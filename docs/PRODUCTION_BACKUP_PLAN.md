# Production backup plan

**Status:** Plan only. Staging encrypted backup/restore is **tested**. Production off-host backups are **not active**.

## Objectives

| Metric | Preliminary target |
|--------|-------------------|
| RPO | ≤ 24 hours (daily logical dump); improve with WAL if managed Postgres |
| RTO | ≤ 4 hours for DB restore to standby (org-dependent) |

## Requirements

| Item | Specification |
|------|----------------|
| Frequency | Daily full `pg_dump` (custom format `-Fc`); optional continuous WAL on managed Postgres |
| Encryption | AES-256 (or cloud KMS) **before** or at rest on off-host storage |
| Key management | Encryption keys in vault/KMS; **not** stored alongside ciphertext only; rotate annually |
| Retention | 30 days daily; 12 monthly; legal hold as required |
| Off-host destination | Separate account/region/bucket from primary DB host |
| Access control | Least privilege; break-glass dual control for decrypt |
| Restore testing | Quarterly restore into isolated DB; never overwrite live |
| Monitoring | Alert on backup job failure / missing daily artifact |

## Staging evidence (not production)

- Script: `scripts/staging-encrypted-backup.sh`
- Report: `data/staging-backup-report.json` — `restoreTestPassed: true`, `activeDbUntouched: true`

## Production implementation checklist (unchecked until real)

- [ ] Backup job scheduled on production DB host or managed service
- [ ] Off-host destination provisioned
- [ ] Encryption keys in org secret store
- [ ] First successful production dump verified
- [ ] Restore drill into non-prod clone completed
- [ ] Alert on backup failure wired to on-call

## Forbidden

- Claiming production backups exist based on staging tests alone  
- Storing unencrypted dumps on the app server as the only copy  
- Restoring over the active production database during drills  
