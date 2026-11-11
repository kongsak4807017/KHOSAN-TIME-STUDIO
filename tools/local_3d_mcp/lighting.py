"""Render-only elephant studio lighting for the local Blender worker.

This uses Blender's own AREA lights. It matches the photographic intent of the
Three.js LTC preview; it is not an implementation of Heitz et al.'s LTC method.
The caller must exclude objects tagged ``render_only`` from asset measurements
and export. Asset materials and the explicitly supplied camera remain untouched.
"""

import math

import bpy
from mathutils import Vector


PRESET = "elephant_studio"


def _aim(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_elephant_studio(scene, asset_objects):
    """Replace review lighting and add a floor; preserve the fixture camera.

    ``asset_objects`` is the already-built authored mesh list, before any floor.
    Returns a JSON-serializable description suitable for measurement evidence.
    Coordinates in this helper are Blender's native Z-up coordinates.
    """
    assets = [obj for obj in asset_objects if obj.type == "MESH" and not obj.get("render_only", False)]
    if not assets or scene.camera is None:
        raise ValueError("Elephant studio requires authored meshes and the fixture camera")
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = [obj.evaluated_get(depsgraph).matrix_world @ Vector(corner)
              for obj in assets for corner in obj.evaluated_get(depsgraph).bound_box]
    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    if not all(math.isfinite(v) for v in (*lo, *hi)):
        raise ValueError("Elephant studio received non-finite asset bounds")
    height = hi.z - lo.z
    if height <= 0:
        raise ValueError("Elephant studio requires a positive asset height")
    center = (lo + hi) * 0.5
    target = Vector((center.x, center.y, lo.z + height * 0.55))
    outward = Vector((scene.camera.location.x - center.x, scene.camera.location.y - center.y, 0))
    if outward.length < 0.01:
        raise ValueError("Elephant studio camera must have a horizontal viewing direction")
    outward.normalize()
    up = Vector((0, 0, 1))
    right = up.cross(outward).normalized()

    # The existing configure_scene creates review lights; replace those lights
    # only. No authored mesh, material, camera or modifier is changed here.
    for obj in list(scene.objects):
        if obj.type == "LIGHT":
            bpy.data.objects.remove(obj, do_unlink=True)
    world = bpy.data.worlds.new("Elephant charcoal studio")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background_color = (0.085, 0.09, 0.085)
    background_strength = 0.40
    background.inputs["Color"].default_value = (*background_color, 1)
    background.inputs["Strength"].default_value = background_strength
    scene.world = world
    scene.view_settings.view_transform = "AgX"
    for look in ("AgX - Medium High Contrast", "AgX - Medium High Contrast Base"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = 0.1

    definitions = [
        # name, screen-right, toward-camera, up, energy at 3 m, width/H, height/H, color
        ("Elephant broad upper-left key", -0.75, 1.65, 1.55, 1225, 1.65, 1.40, (1.0, 0.93, 0.83)),
        ("Elephant quiet cool fill", 1.20, 0.40, 0.60, 231, 1.40, 1.20, (0.78, 0.86, 1.0)),
        ("Elephant soft back separation", -0.45, -1.00, 1.05, 630, 0.85, 1.40, (1.0, 0.96, 0.88)),
    ]
    lights = []
    for name, x, z, y, power, width, light_height, color in definitions:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = power * (height / 3.0) ** 2
        data.shape = "RECTANGLE"
        data.size = width * height
        data.size_y = light_height * height
        data.color = color
        data.use_shadow = True
        if hasattr(data, "use_shadow_jitter"):
            data.use_shadow_jitter = True
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = target + right * (x * height) + outward * (z * height) + up * (y * height)
        _aim(obj, target)
        obj["render_only"] = True
        obj["lighting_preset"] = PRESET
        lights.append({"name": name, "type": "AREA", "shape": "RECTANGLE",
                       "energy_watts": data.energy, "width_m": data.size,
                       "height_m": data.size_y, "position_blender": list(obj.location)})

    span = max(hi.x - lo.x, hi.y - lo.y, height)
    bpy.ops.mesh.primitive_plane_add(size=span * 24, location=(center.x, center.y, lo.z - height * 0.001))
    floor = bpy.context.object
    floor.name = "RENDER_ONLY_ElephantStudioFloor"
    floor["render_only"] = True
    floor["lighting_preset"] = PRESET
    floor["purpose"] = "Review backdrop and area-light ground shadows; excluded from GLB"
    mat = bpy.data.materials.new("Render-only charcoal floor")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.028, 0.029, 0.027, 1)
    bsdf.inputs["Roughness"].default_value = 0.92
    bsdf.inputs["Metallic"].default_value = 0
    # The distant floor tends to zero direct illumination in EEVEE without GI.
    # Match its minimum radiance to the world so a black horizon band cannot
    # appear. Local area-light shading and contact shadows remain visible above
    # this neutral studio-backdrop baseline. This is a presentation material.
    emission = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
    if emission is not None:
        emission.default_value = (*(channel * background_strength for channel in background_color), 1)
    strength = bsdf.inputs.get("Emission Strength")
    if strength is not None:
        strength.default_value = 1
    floor.data.materials.append(mat)
    bpy.context.view_layer.update()
    return {"preset": PRESET, "implementation": "Blender native rectangular AREA lights",
            "ltc_implementation": False, "camera_preserved": True,
            "lights": lights, "render_only_floor": floor.name,
            "ground_shadow_method": "Blender EEVEE area-light shadows",
            "backdrop_baseline": "Floor emission matched to world radiance to avoid an unlit horizon band",
            "asset_height_m": height,
            "parity_note": "Matched studio-lighting intent; no pixel or algorithm parity with Three.js LTC is claimed."}
