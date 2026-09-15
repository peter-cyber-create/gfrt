#!/usr/bin/env bash
# pg_dump via docker, encrypt with openssl, restore-test into musooka_staging_restore.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGING_DIR="${ROOT}/infra/staging"
ENV_FILE="${STAGING_DIR}/.env"
BACKUP_DIR="${ROOT}/data/staging-backups"
REPORT="${ROOT}/data/staging-backup-report.json"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY required in infra/staging/.env}"

mkdir -p "${BACKUP_DIR}"
PLAIN="${BACKUP_DIR}/musooka_staging_${TS}.sql"
ENC="${PLAIN}.enc"
RESTORE_DB="musooka_staging_restore"

echo "Dumping musooka_staging..."
docker compose -f "${STAGING_DIR}/docker-compose.yml" exec -T db \
  pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-musooka_staging}" --no-owner --no-acl \
  > "${PLAIN}"

echo "Encrypting backup..."
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -in "${PLAIN}" -out "${ENC}" \
  -pass pass:"${BACKUP_ENCRYPTION_KEY}"
rm -f "${PLAIN}"

RESTORE_OK=false
DECRYPT_ERR=""
RESTORE_ERR=""

echo "Restore test into ${RESTORE_DB}..."
if docker compose -f "${STAGING_DIR}/docker-compose.yml" exec -T db \
  psql -U "${POSTGRES_USER:-postgres}" -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='${RESTORE_DB}'" | grep -q 1; then
  docker compose -f "${STAGING_DIR}/docker-compose.yml" exec -T db \
    psql -U "${POSTGRES_USER:-postgres}" -d postgres -c "DROP DATABASE ${RESTORE_DB};" >/dev/null
fi

if docker compose -f "${STAGING_DIR}/docker-compose.yml" exec -T db \
  psql -U "${POSTGRES_USER:-postgres}" -d postgres -c "CREATE DATABASE ${RESTORE_DB};" >/dev/null \
  && openssl enc -d -aes-256-cbc -pbkdf2 \
    -in "${ENC}" -pass pass:"${BACKUP_ENCRYPTION_KEY}" \
  | docker compose -f "${STAGING_DIR}/docker-compose.yml" exec -T db \
    psql -U "${POSTGRES_USER:-postgres}" -d "${RESTORE_DB}" >/dev/null 2>&1; then
  RESTORE_OK=true
  docker compose -f "${STAGING_DIR}/docker-compose.yml" exec -T db \
    psql -U "${POSTGRES_USER:-postgres}" -d postgres -c "DROP DATABASE ${RESTORE_DB};" >/dev/null
else
  RESTORE_ERR="restore pipeline failed"
fi

cat > "${REPORT}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backupFile": "${ENC}",
  "encrypted": true,
  "algorithm": "aes-256-cbc-pbkdf2",
  "restoreTestDb": "${RESTORE_DB}",
  "restoreTestPassed": ${RESTORE_OK},
  "restoreError": "${RESTORE_ERR}",
  "decryptError": "${DECRYPT_ERR}",
  "activeDbUntouched": true
}
EOF

echo "Wrote ${ENC}"
echo "Report: ${REPORT}"
if [[ "${RESTORE_OK}" != "true" ]]; then
  exit 1
fi
