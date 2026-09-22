# GitHub Pages (static GFRT demo)

**Host:** static frontend only. Express, Prisma, PostgreSQL, SMTP, and Docker are **not** deployed to GitHub Pages.

## URL

Repository (from `git remote`): `peter-cyber-create/moh-gfrt`  
Pages URL: **https://peter-cyber-create.github.io/moh-gfrt/**

## Architecture

```
GitHub (main)
  → Actions (.github/workflows/deploy-pages.yml)
    → Vite build (VITE_DEMO_MODE=true, base=/moh-gfrt/)
    → Playwright validate against vite preview
    → upload-pages-artifact + deploy-pages
  → https://peter-cyber-create.github.io/moh-gfrt/
```

Full production API remains a separate deployment (see `docs/VERCEL_DEPLOYMENT.md` / Docker runbooks):

```
Frontend → externally hosted API → PostgreSQL
```

## One-time GitHub settings

1. Repository → **Settings → Pages**
2. **Source:** GitHub Actions (not “Deploy from a branch”)
3. Ensure Actions are allowed for the repo
4. Push to `main` (or run **Deploy GitHub Pages** via workflow_dispatch)

### Plan / visibility requirement

GitHub Pages for **private** repositories requires a paid plan that includes Pages.  
If `POST /repos/.../pages` returns *“Your current plan does not support GitHub Pages for this repository”*:

- make the repository **public**, or
- upgrade the org/user plan that includes private Pages, or
- publish the static demo from a dedicated public mirror repo (same `base` path rules)

Until Pages is enabled, the workflow can still **build and validate** the static site; the **deploy** job will not publish a live URL.

## Local build matching Pages

```bash
cd clone
GITHUB_PAGES=true VITE_BASE_PATH=/moh-gfrt/ VITE_DEMO_MODE=true VITE_DATA_SOURCE=mock npm run build
cd ..
bash scripts/pages-spa-fallback.sh
cd clone && npx vite preview --host 127.0.0.1 --port 4173
# Open http://127.0.0.1:4173/moh-gfrt/
CLONE_URL=http://127.0.0.1:4173/moh-gfrt npm run validate
```

## SPA deep links

GitHub Pages has no server rewrite to `index.html`. After each build, `scripts/pages-spa-fallback.sh` copies `index.html` → `404.html` so nested routes (`/moh-gfrt/requisitions`, refresh, etc.) load the SPA.

## Demo safety

- Build forces `VITE_DEMO_MODE=true` and `VITE_DATA_SOURCE=mock`
- Existing `networkGuard` blocks `musooka.site` while demo mode is on
- No `DATABASE_URL` / `SESSION_SECRET` / SMTP secrets in the Pages build

## API mode later

Set public-only:

```
VITE_DEMO_MODE=false
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=https://your-api.example
```

Never put private credentials in `VITE_*` variables.
