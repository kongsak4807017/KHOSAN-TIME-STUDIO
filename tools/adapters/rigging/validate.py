from __future__ import annotations
import argparse
import json
import struct
from pathlib import Path

def validate(path: Path):
    result = {"path": str(path), "exists": path.exists(), "size_bytes": 0, "format": path.suffix.lower(), "checks": []}
    if not path.exists():
        return result
    result["size_bytes"] = path.stat().st_size
    result["checks"].append({"name": "non_empty", "pass": result["size_bytes"] > 64})
    if path.suffix.lower() == ".glb":
        with path.open("rb") as handle:
            head = handle.read(12)
        magic = head[:4] if len(head) >= 4 else b""
        result["checks"].append({"name": "glb_magic", "pass": magic == b"glTF"})
        if len(head) >= 12:
            version = struct.unpack("<I", head[4:8])[0]
            declared = struct.unpack("<I", head[8:12])[0]
            result["glb_version"] = version
            result["declared_length"] = declared
            result["checks"].append({"name": "declared_length_matches", "pass": declared == result["size_bytes"]})
    result["pass"] = bool(result["checks"]) and all(check["pass"] for check in result["checks"])
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    args = parser.parse_args()
    result = validate(Path(args.input).resolve())
    print(json.dumps(result, indent=2))
    return 0 if result.get("pass") else 2

if __name__ == "__main__":
    raise SystemExit(main())
