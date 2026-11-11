"""Strict, versioned local scene contract. No eval, implicit engine fallback, or network."""
from __future__ import annotations

import hashlib
import json
import math
import re

SCHEMA = "khosan.scene/1.0"
MAX_SOURCE_BYTES = 131072
RECIPES = {
    "amphora": {"height": (1.15, .2, 5), "radius": (.34, .06, 2)},
    "table": {"width": (1.8, .3, 8), "depth": (.8, .3, 5), "height": (.85, .2, 3)},
    "column": {"height": (1.7, .3, 8), "radius": (.22, .08, 2)},
    "rock": {"radius": (.18, .05, 2)},
    "terrain": {"width": (7, 1, 40), "depth": (5, 1, 40), "relief": (.035, 0, 2)},
    "elephant": {"height": (3.0, 1.5, 4.5), "body_length": (3.9, 2.8, 5.5), "ear_size": (1.0, .75, 1.3), "tusk_length": (.72, .25, 1.3), "skin_detail": (1.0, 0, 1)},
}
IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_-]{0,63}$")


class SceneError(ValueError):
    def __init__(self, code, path, message):
        self.diagnostic = {"code": code, "path": path, "severity": "error", "message": message}
        super().__init__(f"{path}: {message}")


def fail(path, message, code="INVALID_SCENE"):
    raise SceneError(code, path, message)


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def obj(value, path, allowed, required=()):
    if not isinstance(value, dict):
        fail(path, "Expected an object.")
    unknown = set(value) - set(allowed)
    missing = set(required) - set(value)
    if unknown:
        fail(path, f"Unsupported fields: {', '.join(sorted(unknown))}.", "UNSUPPORTED_FEATURE")
    if missing:
        fail(path, f"Required fields missing: {', '.join(sorted(missing))}.")
    return value


def number(value, path, minimum, maximum, integer=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        fail(path, "Expected a finite number.")
    if integer and not isinstance(value, int):
        fail(path, "Expected an integer.")
    if not minimum <= value <= maximum:
        fail(path, f"Must be between {minimum} and {maximum}.")
    return value


def vector(value, path, low=-500, high=500):
    if not isinstance(value, list) or len(value) != 3:
        fail(path, "Expected exactly three coordinates.")
    return [number(v, f"{path}[{i}]", low, high) for i, v in enumerate(value)]


def identifier(value, path):
    if not isinstance(value, str) or not IDENTIFIER.fullmatch(value):
        fail(path, "Use 1–64 letters, digits, hyphens or underscores, beginning with a letter/underscore.")
    return value


def normalize_scene(raw):
    obj(raw, "$", ("schema", "scene_id", "seed", "units", "up_axis", "materials", "objects", "camera", "render", "budget", "provenance", "lighting"), ("schema", "scene_id", "materials", "objects", "camera"))
    if raw["schema"] != SCHEMA:
        fail("schema", f"Only {SCHEMA} is supported.", "UNSUPPORTED_SCHEMA")
    if raw.get("units", "m") != "m" or raw.get("up_axis", "Y") != "Y":
        fail("coordinates", "This version accepts meters and Y-up only; convert explicitly.", "UNSUPPORTED_COORDINATES")
    out = {"schema": SCHEMA, "scene_id": identifier(raw["scene_id"], "scene_id"), "seed": number(raw.get("seed", 1), "seed", 0, 2**31-1, True), "units": "m", "up_axis": "Y"}
    materials = raw["materials"]
    if not isinstance(materials, list) or not 1 <= len(materials) <= 32:
        fail("materials", "Provide 1–32 materials.")
    ids = set()
    out["materials"] = []
    for i, mat in enumerate(materials):
        p = f"materials[{i}]"
        obj(mat, p, ("id", "base_color", "roughness", "metallic"), ("id", "base_color"))
        mid = identifier(mat["id"], p+".id")
        if mid in ids:
            fail(p+".id", "Duplicate material ID.", "DUPLICATE_ID")
        ids.add(mid)
        color = mat["base_color"]
        if not isinstance(color, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
            fail(p+".base_color", "Expected #RRGGBB.")
        out["materials"].append({"id": mid, "base_color": color.upper(), "roughness": number(mat.get("roughness", .7), p+".roughness", 0, 1), "metallic": number(mat.get("metallic", 0), p+".metallic", 0, 1)})
    objects = raw["objects"]
    if not isinstance(objects, list) or not 1 <= len(objects) <= 64:
        fail("objects", "Provide 1–64 objects.")
    object_ids = set()
    out["objects"] = []
    for i, item in enumerate(objects):
        p = f"objects[{i}]"
        obj(item, p, ("id", "recipe", "material", "position", "rotation", "scale", "parameters"), ("id", "recipe", "material"))
        oid = identifier(item["id"], p+".id")
        if oid in object_ids:
            fail(p+".id", "Duplicate object ID.", "DUPLICATE_ID")
        object_ids.add(oid)
        recipe = item["recipe"]
        if not isinstance(recipe, str) or recipe not in RECIPES:
            fail(p+".recipe", f"Supported static recipes: {', '.join(RECIPES)}. Arbitrary meshes, rigging, animation and physics are not implemented.", "UNSUPPORTED_RECIPE")
        if not isinstance(item["material"], str) or item["material"] not in ids:
            fail(p+".material", "Material ID does not exist.", "MISSING_REFERENCE")
        params = obj(item.get("parameters", {}), p+".parameters", RECIPES[recipe])
        params = {key: number(params.get(key, default), p+".parameters."+key, lo, hi) for key, (default, lo, hi) in RECIPES[recipe].items()}
        out["objects"].append({"id": oid, "recipe": recipe, "material": item["material"], "position": vector(item.get("position", [0, 0, 0]), p+".position"), "rotation": vector(item.get("rotation", [0, 0, 0]), p+".rotation", -360, 360), "scale": vector(item.get("scale", [1, 1, 1]), p+".scale", .01, 20), "parameters": params})
    cam = obj(raw["camera"], "camera", ("position", "target", "lens_mm"), ("position", "target"))
    out["camera"] = {"position": vector(cam["position"], "camera.position"), "target": vector(cam["target"], "camera.target"), "lens_mm": number(cam.get("lens_mm", 50), "camera.lens_mm", 18, 120)}
    if sum((a-b)**2 for a, b in zip(out["camera"]["position"], out["camera"]["target"])) < .01:
        fail("camera", "Camera and target must be at least 0.1 m apart.")
    render = obj(raw.get("render", {}), "render", ("width", "height", "samples"))
    out["render"] = {"width": number(render.get("width", 960), "render.width", 128, 1920, True), "height": number(render.get("height", 540), "render.height", 128, 1920, True), "samples": number(render.get("samples", 32), "render.samples", 8, 64, True)}
    if out["render"]["width"] * out["render"]["height"] > 2073600:
        fail("render", "Proof images are limited to 2,073,600 pixels.")
    if "lighting" in raw:
        lighting = obj(raw["lighting"], "lighting", ("preset",), ("preset",))
        if lighting["preset"] not in ("storybook", "elephant_studio"):
            fail("lighting.preset", "Supported presets: storybook, elephant_studio.", "UNSUPPORTED_LIGHTING")
        out["lighting"] = {"preset": lighting["preset"]}
    budget = obj(raw.get("budget", {}), "budget", ("max_triangles", "max_objects"))
    out["budget"] = {"max_triangles": number(budget.get("max_triangles", 150000), "budget.max_triangles", 1, 1000000, True), "max_objects": number(budget.get("max_objects", 300), "budget.max_objects", 1, 1000, True)}
    prov = obj(raw.get("provenance", {}), "provenance", ("description", "reference_paths", "known_unknowns"))
    description = prov.get("description", "Authored procedural scene; reference likeness has not been evaluated.")
    if not isinstance(description, str) or len(description) > 2000:
        fail("provenance.description", "Expected at most 2000 characters.")
    unknowns = prov.get("known_unknowns", ["Reference likeness, character animation and physical simulation are not evaluated."])
    if not isinstance(unknowns, list) or len(unknowns) > 20 or any(not isinstance(v, str) or len(v) > 1000 for v in unknowns):
        fail("provenance.known_unknowns", "Expected up to 20 short text entries.")
    refs = prov.get("reference_paths", [])
    if not isinstance(refs, list) or len(refs) > 8 or any(not isinstance(v, str) or not v or len(v) > 250 for v in refs):
        fail("provenance.reference_paths", "Expected up to 8 relative local paths.")
    out["provenance"] = {"description": description, "reference_paths": refs, "known_unknowns": unknowns}
    return out


TOKEN = re.compile(r'(?P<space>\s+|//[^\n]*|\#[^\n]*)|(?P<string>"(?:[^"\\]|\\.)*")|(?P<number>-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)|(?P<id>[A-Za-z_][A-Za-z0-9_-]*)|(?P<symbol>[{}=(),;\[\]])')


class Parser:
    """Small KHOSAN Weave dialect, deliberately not an Oriverse interpreter."""
    def __init__(self, source):
        self.tokens = []
        cursor = 0
        while cursor < len(source):
            match = TOKEN.match(source, cursor)
            if match is None:
                fail(f"source[{cursor}]", "Unsupported token.", "PARSE_ERROR")
            if match.lastgroup != "space":
                self.tokens.append((match.lastgroup, match.group(), cursor))
                if len(self.tokens) > 20000:
                    fail("source", "Token budget exceeded.", "SOURCE_LIMIT")
            cursor = match.end()
        self.i = 0

    def peek(self):
        return self.tokens[self.i][1] if self.i < len(self.tokens) else None

    def pop(self, expected=None):
        if self.i >= len(self.tokens):
            fail("source", f"Unexpected end; expected {expected or 'token'}.", "PARSE_ERROR")
        token = self.tokens[self.i]
        self.i += 1
        if expected is not None and token[1] != expected:
            fail(f"source[{token[2]}]", f"Expected {expected}.", "PARSE_ERROR")
        return token

    def value(self, depth=0):
        if depth > 10:
            fail("source", "Array nesting limit exceeded.", "SOURCE_LIMIT")
        kind, value, pos = self.pop()
        if kind == "string":
            try:
                return json.loads(value)
            except ValueError:
                fail(f"source[{pos}]", "Invalid string escape.", "PARSE_ERROR")
        if kind == "number":
            return float(value) if any(c in value for c in ".eE") else int(value)
        if value in ("true", "false"):
            return value == "true"
        if value in ("(", "["):
            end = ")" if value == "(" else "]"
            result = []
            if self.peek() != end:
                while True:
                    result.append(self.value(depth+1))
                    if self.peek() != ",":
                        break
                    self.pop(",")
            self.pop(end)
            return result
        fail(f"source[{pos}]", "Values must be quoted text, numbers, booleans or lists.", "PARSE_ERROR")

    def block(self, depth=0):
        if depth > 8:
            fail("source", "Block nesting limit exceeded.", "SOURCE_LIMIT")
        kind, name, pos = self.pop()
        if kind != "id":
            fail(f"source[{pos}]", "Expected block type.", "PARSE_ERROR")
        node = {"kind": name, "name": None, "props": {}, "children": []}
        if self.peek() != "{":
            k, v, p = self.pop()
            if k not in ("string", "id"):
                fail(f"source[{p}]", "Expected block name.", "PARSE_ERROR")
            node["name"] = json.loads(v) if k == "string" else v
        self.pop("{")
        while self.peek() != "}":
            if self.peek() is None:
                fail("source", "Unclosed block.", "PARSE_ERROR")
            if self.peek() == ";":
                self.pop()
                continue
            if self.i + 1 < len(self.tokens) and self.tokens[self.i+1][1] == "=":
                k, key, p = self.pop()
                if k != "id" or key in node["props"]:
                    fail(f"source[{p}]", "Invalid or duplicate property.", "PARSE_ERROR")
                self.pop("=")
                node["props"][key] = self.value()
            else:
                node["children"].append(self.block(depth+1))
        self.pop("}")
        return node

    def parse(self):
        node = self.block()
        if self.peek() is not None:
            fail("source", "Exactly one scene block is allowed.", "PARSE_ERROR")
        if node["kind"] != "scene" or node["name"] is None:
            fail("source", "Expected scene <id> { ... }.", "PARSE_ERROR")
        obj(node["props"], "scene properties", ("seed", "units", "up_axis"))
        raw = {"schema": SCHEMA, "scene_id": node["name"], **node["props"]}
        if "schema" in node["props"] or "scene_id" in node["props"]:
            fail("source", "Scene name/schema cannot be overridden.", "PARSE_ERROR")
        raw["materials"], raw["objects"] = [], []
        seen = set()
        for child in node["children"]:
            kind, name = child["kind"], child["name"]
            props = dict(child["props"])
            if kind in ("material", "object"):
                if name is None or "id" in props:
                    fail(kind, "A block name is required and id cannot be overridden.", "PARSE_ERROR")
                props["id"] = name
                if kind == "material" and child["children"]:
                    fail(kind, "Nested material blocks are unsupported.", "UNSUPPORTED_FEATURE")
                if kind == "object":
                    for param in child["children"]:
                        if param["kind"] != "parameters" or param["name"] is not None or param["children"] or "parameters" in props:
                            fail(kind, "Only one parameters { ... } block is supported.", "UNSUPPORTED_FEATURE")
                        props["parameters"] = param["props"]
                raw["materials" if kind == "material" else "objects"].append(props)
            elif kind in ("camera", "render", "budget", "provenance", "lighting"):
                if kind in seen or kind in raw or name is not None or child["children"]:
                    fail(kind, "Expected one unnamed, flat block.", "PARSE_ERROR")
                seen.add(kind)
                raw[kind] = props
            else:
                fail(kind, "Block type is not implemented; no fallback will be substituted.", "UNSUPPORTED_FEATURE")
        return raw


def parse_source(source, source_format="weave"):
    if not isinstance(source, str) or not source.strip():
        fail("source", "Non-empty source text is required.")
    if len(source.encode("utf-8")) > MAX_SOURCE_BYTES:
        fail("source", "Source exceeds 128 KiB.", "SOURCE_LIMIT")
    if source_format == "weave":
        raw = Parser(source).parse()
    elif source_format == "json":
        def pairs(items):
            result = {}
            for k, v in items:
                if k in result:
                    fail(k, "Duplicate JSON property.", "DUPLICATE_KEY")
                result[k] = v
            return result
        def constant(value):
            fail("source", f"Invalid JSON numeric constant {value}.")
        try:
            raw = json.loads(source, object_pairs_hook=pairs, parse_constant=constant)
        except (json.JSONDecodeError, RecursionError) as exc:
            fail("source", f"Invalid JSON: {exc}.", "PARSE_ERROR")
    else:
        fail("format", "Choose weave or json.", "UNSUPPORTED_FORMAT")
    return normalize_scene(raw)
