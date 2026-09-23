# Production readiness status (engineering snapshot)

Generated as part of the demo → production conversion workstream.

## Not production-ready for live cutover

GitHub Pages (`https://peter-cyber-create.github.io/gfrt/`) remains a **static demo** (`VITE_DEMO_MODE=true`). A real production deployment still requires an API host, PostgreSQL, SMTP, TLS, backups, and monitoring.

## Engineering (verified locally)

| Check | Result |
|-------|--------|
| Frontend Playwright validate (demo) | **69/69** |
| Backend Vitest (PostgreSQL test DB) | **48/48** |
| Backend `tsc --noEmit` | Pass |
| Pages production build | Pass (demo flags) |
| Change-password API | Implemented + tested |
| Draft update + server totals | Implemented + tested |
| Multi-item New Requisition UI | Implemented + demo-tested |

## Infrastructure (external blockers)

| Item | Status |
|------|--------|
| Production API hostname | **Not configured** — set `VITE_API_BASE_URL` |
| Production PostgreSQL | **Not provisioned** for this cutover |
| DNS / TLS / reverse proxy | **Org-owned** |
| Real SMTP (non-Mailpit) | Required by `backend/src/config.ts` fail-fast |
| Off-host encrypted backups | Documented; not verified here |
| Monitoring / alerting | Documented; not verified here |

## Functional (code path)

| Capability | Demo | API mode |
|------------|------|----------|
| Login / logout / session | Mock | Cookie session + lockout |
| Change password | Local vault | `POST /api/v1/auth/change-password` |
| Password reset | Local token link | SMTP + hashed tokens |
| Admin reset | Presentation accounts | `POST /api/v1/users/:id/reset-password` |
| New requisition + line items | Mock | Create + PATCH draft; totals server-side |
| Save draft / submit | Mock | Create DRAFT → `POST .../submit` |
| Approvals / history / audit | Mock | Existing lifecycle service |
| Attachments | Mock metadata | Upload/download API (durable storage required) |
| Users / roles / notifications / reports | Mock / API-backed where wired | API |

## Reconciliation

See `docs/PRODUCTION_RECONCILIATION.md`. Authenticated Musooka crawl is still unavailable — requisition form fields are **RECONSTRUCTED** from Prisma/API, not claimed as crawled HTML.

## Remaining blockers to claim “production live”

1. Deploy Express API + PostgreSQL behind HTTPS with production env gates.
2. Set frontend `VITE_DEMO_MODE=false`, `VITE_DATA_SOURCE=api`, `VITE_API_BASE_URL=https://…`.
3. Configure real SMTP + `PASSWORD_RESET_URL_BASE`.
4. Durable attachment storage (not ephemeral local disk on serverless).
5. Run `staging:e2e` / `staging:security` / `production:config-check` against that environment.
6. Complete authenticated crawl reconciliation when DB access returns.
