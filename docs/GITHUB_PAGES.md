# GitHub Pages (static GFRT demo)

**Host:** static frontend only. Express, Prisma, PostgreSQL, SMTP, and Docker are **not** deployed to GitHub Pages.

## URL

Repository: `peter-cyber-create/gfrt` (public — required for GitHub Pages on this account)  
Pages URL: **https://peter-cyber-create.github.io/gfrt/**

Local clone may also track `origin` → `peter-cyber-create/moh-gfrt` (private staging repo). Pages deploys from the public `gfrt` remote.

## Architecture

```
GitHub (main on peter-cyber-create/gfrt)
  → Actions (.github/workflows/deploy-pages.yml)
    → Vite build (VITE_DEMO_MODE=true, base=/gfrt/)
    → Playwright validate against vite preview
    → upload-pages-artifact + deploy-pages
  → https://peter-cyber-create.github.io/gfrt/
```

Full production API remains a separate deployment:

```
Frontend → externally hosted API → PostgreSQL
```

## One-time GitHub settings

1. Open https://github.com/peter-cyber-create/gfrt/settings/pages  
2. **Build and deployment → Source → GitHub Actions**  
3. Ensure Actions are allowed for the repo  
4. Push to `main` (or run **Deploy GitHub Pages** via workflow_dispatch)

The repository must be **public** (or on a plan that includes private Pages). Private repos on the free plan cannot enable Pages.

## Local build matching Pages

```bash
npm run pages:build
cd clone && GITHUB_PAGES=true VITE_BASE_PATH=/gfrt/ npx vite preview --host 127.0.0.1 --port 4173
# Open http://127.0.0.1:4173/gfrt/
CLONE_URL=http://127.0.0.1:4173/gfrt npm run validate
```

## SPA deep links

GitHub Pages has no server rewrite to `index.html`. After each build, `scripts/pages-spa-fallback.sh`:

1. Writes a real `index.html` shell under each known client route (`login/`, `home/`, `requisitions/`, …) so direct open / refresh return **HTTP 200**.
2. Still writes `404.html` only as a safety net for unknown paths.

Do not rely on the GitHub 404 page for known application routes.

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
