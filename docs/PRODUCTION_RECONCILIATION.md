# Production reconciliation matrix (GFRT)

Status vocabulary for this table:

| Label | Meaning |
|-------|---------|
| **OBSERVED** | Seen in crawl / live public pages / screenshots |
| **RECONSTRUCTED** | Built from schema, domain model, or documented requirements — not confirmed by authenticated crawl |
| **IMPLEMENTED** | Present in current codebase (API and/or UI) |
| **UNKNOWN** | Insufficient evidence (typically authenticated Musooka screens) |

Authenticated live crawl of musooka.site remains unavailable (`readyForAuthCrawl: false`). Do not treat reconstructed workflows as crawled evidence.

| Area | Original evidence | Current implementation | Status |
|------|-------------------|------------------------|--------|
| Login | OBSERVED public Laravel login | API cookie session + RBAC | IMPLEMENTED (architecture DIFFERENT from Laravel) |
| Registration | OBSERVED public route | UI shell; API may differ | PARTIAL / RECONSTRUCTED |
| Password reset | OBSERVED public routes | API request/confirm + SMTP abstraction; demo local vault | IMPLEMENTED |
| Change password (signed-in) | UNKNOWN (auth crawl missing) | `POST /api/v1/auth/change-password` + Settings | IMPLEMENTED (RECONSTRUCTED UX) |
| Admin password reset | UNKNOWN | `POST /api/v1/users/:id/reset-password` | IMPLEMENTED (RECONSTRUCTED) |
| Dashboard | UNKNOWN authenticated | Metrics from requisitions API / mock store | RECONSTRUCTED + IMPLEMENTED |
| Requisitions list | UNKNOWN authenticated | List, filter, sort, detail modal | RECONSTRUCTED + IMPLEMENTED |
| New Requisition form | UNKNOWN authenticated | Facility, district, department, description, required date, multi line-items, save draft / submit | RECONSTRUCTED from Prisma/API domain — **not** claimed as crawled HTML |
| Line items / totals | Schema-supported | Server recalculates UGX totals; client display only | IMPLEMENTED |
| Approval lifecycle | UNKNOWN live codes | 8-code domain + API transitions + audit/history | RECONSTRUCTED + IMPLEMENTED |
| Attachments | Schema + API | Upload/download API; UI upload/list | IMPLEMENTED (storage durable only with `STORAGE_BACKEND=local` volume / future object store) |
| Users | UNKNOWN | List/search/edit/disable + API | RECONSTRUCTED + IMPLEMENTED |
| Roles | UNKNOWN | Read-only catalogue + permissions | RECONSTRUCTED + IMPLEMENTED (no role mutation API) |
| Reports / Analytics / Performance | UNKNOWN | Derived from requisition data in API mode | RECONSTRUCTED + IMPLEMENTED |
| Notifications | UNKNOWN | API-backed list / mark read | RECONSTRUCTED + IMPLEMENTED |
| Audit | UNKNOWN | Append-only API audit log | NEW + IMPLEMENTED |
| Demo mode | N/A | Mock facade, Pages offline-safe | IMPLEMENTED (explicit `VITE_DEMO_MODE=true`) |
| Production API host | musooka.site (legacy) | Requires `VITE_API_BASE_URL` + deployed Express/Postgres | **BLOCKED** until org infrastructure exists |

## Funding / remarks fields

Not present on the Prisma `Requisition` model. Not invented in the form. Description covers purpose; funding source remains **UNKNOWN** pending authenticated crawl.

## GitHub Pages

Static demo only (`VITE_DEMO_MODE=true`). Not a production API deployment.
