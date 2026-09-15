# Application security review (RC 1.0.0-rc.1)

**Scope:** Controlled staging + codebase. **Not** a substitute for organizational penetration testing.  
**Out of scope:** Intrusive testing of `musooka.site`.

## Review matrix

| Area | Status | Evidence / control |
|------|--------|--------------------|
| Authentication | Implemented + tested | Argon2id; hashed sessions; lockout; staging E2E |
| Authorization | Implemented + tested | Server RBAC; multi-role 12/12 |
| IDOR | Tested | Notifications; attachments requester/approve gate |
| CSRF | Tested | Origin allowlist → 403 |
| XSS | Mitigated | React escaping; API stores text; CSP deferred |
| SQL injection | Mitigated | Prisma parameterized; SQLi-style inputs tested |
| Mass assignment | Mitigated | Zod schemas; actor from session only |
| Session handling | Implemented | HttpOnly Secure cookies in staging HTTPS |
| Password reset | Implemented + E2E | Hashed tokens; single-use; Mailpit lab |
| File uploads | Implemented + unit tests | MIME/ext/size/path; multer 413 |
| Rate limiting | Implemented + tested | Auth limiter |
| CORS | Implemented + tested | Allowlist; no `*` in prod-like |
| Security headers | Verified staging | Helmet + Nginx HSTS/XCTO/XFO |
| Error disclosure | Implemented | No stack traces to clients |
| Logging | Implemented | Redacts password/token/cookie keys |
| Secret handling | Process | Fail-fast; secrets not in Git |

## Automated staging security

`data/staging-security-check.json` — **8/8 passed** (HTTPS, Secure cookie, HSTS, CORS/CSRF, 401, 413, headers).

## Residual risks (accepted until org pen-test)

1. Self-signed TLS (lab) ≠ production CA  
2. No external pen-test yet (`PENETRATION_TEST_SCOPE.md` prepared)  
3. CSP not fully locked down on API (SPA served by Nginx)  
4. Prisma toolchain npm audit highs (dev) — see `DEPENDENCY_SECURITY.md`  

## Classification

**Engineering security baseline: READY for pen-test.**  
**Production security approval: ORGANIZATIONAL DEPENDENCY.**
