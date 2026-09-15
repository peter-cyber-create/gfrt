#!/usr/bin/env bash
# DR exercise: stop API, verify /ready fails, recover; optional brief DB pause.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGING_DIR="${ROOT}/infra/staging"
REPORT="${ROOT}/data/staging-dr-report.json"
STAGING_URL="${STAGING_URL:-https://127.0.0.1:8443}"

probe() {
  local path="$1"
  curl -sk -o /dev/null -w "%{http_code}" "${STAGING_URL}${path}" 2>/dev/null || echo "000"
}

wait_code() {
  local path="$1" expect="$2" tries="${3:-30}"
  local i code
  for i in $(seq 1 "${tries}"); do
    code="$(probe "${path}")"
    if [[ "${code}" == "${expect}" ]]; then
      echo "${code}"
      return 0
    fi
    sleep 2
  done
  echo "${code:-000}"
  return 1
}

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
HEALTH_BEFORE="$(probe /health)"
READY_BEFORE="$(probe /ready)"

echo "Stopping API..."
docker compose -f "${STAGING_DIR}/docker-compose.yml" stop api

READY_DOWN="false"
READY_CODE="$(probe /ready)"
if [[ "${READY_CODE}" != "200" ]]; then
  READY_DOWN="true"
fi

echo "Starting API..."
docker compose -f "${STAGING_DIR}/docker-compose.yml" start api

RECOVERED="false"
if wait_code /ready 200 60 >/dev/null; then
  RECOVERED="true"
fi
HEALTH_AFTER="$(probe /health)"
READY_AFTER="$(probe /ready)"

DB_PAUSE="skipped"
DB_RECOVERED="skipped"
if [[ "${STAGING_DR_DB_PAUSE:-0}" == "1" ]]; then
  echo "Brief DB pause (STAGING_DR_DB_PAUSE=1)..."
  docker compose -f "${STAGING_DIR}/docker-compose.yml" pause db
  sleep 3
  DB_PAUSE="paused"
  READY_DURING_DB="$(probe /ready)"
  docker compose -f "${STAGING_DIR}/docker-compose.yml" unpause db
  if wait_code /ready 200 30 >/dev/null; then
    DB_RECOVERED="true"
  else
    DB_RECOVERED="false"
  fi
fi

cat > "${REPORT}" <<EOF
{
  "timestamp": "${TS}",
  "stagingUrl": "${STAGING_URL}",
  "before": { "health": "${HEALTH_BEFORE}", "ready": "${READY_BEFORE}" },
  "apiStop": { "readyFailed": ${READY_DOWN}, "readyStatusDuringStop": "${READY_CODE}" },
  "apiRecovery": { "recovered": ${RECOVERED}, "health": "${HEALTH_AFTER}", "ready": "${READY_AFTER}" },
  "dbPause": { "action": "${DB_PAUSE}", "recovered": "${DB_RECOVERED}" },
  "notes": "Active musooka_staging DB not dropped; restore-test uses separate DB in backup script."
}
EOF

echo "DR report: ${REPORT}"
if [[ "${RECOVERED}" != "true" ]]; then
  exit 1
fi
