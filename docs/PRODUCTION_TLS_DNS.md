# Production domain and TLS (plan)

**Do not activate against live musooka.site until cutover approval.**

## Intended topology

```
Internet → DNS → HTTPS (public CA) → Nginx → Frontend + /api → API → PostgreSQL (private)
```

## Checklist (unchecked until provisioned)

- [ ] Production hostname decided (may be `musooka.site` after cutover **or** a new hostname)
- [ ] DNS A/AAAA records under org control
- [ ] Publicly trusted certificate (Let's Encrypt/ACME or org PKI)
- [ ] Automated renewal monitored
- [ ] Nginx: HTTP→HTTPS redirect, HSTS, TLS1.2+, security headers
- [ ] `COOKIE_SECURE=true`, appropriate `SameSite`
- [ ] `CORS_ORIGIN` exact production origin(s)
- [ ] Frontend built with `VITE_DEMO_MODE=false` and correct API base

## If the final hostname is musooka.site

| Rule | Action |
|------|--------|
| Until cutover | Leave existing Laravel app, DB, and Nginx **untouched** |
| Parallel deploy | New stack on isolated infra / alternate port or hostname |
| Cutover | Only after `docs/PRODUCTION_CUTOVER.md` approval |
| Rollback | DNS/proxy back to legacy; see rollback section |

## Current lab

- Self-signed cert at `https://127.0.0.1:8443` — **staging only**, not production TLS.
