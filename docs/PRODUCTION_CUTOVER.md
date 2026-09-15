# Production cutover

**Do not execute until written authorization exists.**

Related: `docs/CUTOVER.md`, `docs/PRODUCTION_DEPLOYMENT.md`.

## Pre-cutover checklist

- [ ] RC baseline frozen (`RELEASE_BASELINE.md`)
- [ ] Live Musooka recon complete; reconciliation matrix updated
- [ ] Business acceptance signed (`BUSINESS_ACCEPTANCE.md`)
- [ ] Penetration test findings remediated or accepted
- [ ] Production secrets, SMTP, TLS, backups, monitoring alerts live
- [ ] Migration dry-run + isolated load accepted
- [ ] Rollback drill documented and understood
- [ ] Communication plan for users

## Cutover steps (not executed)

1. **Data freeze** — stop/queue writes on legacy (maintenance window)
2. **Legacy backup** — full DB + filesystem attachments; verify checksums
3. **Final extraction** — export agreed tables/files
4. **Migration** — transform/validate/load into new production DB
5. **Validation** — totals, FK integrity, sample workflows
6. **Smoke testing** — login, requisition path, reports, admin
7. **DNS/proxy switch** — point traffic to new Nginx
8. **Monitoring** — watch 5xx, latency, auth failures
9. **Rollback decision window** — predefined duration (e.g. 2–4 hours)
10. **Post-cutover observation** — 24–72h heightened watch

## Rollback triggers

| Trigger | Action |
|---------|--------|
| Auth systematically failing | Traffic → legacy |
| Data corruption / integrity failure | Freeze new writes; traffic → legacy; investigate |
| Critical workflow broken (approve/submit) | Traffic → legacy |
| 5xx rate above agreed threshold | Traffic → legacy |
| Authorization/IDOR emergency | Traffic → legacy; patch offline |

## Rollback mechanics

| Layer | Method | Limitation |
|-------|--------|------------|
| Traffic | DNS/proxy back to legacy | Propagation delay |
| Application | Keep prior image; do not “hotfix live” during rollback | — |
| Database | Prefer **not** reverse-migrate; restore from pre-cutover backup if new DB diverged | Forward migrations may be irreversible without restore |
| Legacy | Remains read/write capable until decommission | Must not have been modified during candidate phase |

## Absolute rule

No DNS change, no production DB write, no legacy code change until this checklist is authorized.
