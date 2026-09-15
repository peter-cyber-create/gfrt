# Release baseline — 1.0.0-rc.1

| Field | Value |
|-------|-------|
| **Release candidate** | `1.0.0-rc.1` |
| **Git tag** | `v1.0.0-rc.1` |
| **Recorded at (UTC)** | 2026-09-15T05:50:00Z (RC freeze / git init) |
| **Git commit** | See `git rev-parse v1.0.0-rc.1` after tag (recorded in VERSION notes below if present) |
| **Content fingerprint** | `5bc048477605f73c61236a527c93c1faac36da131371914ac0558e2fc4f2cf44` |
| **Fingerprint method** | `sha256sum backend/package-lock.json clone/package-lock.json package-lock.json backend/prisma/migrations/*/migration.sql \| sha256sum` |
| **Application version** | `1.0.0` (`package.json` / `backend/package.json`); RC marker in `VERSION` |
| **Latest migration** | `20260914105648_password_reset_tokens` |
| **Prior migration** | `20260914104847_init` |
| **Frontend mode (staging)** | `VITE_DEMO_MODE=false`, `VITE_DATA_SOURCE=api` |
| **Staging URL** | `https://127.0.0.1:8443` (controlled host; self-signed TLS) |

## Verified test results (this baseline)

| Suite | Result | Evidence |
|-------|--------|----------|
| Frontend demo Playwright | **52/52** | `npm run validate` 2026-09-15 |
| Backend automated | **43/43** | `backend` vitest 2026-09-15 |
| Staging browser E2E | **13/13** | `data/staging-e2e-results.json` |
| Multi-role API | **12/12** | `data/staging-multirole.json` |
| Security checks | **8/8** | `data/staging-security-check.json` |
| Password reset E2E | **6/6** | `data/staging-password-reset-e2e.json` |
| Backup / restore | **PASSED** | `data/staging-backup-report.json` |
| Disaster recovery | **PASSED** | `data/staging-dr-report.json` |
| Production config-check | **PASS** (example env) / **FAIL** (empty) | `npm run production:config-check` |
| Production smoke (staging candidate) | **PASSED** | `BASE_URL=https://127.0.0.1:8443` |
| Legacy host smoke default | **REFUSED** (exit 2) | `BASE_URL=https://musooka.site` |

**Total automated tests counted for RC:** 52 + 43 = **95** (plus staging operational suites above).

## Staging evidence

- Health/ready: OK on `https://127.0.0.1:8443`
- Security regression: 8/8
- Backup restore: staging encrypted restore passed; production off-host **not** provisioned
- DR: staging passed

## Security evidence

- Staging security suite 8/8
- Backend production fail-fast in `backend/src/config.ts`
- `npm run production:config-check` rejects demo/Mailpit/localhost/weak secrets
- Pen-test: **not executed** (org dependency); scope in `docs/PENETRATION_TEST_SCOPE.md`

## Backup evidence

- Staging: encrypted backup + restore verified
- Production: **BLOCKED** until real off-host storage + key custody exist (`docs/PRODUCTION_BACKUP_PLAN.md`)

## DR evidence

- Staging DR exercise: PASSED (`data/staging-dr-report.json`)

## Known limitations

1. Lifecycle and RBAC vs legacy remain **PROPOSED / UNKNOWN** (`readyForAuthCrawl=false`).
2. Production SMTP, DNS, public CA, dedicated host, alert fan-out: absent.
3. Production seeding must never use `db:seed` (dev/staging accounts only). Production path: `prisma migrate deploy` only.
4. Self-signed TLS is lab/staging only.

## External blockers

See organizational checklist in `docs/PRODUCTION_READINESS.md` and `docs/RELEASE_HANDOFF.md` — all items unchecked.

## Builds (reproducibility)

| Artifact | How to reproduce |
|----------|------------------|
| Backend | `cd backend && npm ci && npx prisma generate && npm run build` |
| Frontend (demo) | `cd clone && npm ci && npm run build` with `VITE_DEMO_MODE=true` |
| Frontend (API) | Docker build args `VITE_DEMO_MODE=false` `VITE_DATA_SOURCE=api` + API base URL |
| Staging stack | `npm run staging:up` |
| Migrations (no seed) | `npm --prefix backend run db:migrate` → `prisma migrate deploy` |

## Dependency locks

- `package-lock.json`
- `backend/package-lock.json`
- `clone/package-lock.json`

## Classification at baseline

| Gate | Status |
|------|--------|
| ENGINEERING READY | **Yes** |
| APPROVED FOR PRODUCTION | **No** |
| PRODUCTION BLOCKED BY EXTERNAL DEPENDENCIES | **Yes** |

## Notes

1. Do not modify musooka.site as part of this release candidate.
2. Git tag `v1.0.0-rc.1` freezes this handoff baseline.
