# Cutover runbook (draft)

**Production cutover is blocked** until staging verification and live reconciliation complete.

## Pre-cutover

- [ ] `data/reconciliation-matrix.md` — no critical MISSING items unresolved
- [ ] Backup/restore tested (`npm run backup:test`)
- [ ] Staging smoke green (`npm run staging:smoke`)
- [ ] Security tests green (`npm run api:test`)
- [ ] Legacy migration dry-run reviewed (`npm run migration:dry-run`)
- [ ] TLS + HSTS verified on staging
- [ ] Rollback plan documented (restore DB + previous image tag)

## Cutover window (high level)

1. Enable maintenance page on legacy (out of scope for this repo).
2. Final legacy export → validate → import scripts (TBD).
3. Deploy new stack to staging-equivalent production environment.
4. Run smoke + manual UAT with real roles.
5. Switch DNS / reverse proxy to new stack.
6. Monitor `/ready`, error logs, auth failures for 24h.

## Rollback

1. Revert proxy to legacy application.
2. Restore PostgreSQL from pre-cutover dump if new DB was promoted.
3. Document incident and reconciliation gaps.

## Post-cutover

- Force password reset for users whose legacy hash algorithm could not be migrated.
- Re-run reconciliation matrix with live data.
