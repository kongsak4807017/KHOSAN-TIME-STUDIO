from __future__ import annotations
import argparse
import json
import subprocess
from common import EXTERNAL, python_for, tool_dir, which

def check_python(py: str):
    try:
        p = subprocess.run([py, "-c", "import sys; print(sys.version.split()[0])"], capture_output=True, text=True, timeout=10)
        return p.returncode == 0, p.stdout.strip() or p.stderr.strip()
    except Exception as exc:
        return False, str(exc)

def check_import(py: str, module: str):
    try:
        p = subprocess.run([py, "-c", f"import {module}; print('ok')"], capture_output=True, text=True, timeout=30)
        return p.returncode == 0, p.stdout.strip() or p.stderr.strip()
    except Exception as exc:
        return False, str(exc)

def gpu():
    exe = which("nvidia-smi")
    if not exe:
        return {"ok": False, "detail": "nvidia-smi not found"}
    try:
        p = subprocess.run([exe, "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"], capture_output=True, text=True, timeout=10)
        return {"ok": p.returncode == 0, "detail": p.stdout.strip() or p.stderr.strip()}
    except Exception as exc:
        return {"ok": False, "detail": str(exc)}

def engine(name: str):
    directory = tool_dir(name)
    py = python_for(name)
    py_ok, py_detail = check_python(py)
    torch_ok, torch_detail = check_import(py, "torch") if py_ok else (False, "python unavailable")
    bpy_ok, bpy_detail = check_import(py, "bpy") if py_ok else (False, "python unavailable")
    result = {
        "path": str(directory),
        "repo_present": directory.exists(),
        "python": py,
        "python_ok": py_ok,
        "python_detail": py_detail,
        "torch": torch_ok,
        "torch_detail": torch_detail,
        "bpy": bpy_ok,
        "bpy_detail": bpy_detail,
    }
    if name == "skintokens":
        ckpt = directory / "experiments/articulation_xl_quantization_256_token_4/grpo_1400.ckpt"
        result["checkpoint_present"] = ckpt.exists()
        result["ready"] = all([directory.exists(), py_ok, torch_ok, bpy_ok, ckpt.exists()])
    else:
        result["bash_present"] = which("bash") is not None
        result["ready"] = all([directory.exists(), py_ok, torch_ok, bpy_ok, result["bash_present"]])
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = {"external_root": str(EXTERNAL), "gpu": gpu(), "engines": {"skintokens": engine("skintokens"), "unirig": engine("unirig")}}
    report["ready"] = any(v["ready"] for v in report["engines"].values())
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("[KHOSAN RIGGING DOCTOR]", "READY" if report["ready"] else "BLOCKED")
        print(json.dumps(report, indent=2))
    return 0 if report["ready"] else 2

if __name__ == "__main__":
    raise SystemExit(main())
