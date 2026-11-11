"""KHOSAN Part 7: bounded, deterministic Differential Patch Lock.

This is a pure, local policy/geometry verifier for Z-up centimeter AABB
place_bounds_box scenes. It does not authenticate a remote caller, execute an
LLM, render geometry, sign evidence or install a Git hook. Integrate it behind
a separate, trusted agent-tool gateway and the existing signed evidence gate.
"""
from __future__ import annotations

from copy import deepcopy
from hashlib import sha256
import json
import math
import re
from typing import Any


class HardLockViolation(PermissionError):
    """A tool request violates an enforced geometry/phase contract."""


_ALLOWED_TOOLS: dict[str, frozenset[str]] = {
    "specified": frozenset({"lock_reference"}),
    "reference_locked": frozenset({"create_geometry"}),
    "geometry_built": frozenset({"run_geometry_linter", "patch_failing_layout_nodes"}),
    "geometry_verified": frozenset({"render_contact_sheet"}),
    "rendered": frozenset({"request_independent_visual_review"}),
    "independent_reviewed": frozenset({"request_human_approval"}),
    "human_accepted": frozenset(),
}
_NAME = re.compile(r"^[A-Za-z][A-Za-z0-9._-]{0,79}$")
_TOL_CM = 0.1
_MAX_NODES = 500
_MAX_PATCHES = 64
_MAX_ABS_CM = 1_000_000
_FIELDS = frozenset({"min_xyz_cm", "max_xyz_cm"})


def allowed_tools_for_stage(stage: str) -> tuple[str, ...]:
    """Only present these tools; the server MUST also enforce this allowlist."""
    if stage not in _ALLOWED_TOOLS:
        raise HardLockViolation(f"Unknown stage: {stage!r}")
    return tuple(sorted(_ALLOWED_TOOLS[stage]))


def assert_tool_allowed(stage: str, tool: str) -> None:
    if tool not in allowed_tools_for_stage(stage):
        raise HardLockViolation(f"Tool {tool!r} prohibited during {stage!r}")


def _digest(value: Any) -> str:
    try:
        raw = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise HardLockViolation("Non-JSON or nonfinite source state") from exc
    return sha256(raw.encode("utf-8")).hexdigest()


def _number(value: Any) -> bool:
    return type(value) in (int, float) and math.isfinite(value) and abs(value) <= _MAX_ABS_CM


def _overlap(a: dict, b: dict, axis: int) -> float:
    return min(a["max"][axis], b["max"][axis]) - max(a["min"][axis], b["min"][axis])


def _separation(a: dict, b: dict, axis: int) -> float:
    return max(0.0, a["min"][axis] - b["max"][axis], b["min"][axis] - a["max"][axis])


def _validated_nodes(state: dict[str, Any]) -> dict[str, dict[str, Any]]:
    coordinates = state.get("coordinate_system") if isinstance(state, dict) else None
    if (not isinstance(coordinates, dict)
        or coordinates.get("unit") != "cm" or coordinates.get("up_axis") != "+Z"
        or coordinates.get("forward_axis", "+Y") != "+Y"
        or not set(coordinates).issubset({"unit", "up_axis", "forward_axis"})):
        raise HardLockViolation("Only the +Z-up, +Y-forward, centimeter coordinate contract is supported")
    for extra in ("primitives", "anchors"):
        if state.get(extra):
            raise HardLockViolation(f"Unsupported {extra}: CSG/anchor geometry must be reviewed by a separate validator")
    raw = state.get("layout_nodes")
    if not isinstance(raw, list) or not 1 <= len(raw) <= _MAX_NODES:
        raise HardLockViolation("layout_nodes must contain 1..500 nodes")
    found: dict[str, dict[str, Any]] = {}
    for node in raw:
        if not isinstance(node, dict) or node.get("placement_mode") != "place_bounds_box":
            raise HardLockViolation("Only place_bounds_box is supported in this patch lock")
        name = node.get("instance_name")
        if not isinstance(name, str) or not _NAME.fullmatch(name) or name in found:
            raise HardLockViolation("Missing, duplicate, or unsafe instance_name")
        low, high = node.get("min_xyz_cm"), node.get("max_xyz_cm")
        if not all(isinstance(p, list) and len(p) == 3 and all(_number(c) for c in p) for p in (low, high)):
            raise HardLockViolation(f"Invalid or nonfinite bounds for {name}")
        if any(low[axis] >= high[axis] for axis in range(3)):
            raise HardLockViolation(f"Non-positive extent in {name}")
        ground = node.get("is_ground", False)
        if type(ground) is not bool:
            raise HardLockViolation(f"is_ground must be boolean for {name}")
        found[name] = {"min": low, "max": high, "ground": ground}
    return found


def _pairs(state: dict, name: str, nodes: dict) -> list[tuple[str, str]]:
    value = state.get(name, [])
    if not isinstance(value, list):
        raise HardLockViolation(f"{name} must be a list")
    seen = set()
    pairs = []
    for pair in value:
        if not isinstance(pair, list) or len(pair) != 2 or not all(isinstance(x, str) and x in nodes for x in pair) or pair[0] == pair[1]:
            raise HardLockViolation(f"Malformed {name} pair")
        key = tuple(sorted(pair))
        if key in seen:
            raise HardLockViolation(f"Duplicate {name} pair")
        seen.add(key)
        pairs.append(key)
    return pairs


def _diagnostics(state: dict) -> list[dict[str, Any]]:
    nodes = _validated_nodes(state)
    intentional = set(_pairs(state, "intentional_intersections", nodes))
    seams = _pairs(state, "expected_adjacent_seams", nodes)
    diagnostics = []
    for name, box in nodes.items():
        if box["ground"] or box["min"][2] <= _TOL_CM:
            continue
        supported = any(
            bname != name
            and abs(other["max"][2] - box["min"][2]) <= _TOL_CM
            and _overlap(box, other, 0) > 0
            and _overlap(box, other, 1) > 0
            for bname, other in nodes.items()
        )
        if not supported:
            diagnostics.append({"code": "FLOATING", "involved_nodes": [name], "axes": [2], "severity_cm": box["min"][2]})
    keys = list(nodes)
    for i, first in enumerate(keys):
        for second in keys[i + 1:]:
            pair = tuple(sorted((first, second)))
            if pair in intentional:
                continue
            a, b = nodes[first], nodes[second]
            intersects = [_overlap(a, b, axis) for axis in range(3)]
            if all(v > _TOL_CM for v in intersects):
                axis = min(range(3), key=lambda idx: intersects[idx])
                diagnostics.append({"code": "PIERCING", "involved_nodes": list(pair), "axes": [axis], "severity_cm": intersects[axis]})
    for first, second in seams:
        a, b = nodes[first], nodes[second]
        gaps = [_separation(a, b, axis) for axis in range(3)]
        distance = math.hypot(*gaps)
        if distance > _TOL_CM:
            diagnostics.append({"code": "SEAM_GAP", "involved_nodes": [first, second], "axes": [axis for axis in range(3) if gaps[axis] > 0], "severity_cm": distance})
    diagnostics.sort(key=lambda d: (d["code"], d["involved_nodes"], d["axes"]))
    return diagnostics


def _diagnostic_key(item: dict) -> tuple:
    return (item["code"], tuple(item["involved_nodes"]), tuple(item["axes"]))


class DifferentialPatchLockEnforcer:
    """Verifies scoped atomic coordinate edits; makes no change to disk or repo."""

    def __init__(self, ugir_state: dict[str, Any]):
        self._state = deepcopy(ugir_state)
        _validated_nodes(self._state)
        self._scope: dict[str, Any] | None = None

    @property
    def ugir_state(self) -> dict[str, Any]:
        return deepcopy(self._state)

    def lock_passing_nodes(self, lint_report: dict | None = None) -> dict[str, Any]:
        """Regenerate the repair scope from measured geometry; never trust AI IDs."""
        diagnostics = _diagnostics(self._state)
        if not diagnostics:
            raise HardLockViolation("No measurable failed geometry; cannot issue a repair scope")
        source_sha256 = _digest(self._state)
        if lint_report is not None:
            if not isinstance(lint_report, dict) or lint_report.get("source_sha256") != source_sha256 or lint_report.get("diagnostics") != diagnostics:
                raise HardLockViolation("External lint report does not match recomputed source and defects")
        allowed: dict[str, set[int]] = {}
        for item in diagnostics:
            for name in item["involved_nodes"]:
                allowed.setdefault(name, set()).update(item["axes"])
        nodes = _validated_nodes(self._state)
        scope = {
            "schema": "khosan.3d.repair-window.v1",
            "source_sha256": source_sha256,
            "editable_axes": {name: sorted(axes) for name, axes in sorted(allowed.items())},
            "frozen_sha256": {name: _digest(node) for name, node in sorted(zip((n["instance_name"] for n in self._state["layout_nodes"]), self._state["layout_nodes"])) if name not in allowed},
            "diagnostics": diagnostics,
        }
        # Return a copy and retain a trusted copy inside this controller instance.
        self._scope = deepcopy(scope)
        return deepcopy(scope)

    def get_allowed_tool_schema_for_repair(self) -> dict[str, Any]:
        if self._scope is None:
            raise HardLockViolation("Run geometry linter and lock_passing_nodes first")
        return {
            "type": "function",
            "name": "patch_failing_layout_nodes",
            "description": "Modify ONLY authorized failed coordinate axes; external harness must revalidate every call.",
            "strict": True,
            "parameters": {
                "type": "object",
                "additionalProperties": False,
                "required": ["base_sha256", "patches"],
                "properties": {
                    "base_sha256": {"type": "string", "enum": [self._scope["source_sha256"]]},
                    "patches": {"type": "array", "items": {
                        "type": "object", "additionalProperties": False,
                        "required": ["instance_name", "field", "axis", "value"],
                        "properties": {
                            "instance_name": {"type": "string", "enum": sorted(self._scope["editable_axes"])},
                            "field": {"type": "string", "enum": sorted(_FIELDS)},
                            "axis": {"type": "integer", "enum": [0, 1, 2]},
                            "value": {"type": "number"},
                        },
                    }},
                },
            },
        }

    def apply_verified_patch(self, ai_patch_payload: dict[str, Any]) -> dict[str, Any]:
        """Atomic, fail-closed change; returns result and resets scope after success."""
        if self._scope is None:
            raise HardLockViolation("No active measured repair scope")
        current_hash = _digest(self._state)
        if current_hash != self._scope["source_sha256"]:
            raise HardLockViolation("Stale repair scope: source revision changed")
        if not isinstance(ai_patch_payload, dict) or set(ai_patch_payload) != {"base_sha256", "patches"}:
            raise HardLockViolation("Only base_sha256 + patches are allowed")
        if ai_patch_payload["base_sha256"] != current_hash:
            raise HardLockViolation("Patch references stale or forged source revision")
        patches = ai_patch_payload.get("patches")
        if not isinstance(patches, list) or not 1 <= len(patches) <= _MAX_PATCHES:
            raise HardLockViolation("Patch list must contain 1..64 atomic edits")
        old_diagnostics = _diagnostics(self._state)
        if old_diagnostics != self._scope["diagnostics"]:
            raise HardLockViolation("Repair scope invalidated by new geometry evidence")
        updated = deepcopy(self._state)
        nodes = {node["instance_name"]: node for node in updated["layout_nodes"]}
        seen = set()
        for patch in patches:
            if not isinstance(patch, dict) or set(patch) != {"instance_name", "field", "axis", "value"}:
                raise HardLockViolation("Only atomic coordinate patches may be applied")
            name, field, axis, value = (patch[k] for k in ("instance_name", "field", "axis", "value"))
            if name not in self._scope["editable_axes"]:
                raise HardLockViolation(f"Frozen or unknown node: {name}")
            if field not in _FIELDS or type(axis) is not int or axis not in self._scope["editable_axes"][name] or not _number(value):
                raise HardLockViolation(f"Unauthorized field/axis or invalid value for {name}")
            unique = (name, field, axis)
            if unique in seen:
                raise HardLockViolation("Duplicate coordinate edit")
            seen.add(unique)
            original_value = nodes[name][field][axis]
            if original_value == value:
                raise HardLockViolation("No-op edit is not an actual repair")
            nodes[name][field][axis] = value
        _validated_nodes(updated)
        frozen = self._scope["frozen_sha256"]
        for node in updated["layout_nodes"]:
            name = node["instance_name"]
            if name in frozen and _digest(node) != frozen[name]:
                raise HardLockViolation(f"Frozen node regression: {name}")
        new_diagnostics = _diagnostics(updated)
        prior = {_diagnostic_key(x): x for x in old_diagnostics}
        for item in new_diagnostics:
            key = _diagnostic_key(item)
            if key not in prior:
                raise HardLockViolation(f"New defect/regression: {item['code']} {item['involved_nodes']}")
            if item["severity_cm"] > prior[key]["severity_cm"] + 1e-9:
                raise HardLockViolation(f"Worsened defect: {item['code']} {item['involved_nodes']}")
        before = sum(x["severity_cm"] for x in old_diagnostics)
        after = sum(x["severity_cm"] for x in new_diagnostics)
        if after >= before - 1e-9:
            raise HardLockViolation("No measurable repair progress")
        self._state = updated
        self._scope = None
        return {"source_sha256": current_hash, "patched_sha256": _digest(updated),
                "issues_before": len(old_diagnostics), "issues_after": len(new_diagnostics),
                "complete": len(new_diagnostics) == 0, "state": deepcopy(updated)}