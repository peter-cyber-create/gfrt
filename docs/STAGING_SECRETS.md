# Staging secrets inventory (names only)

**Never commit real values.** Generated locally by `scripts/staging-up.sh` into `infra/staging/.env` (gitignored).

| Name | Purpose | Location |
|------|---------|----------|
| `POSTGRES_PASSWORD` | Postgres superuser | `infra/staging/.env` |
| `POSTGRES_APP_PASSWORD` | `musooka_app` role password | `infra/staging/.env` |
| `SESSION_SECRET` | API session signing (≥ 32 chars) | `infra/staging/.env` |
| `STAGING_SEED_PASSWORD` | Staging demo account password | `infra/staging/.env` |
| `BACKUP_ENCRYPTION_KEY` | Backup encryption | `infra/staging/.env` |
| TLS private key | HTTPS for 127.0.0.1 | `infra/staging/certs/privkey.pem` (gitignored) |

## Non-secrets (set in compose)

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` — Mailpit (no auth)
- `CORS_ORIGIN`, `PASSWORD_RESET_URL_BASE` — public staging URLs
- `DATABASE_URL` — constructed from `POSTGRES_APP_PASSWORD` in compose

## Policy

- Do not use production musooka.site credentials in staging
- Do not seed `admin@gmail.com` / `123456`
- Rotate `SESSION_SECRET` and DB passwords if `.env` is exposed
