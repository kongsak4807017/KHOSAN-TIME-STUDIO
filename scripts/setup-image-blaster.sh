#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT="${KHOSAN_EXTERNAL_DIR:-$ROOT/external}"
DST="${KHOSAN_IMAGE_BLASTER_DIR:-$EXT/image-blaster}"
REPO="https://github.com/kongsak4807017/image-blaster.git"
SHA="4acb43ba126a12358f71838d1b1a05e856b10eaf"

mkdir -p "$(dirname "$DST")"
if [ ! -d "$DST/.git" ]; then
  git clone "$REPO" "$DST"
fi
git -C "$DST" fetch --tags origin
git -C "$DST" checkout --detach "$SHA"

echo "[KHOSAN] image-blaster source pinned at $SHA"
echo "[KHOSAN] source: $DST"
echo "[KHOSAN] Provider credentials are NOT created or charged by this setup."
echo "[KHOSAN] Run: npm run doctor:image-blaster"
