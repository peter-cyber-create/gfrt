# Production deployment runbook (GFRT)

**Do not execute against musooka.site or its database.**

Repository: `git@github.com:peter-cyber-create/gfrt.git`

## Preconditions

- [ ] Host provisioned; Docker available
- [ ] Secrets prepared from `.env.production.example` → secure `infra/production/.env` (gitignored)
- [ ] Postgres reachable only on private network (compose does **not** publish DB ports)
- [ ] SMTP credentials ready (not Mailpit)
- [ ] TLS/DNS or internal candidate hostname ready
- [ ] Encrypted backup destination ready
- [ ] CI green on the release SHA (`docs/GITHUB_DEPLOYMENT.md`)
- [ ] `NODE_ENV=production ENV_FILE=… npm run production:config-check` passes against **real** secrets (not the example file)

## Sequence

1. **Checkout release SHA** on the deploy host (or CI artifact).
2. **Configure secrets** — `infra/production/.env` from the production template; never bake into images.
3. **Build & start** (from `infra/production`):

```bash
chmod +x api-entrypoint.sh db-init/01-app-user.sh
docker compose --env-file .env up --build -d
```

4. **Migrations** — run automatically in `api-entrypoint.sh` via `prisma migrate deploy`. **No seed.**
5. **Health**
   - `GET /health` → 200
   - `GET /ready` → `{ "status":"ready", "database": true }`
6. **Smoke** — `BASE_URL=https://<candidate> npm run production:smoke` (explicit URL; never default to musooka.site)
7. **Config gate** — production:config-check with the live env file
8. **Operator reverse proxy** — adapt `nginx.example.conf` manually if needed (do not auto-install Nginx)
9. **Backups** — first encrypted dump + restore drill (`docs/PRODUCTION_BACKUP_PLAN.md`)
10. **Cutover** — only after acceptance (`docs/PRODUCTION_CUTOVER.md`)

## What this stack does **not** do

- Does not touch UFW / netplan / cloud-init
- Does not install or reconfigure host Nginx automatically
- Does not seed presentation/demo users or the 180 requisitions
- Does not connect to musooka.site

## Verify deployment

| Check | Expect |
|-------|--------|
| `/health` | ok |
| `/ready` | database true |
| Login | real admin user from **production** provisioning (not `@gfrt.local` staging accounts) |
| Create → submit → review → approve | works with RBAC |
| Reports/analytics/performance | numbers match API/DB |
| CSV export | matches filtered API data |
| Password reset | SMTP delivery |
| Logout | session invalidated |

## Rollback

See `docs/ROLLBACK.md`.
