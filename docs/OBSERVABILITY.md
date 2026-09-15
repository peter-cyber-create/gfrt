# Observability — requirements vs implemented

| Requirement | Status | Notes |
|-------------|--------|-------|
| Structured JSON logging | **Implemented** | `backend/src/lib/logger.ts`, request ID middleware |
| Request correlation (`x-request-id`) | **Implemented** | Propagated on responses |
| Health endpoint | **Implemented** | `GET /health` |
| Readiness (DB) | **Implemented** | `GET /ready` runs `SELECT 1` |
| Metrics (Prometheus) | **Not implemented** | Future: HTTP latency, error rate, pool stats |
| Distributed tracing | **Not implemented** | Future: OpenTelemetry |
| Log aggregation | **Not implemented** | Wire to Loki/CloudWatch in staging |
| Alerting | **Not implemented** | Alert on `/ready` failures, 5xx rate |
| Audit trail | **Implemented** | Append-only `audit_logs` |
| Docker HEALTHCHECK | **Implemented** | Backend + frontend images |

## Staging minimum

1. Ship logs to a central sink with `requestId`, `path`, `status`.
2. Alert when `/ready` fails for > 2 minutes.
3. Run `scripts/staging-smoke.js` after deploy.
