from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from job import JobValidationError, load_job


def _find_blender(explicit: str | None) -> str | None:
    if explicit:
        candidate = Path(explicit).expanduser()
        return str(candidate) if candidate.exists() else None

    env_value = os.environ.get("BLENDER_BIN")
    if env_value:
        candidate = Path(env_value).expanduser()
        if candidate.exists():
            return str(candidate)

    return shutil.which("blender")


def build_command(blender: str, worker: Path, job_path: Path) -> list[str]:
    return [
        blender,
        "--background",
        "--python",
        str(worker),
        "--",
        "--job",
        str(job_path),
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a KHOSAN Blender character edit job.")
    parser.add_argument("--job", required=True, help="Path to a character edit job JSON file.")
    parser.add_argument("--blender", help="Path to Blender executable. Defaults to BLENDER_BIN or PATH.")
    parser.add_argument("--dry-run", action="store_true", help="Validate the job and print the Blender command only.")
    parser.add_argument("--timeout", type=int, default=900, help="Maximum Blender runtime in seconds.")
    args = parser.parse_args()

    job_path = Path(args.job).expanduser().resolve()
    try:
        job = load_job(job_path)
    except (OSError, json.JSONDecodeError, JobValidationError) as exc:
        print(f"KHOSAN Blender job validation failed: {exc}", file=sys.stderr)
        return 2

    blender = _find_blender(args.blender)
    if not blender:
        print("Blender executable not found. Set BLENDER_BIN or pass --blender.", file=sys.stderr)
        return 3

    worker = Path(__file__).with_name("blender_worker.py").resolve()
    command = build_command(blender, worker, job_path)

    print(f"asset_id={job.asset_id}")
    print("command=" + " ".join(command))

    if args.dry_run:
        return 0

    try:
        completed = subprocess.run(command, check=False, timeout=args.timeout)
    except (OSError, subprocess.TimeoutExpired) as exc:
        print(f"Blender execution failed: {exc}", file=sys.stderr)
        return 4

    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
