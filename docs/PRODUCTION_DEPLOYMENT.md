# Production deployment runbook

**Do not execute against current musooka.site.**

## Preconditions

- [ ] Org host provisioned (CPU/RAM/disk sized)
- [ ] Secrets in secret store (see `PRODUCTION_CONFIG_AUDIT.md`)
- [ ] Postgres provisioned; app role least-privilege
- [ ] Backup destination + encryption keys ready
- [ ] SMTP ready
- [ ] TLS/DNS ready **or** temporary internal hostname for candidate
- [ ] Release candidate tagged (`docs/RELEASE_BASELINE.md`)

## Sequence

1. **Provision infrastructure** — VMs/containers, private DB network, firewall (no public Postgres)
2. **Configure secrets** — inject env; never bake into images
3. **Provision database** — create DB + `musooka_app` role; no superuser for app
4. **Configure backup** — enable job per `PRODUCTION_BACKUP_PLAN.md`
5. **Deploy application** — build images from RC fingerprint; Nginx + API + frontend
6. **Run migrations** — `prisma migrate deploy` forward-only; record versions. **Do not run `db:seed`.**
7. **Health check** — `/health` 200; `/ready` database true
8. **Smoke test** — `BASE_URL=https://<candidate> npm run production:smoke` (explicit URL; never default to musooka.site)
9. **Config gate** — `NODE_ENV=production ENV_FILE=… npm run production:config-check` before go-live
10. **Security verification** — headers, Secure cookies, CORS, authz spot-checks
11. **Enable monitoring** — scrape health/ready; wire alerts when destination exists
12. **Verify backups** — first encrypted dump + restore to isolated DB
13. **Approve cutover** — only then follow `PRODUCTION_CUTOVER.md`

## Parallel / blue-green

```
Legacy Musooka (musooka.site)     New stack (isolated candidate)
        │                                    │
        │  remains untouched                 │  validate fully
        ▼                                    ▼
   Existing users ◄──── DNS/proxy switch ────┘  (after approval)
```

Rollback: reverse DNS/proxy to legacy; leave new stack intact for forensics.

## Migration during deploy

If legacy data is required: complete dry-run + isolated load **before** step 12. Never migrate as an afterthought during DNS flip.
