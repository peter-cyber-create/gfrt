#!/bin/sh
set -e
cd /app

MIGRATE_URL="${MIGRATE_DATABASE_URL:-$DATABASE_URL}"

echo "[staging] Running prisma migrate deploy (as migrate user)..."
DATABASE_URL="${MIGRATE_URL}" npx prisma migrate deploy

echo "[staging] Granting musooka_app privileges..."
DATABASE_URL="${MIGRATE_URL}" npx tsx prisma/grant-app-user.staging.ts

echo "[staging] Running seed.staging.ts..."
DATABASE_URL="${MIGRATE_URL}" npx tsx prisma/seed.staging.ts

echo "[staging] Starting API..."
exec node dist/index.js
