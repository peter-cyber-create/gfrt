# Legacy migration map

**Do not migrate yet.** Status is **UNKNOWN** until live recon confirms shapes. Dry-run only: `npm run migration:dry-run`.

| Source (legacy) | Destination | Transformation | Validation | Risk |
|-----------------|-------------|----------------|------------|------|
| users | `users` | Map email→unique lowercased; status codes→`UserStatus`; department FK lookup | Email unique; required name; reject blank passwords | **High** — password algorithm unknown |
| password hashes | `users.password_hash` | Only migrate recognized Argon2/bcrypt hashes; else force reset | Hash format prefix check | **Critical** — never import plaintext |
| roles | `roles` + `user_roles` | Name map table (after recon) | Role exists before assign | Medium — name mismatch |
| permissions | `permissions` + `role_permissions` | Map legacy abilities→proposed codes | Unknown codes quarantined | High until recon |
| departments | `departments` | Trim/unique name | Unique constraint | Low |
| requisitions | `requisitions` | Status label→enum map; amounts→int; requester email→user id | Enum membership; FK present | High — status vocabulary unknown |
| line items | `requisition_items` | Qty/cost coerce | Positive qty | Medium |
| approvals | `approvals` | Decision normalize | Actor FK | Medium |
| history | `status_history` | Ordered events; null `from_status` for create | Chronological | Medium |
| attachments | `attachments` + object storage | Copy bytes; sanitize filename; re-key | MIME allowlist; size | High — path traversal / malware |
| sessions | — | **Do not migrate** | Force re-login | Low |
| notifications | `notifications` | Optional | — | Low / NEW |
| audit | `audit_logs` | Optional import as historical | Append-only after cutover | Medium |

## Password migration (separate)

1. Inventory hash formats from a read-only legacy sample.
2. If bcrypt/argon2 recognizable → import into `password_hash`.
3. Otherwise → set random unusable hash + require reset email.
4. Never log or export plaintext credentials into fixtures committed to git.

## Dry-run

```bash
npm run migration:dry-run
```

Writes stats only — **no writes** to any database.
