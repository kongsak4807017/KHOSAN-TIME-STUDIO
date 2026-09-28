#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT="${KHOSAN_EXTERNAL_DIR:-$ROOT/external}"
mkdir -p "$EXT"

clone_pin() {
  local name="$1" url="$2" sha="$3"
  local dst="$EXT/$name"
  if [ ! -d "$dst/.git" ]; then
    git clone "$url" "$dst"
  fi
  git -C "$dst" fetch --tags origin
  git -C "$dst" checkout --detach "$sha"
}

clone_pin "SkinTokens" "https://github.com/kongsak4807017/SkinTokens.git" "273b691d35989d71cd17ff2895fdc735097b92d1"
clone_pin "UniRig" "https://github.com/kongsak4807017/UniRig.git" "6793c6640ff01c8fb389f3993434124bb43d2933"

echo "[KHOSAN] Rigging sources pinned under $EXT"
echo "[KHOSAN] Dependencies/checkpoints are intentionally NOT installed automatically."
echo "[KHOSAN] Follow docs/16-3D-AUTO-RIGGING.md, then run: python tools/adapters/rigging/doctor.py"
