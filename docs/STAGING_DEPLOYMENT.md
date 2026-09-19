# Staging deployment

**Do not deploy to musooka.site from this repository.**

Isolated local staging runs at **https://127.0.0.1:8443** (temporary staging hostname/IP until a remote host is available).

## Quick start

```bash
bash scripts/staging-up.sh
```

This will:

1. Generate self-signed TLS certs in `infra/staging/certs/` (if missing)
2. Create `infra/staging/.env` from `.env.example` with `openssl rand` secrets (if missing)
3. `docker compose -f infra/staging/docker-compose.yml up --build -d`
4. Wait for `https://127.0.0.1:8443/health`

## Stack (`infra/staging/docker-compose.yml`)

| Service | Role | Host access |
|---------|------|-------------|
| `db` | PostgreSQL 16, DB `musooka_staging` | `127.0.0.1:5436` (admin only) |
| `api` | Backend (staging Dockerfile, migrate + seed) | internal |
| `web` | Frontend (API mode, no demo) | internal |
| `proxy` | Nginx TLS termination | `8088` → HTTP redirect, **`8443` → HTTPS** |
| `mailpit` | SMTP capture | http://127.0.0.1:8025 |
| `prometheus` | Metrics | http://127.0.0.1:9090 |
| `blackbox` | Probes `api:4000/health` and `/ready` | internal |

Network: `musooka_staging`

## Environment

Copy `infra/staging/.env.example` → `.env` or let `staging-up.sh` generate it.

| Variable | Requirement |
|----------|-------------|
| `NODE_ENV` | `staging` (set in compose) |
| `SESSION_SECRET` | ≥ 32 chars; no `replace` / `change-me` / `local-dev` |
| `POSTGRES_APP_PASSWORD` | Least-privilege DB user |
| `STAGING_SEED_PASSWORD` | Staging account password |
| `EMAIL_PROVIDER` | `smtp` → Mailpit |
| `COOKIE_SECURE` | `true` |

## Seed accounts

After first start (`seed.staging.ts`):

- `admin@gfrt.local`
- `reviewer@gfrt.local`
- `user@gfrt.local`

Password: value of `STAGING_SEED_PASSWORD` in `.env`.

## NPM scripts

```bash
npm run staging:up          # bash scripts/staging-up.sh
npm run staging:down        # compose down
npm run staging:e2e         # Playwright E2E
npm run staging:reset-e2e   # password reset via Mailpit
npm run staging:security    # HTTPS, cookies, CORS, CSRF checks
npm run staging:backup      # encrypted pg_dump + restore test
npm run staging:dr          # stop/recover API exercise
npm run staging:perf        # timings vs perf baseline
```

## TLS

```bash
bash infra/staging/generate-certs.sh
```

Certs: `infra/staging/certs/fullchain.pem`, `privkey.pem` (gitignored).

## Monitoring

- Prometheus scrapes blackbox exporter probing `/health` and `/ready`
- Alert rules: `infra/staging/alert.rules.yml` (application down, ready fail)

## Acceptance

See [STAGING_ACCEPTANCE.md](./STAGING_ACCEPTANCE.md), [STAGING_SECRETS.md](./STAGING_SECRETS.md), [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md).
