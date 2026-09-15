# Concurrency control for requisition transitions

## Strategy

Requisition lifecycle transitions use **pessimistic row locking + optimistic status check**:

1. Inside a Prisma interactive transaction, the row is locked with `SELECT … FOR UPDATE` on `requisitions`.
2. The current status is validated against the lifecycle rules.
3. Status is updated with `updateMany({ where: { id, status: current } })` so a concurrent writer that changed status first yields `count === 0`.
4. On `count === 0`, the API returns **409 CONFLICT** with code `CONFLICT`.

This avoids adding a `version` column while still preventing lost updates on status transitions.

## Client guidance

- On **409**, refresh the requisition and retry or show a conflict message.
- Do not cache status across tabs without re-fetching before mutating.

## Audit immutability

`audit_logs` has **no soft-delete** and no DELETE API. Audit rows are append-only for compliance traceability.

## Session rotation

- Each login creates a new session row (hashed token in DB).
- Logout deletes the current session.
- Password reset deletes **all** sessions for the user.
- Future enhancement: cap concurrent sessions per user (e.g. invalidate oldest beyond N on login).

## Test hooks

`FORCE_TX_FAILURE=approve_after_status` (only when `NODE_ENV=test`) throws after the status update inside the transaction to prove rollback of history, approvals, notifications, and audit rows.
