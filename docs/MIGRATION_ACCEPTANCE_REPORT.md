# Migration acceptance report format

Use for every dry-run / isolated load. **Never** write to production from this process.

## Header

| Field | Value |
|-------|-------|
| Report ID | |
| Date (UTC) | |
| Operator | |
| Source export ID / checksum | |
| Target DB | isolated migration DB only |
| Tool version / RC | `1.0.0-rc.1` |
| Mode | dry-run / isolated-load |

## Statistics (required)

| Metric | Count |
|--------|-------|
| Source records (total) | |
| Source by entity (users / roles / departments / requisitions / items / approvals / history / attachments) | |
| Target records after load | |
| Converted (OK) | |
| Rejected | |
| Duplicates | |
| Warnings | |
| Missing relationships | |

## Per-entity detail

| Entity | Source | Converted | Rejected | Duplicates | Warnings | Missing FKs |
|--------|--------|-----------|----------|------------|----------|-------------|
| users | | | | | | |
| roles | | | | | | |
| departments | | | | | | |
| requisitions | | | | | | |
| requisition_items | | | | | | |
| approvals | | | | | | |
| status_history | | | | | | |
| attachments | | | | | | |

## Password handling

| Metric | Count |
|--------|-------|
| Recognized hashes migrated | |
| Forced reset required | |
| Plaintext encountered (must be 0) | |

## Integrity checks

- [ ] FK violations = 0  
- [ ] Unique violations explained or fixed  
- [ ] Status enum mapping coverage 100% or quarantined  
- [ ] Attachment files checksum-verified  
- [ ] No silent discards (every reject has reason code)

## Decision

| Outcome | Sign-off |
|---------|----------|
| Accept for production migration planning | |
| Rework required | |
| Reject export | |

## Command

```bash
npm run migration:dry-run
# Future: load into isolated DB only after dry-run acceptance
```
