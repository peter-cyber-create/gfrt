# API overview

OpenAPI JSON: `GET /api/v1/openapi.json`

Base URL (local): `http://127.0.0.1:4000`

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/auth/login` | Sets HttpOnly session cookie |
| POST | `/api/v1/auth/logout` | Clears session |
| GET | `/api/v1/auth/me` | Current user + permissions |
| POST | `/api/v1/auth/password-reset/request` | Foundation (no email provider yet) |
| POST | `/api/v1/auth/password-reset/confirm` | Foundation |

## Core resources

| Method | Path | Permission (proposed) |
|--------|------|------------------------|
| GET/POST | `/api/v1/requisitions` | `requisition.view` / `requisition.create` |
| GET | `/api/v1/requisitions/:id` | `requisition.view` |
| POST | `/api/v1/requisitions/:id/submit` | `requisition.submit` |
| POST | `/api/v1/requisitions/:id/review` | `requisition.view` |
| POST | `/api/v1/requisitions/:id/approve` | `requisition.approve` |
| POST | `/api/v1/requisitions/:id/reject` | `requisition.reject` |
| POST | `/api/v1/requisitions/:id/startProcessing` | `requisition.edit` |
| POST | `/api/v1/requisitions/:id/complete` | `requisition.edit` |
| POST | `/api/v1/requisitions/:id/cancel` | `requisition.edit` |
| GET/POST | `/api/v1/users` | `user.view` / `user.manage` |
| PATCH | `/api/v1/users/:id/status` | `user.manage` |
| GET | `/api/v1/roles` | `role.view` |
| GET | `/api/v1/permissions` | `role.view` |
| GET | `/api/v1/reports/*` | `report.view` |
| GET | `/api/v1/notifications` | authenticated owner |
| GET | `/api/v1/audit-logs` | `audit.view` |
| GET | `/health` | public liveness |
| GET | `/ready` | DB readiness |

Error shape:

```json
{ "error": { "code": "REQUISITION_INVALID_STATE", "message": "..." } }
```
