from __future__ import annotations
import argparse
import json
import os
import shutil
import socket
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

DEFAULT_PORT = 7676
DEVSPACE_DIR = Path.home() / ".devspace"
CONFIG_FILE = DEVSPACE_DIR / "config.json"
AUTH_FILE = DEVSPACE_DIR / "auth.json"

def port_open(host: str, port: int, timeout=1.5) -> bool:
    try:
        with socket.create_connection((host, int(port)), timeout=timeout):
            return True
    except (OSError, ValueError):
        return False

def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

def normalized_mcp_url(base: str) -> str | None:
    if not base:
        return None
    value = base.strip().rstrip("/")
    if not value:
        return None
    if not value.startswith(("http://", "https://")):
        value = "https://" + value
    parsed = urlparse(value)
    if not parsed.hostname:
        return None
    return value if parsed.path.endswith("/mcp") else value + "/mcp"

def protected_mcp(url: str | None, timeout=4):
    if not url:
        return {"configured": False, "reachable": False, "protected": False, "detail": "not configured"}
    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return {
                "configured": True,
                "reachable": True,
                "protected": response.status in (401, 403),
                "detail": f"HTTP {response.status}"
            }
    except urllib.error.HTTPError as exc:
        challenge = (exc.headers.get("WWW-Authenticate") or "").lower()
        protected = exc.code in (401, 403) and ("bearer" in challenge or "oauth" in challenge)
        return {
            "configured": True,
            "reachable": True,
            "protected": protected,
            "detail": f"HTTP {exc.code}; challenge={challenge or 'none'}"
        }
    except Exception as exc:
        return {"configured": True, "reachable": False, "protected": False, "detail": str(exc)}

def command(name: str):
    return shutil.which(name)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-public", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    cfg = load_json(CONFIG_FILE)
    host = str(cfg.get("host") or "127.0.0.1")
    try:
        port = int(cfg.get("port") or DEFAULT_PORT)
    except Exception:
        port = DEFAULT_PORT

    public_base = os.environ.get("KHOSAN_DEVSPACE_PUBLIC_URL") or cfg.get("publicBaseUrl") or ""
    local_url = f"http://{host}:{port}/mcp"
    public_url = normalized_mcp_url(str(public_base))

    local_probe = protected_mcp(local_url)
    public_probe = protected_mcp(public_url) if public_url else {"configured": False, "reachable": False, "protected": False, "detail": "not configured"}

    git_bash = Path(r"C:\Program Files\Git\bin\bash.exe")
    report = {
        "config_file": str(CONFIG_FILE),
        "config_present": CONFIG_FILE.exists(),
        "auth_file_present": AUTH_FILE.exists(),
        "auth_secret_printed": False,
        "host": host,
        "port": port,
        "allowed_roots": cfg.get("allowedRoots", []),
        "local_port_open": port_open(host, port),
        "local_mcp": local_probe,
        "public_url": public_url,
        "public_mcp": public_probe,
        "commands": {
            "devspace": command("devspace"),
            "ngrok": command("ngrok"),
            "cloudflared": command("cloudflared"),
            "git_bash_windows": str(git_bash) if git_bash.exists() else None
        }
    }

    local_ready = report["config_present"] and report["local_port_open"] and local_probe["reachable"]
    public_ready = public_probe["reachable"] and public_probe["protected"] if public_url else False
    report["local_ready"] = local_ready
    report["public_ready"] = public_ready
    report["ready"] = local_ready and (public_ready if args.require_public else True)

    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report["ready"] else 2

if __name__ == "__main__":
    raise SystemExit(main())
