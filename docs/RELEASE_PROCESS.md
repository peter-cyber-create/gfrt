# Release process

## Versioning

- Release candidate identity: `VERSION` file + `docs/RELEASE_BASELINE.md` + `docs/RELEASE_CANDIDATE.md`
- Current RC: **1.0.0-rc.1**
- Prefer git tags (`v1.0.0-rc.1`) once the repo is under version control

## Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | localhost / Vite | Feature work, unit tests |
| Controlled staging | https://127.0.0.1:8443 | Integration, E2E, security, DR |
| Org staging / production | TBD | Organizational dependency |
| Legacy production | musooka.site | **Untouched** until cutover approval |

## Staging release

1. Freeze baseline (`RELEASE_BASELINE.md`)
2. `npm run ci:local` — typecheck, backend tests, frontend build
3. `npm run staging:up`
4. Acceptance: `staging:e2e`, `staging:multirole`, `staging:security`, `staging:reset-e2e`, `staging:backup`, `staging:dr`
5. Complete `STAGING_ACCEPTANCE.md`
6. Tag RC

## Production release (future)

1. Engineering READY + org dependencies satisfied (`PRODUCTION_READINESS.md`)
2. Follow `PRODUCTION_DEPLOYMENT.md` then `PRODUCTION_CUTOVER.md`
3. Never copy `infra/staging/.env` to production
4. Backup-before-migrate mandatory

## Rollback

- Staging: redeploy prior image / restore encrypted backup to non-active DB
- Production: traffic rollback to legacy; DB restore only if new DB diverged — see `PRODUCTION_CUTOVER.md`
