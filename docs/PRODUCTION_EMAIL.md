# Production email (SMTP)

**Status:** Staging delivery verified via **Mailpit** (lab). Organizational SMTP **not provisioned**.

## Production must reject

- `EMAIL_PROVIDER=mock`
- SMTP hosts: `mailpit`, `mailhog`, `localhost`, `127.0.0.1`

Enforced in `backend/src/config.ts` when `NODE_ENV=production`.

## Required production settings

| Setting | Requirement |
|---------|-------------|
| `EMAIL_PROVIDER` | `smtp` |
| `SMTP_HOST` | Org SMTP or relay FQDN |
| `SMTP_PORT` | Typically `587` (STARTTLS) or `465` (TLS) |
| TLS | Required in transit |
| `SMTP_USER` / `SMTP_PASS` | If auth required; from secret store |
| `SMTP_FROM` | Verified sender (e.g. `noreply@<org-domain>`) |
| `PASSWORD_RESET_URL_BASE` | `https://<production-host>/password/reset/confirm` |

## Application behavior

1. Generate opaque reset token  
2. Store **SHA-256 hash** only (`password_reset_tokens`)  
3. Send link via `SmtpEmailProvider` (nodemailer)  
4. Confirm: single-use, expiry enforced, sessions invalidated  
5. Never log tokens, SMTP passwords, or full reset URLs in production logs  

## Delivery monitoring

| Signal | Action |
|--------|--------|
| SMTP send failure | Log `email_sent` failure without secrets; alert on rate |
| Bounce/complaint | Handle at mail provider; disable address if needed |
| Reset request spike | Rely on auth rate limit + monitoring |

## Organizational dependency

Provide SMTP host, credentials, and approved From address before production go-live.
