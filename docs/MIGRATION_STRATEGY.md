# Migration strategy (legacy → new stack)

This repository does **not** migrate or modify the existing musooka.site Laravel database.

## When production DB connectivity returns

1. `npm run restore:check`
2. `npm run production:recon`
3. Authenticate with recon credentials from local `.env` only
4. Crawl authenticated pages → `data/live/`
5. `npm run reconcile` → review `data/reconciliation-report.md`
6. Compare live workflows, roles, statuses, fields, and reports with this schema

## Inventory targets

- Users (status, contact fields)
- Roles / permissions (names may differ from proposed codes)
- Departments / organizational units
- Requisitions and line items
- Approvals and status history
- Attachments (storage paths, MIME types)
- Notifications / audit if present

## Safe migration principles

- Map through an explicit transform layer; do not `INSERT SELECT *` into new tables.
- Validate every row; quarantine failures.
- Passwords: never import plaintext; only migrate recognized hashes or force reset.
- Preserve historical status events as append-only history where possible.
- Attachments: copy to object storage outside the web root; re-hash filenames.
- Run dual-read or shadow writes in staging before cutover.

## Cutover gate

Cutover is blocked until:

- Live recon reconciled
- Staging restore + smoke tests pass
- Backup/restore proven
- Production readiness checklist signed off
