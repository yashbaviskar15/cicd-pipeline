# Runbook: HighErrorRate (error-budget burn)

**Alerts:** `ErrorBudgetFastBurn` (critical, 14.4x) and `ErrorBudgetSlowBurn`
(warning, 6x)
**Severity:** critical (fast burn) / warning (slow burn)
**SLO impact:** availability — error budget is being consumed faster than allowed

## What it means

The ratio of 5xx responses to total responses is burning the 99.5% availability
budget faster than the SLO allows.

- **Fast burn (14.4x):** ~2% of the 30-day budget consumed in ~1 hour. Treat as
  a page — something is actively broken.
- **Slow burn (6x):** ~5% in ~6 hours. Investigate during working hours.

## First questions

1. **Is it all traffic or one route?**
   Grafana → **Backend overview** → break down `rate(http_requests_total{status_code=~"5.."}[5m])` by `route`.
   The `route` label is the matched pattern (e.g. `/api/tasks/:id`), so a single
   endpoint lighting up narrows the cause immediately.
2. **Did a deploy just happen?** Check the deploy workflow run and the image
   tag currently running vs. the previous one.
3. **Is a dependency failing?** Check DB p95/latency and RDS metrics.

## Triage steps

```bash
# Which status codes are being returned?
# Grafana Explore → Prometheus:
#   sum by (route, status_code) (rate(http_requests_total{status_code=~"5.."}[5m]))

# Pull recent error logs (pino JSON)
# Loki:  {service="backend"} | json | level="error"
aws logs tail /ecs/<service> --since 10m --follow    # ECS
kubectl -n cicd-pipeline logs -l app.kubernetes.io/name=backend --tail=200 | grep '"level":"error"'
```

The structured logs include `reqId` (correlation id) — copy it into the Jaeger
trace search to see the failing span end-to-end.

## Common causes

| Pattern | Likely cause | Fix |
| --- | --- | --- |
| 500s from a single route after a deploy | regression in that handler | roll back (see below), add a regression test |
| 503 spikes across all routes | DB down / exhausted connections | check RDS, connection pool, `/health/ready` |
| 429 rising | rate limit too aggressive | tune `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` |
| 500s on auth routes | `JWT_SECRET` rotated without redeploy, or clock skew | verify secret consistency across tasks |
| Intermittent 500s | flaky dependency / timeout | check OTel traces for the slow span |

## Mitigation

- **Regression:** roll back immediately, then fix forward.
  - ECS blue/green: CodeDeploy → deployment → **Stop and roll back**.
  - Kubernetes: `kubectl -n cicd-pipeline rollout undo deployment/backend`.
- **Dependency:** shed load — enable/verify rate limiting, and if the DB is the
  bottleneck, pause non-critical write paths.
- **Config:** fix the Secret/ConfigMap and redeploy; verify with `/health/ready`.

## Post-incident

1. Confirm `sli:http_error_ratio:rate5m` is back under `0.005` and the burn-rate
   alert has cleared.
2. Record the budget consumed in the incident review.
3. Add a test (unit/integration/smoke) that reproduces the failure so it cannot
   ship again. Post-deploy smoke tests exist for exactly this reason.
