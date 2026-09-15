# Production readiness gate

**Do not deploy to or modify musooka.site without cutover authorization.**

## Classification (authoritative)

| State | Status |
|-------|--------|
| **ENGINEERING READY** | **YES** — RC `1.0.0-rc.1` / tag `v1.0.0-rc.1` |
| **ORGANIZATIONAL DEPENDENCY** | **YES** — see checklist below |
| **BLOCKED** (for production go-live) | **YES** |
| **APPROVED FOR PRODUCTION** | **NO** |

Desired summary:

> **ENGINEERING READY**  
> **PRODUCTION BLOCKED BY EXTERNAL DEPENDENCIES**  
> **APPROVED FOR PRODUCTION = NO**

## Engineering gate (met)

- [x] Local tests pass (frontend 52/52, backend 43/43)
- [x] Controlled staging passes (E2E, multi-role, security, reset, backup, DR)
- [x] Real API + PostgreSQL
- [x] Browser E2E API mode
- [x] Multi-role server enforcement
- [x] Security tests on staging
- [x] Password reset (lab SMTP)
- [x] Backup restore tested (staging)
- [x] DR exercise tested (staging)
- [x] Production configuration documented + fail-fast hardened (`production:config-check`)
- [x] Production smoke suite (`production:smoke`; explicit `BASE_URL`; refuses legacy host by default)
- [x] Deployment reproducible (`staging:up` / Dockerfiles / runbooks)
- [x] Rollback documented
- [x] Migration tooling ready (`migrate deploy` without seed)
- [x] Monitoring design ready (lab deployed; fan-out pending)
- [x] Git freeze + annotated tag `v1.0.0-rc.1`
- [x] Release handoff doc (`docs/RELEASE_HANDOFF.md`)

## Organizational dependencies (not inventable locally)

Required before production — **do not mark complete without evidence**:

- [ ] Dedicated production host
- [ ] Production DNS
- [ ] Public CA certificate
- [ ] Production SMTP
- [ ] Off-host encrypted backup
- [ ] Production monitoring alert destination
- [ ] Penetration test
- [ ] Legacy authenticated reconciliation
- [ ] Real legacy export
- [ ] Migration validation
- [ ] Business acceptance
- [ ] Cutover approval
- [ ] Organizational Git remote

## Engineering blockers (residual)

| Item | Severity | Notes |
|------|----------|-------|
| Live recon incomplete | High for cutover | `readyForAuthCrawl=false`; blocks confirming RBAC/lifecycle vs legacy |
| Pen-test not executed | Medium | Scope ready; waiting on security team |
| Production alert destination | Medium | Prometheus rules exist; no pager/Slack/email fan-out |
| Production off-host backup | High for go-live | Staging only; prod blocked until destination + keys |

## Production blockers = organizational + recon + approval

No production traffic switch until all organizational dependencies and `PRODUCTION_CUTOVER.md` are satisfied.

## Evidence index

| Artifact | Path |
|----------|------|
| Handoff | `docs/RELEASE_HANDOFF.md` |
| Baseline | `docs/RELEASE_BASELINE.md` |
| RC report | `docs/RELEASE_CANDIDATE.md` |
| Config audit | `docs/PRODUCTION_CONFIG_AUDIT.md` |
| Staging acceptance | `docs/STAGING_ACCEPTANCE.md` |
| Security review | `docs/SECURITY_REVIEW.md` |
| Pen-test scope | `docs/PENETRATION_TEST_SCOPE.md` |
| Backup plan | `docs/PRODUCTION_BACKUP_PLAN.md` |
| Monitoring | `docs/PRODUCTION_MONITORING.md` |
