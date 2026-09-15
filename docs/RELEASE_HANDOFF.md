# Release handoff — 1.0.0-rc.1

**Audience:** engineering + organizational production owners  
**Purpose:** freeze and transfer the release candidate for onboarding — **not** to authorize production cutover.

## Release identity

| Field | Value |
|-------|-------|
| Release | `1.0.0-rc.1` |
| Git tag | `v1.0.0-rc.1` |
| Content fingerprint | `5bc048477605f73c61236a527c93c1faac36da131371914ac0558e2fc4f2cf44` |
| Classification | **ENGINEERING READY** / **PRODUCTION BLOCKED BY EXTERNAL DEPENDENCIES** |
| Approved for production | **NO** |

See `docs/RELEASE_BASELINE.md` for commit SHA after tag creation.

## Verified engineering baseline

| Gate | Status |
|------|--------|
| Automated tests | Frontend **52/52** + Backend **43/43** = **95** |
| Staging | Verified (`https://127.0.0.1:8443`) |
| Security regression | Verified (staging **8/8**) |
| Backup | Staging encrypted restore verified |
| DR | Staging verified |
| Production config gate | `npm run production:config-check` |
| Production smoke | `BASE_URL=… npm run production:smoke` (requires explicit URL; refuses `musooka.site` by default) |

## Legacy reconciliation

| Item | Status |
|------|--------|
| Legacy host | `musooka.site` — **must remain untouched** |
| `readyForAuthCrawl` | **false** (legacy DB/auth unavailable via non-invasive recon) |
| Roles / permissions / lifecycle / reports | **PROPOSED / UNKNOWN** until authenticated recon |

When legacy DB access is provided (read-only tooling only):

1. `npm run restore:check`
2. `npm run production:recon`
3. Authenticate → crawl → reconcile

Do **not** run intrusive scans or write operations against legacy production.

## Production infrastructure

**Not provisioned.** Lab/staging only.

## Organizational checklist (all open)

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

Do not mark items complete without evidence.

## Handoff commands (engineering)

```bash
# Reproduce automated baseline
cd backend && npm test          # expect 43/43
cd .. && CLONE_URL=http://127.0.0.1:5175 npm run validate  # expect 52/52

# Config fail-fast (no production connection)
NODE_ENV=production ENV_FILE=/path/to/prod.env npm run production:config-check

# Smoke against a *candidate* host only (never default musooka.site)
BASE_URL=https://candidate.example SMOKE_EMAIL=… SMOKE_PASSWORD=… npm run production:smoke

# Controlled staging stack
npm run staging:up
```

## Authoritative docs

| Doc | Role |
|-----|------|
| `docs/PRODUCTION_READINESS.md` | Classification gate |
| `docs/RELEASE_BASELINE.md` | Fingerprint + evidence |
| `docs/PRODUCTION_CUTOVER.md` | Cutover (blocked) |
| `docs/PRODUCTION_BACKUP_PLAN.md` | Backup (prod off-host blocked) |
| `docs/PRODUCTION_MONITORING.md` | Alerts (destination pending) |

## Explicit non-goals of this handoff

- Deploying to or modifying `musooka.site`
- Claiming production readiness
- Inventing org infrastructure or alert destinations
