# Environment configuration

This document lists variables used by the **current** GFRT codebase. Placeholders only — never commit real values.

Templates:

- Development API: `backend/.env.example`
- Demo frontend: `clone/.env.example`
- Staging lab: `infra/staging/.env.example`
- Production: `.env.production.example`

## Backend (runtime)

| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `PORT` | optional (4000) | 4000 | 4000 |
| `DATABASE_URL` | local Postgres | staging DB | production DB (no localhost) |
| `SESSION_SECRET` | ≥16 (≥32 staging+) | ≥32 | ≥32, no weak fragments |
| `COOKIE_SECURE` | false | false (HTTP lab) | **true** |
| `COOKIE_SAMESITE` | lax | lax | lax/strict |
| `CORS_ORIGIN` | localhost Vite | staging origins | HTTPS origins only |
| `EMAIL_PROVIDER` | mock | smtp | **smtp** |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | n/a | Mailpit OK | real SMTP; Mailpit forbidden |
| `PASSWORD_RESET_URL_BASE` | optional | required | required HTTPS |
| `STORAGE_ROOT` | `./data/uploads` | volume path | durable path outside web root |
| `FORCE_TX_FAILURE` | test only | forbidden | **forbidden** |
| `STAGING_ALLOW_PRESENTATION_RESET` | n/a | `true` lab only | **forbidden** |
| `STAGING_SEED_PASSWORD` | n/a | required for seed | **must not be set** |

Fail-fast validation: `backend/src/config.ts` and `npm run production:config-check`.

## Frontend (build-time Vite)

| Variable | Demo local | Staging image | Production image |
|----------|------------|---------------|------------------|
| `VITE_DEMO_MODE` | `true` | `false` | **`false`** |
| `VITE_DATA_SOURCE` | `mock` | `api` | **`api`** |
| `VITE_API_BASE_URL` | `http://127.0.0.1:4000` | empty (same-origin) | empty or public origin |
| `VITE_STAGING_QUICK_LOGIN` | false | true | **false** |
| `VITE_STAGING_DEMO_PASSWORD` | unset | from staging `.env` | **unset** |
| `VITE_STAGING_PRESENTATION_RESET` | false | true | **false** |
| `VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD` | demo only | unused | **must not bake real secrets** |

API mode must never silently fall back to mock services (`clone/src/services/index.js`).

## Seeds (never for production)

| Command | Purpose |
|---------|---------|
| `npm run db:seed` | Development seed (`@musooka.local`) — refused when `NODE_ENV=production` |
| `npm run db:seed:staging` / `db:seed:presentation` | Staging presentation dataset — requires `STAGING_SEED_PASSWORD` |
| Production entrypoint | **migrate only** — no seed |

## Operator URLs (documentation)

| Variable | Meaning |
|----------|---------|
| `FRONTEND_URL` | Public SPA URL |
| `API_URL` | Public API URL (often same host via reverse proxy) |
