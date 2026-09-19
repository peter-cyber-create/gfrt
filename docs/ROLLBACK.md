# Rollback

Applies to the **new GFRT stack** only. Do not alter musooka.site, UFW, netplan, or cloud-init as part of this procedure.

## When to roll back

- Health/ready failing after deploy
- Auth/session regressions
- Migration error (forward migration failed mid-deploy)
- Critical functional defect found in smoke tests

## Application rollback (containers)

1. Note the failing release (git SHA / image tag).
2. Redeploy the previous known-good image tags for `api` and `web`.
3. Confirm:
   - `GET /health` → 200
   - `GET /ready` → `{ "database": true }`
4. Re-run smoke: `BASE_URL=https://<candidate> npm run production:smoke`

Compose example (from `infra/production`):

```bash
# Operator sets IMAGE tags / prior build context
docker compose --env-file .env up -d --no-deps api web
```

## Database migration rollback

Prisma migrations in this project are **forward-only** in production.

- Prefer restore from encrypted backup taken **before** migrate (`docs/PRODUCTION_BACKUP_PLAN.md`, `docs/DISASTER_RECOVERY.md`).
- Do not invent down-migrations against a live production database.
- Never restore onto musooka.site’s legacy database.

## DNS / proxy rollback

If traffic was switched to the new stack:

1. Point the reverse proxy / DNS back to the previous upstream.
2. Leave the new stack running for forensics.
3. Capture logs and the failing SHA.

Nginx changes are **operator-managed** — this repository only ships `infra/production/nginx.example.conf` as a reference.

## Staging lab

Staging reset is intentional and separate:

```bash
# Staging only — requires STAGING_ALLOW_PRESENTATION_RESET
# POST /api/v1/staging/presentation-reset (admin session)
```

Never enable presentation reset in production.
