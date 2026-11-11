"""KHOSAN local procedural proof worker. Run inside Blender, never ordinary Python.

This builds authored procedural props, not image reconstruction, character rigs,
or a physics simulation. Only locally available Blender APIs are used. All
delivered materials are plain glTF-compatible metallic/roughness materials.
Canonical input/output coordinates are meters, +Y up; Blender uses (x,-z,y).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy
from mathutils import Euler, Matrix, Vector


AXIS = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
PARTS: dict[str, list] = {}
MATERIALS = {}


def cvec(values):
    return AXIS @ Vector(values)


def canonical(values):
    return [float(values[0]), float(values[2]), float(-values[1])]


def srgb_linear(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def material(name, color, roughness=.65, metallic=0):
    if name in MATERIALS:
        return MATERIALS[name]
    rgb = [srgb_linear(int(color[i:i + 2], 16) / 255) for i in (1, 3, 5)]
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    pbr = result.node_tree.nodes.get("Principled BSDF")
    pbr.inputs["Base Color"].default_value = (*rgb, 1)
    pbr.inputs["Roughness"].default_value = roughness
    pbr.inputs["Metallic"].default_value = metallic
    result.diffuse_color = (*rgb, 1)
    MATERIALS[name] = result
    return result


def variant(base, suffix, factor, roughness=None):
    key = base.name + "__" + suffix
    if key in MATERIALS:
        return MATERIALS[key]
    result = base.copy()
    result.name = key
    pbr = result.node_tree.nodes.get("Principled BSDF")
    old = pbr.inputs["Base Color"].default_value
    rgba = (*[min(.95, max(.003, x * factor)) for x in old[:3]], 1)
    pbr.inputs["Base Color"].default_value = rgba
    result.diffuse_color = rgba
    if roughness is not None:
        pbr.inputs["Roughness"].default_value = roughness
    MATERIALS[key] = result
    return result


def tag(obj, semantic, recipe, part, mats, smooth=False):
    obj.name = semantic + "__" + part
    obj["semantic_id"] = semantic
    obj["recipe"] = recipe
    obj["part_id"] = part
    for mat in mats:
        obj.data.materials.append(mat)
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = smooth
    PARTS.setdefault(semantic, []).append(obj)
    return obj


def mesh(name, vertices, faces):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return obj


def bevel(obj, amount, segments=3):
    mod = obj.modifiers.new("Soft crafted edges", "BEVEL")
    mod.width = amount
    mod.segments = segments
    mod.affect = "EDGES"
    mod.limit_method = "ANGLE"
    try:
        norm = obj.modifiers.new("Weighted surface normals", "WEIGHTED_NORMAL")
        norm.keep_sharp = True
        norm.weight = 40
    except (AttributeError, TypeError):
        pass


def box(semantic, recipe, part, center, size, mat, edge=.006):
    x, y, z = center
    a, b, c = [v * .5 for v in size]
    vertices = [(x + dx*a, y + dy*b, z + dz*c)
                for dx, dy, dz in ((-1,-1,-1), (1,-1,-1), (1,1,-1), (-1,1,-1),
                                   (-1,-1,1), (1,-1,1), (1,1,1), (-1,1,1))]
    obj = mesh(part, vertices, [(0,3,2,1), (4,5,6,7), (0,1,5,4),
                                (1,2,6,5), (2,3,7,6), (3,0,4,7)])
    tag(obj, semantic, recipe, part, [mat])
    if edge:
        bevel(obj, edge)
    return obj


def tube(semantic, recipe, part, points, radius, mat, sides=8, taper=None):
    """A real mesh swept along a path, with capped ends and stable frames."""
    ps = [Vector(p) for p in points]
    verts, faces = [], []
    for i, point in enumerate(ps):
        tangent = ps[min(i + 1, len(ps)-1)] - ps[max(0, i-1)]
        tangent.normalize()
        reference = Vector((0, 1, 0))
        if abs(tangent.dot(reference)) > .93:
            reference = Vector((0, 0, 1))
        u = tangent.cross(reference).normalized()
        v = tangent.cross(u).normalized()
        thickness = radius * (taper(i/(len(ps)-1)) if taper else 1)
        for j in range(sides):
            angle = j * math.tau / sides
            verts.append(point + thickness * (u*math.cos(angle) + v*math.sin(angle)))
        if i:
            for j in range(sides):
                a = (i-1)*sides+j
                b = (i-1)*sides+(j+1)%sides
                c = i*sides+(j+1)%sides
                d = i*sides+j
                faces.append((a,b,c,d))
    faces.extend([tuple(reversed(range(sides))),
                  tuple((len(ps)-1)*sides+j for j in range(sides))])
    return tag(mesh(part, verts, faces), semantic, recipe, part, [mat], True)


def lathe(semantic, recipe, part, profile, mats, segments=80, wobble=0, phase=0):
    """Revolve a closed vessel section: outer wall, rim, inner wall, solid base."""
    verts, faces = [], []
    for radius, height in profile:
        for i in range(segments):
            theta = i * math.tau / segments
            r = radius * (1 + wobble*math.sin(theta*3+phase) + wobble*.4*math.cos(theta*7))
            verts.append((r*math.cos(theta), r*math.sin(theta), height))
    for j in range(len(profile)-1):
        for i in range(segments):
            faces.append((j*segments+i, j*segments+(i+1)%segments,
                          (j+1)*segments+(i+1)%segments, (j+1)*segments+i))
    faces.append(tuple(reversed(range(segments))))
    faces.append(tuple((len(profile)-1)*segments+i for i in range(segments)))
    obj = tag(mesh(part, verts, faces), semantic, recipe, part, mats, True)
    # The tiny variation is modeled and material-based; no unsupported shader graphs.
    if len(mats) > 1:
        for face in obj.data.polygons:
            ring = face.index // segments
            if ring in (1, 2, 6, 7, 18, 19, 20, 21, 22):
                face.material_index = 1
            elif ring >= 27:
                face.material_index = min(2, len(mats)-1)
    return obj


def amphora(oid, p, mat, rng):
    h, r = p.get("height", 1.15), p.get("radius", .34)
    # Small concave bands, a generous shoulder, rolled hollow lip, continuous inner wall.
    profile = [(r*f,h*z) for f,z in [
        (.13,0),(.39,0),(.42,.025),(.42,.055),(.32,.071),
        (.39,.105),(.49,.155),(.52,.169),(.515,.178),(.545,.187),
        (.69,.265),(.86,.38),(.97,.49),(1,.58),(.985,.65),(.92,.72),
        (.77,.78),(.55,.817),(.36,.842),(.35,.87),(.345,.88),(.35,.89),
        (.355,.925),(.40,.938),(.43,.955),(.43,.976),(.39,.99),
        (.32,.99),(.29,.974),(.29,.953),(.294,.925),(.292,.875),
        (.31,.851),(.49,.825),(.71,.783),(.87,.72),(.932,.65),(.947,.58),
        (.918,.50),(.81,.39),(.64,.275),(.47,.192),(.34,.128),(.15,.10)]]
    rim = variant(mat,"rim",.72,.58)
    inner = variant(mat,"interior",.55,.83)
    lathe(oid,"amphora","hollow_fired_clay_body",profile,[mat,rim,inner],88,.006,rng.random()*6)
    handle_mat = variant(mat,"handles",.93,.67)
    for sign in (-1,1):
        points = []
        for j in range(36):
            t=j/35
            # Handles join neck and upper shoulder, with broad negative-space openings.
            x=sign*r*(.37 + .77*math.sin(math.pi*t)**.80 + .29*t)
            y=r*.018*math.sin(t*math.tau)
            z=h*(.922-.255*t)
            points.append((x,y,z))
        tube(oid,"amphora","handle_left" if sign<0 else "handle_right",points,r*.085,
             handle_mat,12,lambda t: .92+.28*abs(2*t-1))
    # Two subtly inset-looking decorative bands follow the shoulder curvature.
    for index,(rad,z) in enumerate(((.807*r,.762*h),(.842*r,.750*h))):
        pts=[(rad*math.cos(t*math.tau/96),rad*math.sin(t*math.tau/96),z) for t in range(97)]
        tube(oid,"amphora",f"shoulder_band_{index}",pts,r*.008, rim,6)


def table(oid,p,mat,rng):
    w,d,h=p.get("width",1.8),p.get("depth",.8),p.get("height",.85)
    thick=min(.075,h*.1)
    leg=min(.10,w*.07,d*.13)
    edge=min(.008,thick*.15)
    dark=variant(mat,"grain",.48,.82)
    peg=variant(mat,"end_grain",.65,.75)
    planks=5
    for j in range(planks):
        y=-d/2+(j+.5)*d/planks
        m=variant(mat,f"board_{j}",.90+.075*j,.68)
        box(oid,"table",f"top_plank_{j}",(0,y,h-thick/2),(w,d/planks-.005,thick),m,edge)
        # Sparse hand-worked grain embedded in the surface as fine dark mesh traces.
        for g in range(4):
            gy=y+(g-1.5)*d/planks*.18
            phase=rng.random()*math.tau
            points=[]
            for k in range(25):
                x=-w*.46+w*.92*k/24
                wave=math.sin(x*5+phase)*d*.003+math.sin(x*14+phase)*d*.001
                points.append((x,gy+wave,h+.00035))
            tube(oid,"table",f"grain_{j}_{g}",points,min(.0007,w*.0004),dark,4)
        if j in (1,3):
            xk=(-.22 if j==1 else .27)*w
            for ring in range(2):
                pts=[(xk+(.014+.010*ring)*math.cos(k*math.tau/28),
                      y+(.006+.004*ring)*math.sin(k*math.tau/28),h+.0007)
                     for k in range(29)]
                tube(oid,"table",f"knot_{j}_{ring}",pts,.0008,dark,4)
    insetx=w/2-leg*1.25
    insety=d/2-leg*1.30
    for sx in (-1,1):
        for sy in (-1,1):
            x,y=sx*insetx,sy*insety
            ztop=h-thick
            verts=[]
            for z,size in ((0,leg*.72),(ztop,leg)):
                for a,b in ((-1,-1),(1,-1),(1,1),(-1,1)):
                    verts.append((x+a*size/2,y+b*size/2,z))
            obj=tag(mesh("leg",verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]),
                    oid,"table",f"tapered_leg_{sx}_{sy}",[mat])
            bevel(obj,edge*.8)
    apron_h=min(.12,h*.17)
    for sy in (-1,1):
        box(oid,"table",f"long_apron_{sy}",(0,sy*insety,h-thick-apron_h/2),
            (2*insetx,leg*.48,apron_h),mat,edge*.65)
    for sx in (-1,1):
        box(oid,"table",f"end_apron_{sx}",(sx*insetx,0,h-thick-apron_h/2),
            (leg*.48,2*insety,apron_h),mat,edge*.65)
        box(oid,"table",f"lower_stretcher_{sx}",(sx*insetx,0,h*.27),
            (leg*.64,2*insety,leg*.7),mat,edge*.6)
    box(oid,"table","central_crossbar",(0,0,h*.27),(2*insetx,leg*.65,leg*.7),mat,edge*.6)
    # Mortise pegs are explicit shallow wood cylinders, with no metallic placeholder nails.
    for sx in (-1,1):
        for sy in (-1,1):
            center=(sx*insetx,sy*(insety+leg*.5+.0005),h-thick-apron_h*.52)
            end=(center[0],center[1]+sy*.002,center[2])
            tube(oid,"table",f"joinery_peg_{sx}_{sy}",[center,end],leg*.085,peg,12)


def column(oid,p,mat,rng):
    h,r=p.get("height",1.7),p.get("radius",.22)
    base=min(h*.12,r*.60)
    dark=variant(mat,"aged_recess",.84,.83)
    light=variant(mat,"edges",1.10,.73)
    box(oid,"column","lower_plinth",(0,0,base*.23),(r*2.8,r*2.8,base*.46),mat,r*.045)
    box(oid,"column","upper_plinth",(0,0,base*.66),(r*2.40,r*2.40,base*.40),light,r*.035)
    shaftbottom=base*.88
    shafttop=h-base*1.15
    rings=14;seg=96
    verts=[]
    for j in range(rings):
        t=j/(rings-1)
        z=shaftbottom+(shafttop-shaftbottom)*t
        for i in range(seg):
            a=math.tau*i/seg
            flute=.075*(.5+.5*math.cos(a*16))
            rad=r*(.99-.09*t-flute+.013*math.sin(t*math.pi))
            uneven=(rng.random()-.5)*r*.004
            verts.append(((rad+uneven)*math.cos(a),(rad+uneven)*math.sin(a),z))
    faces=[]
    for j in range(rings-1):
        for i in range(seg):
            faces.append((j*seg+i,j*seg+(i+1)%seg,(j+1)*seg+(i+1)%seg,(j+1)*seg+i))
    faces.extend([tuple(reversed(range(seg))),tuple((rings-1)*seg+i for i in range(seg))])
    obj=tag(mesh("shaft",verts,faces),oid,"column","sixteen_fluted_shaft",[mat,dark],True)
    for poly in obj.data.polygons:
        if poly.index%6==0:
            poly.material_index=1
    lathe(oid,"column","base_torus",[(r*f,base*z) for f,z in ((1.12,.75),(1.17,.85),(1.14,1.0),(1.02,1.08),(.96,1.05))],
          [light],64)
    lathe(oid,"column","capital_echinus",[(r*f,h-base*z) for f,z in ((.89,1.24),(.94,1.10),(1.13,.97),(1.25,.83),(1.25,.68))],
          [light],64)
    cap=box(oid,"column","worn_capital_abacus",(0,0,h-base*.34),(r*2.8,r*2.8,base*.68),mat,r*.05)
    # Tiny asymmetry at two corners produces a worn carved silhouette while retaining the stepped profile.
    for v in cap.data.vertices:
        if v.co.z>h-base*.4 and v.co.x>0 and v.co.y>0:
            v.co.x-=r*.10
            v.co.z-=base*.10
    # Fine joint at the shaft's lower third, a visible construction detail.
    z=shaftbottom+(shafttop-shaftbottom)*.37
    pts=[(r*.953*math.cos(k*math.tau/97),r*.953*math.sin(k*math.tau/97),z) for k in range(98)]
    tube(oid,"column","carved_joint",pts,r*.007,dark,4)


def rock(oid,p,mat,rng):
    r=p.get("radius",.18)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1)
    obj=bpy.context.object
    for v in obj.data.vertices:
        q=v.co.copy()
        noise=1+.15*rng.uniform(-1,1)+.07*math.sin(q.x*9+q.y*5)
        v.co=(q.x*r*noise*1.16,q.y*r*noise*.87,q.z*r*noise*.71)
    zmin=min(v.co.z for v in obj.data.vertices)
    for v in obj.data.vertices:
        v.co.z-=zmin
    mats=[mat,variant(mat,"dark",.80,.86),variant(mat,"pale",1.15,.82)]
    tag(obj,oid,"rock","hand_hewn_stone",mats,False)
    for face in obj.data.polygons:
        face.material_index=rng.choices((0,1,2),(8,1,1))[0]


def terrain(oid,p,mat,rng):
    w,d,relief=p.get("width",7),p.get("depth",5),p.get("relief",.035)
    seg=96
    radial=(.02,.24,.48,.67,.83,1.0)
    perimeter=[1+.017*math.sin(i*math.tau/seg*5)+.008*math.cos(i*math.tau/seg*11) for i in range(seg)]
    verts=[]
    for rr in radial:
        for i in range(seg):
            a=i*math.tau/seg
            # Broad center at exactly y=0 gives explicit floor contact for the demo props.
            edge=max(0,(rr-.67)/.33)
            z=-edge*relief*(.45+.3*math.sin(a*4)+.1*math.sin(a*9))
            verts.append((math.cos(a)*w*.5*rr*perimeter[i],math.sin(a)*d*.5*rr*perimeter[i],z))
    faces=[tuple(range(seg))]
    for j in range(len(radial)-1):
        for i in range(seg):
            faces.append((j*seg+i,(j+1)*seg+i,(j+1)*seg+(i+1)%seg,j*seg+(i+1)%seg))
    top_ring=(len(radial)-1)*seg
    bottom_start=len(verts)
    thickness=min(.15,w*.045)+relief*.35
    for i in range(seg):
        a=i*math.tau/seg
        verts.append((math.cos(a)*w*.5*perimeter[i]*.985,math.sin(a)*d*.5*perimeter[i]*.985,-thickness))
        faces.append((top_ring+i,bottom_start+i,bottom_start+(i+1)%seg,top_ring+(i+1)%seg))
    faces.append(tuple(reversed([bottom_start+i for i in range(seg)])))
    obj=tag(mesh("earth",verts,faces),oid,"terrain","low_earthen_stage",[mat,variant(mat,"cut_earth",.64,.95)],False)
    side_start=1+(len(radial)-1)*seg
    for face in obj.data.polygons:
        if face.index>=side_start:
            face.material_index=1
    bevel(obj,min(.015,w*.003),2)


def elephant(semantic, params, mat, rng):
    from elephant_recipe import build
    return build(semantic, params, mat, rng, globals())


RECIPES={"amphora":amphora,"table":table,"column":column,"rock":rock,"terrain":terrain,"elephant":elephant}


def apply_transform(objects,spec):
    rotation=Euler(tuple(math.radians(v) for v in spec.get("rotation",[0,0,0])),"XYZ").to_matrix()
    scale=Matrix.Diagonal(Vector(spec.get("scale",[1,1,1])))
    transformed=AXIS@rotation@scale@AXIS.inverted()
    matrix=transformed.to_4x4()
    matrix.translation=cvec(spec.get("position",[0,0,0]))
    for obj in objects:
        obj.matrix_world=matrix


def evaluated_metrics(objects):
    depsgraph=bpy.context.evaluated_depsgraph_get()
    depsgraph.update()
    result={"triangle_count":0,"mesh_object_count":0,"material_count":0,
            "bounds":{"min":[math.inf]*3,"max":[-math.inf]*3},"semantic_ids":[],"missing_materials":[]}
    material_names=set();ids=set()
    for obj in objects:
        if obj.type!="MESH":
            continue
        ev=obj.evaluated_get(depsgraph)
        em=ev.to_mesh()
        try:
            if not em.vertices or not em.polygons:
                raise RuntimeError("Empty evaluated mesh: "+obj.name)
            em.calc_loop_triangles()
            result["triangle_count"]+=len(em.loop_triangles)
            result["mesh_object_count"]+=1
            if not obj.material_slots or any(slot.material is None for slot in obj.material_slots):
                result["missing_materials"].append(obj.name)
            material_names.update(slot.material.name for slot in obj.material_slots if slot.material)
            sid=obj.get("semantic_id")
            if sid:
                ids.add(sid)
            for vertex in em.vertices:
                co=canonical(obj.matrix_world@vertex.co)
                for i in range(3):
                    result["bounds"]["min"][i]=min(result["bounds"]["min"][i],co[i])
                    result["bounds"]["max"][i]=max(result["bounds"]["max"][i],co[i])
        finally:
            ev.to_mesh_clear()
    result["semantic_ids"]=sorted(ids)
    result["material_count"]=len(material_names)
    return result


def orient(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def configure_scene(spec):
    scene=bpy.context.scene
    available={i.identifier for i in scene.render.bl_rna.properties["engine"].enum_items}
    selected=next((x for x in ("BLENDER_EEVEE_NEXT","BLENDER_EEVEE") if x in available),None)
    if selected is None:
        # Engine enum introspection can omit dynamic engine identifiers; assignment is authoritative.
        for candidate in ("BLENDER_EEVEE_NEXT","BLENDER_EEVEE"):
            try:
                scene.render.engine=candidate
                selected=candidate
                break
            except TypeError:
                continue
    if selected is None:
        raise RuntimeError("This worker requires an available EEVEE renderer")
    scene.render.engine=selected
    render=spec.get("render",{})
    scene.render.resolution_x=int(render.get("width",960))
    scene.render.resolution_y=int(render.get("height",540))
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGB"
    scene.render.film_transparent=False
    scene.render.use_file_extension=True
    scene.render.image_settings.color_depth="8"
    scene.render.threads_mode="FIXED"
    scene.render.threads=4
    if hasattr(scene,"eevee"):
        eevee=scene.eevee
        for attr in ("taa_render_samples","taa_samples"):
            if hasattr(eevee,attr):
                setattr(eevee,attr,int(render.get("samples",32)))
        if hasattr(eevee,"use_raytracing"):
            eevee.use_raytracing=False
    scene.view_settings.view_transform="AgX"
    try:
        scene.view_settings.look="AgX - Medium High Contrast"
    except TypeError:
        pass
    scene.view_settings.exposure=.25
    world=bpy.data.worlds.new("Warm neutral studio")
    world.use_nodes=True
    world.node_tree.nodes["Background"].inputs["Color"].default_value=(.44,.40,.33,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value=.38
    scene.world=world
    for name,pos,power,size,color in [
        ("Soft warm key",(-3.4,-4.0,6.3),850,4.5,(1,.84,.66)),
        ("Cool fill",(4.4,-1.0,3.8),470,4.0,(.70,.83,1)),
        ("High rim",(.4,4.1,5.5),1050,3.2,(1,.94,.79))]:
        data=bpy.data.lights.new(name,"AREA")
        data.energy=power
        data.shape="DISK"
        data.size=size
        data.color=color
        obj=bpy.data.objects.new(name,data)
        scene.collection.objects.link(obj)
        obj.location=pos
        orient(obj,(0,0,.6))
    camdata=bpy.data.cameras.new("Proof camera")
    cam=bpy.data.objects.new("Proof camera",camdata)
    scene.collection.objects.link(cam)
    scene.camera=cam
    cs=spec.get("camera",{})
    cam.location=cvec(cs.get("position",[4.7,3.2,5.7]))
    target=cvec(cs.get("target",[0,.65,0]))
    orient(cam,target)
    camdata.lens=float(cs.get("lens_mm",48))
    camdata.clip_start=.02
    camdata.clip_end=1000
    return cam,target


def render_views(spec,out,cam,target):
    scene=bpy.context.scene
    start=time.perf_counter()
    original=cam.matrix_world.copy()
    # Canonical front is +Z; all review cameras maintain a useful downward angle.
    delta=cam.location-target
    horizontal=max(1,math.hypot(delta.x,delta.y))
    elevation=max(horizontal*.35,delta.z)
    positions={"front":Vector((target.x,target.y-horizontal,target.z+elevation)),
               "side":Vector((target.x+horizontal,target.y,target.z+elevation)),
               "back":Vector((target.x,target.y+horizontal,target.z+elevation))}
    for name,pos in positions.items():
        cam.location=pos
        orient(cam,target)
        scene.render.filepath=str(out/f"preview_{name}.png")
        bpy.ops.render.render(write_still=True)
    cam.matrix_world=original
    scene.render.filepath=str(out/"preview_hero.png")
    bpy.ops.render.render(write_still=True)
    return round(time.perf_counter()-start,3)


def export_and_roundtrip(out,original_metrics,ids):
    scene=bpy.context.scene
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        if obj.type=="MESH" and obj.get("semantic_id") in ids and not obj.get("render_only",False):
            obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out/"scene.glb"),export_format="GLB",use_selection=True,
                              export_apply=True,export_extras=True,export_materials="EXPORT")
    glb=out/"scene.glb"
    if not glb.is_file() or glb.stat().st_size<100:
        raise RuntimeError("GLB exporter did not produce a usable file")
    # A fresh scene avoids mistaking the pre-export source for a successful import.
    validation_scene=bpy.data.scenes.new("GLB roundtrip verification")
    window=bpy.context.window
    if window is None:
        raise RuntimeError("Cannot create isolated Blender scene for GLB readback")
    window.scene=validation_scene
    try:
        bpy.ops.import_scene.gltf(filepath=str(glb))
        actual=evaluated_metrics(list(validation_scene.objects))
    finally:
        window.scene=scene
    deltas=[abs(a-b) for key in ("min","max")
            for a,b in zip(original_metrics["bounds"][key],actual["bounds"][key])]
    max_delta=max(deltas)
    actual.update({"max_bounds_delta":max_delta,
                   "missing_semantic_ids":sorted(set(ids)-set(actual["semantic_ids"])),
                   "unexpected_semantic_ids":sorted(set(actual["semantic_ids"])-set(ids))})
    actual["passed"]=(actual["mesh_object_count"]==original_metrics["mesh_object_count"] and
                      actual["triangle_count"]==original_metrics["triangle_count"] and
                      max_delta<=.0001 and not actual["missing_materials"] and
                      not actual["missing_semantic_ids"] and not actual["unexpected_semantic_ids"])
    if not actual["passed"]:
        raise RuntimeError("GLB roundtrip verification failed: "+json.dumps(actual))
    bpy.data.scenes.remove(validation_scene)
    return actual


def main():
    args=argparse.ArgumentParser(description=__doc__)
    args.add_argument("--spec",required=True,type=Path)
    args.add_argument("--output",required=True,type=Path)
    options=args.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    out=options.output.resolve()
    if not out.is_dir():
        raise ValueError("Output must be an existing unique job directory")
    if any((out/name).exists() for name in ("scene.blend","scene.glb","measured.json","preview_hero.png")):
        raise FileExistsError("Refusing to overwrite an existing completed/partial job")
    spec=json.loads(options.spec.read_text(encoding="utf-8-sig"))
    if spec.get("schema")!="khosan.scene/1.0" or spec.get("units")!="m" or spec.get("up_axis")!="Y":
        raise ValueError("Unsupported scene schema/coordinate system")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    PARTS.clear();MATERIALS.clear()
    for m in spec["materials"]:
        material(m["id"],m["base_color"],m.get("roughness",.65),m.get("metallic",0))
    seed=int(spec["seed"])
    built_triangles=0
    built_objects=0
    for obj in spec["objects"]:
        recipe=obj["recipe"]
        if recipe not in RECIPES:
            raise ValueError("Unsupported procedural recipe: "+str(recipe))
        if obj["id"] in PARTS:
            raise ValueError("Duplicate object ID: "+obj["id"])
        stable=int(hashlib.sha256(f"{seed}:{obj['id']}".encode()).hexdigest()[:16],16)
        RECIPES[recipe](obj["id"],obj.get("parameters",{}),MATERIALS[obj["material"]],random.Random(stable))
        apply_transform(PARTS[obj["id"]],obj)
        bpy.context.view_layer.update()
        piece=evaluated_metrics(PARTS[obj["id"]])
        built_triangles+=piece["triangle_count"]
        built_objects+=piece["mesh_object_count"]
        if built_triangles>spec["budget"]["max_triangles"] or built_objects>spec["budget"]["max_objects"]:
            raise RuntimeError("Measured geometry exceeds budget after object "+obj["id"]+": "+json.dumps({"triangle_count":built_triangles,"mesh_object_count":built_objects}))
    bpy.context.view_layer.update()
    all_mesh=[obj for values in PARTS.values() for obj in values]
    metrics=evaluated_metrics(all_mesh)
    budget=spec["budget"]
    if metrics["triangle_count"]>budget["max_triangles"] or metrics["mesh_object_count"]>budget["max_objects"]:
        raise RuntimeError("Measured geometry exceeds budget: "+json.dumps(metrics))
    if metrics["missing_materials"]:
        raise RuntimeError("Generated mesh has missing materials")
    objects=[]
    for obj in spec["objects"]:
        data=evaluated_metrics(PARTS[obj["id"]])
        objects.append({"id":obj["id"],"recipe":obj["recipe"],
                        "triangle_count":data["triangle_count"],"mesh_object_count":data["mesh_object_count"],
                        "bounds":data["bounds"]})
    cam,target=configure_scene(spec)
    lighting_info={"preset":"storybook","method":"Blender area lights"}
    if spec.get("lighting",{}).get("preset")=="elephant_studio":
        from lighting import configure_elephant_studio
        lighting_info=configure_elephant_studio(bpy.context.scene,all_mesh)
    bpy.context.view_layer.update()
    render_seconds=render_views(spec,out,cam,target)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/"scene.blend"))
    roundtrip=export_and_roundtrip(out,metrics,[o["id"] for o in spec["objects"]])
    result={"schema":"khosan.measurements/1.0","scene_id":spec["scene_id"],"seed":seed,
            "blender_version":bpy.app.version_string,"triangle_count":metrics["triangle_count"],
            "mesh_object_count":metrics["mesh_object_count"],"world_bounds":metrics["bounds"],
            "material_count":metrics["material_count"],"semantic_ids":metrics["semantic_ids"],
            "missing_materials":metrics["missing_materials"],"objects":objects,"render_seconds":render_seconds,
            "roundtrip":roundtrip,"renderer":bpy.context.scene.render.engine,
            "lighting":lighting_info,
            "materials":"Plain glTF metallic/roughness PBR; all visible details are modeled geometry.",
            "limitations":["Procedural modeling guided by stated references; hidden geometry and absolute scale are inferred, not scanned.",
                            "No character rig, animation, cloth or physics simulation is claimed.",
                            "No automated artistic approval; renders require independent review."]}
    for name in ("scene.blend","scene.glb","preview_front.png","preview_side.png","preview_back.png","preview_hero.png"):
        if not (out/name).is_file() or (out/name).stat().st_size<100:
            raise RuntimeError("Missing output artifact: "+name)
    temporary=out/"measured.json.tmp"
    temporary.write_text(json.dumps(result,indent=2,allow_nan=False),encoding="utf-8")
    temporary.replace(out/"measured.json")
    print("KHOSAN_RESULT "+json.dumps({"scene_id":spec["scene_id"],"triangles":metrics["triangle_count"],
                                         "mesh_objects":metrics["mesh_object_count"],"roundtrip":True}))


if __name__=="__main__":
    main()
