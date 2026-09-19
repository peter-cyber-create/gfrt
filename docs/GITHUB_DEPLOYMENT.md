# GitHub deployment for GFRT

Repository: `https://github.com/peter-cyber-create/gfrt`  
SSH remote: `git@github.com:peter-cyber-create/gfrt.git`

## Branch strategy

| Branch / event | Action |
|----------------|--------|
| `pull_request` | CI only (backend, Prisma, frontend production build, Playwright demo, config gate) |
| `push` to any branch | CI only — **no automatic production deploy** |
| `workflow_dispatch` | Optional manual deploy job (requires GitHub Environment `production`) |

Prefer: **PR → green CI → merge → manual production deploy**.

## Required GitHub configuration

### Actions secrets / variables (Environment: `production`)

Set these in the GitHub UI — never in workflow YAML:

| Name | Purpose |
|------|---------|
| `PRODUCTION_HOST` | SSH host (operator-defined) |
| `PRODUCTION_SSH_KEY` | Deploy key (private) |
| `PRODUCTION_DATABASE_URL` | Injected at deploy time only |
| `SESSION_SECRET` | API session signing |
| `SMTP_*` | Production SMTP |

Do not store staging passwords or demo credentials in GitHub production secrets.

## CI jobs (`.github/workflows/ci.yml`)

1. **backend** — `npm ci`, Prisma generate/validate/migrate, typecheck, Vitest, npm audit  
2. **frontend** — production build (`VITE_DEMO_MODE=false`, `VITE_DATA_SOURCE=api`)  
3. **playwright** — demo-mode UI suite (`npm run validate`)  
4. **production-config-gate** — ensures `.env.production.example` placeholders fail the config check; light secret scan  
5. **deploy-production** — manual only (`workflow_dispatch` + Environment protection)

## Local commands mirroring CI

```bash
npm run test:backend
cd clone && VITE_DEMO_MODE=false VITE_DATA_SOURCE=api npm run build
CLONE_URL=http://127.0.0.1:5173 npm run validate   # with demo frontend running
NODE_ENV=production ENV_FILE=.env.production.example npm run production:config-check  # expect FAIL on placeholders
```

## Pushing (after local secret audit)

```bash
git push -u origin HEAD
```

Never force-push `main`. Never rewrite shared history.
