# Executive presentation flow

Deterministic demo for presenting the local Musooka clone **without** production connectivity.

## Start

```bash
cd /home/peter/Projects/MOH/musooka-recon
npm run clone:dev
```

Open the URL Vite prints (often `http://127.0.0.1:5173` or `5175`).

Login with credentials from `clone/.env` (`VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD`).

Confirm the subtle **Presentation** indicator is visible.

## Script (≈10–12 minutes)

1. **Login** — show local auth; wrong password shows an error; correct credentials land on Dashboard.
2. **Dashboard** — walk KPI cards (totals reconcile with demo requisitions). Point out trend + status charts and recent activity.
3. **Requisitions** — open Operations → Requisitions. Search e.g. `Mulago`, filter by status/department.
4. **Open a requisition** — View details: items, amounts, requester, required date.
5. **Status timeline** — show history entries and approval information.
6. **Local transition** — use a workflow button (e.g. move Under Review → Approved). Emphasize this is **demo-only**.
7. **Performance** — completion/approval rates and department bars.
8. **Analytics** — change department filter; show charts update; optional Export.
9. **Reports** — pick a catalogue item, apply date range, Export CSV.
10. **Users** — search, open View/Edit (local), show Disable stays local.
11. **Roles** — open permission details; note proposed RBAC until production is reconciled.
12. **Settings → Audit** — show local audit events from the demo actions.
13. **Optional** — Settings → Security → **Reset Demo Data** before the next audience.
14. **Return to Dashboard** — refreshed KPIs from reset or transitions.

## Safety talking points

- `VITE_DEMO_MODE=true` blocks requests to `musooka.site`.
- No production mutations.
- Proposed lifecycle/permissions are application models, not confirmed production facts.
- When production DB returns: `npm run restore:check` then `npm run production:recon`.
