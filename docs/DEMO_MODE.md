# Demo Mode

## Enable

In `clone/.env`:

```
VITE_DEMO_MODE=true
VITE_DEMO_EMAIL=...
VITE_DEMO_PASSWORD=...
```

Never commit real production secrets. Never put production passwords in React source.

## Guarantees when demo mode is on

- Local authentication only (`authService` mock)
- Local / in-memory mock data only
- No production mutations
- Network guard blocks `fetch` / `XHR` to `musooka.site` and `www.musooka.site`
- Subtle “Presentation” badge + demo banner in the UI

## Guard

`clone/src/demo/networkGuard.js` installed from `main.jsx`.

Blocked requests reject with:

`[demo-mode] Blocked request to production host: ...`

## Switching later

1. Set `VITE_DEMO_MODE=false`
2. Set `VITE_DATA_SOURCE=api`
3. Set `VITE_API_BASE_URL` to your **own** backend (default `http://127.0.0.1:4000`)
4. Real clients live in `clone/src/services/api/client.js` behind the existing facade

Do not point the facade at musooka.site. The production Laravel app remains untouched.
