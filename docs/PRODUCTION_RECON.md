# Production reconnaissance

Read-only tooling for when `https://musooka.site` is healthy again.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run restore:check` | DNS / TCP 443 / TLS / HTTP / login page; **no login** |
| `npm run save-session` | Login once; save `playwright/.auth/musooka.json` |
| `npm run crawl` | Authenticated GET crawl → `data/*.json` + screenshots |
| `npm run production:recon` | Health → (optional) session+crawl → snapshot `data/live/` → reconcile |
| `npm run reconcile` | Diff `data/live/` vs local clone routes (no overwrite) |

## Safety

- Do not submit business forms
- Do not create/update/delete production records
- Do not commit `.env` or `playwright/.auth/`
- Credentials only via environment variables

## Current limitation

Production database has been observed as `SQLSTATE Connection refused`. Authenticated UI is therefore not fully captured. The local clone remains a presentation reconstruction for gated modules.
