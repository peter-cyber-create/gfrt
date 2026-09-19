# Penetration test scope

**Status:** Ready for organizational security engagement.  
**Do not** test against live `musooka.site` without separate written authorization.

## In scope

| Target | Detail |
|--------|--------|
| Hostname | Controlled staging endpoint (currently `https://127.0.0.1:8443` or future org staging FQDN) |
| Frontend | React SPA (API mode, demo off) |
| API | `/api/v1/*`, `/health`, `/ready` |
| Auth | Login, logout, session cookies, password reset |
| Authorization | RBAC on requisitions, users, roles, reports, audit |
| File upload | Attachment upload/download controls |
| Workflows | Requisition create/submit/review/approve/reject/complete |
| Reports / notifications | Authenticated access only |

## Out of scope

- Production Musooka (`musooka.site`) and its Laravel app/DB/Nginx
- Legacy database servers
- Third-party MOH systems unrelated to this stack
- Destructive DoS / volumetric attacks without explicit approval
- Social engineering of staff

## Test accounts (passwords out of band)

| Role | Example identity (staging) |
|------|----------------------------|
| Administrator | `admin@gfrt.local` |
| Reviewer | `reviewer@gfrt.local` |
| Normal user | `user@gfrt.local` |

Passwords are **not** included in this document. Obtain from the staging secret owner.

## Suggested focus areas

1. IDOR on requisitions, attachments, notifications  
2. Privilege escalation (approve/user.manage without role)  
3. Session fixation / cookie flags / CSRF  
4. Password-reset token reuse and enumeration  
5. Upload bypass (MIME, double extension, path traversal)  
6. Mass assignment on user/requisition bodies  
7. Rate-limit bypass on `/api/v1/auth/login`  
8. Information disclosure in errors/logs  

## Deliverable expected from tester

- Findings with severity, reproduction, impact, remediation  
- Retest after fixes  
- Explicit statement that production Musooka was not tested
