#!/bin/sh
# Production API entrypoint: migrate only — never seed presentation/demo data.
set -e
cd /app

MIGRATE_URL="${MIGRATE_DATABASE_URL:-$DATABASE_URL}"

if [ "${NODE_ENV}" != "production" ]; then
  echo "[production-entrypoint] REFUSING: NODE_ENV must be production (got '${NODE_ENV}')." >&2
  exit 1
fi

echo "[production] Running prisma migrate deploy..."
DATABASE_URL="${MIGRATE_URL}" npx prisma migrate deploy

echo "[production] Starting API (no seed)..."
exec node dist/index.js
