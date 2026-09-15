# Reconciliation Report

Generated: 2026-09-14T09:03:38.358Z

## Production status

```
{
  "dns": true,
  "tcp443": true,
  "tls": true,
  "http": true,
  "laravel": true,
  "loginAvailable": true,
  "database": null,
  "classification": "ok_login_available",
  "title": "Laravel",
  "readyForAuthCrawl": true
}
```

## Live data present

No — authenticated live crawl has not succeeded yet

## Routes

| Set | Count |
|-----|------:|
| Local clone | 11 |
| Live captured | 0 |

### Shared
_none_

### Only in local clone (presentation extensions / reconstructions)
- `/login`
- `/register`
- `/password/reset`
- `/home`
- `/requisitions`
- `/performance`
- `/users`
- `/roles`
- `/reports`
- `/analytics`
- `/settings`

### Only in live
_none_

## Navigation

Local nav paths: `/home`, `/requisitions`, `/performance`, `/users`, `/roles`, `/reports`, `/analytics`, `/settings`

Live sidebar entries: 0
Live top entries: 0

## Recommendations

- Run npm run production:recon when the production database is healthy.
- Do not auto-overwrite local clone; update pages intentionally after review.
- Treat proposed RBAC/status codes as provisional until live UI confirms them.

## Notes

- This report does **not** mutate the local presentation clone.
- Proposed lifecycle statuses and RBAC permissions remain provisional until verified against live UI.
