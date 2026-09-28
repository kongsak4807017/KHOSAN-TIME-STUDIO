from __future__ import annotations
import argparse
import json
from pathlib import Path
from common import python_for, tool_dir, which, run

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--engine", choices=["skintokens", "unirig"], default="skintokens")
    parser.add_argument("--preserve-materials", action="store_true")
    parser.add_argument("--use-existing-skeleton", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    source = Path(args.input).resolve()
    output = Path(args.output).resolve()
    if not source.exists():
        raise SystemExit("input does not exist: " + str(source))
    output.parent.mkdir(parents=True, exist_ok=True)

    directory = tool_dir(args.engine)
    if not directory.exists():
        raise SystemExit("tool repo missing: " + str(directory))

    if args.engine == "skintokens":
        cmd = [python_for("skintokens"), "demo.py", "--input", str(source), "--output", str(output)]
        if args.preserve_materials:
            cmd.append("--use_transfer")
        if args.use_existing_skeleton:
            cmd.append("--use_skeleton")
        result = run(cmd, cwd=directory, dry_run=args.dry_run)
    else:
        bash = which("bash")
        if not bash:
            raise SystemExit("UniRig expert path requires bash/WSL or a future native wrapper")
        skeleton = output.with_name(output.stem + "_skeleton.fbx")
        skin = output.with_name(output.stem + "_skin.fbx")
        steps = [
            [bash, "launch/inference/generate_skeleton.sh", "--input", str(source), "--output", str(skeleton)],
            [bash, "launch/inference/generate_skin.sh", "--input", str(skeleton), "--output", str(skin)],
            [bash, "launch/inference/merge.sh", "--source", str(skin), "--target", str(source), "--output", str(output)],
        ]
        results = []
        for cmd in steps:
            item = run(cmd, cwd=directory, dry_run=args.dry_run)
            results.append(item)
            if item["returncode"] not in (None, 0):
                break
        result = {"steps": results, "returncode": results[-1]["returncode"] if results else 1}

    print(json.dumps({"engine": args.engine, "input": str(source), "output": str(output), "result": result}, indent=2))
    code = result.get("returncode") if isinstance(result, dict) else 1
    return 0 if code in (None, 0) else int(code)

if __name__ == "__main__":
    raise SystemExit(main())
