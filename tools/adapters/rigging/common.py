from __future__ import annotations
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EXTERNAL = Path(os.environ.get("KHOSAN_EXTERNAL_DIR", ROOT / "external")).resolve()

def python_for(tool: str) -> str:
    env = os.environ.get(f"KHOSAN_{tool.upper()}_PYTHON")
    if env:
        return env
    base = EXTERNAL / ("SkinTokens" if tool == "skintokens" else "UniRig")
    candidates = [base / ".venv" / "Scripts" / "python.exe", base / ".venv" / "bin" / "python"]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return sys.executable

def tool_dir(tool: str) -> Path:
    return EXTERNAL / ("SkinTokens" if tool == "skintokens" else "UniRig")

def which(name: str):
    return shutil.which(name)

def run(cmd, cwd=None, dry_run=False):
    printable = subprocess.list2cmdline([str(x) for x in cmd])
    if dry_run:
        return {"command": printable, "returncode": None}
    process = subprocess.run([str(x) for x in cmd], cwd=str(cwd) if cwd else None)
    return {"command": printable, "returncode": process.returncode}
