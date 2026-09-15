# Local / staging deployment notes

**Do not deploy this stack to musooka.site. Do not modify the production Laravel server or database.**

## Local Postgres

```bash
docker compose -f infra/docker-compose.yml up -d db db_test
cd backend
cp .env.example .env   # set SESSION_SECRET
npm install
npm run db:migrate
npm run db:seed   # LOCAL/DEV ONLY — creates @musooka.local accounts; refused when NODE_ENV=production
npm run dev
```

API: `http://127.0.0.1:4000` — `/health`, `/ready`, `/api/v1/...`

**Production:** run `npm run db:migrate` (`prisma migrate deploy`) only. Do **not** run `db:seed` against production.

## Frontend demo (default)

```bash
cd clone && npm run dev -- --host 127.0.0.1 --port 5173
```

Keep `VITE_DEMO_MODE=true` for offline presentation.

## Frontend → local API (optional)

```
VITE_DEMO_MODE=false
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://127.0.0.1:4000
```

## Target topology (future staging)

```
Internet → Nginx (infra/nginx.conf) → static frontend + /api proxy → API container → PostgreSQL
```

Dockerfiles: `backend/Dockerfile`, `clone/Dockerfile`. Compose profile `full` can start the API against local Postgres.
