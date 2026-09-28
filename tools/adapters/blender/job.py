from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1

ALLOWED_OPERATION_TYPES = {
    "set_shape_key_value",
    "set_object_visibility",
    "set_object_transform",
    "parent_object_to_bone",
    "set_custom_property",
    "rename_data_block",
}

_REQUIRED_TOP_LEVEL = {
    "schema_version",
    "asset_id",
    "source",
    "outputs",
    "operations",
}


class JobValidationError(ValueError):
    pass


@dataclass(frozen=True)
class CharacterEditJob:
    data: dict[str, Any]

    @property
    def asset_id(self) -> str:
        return str(self.data["asset_id"])

    @property
    def source_path(self) -> Path:
        return Path(self.data["source"]["path"]).expanduser()

    @property
    def master_blend_path(self) -> Path:
        return Path(self.data["outputs"]["master_blend"]).expanduser()

    @property
    def runtime_glb_path(self) -> Path:
        return Path(self.data["outputs"]["runtime_glb"]).expanduser()

    @property
    def operations(self) -> list[dict[str, Any]]:
        return list(self.data["operations"])


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise JobValidationError(message)


def _require_name(value: Any, field: str) -> str:
    _require(isinstance(value, str) and value.strip() != "", f"{field} must be a non-empty string")
    return value


def _validate_vec3(value: Any, field: str) -> None:
    _require(isinstance(value, list) and len(value) == 3, f"{field} must be a 3-element array")
    _require(all(isinstance(item, (int, float)) for item in value), f"{field} must contain only numbers")


def _validate_operation(index: int, op: Any) -> None:
    prefix = f"operations[{index}]"
    _require(isinstance(op, dict), f"{prefix} must be an object")
    op_type = _require_name(op.get("type"), f"{prefix}.type")
    _require(op_type in ALLOWED_OPERATION_TYPES, f"{prefix}.type is not allowed: {op_type}")

    if op_type == "set_shape_key_value":
        _require_name(op.get("object"), f"{prefix}.object")
        _require_name(op.get("key"), f"{prefix}.key")
        value = op.get("value")
        _require(isinstance(value, (int, float)), f"{prefix}.value must be numeric")
        _require(0.0 <= float(value) <= 1.0, f"{prefix}.value must be in [0, 1]")

    elif op_type == "set_object_visibility":
        _require_name(op.get("object"), f"{prefix}.object")
        _require(isinstance(op.get("visible"), bool), f"{prefix}.visible must be boolean")

    elif op_type == "set_object_transform":
        _require_name(op.get("object"), f"{prefix}.object")
        present = False
        for field in ("location", "rotation_euler_degrees", "scale"):
            if field in op:
                _validate_vec3(op[field], f"{prefix}.{field}")
                present = True
        _require(present, f"{prefix} must include location, rotation_euler_degrees, or scale")

    elif op_type == "parent_object_to_bone":
        _require_name(op.get("object"), f"{prefix}.object")
        _require_name(op.get("armature"), f"{prefix}.armature")
        _require_name(op.get("bone"), f"{prefix}.bone")
        if "keep_world" in op:
            _require(isinstance(op["keep_world"], bool), f"{prefix}.keep_world must be boolean")

    elif op_type == "set_custom_property":
        _require(op.get("target_type") in {"object", "bone"}, f"{prefix}.target_type must be object or bone")
        _require_name(op.get("target"), f"{prefix}.target")
        if op.get("target_type") == "bone":
            _require_name(op.get("armature"), f"{prefix}.armature")
        _require_name(op.get("property"), f"{prefix}.property")
        _require("value" in op, f"{prefix}.value is required")

    elif op_type == "rename_data_block":
        _require(op.get("data_type") in {"object", "mesh", "armature", "material"}, f"{prefix}.data_type is invalid")
        _require_name(op.get("from"), f"{prefix}.from")
        _require_name(op.get("to"), f"{prefix}.to")


def validate_job_dict(data: Any) -> CharacterEditJob:
    _require(isinstance(data, dict), "job must be a JSON object")
    missing = sorted(_REQUIRED_TOP_LEVEL.difference(data))
    _require(not missing, f"missing required fields: {', '.join(missing)}")
    _require(data["schema_version"] == SCHEMA_VERSION, f"schema_version must equal {SCHEMA_VERSION}")
    _require_name(data["asset_id"], "asset_id")

    source = data["source"]
    _require(isinstance(source, dict), "source must be an object")
    source_path = _require_name(source.get("path"), "source.path")
    _require(Path(source_path).suffix.lower() in {".blend", ".glb", ".gltf"}, "source.path must be .blend, .glb, or .gltf")

    outputs = data["outputs"]
    _require(isinstance(outputs, dict), "outputs must be an object")
    master = _require_name(outputs.get("master_blend"), "outputs.master_blend")
    runtime = _require_name(outputs.get("runtime_glb"), "outputs.runtime_glb")
    _require(Path(master).suffix.lower() == ".blend", "outputs.master_blend must end in .blend")
    _require(Path(runtime).suffix.lower() == ".glb", "outputs.runtime_glb must end in .glb")

    operations = data["operations"]
    _require(isinstance(operations, list), "operations must be an array")
    for index, op in enumerate(operations):
        _validate_operation(index, op)

    preserve = data.get("preserve", [])
    _require(isinstance(preserve, list), "preserve must be an array when present")
    _require(all(isinstance(item, str) and item for item in preserve), "preserve entries must be non-empty strings")

    return CharacterEditJob(data=data)


def load_job(path: str | Path) -> CharacterEditJob:
    job_path = Path(path).expanduser()
    with job_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return validate_job_dict(data)
