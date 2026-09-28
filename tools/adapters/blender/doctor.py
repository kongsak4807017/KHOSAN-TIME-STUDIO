from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional


@dataclass
class DoctorResult:
    ok: bool
    blender: Optional[str]
    version: Optional[str]
    version_tuple: Optional[tuple[int, int, int]]
    meets_minimum: Optional[bool]
    notes: list[str]


def _find_blender(explicit: Optional[str]) -> Optional[str]:
    if explicit:
        candidate = Path(explicit).expanduser()
        if candidate.exists():
            return str(candidate)
        return None

    env_value = os.environ.get("BLENDER_BIN")
    if env_value:
        candidate = Path(env_value).expanduser()
        if candidate.exists():
            return str(candidate)

    return shutil.which("blender")


def _parse_version(text: str) -> Optional[tuple[int, int, int]]:
    match = re.search(r"Blender\s+(\d+)\.(\d+)(?:\.(\d+))?", text)
    if not match:
        return None
    return (
        int(match.group(1)),
        int(match.group(2)),
        int(match.group(3) or 0),
    )


def inspect_blender(blender: Optional[str], minimum: tuple[int, int, int]) -> DoctorResult:
    notes: list[str] = []
    executable = _find_blender(blender)
    if not executable:
        return DoctorResult(
            ok=False,
            blender=None,
            version=None,
            version_tuple=None,
            meets_minimum=None,
            notes=["Blender executable was not found. Set BLENDER_BIN or pass --blender."],
        )

    try:
        completed = subprocess.run(
            [executable, "--version"],
            check=False,
            capture_output=True,
            text=True,
            timeout=20,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return DoctorResult(
            ok=False,
            blender=executable,
            version=None,
            version_tuple=None,
            meets_minimum=None,
            notes=[f"Failed to execute Blender: {exc}"],
        )

    combined = "\n".join(part for part in [completed.stdout, completed.stderr] if part).strip()
    parsed = _parse_version(combined)
    if completed.returncode != 0:
        notes.append(f"Blender --version exited with code {completed.returncode}.")
    if parsed is None:
        notes.append("Could not parse Blender version.")
        meets = None
    else:
        meets = parsed >= minimum
        if not meets:
            notes.append(
                f"Blender {parsed[0]}.{parsed[1]}.{parsed[2]} is older than "
                f"the configured minimum {minimum[0]}.{minimum[1]}.{minimum[2]}."
            )

    ok = completed.returncode == 0 and parsed is not None and bool(meets)
    first_line = combined.splitlines()[0] if combined else None
    return DoctorResult(
        ok=ok,
        blender=executable,
        version=first_line,
        version_tuple=parsed,
        meets_minimum=meets,
        notes=notes,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Blender availability for KHOSAN Asset Lab.")
    parser.add_argument("--blender", help="Explicit path to Blender executable.")
    parser.add_argument("--min-major", type=int, default=4)
    parser.add_argument("--min-minor", type=int, default=2)
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = parser.parse_args()

    result = inspect_blender(args.blender, (args.min_major, args.min_minor, 0))
    payload = asdict(result)
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print("KHOSAN Blender doctor")
        print(f"  ok: {result.ok}")
        print(f"  blender: {result.blender or 'not found'}")
        print(f"  version: {result.version or 'unknown'}")
        for note in result.notes:
            print(f"  note: {note}")

    return 0 if result.ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
