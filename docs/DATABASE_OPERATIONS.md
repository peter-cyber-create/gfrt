# Database operations

Status: **local backup-restore script implemented; production backups NOT configured.**

The legacy musooka.site database is out of scope and must not be modified from this repository.

## Local / staging databases

| Purpose | Compose service | Host port | Database |
|---------|-----------------|-----------|----------|
| Development | `db` | 5434 | `musooka_dev` |
| Automated tests | `db_test` | 5435 | `musooka_test` |
| Restore test | `db` | 5434 | `musooka_restore_test` (ephemeral) |

Start:

```bash
docker compose -f infra/docker-compose.yml up -d
cd backend && npm run db:migrate && npm run db:seed
```

Commands (from `backend/`):

| Command | Purpose |
|---------|---------|
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | Create/apply migration in development |
| `npm run db:seed` | Deterministic non-production seed |
| `npm run db:reset` | Reset + migrate + seed (destructive, local only) |

Connection strings come from environment variables. Never commit credentials.

## Backup-restore test (local)

Script: `scripts/backup-restore-test.sh` (also `npm run backup:test`)

1. `pg_dump` `musooka_dev` via `docker exec musooka-postgres`
2. Drop/create `musooka_restore_test`
3. `pg_restore` into restore DB
4. Compare `users` and `requisitions` counts
5. Write `data/backup-restore-report.json`

Run after seeding dev DB:

```bash
npm run backup:test
```

### Actual test results

| Run | Source users | Restored users | Source reqs | Restored reqs | Verified |
|-----|--------------|----------------|-------------|---------------|----------|
| 2026-09-14T11:00:01Z | 3 | 3 | 2 | 2 | **yes** (`data/backup-restore-report.json`) |

Local restore testing is **TESTED**. Staging/production off-host backups remain **NOT configured**.

## Proposed production backup strategy (when deployed)

| Item | Target |
|------|--------|
| Frequency | Daily full logical dump (`pg_dump`) + WAL if managed Postgres |
| Retention | ≥ 30 days daily |
| Encryption | At rest + TLS in transit |
| Off-host storage | Separate account/region |
| Restore testing | Quarterly into isolated staging |

## Migration safety

- All schema changes go through Prisma migrations.
- Never manually edit production tables.
- Rollback: restore from backup for data-loss scenarios.

## Audit immutability

`audit_logs` has no soft-delete column and no DELETE API. Treat audit data as append-only.

## Future legacy migration

See `docs/LEGACY_MIGRATION_MAP.md` and `npm run migration:dry-run`.
