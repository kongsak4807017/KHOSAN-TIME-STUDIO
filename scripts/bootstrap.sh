#!/usr/bin/env bash
set -euo pipefail

echo "[KHOSAN] Master repository bootstrap"

if command -v python3 >/dev/null 2>&1; then
  python3 scripts/harness_check.py
elif command -v python >/dev/null 2>&1; then
  python scripts/harness_check.py
else
  echo "[KHOSAN] Python not found; structural verification skipped."
fi

echo
echo "[KHOSAN] Git state"
git status --short || true

echo
echo "[KHOSAN] Optional tool discovery"
for cmd in git node npm python3 docker; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "  [found] $cmd"
  else
    echo "  [missing/optional] $cmd"
  fi
done

echo
echo "[KHOSAN] Ready for repository/harness mode."
echo "Read AGENTS.md -> studio/studio_state.json -> studio/graph.md."
