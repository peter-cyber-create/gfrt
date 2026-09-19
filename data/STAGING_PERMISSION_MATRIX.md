# Staging Functional Audit — Permission Matrix (live from PostgreSQL RBAC)

Source: `/api/v1/auth/me` against presentation seed roles. Server-side enforcement via `requirePermission` / `assertPermission`.

| Permission | Administrator | Reviewer | Requester (User Demo) |
|---|---|---|---|
| requisition.view | ✓ | ✓ | ✓ |
| requisition.create | ✓ | | ✓ |
| requisition.edit | ✓ | | ✓ |
| requisition.submit | ✓ | | ✓ |
| requisition.approve | ✓ | ✓ | |
| requisition.reject | ✓ | ✓ | |
| report.view | ✓ | ✓ | ✓ |
| report.export | ✓ | ✓ | |
| user.view | ✓ | ✓ | |
| user.manage | ✓ | | |
| role.view | ✓ | | |
| role.manage | ✓ | | |
| settings.view | ✓ | | |
| audit.view | ✓ | | |

Additional staging roles (seed): Approver, Finance, Procurement, Auditor — see `backend/src/staging/presentationSeed.ts` `ROLE_PERMS`.

Frontend visibility uses the **session permission list from the API**, not the demo `ROLE_PERMISSIONS` map in `clone/src/data/permissions.js`.
