from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any

import bpy


class WorkerError(RuntimeError):
    pass


def _parse_args() -> argparse.Namespace:
    argv = sys.argv
    forwarded = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser(description="KHOSAN Blender worker")
    parser.add_argument("--job", required=True)
    return parser.parse_args(forwarded)


def _load_job(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if data.get("schema_version") != 1:
        raise WorkerError("Unsupported job schema_version")
    return data


def _resolve(path_text: str, base: Path) -> Path:
    path = Path(path_text).expanduser()
    return path if path.is_absolute() else (base / path).resolve()


def _clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def _load_source(source: Path) -> None:
    suffix = source.suffix.lower()
    if suffix == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(source))
    elif suffix in {".glb", ".gltf"}:
        _clear_scene()
        bpy.ops.import_scene.gltf(filepath=str(source))
    else:
        raise WorkerError(f"Unsupported source format: {suffix}")


def _object(name: str):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise WorkerError(f"Object not found: {name}")
    return obj


def _armature(name: str):
    obj = _object(name)
    if obj.type != "ARMATURE":
        raise WorkerError(f"Object is not an armature: {name}")
    return obj


def _apply_set_shape_key_value(op: dict[str, Any]) -> None:
    obj = _object(op["object"])
    shape_keys = getattr(obj.data, "shape_keys", None)
    if shape_keys is None:
        raise WorkerError(f"Object has no shape keys: {obj.name}")
    key = shape_keys.key_blocks.get(op["key"])
    if key is None:
        raise WorkerError(f"Shape key not found on {obj.name}: {op['key']}")
    key.value = float(op["value"])


def _apply_set_object_visibility(op: dict[str, Any]) -> None:
    obj = _object(op["object"])
    visible = bool(op["visible"])
    obj.hide_viewport = not visible
    obj.hide_render = not visible
    try:
        obj.hide_set(not visible)
    except RuntimeError:
        pass


def _apply_set_object_transform(op: dict[str, Any]) -> None:
    obj = _object(op["object"])
    if "location" in op:
        obj.location = tuple(float(value) for value in op["location"])
    if "rotation_euler_degrees" in op:
        obj.rotation_mode = "XYZ"
        obj.rotation_euler = tuple(math.radians(float(value)) for value in op["rotation_euler_degrees"])
    if "scale" in op:
        obj.scale = tuple(float(value) for value in op["scale"])


def _apply_parent_object_to_bone(op: dict[str, Any]) -> None:
    child = _object(op["object"])
    rig = _armature(op["armature"])
    bone_name = op["bone"]
    if rig.data.bones.get(bone_name) is None:
        raise WorkerError(f"Bone not found on {rig.name}: {bone_name}")

    keep_world = bool(op.get("keep_world", True))
    matrix_world = child.matrix_world.copy()
    child.parent = rig
    child.parent_type = "BONE"
    child.parent_bone = bone_name
    if keep_world:
        child.matrix_world = matrix_world


def _apply_set_custom_property(op: dict[str, Any]) -> None:
    if op["target_type"] == "object":
        target = _object(op["target"])
    else:
        rig = _armature(op["armature"])
        target = rig.data.bones.get(op["target"])
        if target is None:
            raise WorkerError(f"Bone not found on {rig.name}: {op['target']}")
    target[op["property"]] = op["value"]


def _apply_rename_data_block(op: dict[str, Any]) -> None:
    collections = {
        "object": bpy.data.objects,
        "mesh": bpy.data.meshes,
        "armature": bpy.data.armatures,
        "material": bpy.data.materials,
    }
    collection = collections[op["data_type"]]
    block = collection.get(op["from"])
    if block is None:
        raise WorkerError(f"{op['data_type']} data block not found: {op['from']}")
    if collection.get(op["to"]) is not None:
        raise WorkerError(f"{op['data_type']} data block already exists: {op['to']}")
    block.name = op["to"]


_OPERATION_HANDLERS = {
    "set_shape_key_value": _apply_set_shape_key_value,
    "set_object_visibility": _apply_set_object_visibility,
    "set_object_transform": _apply_set_object_transform,
    "parent_object_to_bone": _apply_parent_object_to_bone,
    "set_custom_property": _apply_set_custom_property,
    "rename_data_block": _apply_rename_data_block,
}


def _apply_operations(operations: list[dict[str, Any]]) -> None:
    for index, op in enumerate(operations):
        op_type = op.get("type")
        handler = _OPERATION_HANDLERS.get(op_type)
        if handler is None:
            raise WorkerError(f"Unsupported operation at index {index}: {op_type}")
        print(f"[KHOSAN] operation {index + 1}/{len(operations)}: {op_type}")
        handler(op)


def _save_outputs(outputs: dict[str, Any], base: Path) -> tuple[Path, Path]:
    master = _resolve(outputs["master_blend"], base)
    runtime = _resolve(outputs["runtime_glb"], base)
    master.parent.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(master))
    bpy.ops.export_scene.gltf(
        filepath=str(runtime),
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_morph_animation=True,
        export_extras=True,
    )
    return master, runtime


def main() -> int:
    args = _parse_args()
    job_path = Path(args.job).expanduser().resolve()
    job = _load_job(job_path)
    base = job_path.parent

    source = _resolve(job["source"]["path"], base)
    if not source.exists():
        raise WorkerError(f"Source asset does not exist: {source}")

    print(f"[KHOSAN] loading {source}")
    _load_source(source)
    _apply_operations(list(job.get("operations", [])))
    master, runtime = _save_outputs(job["outputs"], base)
    print(f"[KHOSAN] master_blend={master}")
    print(f"[KHOSAN] runtime_glb={runtime}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except WorkerError as exc:
        print(f"[KHOSAN] ERROR: {exc}", file=sys.stderr)
        raise SystemExit(10)
