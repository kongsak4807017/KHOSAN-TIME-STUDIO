"""Authored elephant sculpt recipe guided by the supplied single visual reference.

No image-to-3D service, generator, pretrained model, or external asset is used.
Body, head, legs and trunk are fused into a continuous editable sculpt mesh.
Visible skin relief is real geometry, with plain exportable PBR materials.
Hidden anatomy is an artistic inference. No skeleton or animation is implied.
"""
from __future__ import annotations

import math

import bpy
import bmesh
from mathutils import Vector
from mathutils import noise


def _ellipsoid(center, radii, name, segments=48, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=center)
    obj=bpy.context.object
    obj.name=name
    obj.scale=radii
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return obj


def _curve(control, subdivisions=7):
    """Catmull-Rom samples of (x,y,z,radius), with endpoint duplication."""
    p=[Vector(v) for v in control]
    out=[]
    for i in range(len(p)-1):
        a,b,c,d=p[max(0,i-1)],p[i],p[i+1],p[min(len(p)-1,i+2)]
        for j in range(subdivisions):
            t=j/subdivisions
            out.append((b*2+(c-a)*t+(a*2-b*5+c*4-d)*t*t+(-a+b*3-c*3+d)*t*t*t)*.5)
    out.append(p[-1])
    return out


def _sweep(api,name,control,sides=32,subdivisions=7,flatten=1):
    samples=_curve(control,subdivisions)
    verts=[];faces=[]
    prior_u=None
    for i,s in enumerate(samples):
        pt=Vector(s[:3])
        tangent=Vector(samples[min(i+1,len(samples)-1)][:3])-Vector(samples[max(0,i-1)][:3])
        tangent.normalize()
        ref=Vector((1,0,0))
        u=ref-tangent*ref.dot(tangent)
        if u.length<.01:
            ref=Vector((0,1,0));u=ref-tangent*ref.dot(tangent)
        u.normalize()
        if prior_u is not None and u.dot(prior_u)<0:
            u=-u
        prior_u=u
        v=tangent.cross(u).normalized()
        for k in range(sides):
            angle=math.tau*k/sides
            co=pt+max(.001,s[3])*(u*math.cos(angle)+v*math.sin(angle)*flatten)
            verts.append(co)
        if i:
            for k in range(sides):
                faces.append(((i-1)*sides+k,(i-1)*sides+(k+1)%sides,
                              i*sides+(k+1)%sides,i*sides+k))
    faces.append(tuple(reversed(range(sides))))
    faces.append(tuple((len(samples)-1)*sides+k for k in range(sides)))
    return api['mesh'](name,verts,faces)


def _closed_outline(points,count=128):
    result=[]
    for k in range(count):
        f=k/count*len(points)
        i=int(f);t=f-i
        a,b,c,d=[Vector(points[j%len(points)]) for j in (i-1,i,i+1,i+2)]
        result.append((b*2+(c-a)*t+(a*2-b*5+c*4-d)*t*t+(-a+b*3-c*3+d)*t*t*t)*.5)
    return result


def _segment_distance_squared(px,py,a,b):
    dx,dy=b[0]-a[0],b[1]-a[1]
    den=dx*dx+dy*dy
    t=max(0,min(1,((px-a[0])*dx+(py-a[1])*dy)/den)) if den>1e-12 else 0
    return (px-a[0]-t*dx)**2+(py-a[1]-t*dy)**2


def _ear(api,semantic,sign,scale,skin,detail):
    # A uniformly sampled quad patch clipped to the same fan outline. There is
    # deliberately no polar center/pole anywhere on the exposed ear surface.
    outline=_closed_outline([(-.04,.28),(.20,.54),(.59,.58),(.92,.43),(1.10,.13),
                             (1.05,-.23),(.88,-.58),(.61,-.91),(.29,-.73),(.10,-.36),(-.025,-.06)],256)
    rows,cols=64,48
    low=min(p.y for p in outline)+.00005
    high=max(p.y for p in outline)-.00005
    grid=[]
    for row in range(rows+1):
        v=low+(high-low)*row/rows
        cuts=[]
        for a,b in zip(outline,outline[1:]+outline[:1]):
            if (a.y<=v<b.y) or (b.y<=v<a.y):
                cuts.append(a.x+(b.x-a.x)*(v-a.y)/(b.y-a.y))
        if len(cuts)<2:
            raise RuntimeError('Ear outline could not be sampled at v='+str(v))
        left,right=min(cuts),max(cuts)
        for col in range(cols+1):
            grid.append((left+(right-left)*col/cols,v))
    crease_controls=[
        [( .02,.24),(.25,.31),(.49,.36),(.79,.39),(.98,.30)],
        [( .10,.07),(.29,.02),(.52,-.08),(.78,-.21),(.98,-.27)],
        [( .12,-.13),(.28,-.25),(.44,-.46),(.60,-.68),(.63,-.82)],
        [( .15,.15),(.42,.21),(.65,.19),(.88,.10),(1.03,-.02)],
        [( .23,-.34),(.41,-.37),(.63,-.45),(.87,-.55)]]
    segments=[]
    for control in crease_controls:
        points=_curve([(a,b,0,1) for a,b in control],5)
        segments.extend((tuple(a[:2]),tuple(b[:2])) for a,b in zip(points,points[1:]))
    verts=[];faces=[]
    asym=.93 if sign>0 else 1.0
    for back in (False,True):
        for u,v in grid:
            x=sign*(.52+u*scale*asym)
            z=2.58+v*scale*asym-(.07 if sign>0 else 0)
            y=-1.53+.60*u+.055*(u-.45)**2
            y+=.017*math.sin(v*7+u*3)+.010*math.sin(v*13-u*4)*max(.1,u)
            if detail:
                distance=min(_segment_distance_squared(u,v,a,b) for a,b in segments)
                # Separate curved fold paths; no common on-surface convergence.
                y+=detail*.010*math.exp(-distance/(.021*.021))
                y+=detail*.0009*noise.noise_vector(Vector((u*31,v*29,sign*.7))).x
            thickness=.025+.055*max(0,1-u/.55)
            y+=thickness if back else -thickness*.15
            verts.append((x,y,z))
        offset=len(grid) if back else 0
        for row in range(rows):
            for col in range(cols):
                a=offset+row*(cols+1)+col
                face=(a,a+1,a+cols+2,a+cols+1)
                faces.append(tuple(reversed(face)) if back else face)
    perimeter=list(range(cols+1))
    perimeter += [row*(cols+1)+cols for row in range(1,rows+1)]
    perimeter += [rows*(cols+1)+col for col in range(cols-1,-1,-1)]
    perimeter += [row*(cols+1) for row in range(rows-1,0,-1)]
    second=len(grid)
    for a,b in zip(perimeter,perimeter[1:]+perimeter[:1]):
        faces.append((a,second+a,second+b,b))
    ear=api['mesh']('fan_ear',verts,faces)
    # The hand-drawn outline is clockwise. Recalculate this closed shell's
    # orientation explicitly; inverted front normals darken the ear incorrectly.
    bm=bmesh.new();bm.from_mesh(ear.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if bm.calc_volume(signed=True)<0:
        bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bm.to_mesh(ear.data);bm.free();ear.data.update()
    obj=api['tag'](ear,semantic,'elephant',
                   'right_fan_ear' if sign>0 else 'left_fan_ear',[skin],True)
    return obj


def _wrinkle_sculpt(obj,amount,rng):
    """Irregular shallow folds in actual vertices; no procedural shader dependency."""
    if amount<=0:
        return
    obj.data.update()
    # Snapshot normals before changing coordinates. Reading a live normal after
    # every vertex edit can repeatedly invalidate/rebuild Blender's normal cache.
    normals=[v.normal.copy() for v in obj.data.vertices]
    # Short irregular curves on the flank/shoulder/hip, indexed spatially so
    # long crease paths do not require an expensive global search per vertex.
    crease_bins={};bin_size=.20
    for index in range(70):
        cy,cz=rng.uniform(-1.25,1.40),rng.uniform(1.15,2.72)
        angle=rng.uniform(-1.25,.50)
        length=rng.uniform(.22,.68)
        phase=rng.uniform(0,math.tau)
        width=rng.uniform(.012,.019)
        depth=rng.uniform(.0030,.0058)
        points=[]
        for k in range(9):
            t=k/8-.5
            points.append((cy+t*length*math.cos(angle)+.018*math.sin(k*.83+phase),
                           cz+t*length*math.sin(angle)+.015*math.sin(k*1.15+phase)))
        for a,b in zip(points,points[1:]):
            margin=width*2.5
            for by in range(math.floor((min(a[0],b[0])-margin)/bin_size),math.floor((max(a[0],b[0])+margin)/bin_size)+1):
                for bz in range(math.floor((min(a[1],b[1])-margin)/bin_size),math.floor((max(a[1],b[1])+margin)/bin_size)+1):
                    crease_bins.setdefault((by,bz),[]).append((a,b,width,depth))
    for vertex,normal in zip(obj.data.vertices,normals):
        x,y,z=vertex.co
        if z<.045:
            continue
        p=Vector((x,y,z))
        a=noise.noise_vector(p*3.15)
        b=noise.noise_vector(p*10.4)
        # Warped cellular edge distance gives branching intersecting creases.
        # It avoids the globally periodic corrugations of an all-over sine field.
        fine=noise.voronoi(Vector((x*22,y*17,z*25))+a*1.4)[0]
        coarse=noise.voronoi(Vector((x*9,y*8,z*14))+a*.85)[0]
        fine_edge=math.exp(-((fine[1]-fine[0])/.22)**2)
        coarse_edge=math.exp(-((coarse[1]-coarse[0])/.14)**2)
        displaced=-.00155*fine_edge-.00084*coarse_edge+.00065*b.z
        side_weight=max(0,min(1,(abs(normal.x)-.20)/.65))
        if side_weight and z>.85 and -1.5<y<1.65:
            long_crease=0
            for start,end,width,depth in crease_bins.get((math.floor(y/bin_size),math.floor(z/bin_size)),[]):
                distance=_segment_distance_squared(y,z,start,end)
                long_crease=max(long_crease,depth*math.exp(-distance/(width*width)))
            displaced-=side_weight*long_crease
        # Trunk folds are transverse, shallow and non-uniform, not separate torus rings.
        if y<-2.11 and z<2.55:
            phase=z*104+y*23+math.sin(x*18)*.8+a.y*4.2+a.x*1.4
            displaced=-.0060*math.exp(-((math.sin(phase)/.31)**2))-.0008*fine_edge+.0006*b.x
        # Lower limbs carry stronger ankle folds than the broad back.
        if z<.9 and abs(x)>.32 and y> -1.65:
            phase=z*94+math.sin(y*11+x*17)*1.5+a.x*6
            displaced-=.0048*math.exp(-((math.sin(phase)/.34)**2))
        vertex.co+=normal*displaced*amount
    obj.data.update()


def build(semantic,params,mat,rng,api):
    height=params.get('height',3.0)
    length=params.get('body_length',3.9)
    ear_size=params.get('ear_size',1.0)
    tusk_length=params.get('tusk_length',.72)
    detail=params.get('skin_detail',1.0)
    components=[]
    # The union is intentionally broad through the shoulders and pelvis, never disconnected toy balls.
    for name,center,radii in [
        ('barrel',(0,.20,1.94),(.85,1.54,.91)),
        ('rounded_rump',(0,1.15,1.97),(.78,.79,.89)),
        ('withers',(0,-.76,2.17),(.78,.83,.84)),
        ('short_neck',(0,-1.13,2.24),(.62,.69,.72)),
        ('skull',(0,-1.64,2.45),(.56,.60,.59)),
        ('forehead_left',(-.17,-1.58,2.75),(.34,.43,.32)),
        ('forehead_right',(.17,-1.58,2.75),(.34,.43,.32)),
        ('cheek_left',(-.25,-1.82,2.24),(.28,.35,.34)),
        ('cheek_right',(.25,-1.82,2.24),(.28,.35,.34))]:
        components.append(_ellipsoid(center,radii,name))
    body_y_min=min(obj.location.y+min(v.co.y for v in obj.data.vertices) for obj in components)
    body_y_max=max(obj.location.y+max(v.co.y for v in obj.data.vertices) for obj in components)
    authored_body_span=body_y_max-body_y_min
    feet=[]
    for sign in (-1,1):
        yfront=-.99 if sign>0 else -.79
        xfront=sign*.615
        control=[(sign*.46,-.84,2.58,.22),(sign*.53,-.86,2.23,.375),(sign*.59,yfront+.07,1.82,.355),
                 (sign*.62,yfront,1.31,.270),(sign*.63,yfront+.04,.79,.235),
                 (xfront,yfront,.32,.237),(xfront,yfront,.13,.285),(xfront,yfront,.025,.275)]
        components.append(_sweep(api,'foreleg',control,40,6,1.05))
        feet.append((xfront,yfront,.275,4))
        yh=1.22 if sign>0 else 1.10
        xh=sign*.59
        control=[(sign*.44,1.10,2.51,.22),(sign*.52,1.14,2.12,.395),(sign*.59,1.25,1.66,.350),
                 (sign*.61,1.16,1.12,.260),(sign*.59,yh-.03,.69,.215),
                 (xh,yh,.27,.222),(xh,yh,.12,.272),(xh,yh,.025,.263)]
        components.append(_sweep(api,'hindleg',control,40,6,1.05))
        feet.append((xh,yh,.263,3))
    trunk=[(0,-1.80,2.82,.365),(0,-2.08,2.57,.315),(0,-2.22,2.26,.265),
           (0,-2.31,1.93,.233),(0,-2.37,1.57,.210),(0,-2.40,1.20,.185),
           (0,-2.37,.86,.159),(0,-2.28,.56,.137),(0,-2.12,.35,.116),
           (0,-1.96,.29,.085),(0,-1.88,.37,.060)]
    components.append(_sweep(api,'continuous_trunk',trunk,48,9))
    for sign in (-1,1):
        components.append(_sweep(api,'tusk_socket',[(sign*.31,-1.94,2.13,.145),
                           (sign*.37,-2.06,2.05,.12),(sign*.40,-2.13,2.00,.09)],28,5))
    # Voxel union creates a single editable skin surface through body, limbs, head and trunk.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in components:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=components[0]
    bpy.ops.object.join()
    skin=bpy.context.object
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    mod=skin.modifiers.new('Unified organic anatomy','REMESH')
    mod.mode='VOXEL'
    mod.voxel_size=.032 if detail else .047
    mod.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    smooth=skin.modifiers.new('Anatomical surface continuity','SMOOTH')
    smooth.factor=.8;smooth.iterations=11
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    subdiv=skin.modifiers.new('Sculpt surface resolution','SUBSURF')
    subdiv.subdivision_type='CATMULL_CLARK';subdiv.levels=1
    bpy.ops.object.modifier_apply(modifier=subdiv.name)
    for vertex in skin.data.vertices:
        if vertex.co.z<.052:
            vertex.co.z=0
    print('ELEPHANT_STAGE unified_surface_vertices',len(skin.data.vertices),flush=True)
    _wrinkle_sculpt(skin,detail,rng)
    print('ELEPHANT_STAGE modeled_skin_relief_complete',flush=True)
    mats=[mat]
    for k in range(7):
        mats.append(api['variant'](mat,f'elephant_skin_{k}',.82+.055*k,.87))
    api['tag'](skin,semantic,'elephant','continuous_body_head_legs_trunk',mats,True)
    for face in skin.data.polygons:
        co=face.center
        n=noise.noise_vector(co*2.1).x*.7+noise.noise_vector(co*7.7).y*.3
        face.material_index=max(1,min(7,4+int(n*3))) if detail else 0
    # Separate ears are thin folded surfaces and remain individually editable.
    earskin=api['variant'](mat,'ear_skin',.95,.89)
    for sign in (-1,1):
        _ear(api,semantic,sign,ear_size,earskin,detail)
    ivory=api['material'](semantic+'__warm_ivory','#D9D2B5',.48,0)
    nailmat=api['material'](semantic+'__aged_nails','#8A8573',.76,0)
    eye=api['material'](semantic+'__dark_eyes','#171510',.48,0)
    foldmat=api['variant'](mat,'eye_folds',.70,.84)
    for sign in (-1,1):
        f=tusk_length/.72
        base=Vector((sign*.395,-2.115,2.018))
        controls=[]
        for ox,oy,oz,r in [(0,0,0,.087),(.07,-.11,-.11,.077),(.18,-.29,-.15,.055),
                            (.30,-.46,-.105,.032),(.37,-.57,.015,.002)]:
            controls.append((base.x+sign*ox*f,base.y+oy*f,base.z+oz*f,r))
        tusk=_sweep(api,'curved_tusk',controls,32,10)
        api['tag'](tusk,semantic,'elephant','right_tusk' if sign>0 else 'left_tusk',[ivory],True)
        ec=Vector((sign*.46,-1.95,2.565))
        outward=Vector((sign*.78,-.63,0)).normalized()
        tangent=Vector((.63,sign*.78,0)).normalized()
        up=Vector((0,0,1))
        hit,loc,normal,_=skin.ray_cast(ec+outward*.35,-outward,distance=.7)
        if hit:
            ec=loc
        eyeball=_ellipsoid(ec-outward*.019,(.032,.032,.029),'small_eye',32,20)
        api['tag'](eyeball,semantic,'elephant','right_eye' if sign>0 else 'left_eye',[eye],True)
        for lid in (0,1):
            controls=[]
            width=.054+lid*.040
            high=.030+lid*.043
            for i in range(25):
                a=.13+(math.pi-.26)*i/24
                point=ec+tangent*(width*math.cos(a))+up*(high*math.sin(a))
                hit,loc,normal,_=skin.ray_cast(point+outward*.3,-outward,distance=.6)
                point=loc+outward*.004 if hit else point
                controls.append((*point,.006 if lid==0 else .0065))
            ob=_sweep(api,'eyelid',controls,8,2)
            api['tag'](ob,semantic,'elephant',f'eye_fold_{sign}_{lid}',[foldmat if lid==0 else mat],True)
        controls=[]
        for i in range(16):
            a=math.pi+.15+(math.pi-.3)*i/15
            point=ec+tangent*(.052*math.cos(a))+up*(.025*math.sin(a))
            hit,loc,normal,_=skin.ray_cast(point+outward*.3,-outward,distance=.6)
            point=loc+outward*.003 if hit else point
            controls.append((*point,.0045))
        api['tag'](_sweep(api,'lower_lid',controls,8,2),semantic,'elephant',f'lower_lid_{sign}',[foldmat],True)
    for index,(x,y,r,count) in enumerate(feet):
        for k in range(count):
            angle=-math.pi/2+(k-(count-1)/2)*.37
            radial=Vector((math.cos(angle),math.sin(angle),0))
            center=Vector((x,y,.058))+radial*r
            hit,loc,normal,_=skin.ray_cast(center+radial*.20,-radial,distance=.5)
            center=loc-radial*.006 if hit else center-radial*.017
            nail=_ellipsoid(center,(.045,.014,.052),'toenail',24,16)
            nail.rotation_euler.z=angle+math.pi/2
            bpy.context.view_layer.objects.active=nail
            bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
            api['tag'](nail,semantic,'elephant',f'foot_{index}_nail_{k}',[nailmat],True)
    tailcontrols=[(.02,1.88,2.10,.055),(.05,1.98,1.76,.041),(.13,2.00,1.34,.033),
                  (.20,1.97,.92,.027),(.18,1.91,.66,.018)]
    api['tag'](_sweep(api,'tail',tailcontrols,16,8),semantic,'elephant','tail',[mat],True)
    hair=api['material'](semantic+'__tail_hair','#3B372F',.92,0)
    for i in range(13):
        a=i*math.tau/13
        r=.024+.020*rng.random()
        control=[(.18+math.cos(a)*.015,1.91+math.sin(a)*.015,.70,.009),
                 (.18+math.cos(a)*r,1.91+math.sin(a)*r,.59,.007),
                 (.16+math.cos(a)*r,1.93+math.sin(a)*r,.49-.025*rng.random(),.001)]
        api['tag'](_sweep(api,'tail_tuft',control,6,4),semantic,'elephant',f'tail_tuft_{i}',[hair],True)
    # Normalize actual top height, and explicitly stretch front/back proportion independently.
    objects=api['PARTS'][semantic]
    # Bring all coordinates into local mesh data before the parent worker applies canonical transforms.
    for obj in objects:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    top=max(v.co.z for obj in objects for v in obj.data.vertices)
    uniform=height/top
    longitudinal=length/authored_body_span
    for obj in objects:
        for vertex in obj.data.vertices:
            vertex.co.x*=uniform
            vertex.co.y*=longitudinal
            vertex.co.z=max(0,vertex.co.z*uniform)
        obj.data.update()
    skin['construction']='Continuous voxel-unioned authored sculpt; editable mesh'
    skin['skin_detail_encoding']='Modeled shallow cellular micrograin, irregular localized crease paths, and transverse trunk/joint folds; plain PBR material variation; no shader-only details'
    skin['reference_scope']='Single-image visual guidance; hidden anatomy inferred; no metric reconstruction'
    skin['body_length_convention']='Authored rump-to-head source span, excluding trunk, tusks and tail; normalized independently of height'
    return objects
