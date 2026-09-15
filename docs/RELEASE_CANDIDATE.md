# Release candidate — Musooka 1.0.0-rc.1

## Identity

| Field | Value |
|-------|-------|
| Version | **1.0.0-rc.1** |
| Git tag | `v1.0.0-rc.1` (see `git rev-parse v1.0.0-rc.1^{}`) |
| Content fingerprint | `5bc048477605f73c61236a527c93c1faac36da131371914ac0558e2fc4f2cf44` |
| Baseline doc | `docs/RELEASE_BASELINE.md` |
| Handoff doc | `docs/RELEASE_HANDOFF.md` |
| Date | 2026-09-15 |

## Tests

| Suite | Result |
|-------|--------|
| Frontend demo | 52/52 |
| Backend | 43/43 |
| Staging browser E2E | 13/13 |
| Multi-role | 12/12 |
| Security | 8/8 |
| Password reset | 6/6 |
| Backup/restore | PASSED |
| DR | PASSED |

## Database

- Migrations: `20260914104847_init`, `20260914105648_password_reset_tokens`
- Schema review: `docs/DATABASE_SCHEMA_REVIEW.md`
- App role non-superuser (staging): verified

## Security

- Review: `docs/SECURITY_REVIEW.md`
- Pen-test scope: `docs/PENETRATION_TEST_SCOPE.md` (execution = org)
- Config fail-fast hardened for production (no Mailpit/mock/dev DB)

## Performance

Staging vs local baseline: small deltas only (`data/staging-perf.json`).

## Backup / DR

- Staging encrypted backup + isolated restore: PASSED  
- Production backup: **plan only** (`PRODUCTION_BACKUP_PLAN.md`)

## Deployment

- Reproducible staging: `npm run staging:up`  
- Production runbook: `PRODUCTION_DEPLOYMENT.md` (not executed on musooka.site)

## Monitoring

- Lab Prometheus/blackbox: up  
- Alert fan-out: **organizational dependency**

## Migration / reconciliation

- Dry-run tooling: present  
- Live Musooka authenticated recon: **not complete** (DB auth still unverified)  
- Lifecycle/RBAC: **proposed**, not production-verified

## Known limitations

1. No org remote host / public CA / DNS  
2. SMTP is Mailpit in lab only  
3. No off-host production backup destination  
4. No pager destination  
5. No git history yet  
6. Legacy data not migrated  
7. Business acceptance pending recon  

## Classification

```
ENGINEERING READY
PRODUCTION BLOCKED BY EXTERNAL DEPENDENCIES
APPROVED FOR PRODUCTION = NO
```

Legacy musooka.site remains **untouched**.
