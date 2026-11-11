#!/usr/bin/env python3
"""Portable, checkout-relative bootstrap for KHOSAN's local Blender/MCP tools.

This driver never edits global MCP settings. All generated configuration and
environments belong to this checkout. Commands use argv lists, never a shell.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "tools" / "local_3d_mcp"
STATE = ROOT / ".khosan" / "local3d-machine.json"
CLIENT_CONFIG = ROOT / ".khosan" / "local3d-mcp.json"
ENVIRONMENT = ROOT / ".venv-local3d"


def utf8_environment():
    env = os.environ.copy()
    env.update(PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    return env


def run(argv, *, capture=False):
    return subprocess.run(
        [str(arg) for arg in argv], cwd=ROOT, env=utf8_environment(),
        check=True, text=True, encoding="utf-8", errors="replace",
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )


def environment_python():
    return ENVIRONMENT / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def require_environment():
    executable = environment_python()
    if not executable.is_file():
        raise RuntimeError("Run scripts/local3d.py setup first; this checkout has no local Python environment.")
    return executable


def read_machine():
    if not STATE.exists():
        return {}
    data = json.loads(STATE.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("schema") != "khosan.local3d-machine/1":
        raise RuntimeError("Unsupported local machine configuration. Rerun setup with --blender.")
    return data


def resolve_executable(value):
    expanded = os.path.expandvars(os.path.expanduser(str(value)))
    found = shutil.which(expanded)
    path = Path(found or expanded).resolve()
    if not path.is_file():
        raise RuntimeError(f"Blender executable does not exist: {path}")
    return path


def select_blender(explicit=None):
    # An explicit selection is authoritative; never silently replace a typo.
    if explicit:
        return resolve_executable(explicit)
    if os.environ.get("KHOSAN_BLENDER_PATH"):
        return resolve_executable(os.environ["KHOSAN_BLENDER_PATH"])
    saved = read_machine().get("blender")
    if saved:
        return resolve_executable(saved)
    on_path = shutil.which("blender")
    if on_path:
        return resolve_executable(on_path)
    candidates = []
    if os.name == "nt":
        for variable in ("ProgramW6432", "ProgramFiles", "ProgramFiles(x86)"):
            base = os.environ.get(variable)
            if base:
                candidates.extend((Path(base) / "Blender Foundation").glob("Blender*/blender.exe"))
    elif sys.platform == "darwin":
        candidates.extend([
            Path("/Applications/Blender.app/Contents/MacOS/Blender"),
            Path.home() / "Applications/Blender.app/Contents/MacOS/Blender",
        ])
    def installed_version(candidate):
        return tuple(int(part) for part in re.findall(r"\d+", candidate.parent.name))
    for candidate in sorted(set(candidates), key=installed_version, reverse=True):
        if candidate.is_file():
            return candidate.resolve()
    raise RuntimeError(
        "Blender was not found. Install Blender, then rerun setup --blender \"/absolute/path/to/blender\". "
        "Blender is installed separately; Python pip does not install the Blender application."
    )


def check_blender(executable):
    completed = subprocess.run(
        [str(executable), "--version"], cwd=ROOT, env=utf8_environment(),
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=20, check=True,
    )
    first = completed.stdout.splitlines()[0] if completed.stdout else ""
    match = re.match(r"Blender (\d+)\.(\d+)", first)
    if not match or tuple(map(int, match.groups())) < (4, 3):
        raise RuntimeError(f"Blender 4.3 or newer is required; received {first!r}.")
    return first


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def project_root(value=None):
    result = Path(value).expanduser().resolve() if value else ROOT
    if not result.is_dir():
        raise RuntimeError(f"Project root must be an existing directory: {result}")
    return result


def client_configuration(blender, project):
    return {"mcpServers": {"khosan-local3d": {
        "command": str(require_environment()),
        "args": [str(PACKAGE / "server.py"), "--stdio", "--project-root", str(project), "--blender", str(blender)],
        "env": {"PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"},
    }}}


def doctor(blender, project):
    result = run([require_environment(), PACKAGE / "server.py", "--doctor", "--project-root", project,
                  "--blender", blender], capture=True)
    data = json.loads(result.stdout)
    if Path(data["project_root"]).resolve() != project or Path(data["blender"]).resolve() != blender:
        raise RuntimeError("Doctor did not use the selected project or Blender executable.")
    return data


def setup(args):
    blender = select_blender(args.blender)
    version = check_blender(blender)
    if not environment_python().is_file():
        run([sys.executable, "-m", "venv", ENVIRONMENT])
    python = require_environment()
    if not args.skip_install:
        run([python, "-m", "pip", "install", "--disable-pip-version-check", "--no-cache-dir",
             "--timeout", "30", "--retries", "2", "-r", PACKAGE / "requirements-lock.txt"])
    run([python, "-m", "pip", "check"])
    sdk = run([python, "-c", "import importlib.metadata as m; print(m.version('mcp'))"], capture=True).stdout.strip()
    if sdk != "1.29.0":
        raise RuntimeError(f"Expected pinned mcp==1.29.0; installed {sdk}. Rerun setup without --skip-install.")
    report = doctor(blender, ROOT)
    write_json(STATE, {"schema": "khosan.local3d-machine/1", "checkout": str(ROOT),
                       "blender": str(blender), "blender_version": version,
                       "python": str(python), "mcp_version": sdk})
    write_json(CLIENT_CONFIG, client_configuration(blender, ROOT))
    print(json.dumps({"status": "READY_FOR_LOCAL_BUILD", "doctor": report,
                      "client_config": str(CLIENT_CONFIG), "machine_config": str(STATE)}, ensure_ascii=False, indent=2))
    return 0


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    if sys.version_info < (3, 10):
        raise RuntimeError("Python 3.10 or newer is required; Python 3.12 is the tested recommendation.")
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("setup", "doctor", "config", "serve", "proof"):
        command = commands.add_parser(name)
        command.add_argument("--blender", help="Explicit Blender executable; stored by setup and passed to child processes")
        if name in ("doctor", "config", "serve"):
            command.add_argument("--project-root", help="Existing project directory; default is this checkout")
        if name == "setup":
            command.add_argument("--skip-install", action="store_true", help="Verify an already installed environment without pip installation")
        if name == "proof":
            command.add_argument("--fixture", choices=("props", "elephant"), default="elephant")
            command.add_argument("--quality", choices=("standard", "draft"), default="standard",
                                 help="Draft renders 640x360 at 8 samples; geometry and the original fixture stay unchanged")
            command.add_argument("--timeout", type=int, choices=range(15, 601), metavar="15..600", default=600)
    args = parser.parse_args(argv)
    if args.command == "setup":
        return setup(args)
    blender = select_blender(args.blender)
    check_blender(blender)
    project = project_root(getattr(args, "project_root", None))
    if args.command == "doctor":
        print(json.dumps(doctor(blender, project), ensure_ascii=False, indent=2))
    elif args.command == "config":
        doctor(blender, project)
        config = client_configuration(blender, project)
        write_json(CLIENT_CONFIG, config)
        print(json.dumps({"config_file": str(CLIENT_CONFIG), "configuration": config}, ensure_ascii=False, indent=2))
    elif args.command == "serve":
        # Keep stdout exclusively available to the official MCP server.
        return subprocess.call([str(require_environment()), str(PACKAGE / "server.py"), "--stdio",
                                "--project-root", str(project), "--blender", str(blender)],
                               cwd=ROOT, env=utf8_environment())
    elif args.command == "proof":
        elephant = args.fixture == "elephant"
        source = PACKAGE / "fixtures" / ("elephant_scene.json" if elephant else "proof_scene.json")
        if not source.is_file():
            raise RuntimeError(f"Fixture is missing: {source}")
        if elephant and not (PACKAGE / "references/ep02_elephant_ref_r7.png").is_file():
            raise RuntimeError("The elephant reference is missing; restore the complete repository checkout.")
        if args.quality == "draft":
            spec = json.loads(source.read_text(encoding="utf-8"))
            spec["scene_id"] += "_draft"
            spec["render"].update(width=640, height=360, samples=8)
            source = ROOT / ".khosan" / "local3d" / "inputs" / (args.fixture + "-draft.json")
            write_json(source, spec)
            print("Explicit draft preview: 640x360, 8 samples; model geometry is unchanged.", file=sys.stderr)
        run([require_environment(), PACKAGE / "smoke_mcp.py", "--project-root", ROOT,
             "--source", source, "--source-format", "json", "--timeout", args.timeout,
             "--blender", blender, "--evidence-name", "elephant-proof.json" if elephant else "proof.json"])
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"Local 3D setup/run failed: {error}", file=sys.stderr)
        if isinstance(error, subprocess.CalledProcessError) and error.stderr:
            print(error.stderr, file=sys.stderr)
        raise SystemExit(1)
