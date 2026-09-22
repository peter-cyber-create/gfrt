#!/usr/bin/env bash
# After Vite build: copy index.html → 404.html so GitHub Pages serves the SPA
# for deep links / refresh (Pages has no server-side fallback routing).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/clone/dist"

if [[ ! -f "${DIST}/index.html" ]]; then
  echo "[pages] Missing ${DIST}/index.html — run vite build first" >&2
  exit 1
fi

cp "${DIST}/index.html" "${DIST}/404.html"
echo "[pages] Wrote ${DIST}/404.html (SPA fallback for GitHub Pages)"
