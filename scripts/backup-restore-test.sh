#!/usr/bin/env bash
# Backup musooka_dev, restore into musooka_restore_test, verify row counts.
# Requires musooka-postgres container (infra/docker-compose.yml db service).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="${POSTGRES_CONTAINER:-musooka-postgres}"
PGUSER="${POSTGRES_USER:-musooka}"
SRC_DB="${SRC_DB:-musooka_dev}"
RESTORE_DB="${RESTORE_DB:-musooka_restore_test}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP="/tmp/musooka-${STAMP}.dump"
REPORT="${ROOT}/data/backup-restore-report.json"

mkdir -p "${ROOT}/data"

echo "==> Dumping ${SRC_DB} from ${CONTAINER}"
docker exec "${CONTAINER}" pg_dump -U "${PGUSER}" -Fc -d "${SRC_DB}" > "${DUMP}"

echo "==> Recreating ${RESTORE_DB}"
docker exec "${CONTAINER}" psql -U "${PGUSER}" -d postgres -c "DROP DATABASE IF EXISTS ${RESTORE_DB};"
docker exec "${CONTAINER}" psql -U "${PGUSER}" -d postgres -c "CREATE DATABASE ${RESTORE_DB};"

echo "==> Restoring into ${RESTORE_DB}"
cat "${DUMP}" | docker exec -i "${CONTAINER}" pg_restore -U "${PGUSER}" -d "${RESTORE_DB}" --no-owner --no-privileges

count_users() {
  docker exec "${CONTAINER}" psql -U "${PGUSER}" -d "$1" -tAc "SELECT COUNT(*) FROM users;"
}

count_requisitions() {
  docker exec "${CONTAINER}" psql -U "${PGUSER}" -d "$1" -tAc "SELECT COUNT(*) FROM requisitions;"
}

SRC_USERS="$(count_users "${SRC_DB}")"
SRC_REQS="$(count_requisitions "${SRC_DB}")"
RST_USERS="$(count_users "${RESTORE_DB}")"
RST_REQS="$(count_requisitions "${RESTORE_DB}")"

OK="true"
if [[ "${SRC_USERS}" != "${RST_USERS}" || "${SRC_REQS}" != "${RST_REQS}" ]]; then
  OK="false"
fi

cat > "${REPORT}" <<EOF
{
  "timestamp": "${STAMP}",
  "container": "${CONTAINER}",
  "sourceDatabase": "${SRC_DB}",
  "restoreDatabase": "${RESTORE_DB}",
  "dumpFile": "${DUMP}",
  "counts": {
    "source": { "users": ${SRC_USERS}, "requisitions": ${SRC_REQS} },
    "restored": { "users": ${RST_USERS}, "requisitions": ${RST_REQS} }
  },
  "verified": ${OK}
}
EOF

echo "==> Report written to ${REPORT}"
cat "${REPORT}"

rm -f "${DUMP}"

if [[ "${OK}" != "true" ]]; then
  echo "Restore verification FAILED" >&2
  exit 1
fi

echo "Backup/restore test PASSED"
