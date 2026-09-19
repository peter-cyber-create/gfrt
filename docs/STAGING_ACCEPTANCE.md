# Staging acceptance checklist

Isolated controlled staging: **https://127.0.0.1:8443**  
**Not** musooka.site. **Not** a separate org cloud host (temporary controlled IP/hostname).

## Infrastructure

- [x] Staging compose stack (`infra/staging/docker-compose.yml`)
- [x] DNS/hostname documented as `127.0.0.1` / temporary controlled endpoint
- [x] TLS (self-signed lab cert) + HTTP→HTTPS redirect on :8088→8443
- [x] Nginx proxy (frontend + API + health)
- [x] Docker non-root API image (`Dockerfile.staging`)
- [ ] Public CA / org DNS hostname

## Application

- [x] Frontend (`VITE_DEMO_MODE=false`, API mode)
- [x] API healthy via `https://127.0.0.1:8443/health`
- [x] PostgreSQL ready via `/ready`
- [x] Migrations on clean staging DB
- [x] Staging seed accounts `@gfrt.local` only

## Authentication

- [x] Login / logout / session cookie Secure+HttpOnly
- [x] Password reset request → Mailpit email → confirm → login
- [x] Old password rejected; token single-use

## Authorization

- [x] Admin / reviewer / user browser coverage (`staging-e2e`)
- [x] API enforcement: user cannot approve / manage users; reviewer can approve (`staging-multirole`)

## Core workflows

- [x] Create → submit → review → approve
- [x] Notification on approve
- [x] Audit log records approve
- [ ] Rejection / completion covered in dedicated staging E2E cases (available via API; not all exercised in browser suite)

## Operations

- [x] Structured logging (requestId, method, route, status, duration)
- [x] Prometheus + blackbox probes (localhost:9090)
- [x] Encrypted off-container backup + restore to separate DB
- [x] DR: stop API → ready fails → recover
- [ ] Off-host object storage for backups (files currently under `data/staging-backups/` on this host)
- [ ] Alert fan-out (email/Slack/PagerDuty)

## Security

- [x] HTTPS / HSTS / Secure cookies
- [x] CSRF invalid Origin → 403
- [x] Oversized body → 413
- [x] Unauthenticated → 401
- [x] Headers scan (nosniff / frame options)
- [x] IDOR/privilege checks via multi-role API suite
- [ ] External professional penetration test

## Testing

- [x] Backend 43/43
- [x] Frontend demo 52/52 (unchanged)
- [x] Staging browser E2E 13/13
- [x] Multi-role API 12/12
- [x] Password reset E2E 6/6
- [x] Security check 8/8
- [x] Perf baseline comparison recorded

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | automated | 2026-09-14 | Controlled-host staging verified |
| QA | | | Pending org remote staging |
| Security | | | Pending public CA + pen test |
