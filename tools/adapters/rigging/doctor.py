from __future__ import annotations
import argparse
import json
import re
import subprocess
from common import EXTERNAL, python_for, tool_dir, which

SKINTOKENS_MIN_VRAM_MB = 14 * 1024

def run_probe(cmd, timeout=30):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode == 0, p.stdout.strip() or p.stderr.strip()
    except Exception as exc:
        return False, str(exc)

def check_python(py: str):
    return run_probe([py, "-c", "import sys; print(sys.version.split()[0])"], 10)

def check_import(py: str, module: str):
    return run_probe([py, "-c", f"import {module}; print('ok')"], 30)

def check_torch_cuda(py: str):
    code = "import json,torch; print(json.dumps({'cuda':torch.cuda.is_available(),'torch_cuda':torch.version.cuda,'devices':torch.cuda.device_count()}))"
    ok, detail = run_probe([py, "-c", code], 30)
    parsed = {}
    if ok:
        try:
            parsed = json.loads(detail.splitlines()[-1])
        except Exception:
            pass
    return ok and bool(parsed.get("cuda")), parsed or detail

def gpu():
    exe = which("nvidia-smi")
    if not exe:
        return {"ok": False, "detail": "nvidia-smi not found", "max_vram_mb": 0}
    ok, detail = run_probe([exe, "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"], 10)
    max_vram = 0
    if ok:
        for line in detail.splitlines():
            parts = [x.strip() for x in line.split(",")]
            if len(parts) >= 2:
                match = re.search(r"\d+", parts[1])
                if match:
                    max_vram = max(max_vram, int(match.group()))
    return {"ok": ok, "detail": detail, "max_vram_mb": max_vram, "meets_skintokens_14gb": max_vram >= SKINTOKENS_MIN_VRAM_MB}

def engine(name: str, gpu_report):
    directory = tool_dir(name)
    py = python_for(name)
    py_ok, py_detail = check_python(py)
    torch_ok, torch_detail = check_import(py, "torch") if py_ok else (False, "python unavailable")
    cuda_ok, cuda_detail = check_torch_cuda(py) if torch_ok else (False, "torch unavailable")
    bpy_ok, bpy_detail = check_import(py, "bpy") if py_ok else (False, "python unavailable")
    result = {
        "path": str(directory),
        "repo_present": directory.exists(),
        "python": py,
        "python_ok": py_ok,
        "python_detail": py_detail,
        "torch_import": torch_ok,
        "torch_detail": torch_detail,
        "torch_cuda": cuda_ok,
        "torch_cuda_detail": cuda_detail,
        "bpy": bpy_ok,
        "bpy_detail": bpy_detail,
    }
    if name == "skintokens":
        flash_ok, flash_detail = check_import(py, "flash_attn") if py_ok else (False, "python unavailable")
        ckpt = directory / "experiments/articulation_xl_quantization_256_token_4/grpo_1400.ckpt"
        result["flash_attn"] = flash_ok
        result["flash_attn_detail"] = flash_detail
        result["checkpoint_present"] = ckpt.exists()
        result["vram_requirement_mb"] = SKINTOKENS_MIN_VRAM_MB
        result["ready"] = all([
            directory.exists(), py_ok, torch_ok, cuda_ok, bpy_ok, flash_ok,
            ckpt.exists(), gpu_report.get("meets_skintokens_14gb", False)
        ])
    else:
        result["bash_present"] = which("bash") is not None
        result["ready"] = all([
            directory.exists(), py_ok, torch_ok, cuda_ok, bpy_ok,
            result["bash_present"], gpu_report.get("ok", False)
        ])
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    gpu_report = gpu()
    report = {
        "external_root": str(EXTERNAL),
        "gpu": gpu_report,
        "engines": {
            "skintokens": engine("skintokens", gpu_report),
            "unirig": engine("unirig", gpu_report)
        }
    }
    report["ready"] = any(v["ready"] for v in report["engines"].values())
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("[KHOSAN RIGGING DOCTOR]", "READY" if report["ready"] else "BLOCKED")
        print(json.dumps(report, indent=2))
    return 0 if report["ready"] else 2

if __name__ == "__main__":
    raise SystemExit(main())
