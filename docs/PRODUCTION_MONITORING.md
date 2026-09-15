# Production monitoring & alerting architecture

## Current (lab)

| Component | Endpoint | Status |
|-----------|----------|--------|
| Prometheus | `http://127.0.0.1:9090` | Deployed |
| Blackbox | probes API `/health` `/ready` | Deployed |
| Alert rules | `infra/staging/alert.rules.yml` | Present |
| Pager/Slack/email fan-out | — | **Not configured** (org dependency) |

## Required production signals

| Signal | Source |
|--------|--------|
| Availability | Blackbox or synthetic HTTPS check |
| HTTP 5xx rate | Nginx / API metrics or log-derived |
| Latency | API request logs / APM |
| DB availability | `/ready` + Postgres exporter |
| DB connections | Postgres exporter |
| CPU / memory / disk | Node exporter / cAdvisor / cloud metrics |
| Container health | Docker/K8s healthchecks |
| Auth failures | App logs (`auth.login_failed`) aggregated |
| Backup success/failure | Backup job exit + object presence |

## Alert definitions (wire when destination exists)

| Alert | Condition (preliminary) |
|-------|-------------------------|
| Application unavailable | Health fail > 2m |
| Database unavailable | Ready fail > 1m |
| High error rate | 5xx > 5% over 5m |
| Disk exhaustion | Filesystem > 85% |
| Backup missing | No successful backup in 36h |
| Certificate expiry | < 14 days |

## Fan-out

**Blocked** until organization provides: email list, Slack webhook, or PagerDuty key.

Do not fabricate destinations. Document recipient in ops runbook when available.

## Logging requirements (already in app)

Each request: `requestId`, timestamp, method, route, status, `durationMs`.  
Must **not** contain passwords, cookies, session IDs, reset tokens, DB/SMTP credentials.
