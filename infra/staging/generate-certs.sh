#!/usr/bin/env bash
# Generate self-signed TLS certs for local staging (127.0.0.1 / staging.musooka.local).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${SCRIPT_DIR}/certs"
mkdir -p "${CERT_DIR}"

if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
  echo "Certs already exist in ${CERT_DIR}"
  exit 0
fi

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout "${CERT_DIR}/privkey.pem" \
  -out "${CERT_DIR}/fullchain.pem" \
  -subj "/CN=staging.musooka.local/O=Musooka Staging/C=UG" \
  -addext "subjectAltName=DNS:staging.musooka.local,IP:127.0.0.1"

chmod 600 "${CERT_DIR}/privkey.pem"
echo "Generated ${CERT_DIR}/fullchain.pem and privkey.pem"
