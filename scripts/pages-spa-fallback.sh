#!/usr/bin/env bash
# GitHub Pages has no server-side SPA rewrite. After Vite build:
# 1) Emit a real HTML shell at each known client route so direct open / refresh
#    return HTTP 200 (not the Pages 404 path).
# 2) Keep 404.html as a safety net for unknown paths only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/clone/dist"

if [[ ! -f "${DIST}/index.html" ]]; then
  echo "[pages] Missing ${DIST}/index.html — run vite build first" >&2
  exit 1
fi

# Must match clone/src/App.jsx routes (no leading slash).
ROUTES=(
  login
  register
  password/reset
  password/reset/confirm
  home
  requisitions
  performance
  users
  roles
  reports
  analytics
  settings
)

for route in "${ROUTES[@]}"; do
  dir="${DIST}/${route}"
  mkdir -p "$dir"
  cp "${DIST}/index.html" "${dir}/index.html"
  echo "[pages] Wrote ${route}/index.html"
done

cp "${DIST}/index.html" "${DIST}/404.html"
echo "[pages] Wrote 404.html (unknown-path safety net only)"
echo "[pages] SPA route shells ready (${#ROUTES[@]} routes + 404.html)"
