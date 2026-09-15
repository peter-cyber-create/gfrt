# Architecture

Production-foundation architecture for Musooka. The existing presentation UI is preserved; a real API, database, and operational layer sit beside it.

## Separation of concerns

| Layer | Path | Role |
|-------|------|------|
| Frontend (UI) | `clone/` | React + Vite presentation; Bootstrap/Nunito look preserved |
| Backend (API) | `backend/` | Express + TypeScript REST API (`/api/v1`) |
| Database | PostgreSQL via Prisma | Schema + deterministic migrations in `backend/prisma` |
| Infrastructure | `infra/` | Docker Compose (Postgres), Dockerfiles, Nginx sample |
| Recon tooling | `scripts/` | Read-only production inspection (`restore:check`, `production:recon`, crawl) |
| Documentation | `docs/` | Architecture, ops, readiness, recon notes |

Conceptual layout (preserved physical names where the clone already lived):

```
clone/          # frontend
backend/        # API + Prisma
infra/          # deployment / local Postgres
scripts/        # recon + validate
docs/
data/           # recon outputs (gitignored where sensitive)
```

## Request flow

```
Browser
  → clone (React)
      → service facade (clone/src/services/index.js)
          → DEMO: mock services (offline)
          → API:  HTTP client → backend /api/v1
              → Controller/routes
              → Domain/services
              → Prisma repositories
              → PostgreSQL
```

## Modes

1. **Demo** (`VITE_DEMO_MODE=true`, default) — mock services only; production hosts blocked by network guard.
2. **API/local** (`VITE_DEMO_MODE=false`, `VITE_DATA_SOURCE=api`) — facade calls local backend; never points at musooka.site by default.
3. **Live recon** — Node/Playwright scripts under `scripts/`; does not modify production.

## Backend layering

```
routes (HTTP) → services (business rules) → Prisma (persistence)
```

Critical transitions (approve/reject/submit/…) run in database transactions and always write `status_history` + `audit_logs`.

## Proposed domain (not production-verified)

Until live recon reconciles `data/live/`:

- Statuses: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `PROCESSING`, `COMPLETED`, `CANCELLED`
- Permissions: `requisition.*`, `report.*`, `user.*`, `role.*`, `settings.view`, `audit.view`

Do not treat these as facts about the current Laravel production system.

## Auth model

- Argon2id password hashes
- Opaque session tokens stored as SHA-256 hashes in `sessions`
- HttpOnly cookie `musooka_sid` (+ optional Bearer for API clients)
- Server-side RBAC via `roles` / `permissions` / join tables
- Failed-login lockout via env-configured thresholds

## Non-goals of this phase

- No deploy to musooka.site
- No changes to the existing production Laravel app or DB
- Demo mode remains fully offline
