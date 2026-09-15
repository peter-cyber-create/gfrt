#!/usr/bin/env bash
# Bring up isolated local staging stack at https://127.0.0.1:8443
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGING_DIR="${ROOT}/infra/staging"
ENV_FILE="${STAGING_DIR}/.env"
ENV_EXAMPLE="${STAGING_DIR}/.env.example"

cd "${STAGING_DIR}"

bash "${STAGING_DIR}/generate-certs.sh"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Creating ${ENV_FILE} from .env.example with generated secrets..."
  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  PG_PASS="$(openssl rand -hex 24)"
  APP_PASS="$(openssl rand -hex 24)"
  SESSION_SECRET="$(openssl rand -hex 32)"
  BACKUP_KEY="$(openssl rand -hex 32)"
  SEED_PASS="$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)Aa1!"

  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASS}|" "${ENV_FILE}"
  sed -i "s|^POSTGRES_APP_PASSWORD=.*|POSTGRES_APP_PASSWORD=${APP_PASS}|" "${ENV_FILE}"
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=${SESSION_SECRET}|" "${ENV_FILE}"
  sed -i "s|^BACKUP_ENCRYPTION_KEY=.*|BACKUP_ENCRYPTION_KEY=${BACKUP_KEY}|" "${ENV_FILE}"
  sed -i "s|^STAGING_SEED_PASSWORD=.*|STAGING_SEED_PASSWORD=${SEED_PASS}|" "${ENV_FILE}"
  echo "Generated ${ENV_FILE} — not committed to git."
fi

chmod +x "${STAGING_DIR}/api-entrypoint.sh" "${STAGING_DIR}/db-init/01-app-user.sh" 2>/dev/null || true

docker compose up --build -d

echo "Waiting for https://127.0.0.1:8443/health ..."
for i in $(seq 1 90); do
  if curl -skf "https://127.0.0.1:8443/health" >/dev/null 2>&1; then
    echo ""
    echo "Staging is up:"
    echo "  App:      https://127.0.0.1:8443"
    echo "  Health:   https://127.0.0.1:8443/health"
    echo "  Ready:    https://127.0.0.1:8443/ready"
    echo "  Mailpit:  http://127.0.0.1:8025"
    echo "  Prom:     http://127.0.0.1:9090"
    curl -sk "https://127.0.0.1:8443/health" | head -c 200
    echo ""
    exit 0
  fi
  sleep 2
done

echo "ERROR: staging health check timed out" >&2
docker compose ps
exit 1
