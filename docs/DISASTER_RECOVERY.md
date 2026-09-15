# Disaster recovery (preliminary)

Applies to the **local staging stack** (`infra/staging/`). Production RTO/RPO will be finalized before musooka.site cutover.

## Objectives (staging)

| Metric | Target | Notes |
|--------|--------|-------|
| **RPO** | ≤ 24 h | Daily encrypted backups via `scripts/staging-encrypted-backup.sh` |
| **RTO** | ≤ 30 min | Rebuild compose stack + restore from latest backup |

## Backup

```bash
npm run staging:backup
```

- Dumps `musooka_staging` via `pg_dump` inside the db container
- Encrypts with `openssl enc -aes-256-cbc -pbkdf2` using `BACKUP_ENCRYPTION_KEY`
- Stores under `data/staging-backups/` (gitignored)
- Restore-test into `musooka_staging_restore` without touching the active DB

## Recovery procedure (staging)

1. `docker compose -f infra/staging/docker-compose.yml down` (optional)
2. Restore volume or recreate DB from decrypted dump
3. `bash scripts/staging-up.sh`
4. Verify `https://127.0.0.1:8443/ready`
5. Run `npm run staging:dr` and `npm run staging:e2e`

## DR exercise

```bash
npm run staging:dr
```

Documents API stop/recovery in `data/staging-dr-report.json`. Set `STAGING_DR_DB_PAUSE=1` for optional brief DB pause.

## Production (placeholder)

Production DR will require off-site encrypted backups, runbook ownership, and tested restore on a non-production clone before cutover.
