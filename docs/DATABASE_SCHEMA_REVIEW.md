# Database schema final review (RC 1.0.0-rc.1)

## Identifier & time strategy

- UUIDs for primary keys  
- `created_at` / `updated_at` on mutable entities  
- Append-only: `audit_logs`, `status_history`, `approvals` (no update/delete API)

## Relationships (FK)

| Child | Parent | On delete |
|-------|--------|-----------|
| user_roles | users, roles | Cascade |
| role_permissions | roles, permissions | Cascade |
| requisitions | departments, users(requester) | Restrict (default) |
| requisition_items / approvals / status_history / attachments | requisitions | Cascade |
| notifications / sessions / password_reset_tokens | users | Cascade |
| audit_logs.actor_id | users | Set null allowed |

## Uniques & indexes

- `users.email` unique  
- `roles.name`, `permissions.code`, `departments.name`, `requisitions.number` unique  
- `sessions.token_hash` unique  
- Indexes on status, department, requester, audit (entity, actor, created_at, action)

## Concurrency

- Requisition transitions: `SELECT … FOR UPDATE` + status-conditioned `updateMany`  
- Documented in `docs/CONCURRENCY.md`

## Transactions

Critical path (approve etc.): status + history + approval + notification + audit in one transaction; rollback tested.

## Application DB user

Staging creates non-superuser `musooka_app`. Production must mirror: **no SUPERUSER**, no `CREATEDB` unless justified.

## Soft delete

Not used for audit/history. User disable via `status=DISABLED`.

## Migration execution procedure (forward-only)

1. Backup DB  
2. Review Prisma migration SQL in PR  
3. Apply on staging candidate: `npx prisma migrate deploy`  
4. Smoke + migrate status record  
5. Apply on production only during approved window  
6. **No** manual production table edits  
7. Rollback = restore from backup if migration is irreversible  

Migrations in this RC:

1. `20260914104847_init`  
2. `20260914105648_password_reset_tokens`  
