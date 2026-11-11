#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec "${KHOSAN_PYTHON:-python3}" "$SCRIPT_DIR/local3d.py" setup "$@"

