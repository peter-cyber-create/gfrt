# Reconciliation matrix (new system vs live Musooka)

Status key: **CONFIRMED** | **DIFFERENT** | **MISSING** | **NEW** | **UNKNOWN**

**RC note (1.0.0-rc.1):** Authenticated live crawl still unavailable (`readyForAuthCrawl: false` as of 2026-09-14 restore:check). Proposed lifecycle/RBAC remain **UNKNOWN / not production-verified**.

Sources: public crawl + `data/live/restore-check.json`.

| Feature | New system | Old Musooka (known) | Status | Decision |
|---------|------------|---------------------|--------|----------|
| Public login page | `/login` | Laravel login at musooka.site | CONFIRMED | Keep parity |
| Register / password reset pages | Present in UI | Public routes exist | CONFIRMED | Keep UI; backend reset is NEW architecture |
| App title / branding | Global Fund Requisition Performance Tracker | Same branding on public pages | CONFIRMED | Preserve |
| Authenticated nav | 11 routes in clone | Auth-gated paths when redirects worked | UNKNOWN | Confirm after auth crawl |
| Requisition lifecycle statuses | 8 proposed codes | Not verified | UNKNOWN | Reconcile after `data/live/` |
| RBAC permission codes | Proposed `requisition.*` etc. | Not verified | UNKNOWN | Map after live roles crawl |
| Dashboard KPIs | Derived from requisitions | Not verified | UNKNOWN | Compare widgets |
| Reports | Catalog + dashboard metrics | Not verified | UNKNOWN | Compare report list |
| Audit log | Server append-only | Unknown if present | NEW / UNKNOWN | Keep; reconcile if legacy has audit |
| Notifications | In-app | Unknown | NEW / UNKNOWN | Keep unless live differs |
| Demo mode | Offline mock facade | N/A | NEW | Keep for presentation |
| Argon2id sessions | New stack | Laravel sessions (likely) | DIFFERENT | Do not copy hashes blindly |
| Database engine | PostgreSQL (new) | MySQL/MariaDB likely | DIFFERENT | Transform on migration |
| Production host | Not deployed | musooka.site | CONFIRMED | Do not modify until cutover |

## Process when DB returns

1. `npm run restore:check`
2. `npm run production:recon`
3. Authenticate + crawl → `data/live/`
4. `npm run reconcile`
5. Update this matrix cell-by-cell — **no guessing**
6. Feed into business acceptance + migration mapping
