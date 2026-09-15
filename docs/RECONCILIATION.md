# Reconciliation

Compare live captures with the local presentation clone **without** auto-updating the UI.

## Inputs

- `data/live/routes.json`, `pages.json`, `navigation.json`, … (from `npm run production:recon`)
- Local route list embedded in `scripts/reconcile.js` (mirrors the clone)

## Outputs

- `data/reconciliation-report.json`
- `data/reconciliation-report.md`

## What is compared

- Routes (shared / only-local / only-live)
- Navigation hints
- Page titles / forms / headings / tables when live pages exist
- Production health summary

## Process after a successful live crawl

1. Read the report
2. Decide which live modules to mirror
3. Update clone pages/services intentionally
4. Re-run `npm run validate`

Do **not** treat proposed RBAC or status codes as confirmed until live evidence exists.
