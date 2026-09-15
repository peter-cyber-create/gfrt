# Production environment configuration audit

## Classification legend

| Class | Meaning |
|-------|---------|
| **REQUIRED** | Must be set; process must fail startup if missing/invalid |
| **OPTIONAL** | Has safe default or may be omitted |
| **DEVELOPMENT ONLY** | Forbidden or meaningless in production |
| **STAGING ONLY** | Allowed in staging lab; forbidden in production |
| **PRODUCTION ONLY** | Required or expected only in production |

## Backend (`NODE_ENV=production`)

| Variable | Class | Notes |
|----------|-------|-------|
| `NODE_ENV` | REQUIRED / PRODUCTION | Must be `production` |
| `DATABASE_URL` | REQUIRED | Non-dev DB; app role not superuser |
| `SESSION_SECRET` | REQUIRED | ≥32 chars; no `replace`/`change-me`/`local-dev` |
| `COOKIE_SECURE` | REQUIRED | Must be `true` |
| `COOKIE_SAMESITE` | OPTIONAL | Default `lax`; use `none` only with Secure + cross-site need |
| `CORS_ORIGIN` | REQUIRED | Exact HTTPS origins; no `*`; no localhost |
| `EMAIL_PROVIDER` | REQUIRED | Must be `smtp` (mock forbidden) |
| `SMTP_HOST` | REQUIRED | Real org SMTP; Mailpit/Mailhog/localhost forbidden |
| `SMTP_PORT` | OPTIONAL | Default 587 / 465 |
| `SMTP_USER` / `SMTP_PASS` | REQUIRED* | If SMTP requires auth |
| `SMTP_FROM` | REQUIRED | Verified sender |
| `PASSWORD_RESET_URL_BASE` | REQUIRED | Public HTTPS reset confirm URL |
| `STORAGE_ROOT` | REQUIRED | Path outside web root / object storage mount |
| `PORT` | OPTIONAL | Default 4000 (behind Nginx) |
| `LOGIN_MAX_ATTEMPTS` | OPTIONAL | Default 5 |
| `LOGIN_LOCK_MINUTES` | OPTIONAL | Default 15 |
| `SESSION_DAYS` | OPTIONAL | Default 7 |
| `RATE_LIMIT_*` | OPTIONAL | Tune for production traffic |
| `FORCE_TX_FAILURE` | DEVELOPMENT ONLY | Forbidden in production (fail-fast) |
| `DATABASE_URL` containing `musooka_dev` / `musooka_test` / `musooka_dev_only` | DEVELOPMENT ONLY | Rejected in production |

## Frontend build-time

| Variable | Class | Notes |
|----------|-------|-------|
| `VITE_DEMO_MODE` | PRODUCTION: must be `false` | Demo mode forbidden for production builds |
| `VITE_DATA_SOURCE` | PRODUCTION: `api` | |
| `VITE_API_BASE_URL` | REQUIRED | Public API origin (often same-origin via Nginx → empty or site URL) |
| `VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD` | DEVELOPMENT ONLY | Must not be baked into production builds |

## Staging-only (lab)

| Variable / resource | Class |
|---------------------|-------|
| Mailpit SMTP | STAGING ONLY |
| Self-signed TLS | STAGING ONLY |
| `STAGING_SEED_PASSWORD` | STAGING ONLY |
| `https://127.0.0.1:8443` | STAGING ONLY |

## Fail-fast enforcement

Implemented in `backend/src/config.ts` via Zod `superRefine` for `staging`/`production`.

Production additionally rejects: mock email, Mailpit/localhost SMTP, insecure cookies, localhost CORS, test DB URLs, `FORCE_TX_FAILURE`.

## Provisioning (no secrets in repo)

| Secret | Provision via |
|--------|----------------|
| `DATABASE_URL` | Host/orchestrator secret store or sealed env file on server (mode 600) |
| `SESSION_SECRET` | `openssl rand -hex 32` stored in secret manager |
| SMTP credentials | Org mail provider vault |
| Backup encryption key | Separate secret manager; not co-located with dumps only |
| TLS private key | Certbot/ACME or org PKI; not in Git/Docker image layers |

Never: Git, Dockerfiles, frontend bundles, CI logs, Markdown docs.
