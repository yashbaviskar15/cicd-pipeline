# Runbook: HighLatency / HighDBLatency

**Alerts:** `HighLatencyP95` (warning, p95 > 300 ms for 5m) and `HighDBLatency`
(warning, DB p95 > 250 ms for 5m)
**Severity:** warning
**SLO impact:** latency — p95 < 300 ms target at risk

## What it means

Requests are getting slower. This is an SLO **warning**: if latency stays high,
it may also start causing timeouts that turn into 5xx and burn the availability
budget too. Act before it becomes an error-rate incident.

## First questions

1. **Application latency or DB latency?**
   Compare `sli:http_latency_p95:rate5m` with
   `histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le))`.
   If DB p95 is the one spiking, the bottleneck is the database, not Node.
2. **All routes or one?** Break the latency histogram down by `route` in Grafana →
   **Backend overview**. A single slow route points at a specific query.
3. **Sudden or gradual?** A step change correlates with a deploy or a traffic
   increase; a gradual climb suggests a growing table / missing index / leak.

## Triage steps

```bash
# Is the DB the bottleneck? Look at db_query_duration_seconds by operation.
# Grafana Explore → Prometheus:
#   histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (operation))

# Node event-loop / CPU check
#   nodejs_eventloop_lag_p99_seconds, process_cpu_seconds_total

# Trace the slow path (Jaeger) — sort spans by duration, find the hot span.
#   Jaeger UI → service "cicd-backend" → operation "GET /api/tasks"
```

For Postgres, inspect slow queries:

```sql
SELECT pid, now() - query_start AS duration, state, query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY duration DESC
LIMIT 10;
```

## Common causes

| Pattern | Likely cause | Fix |
| --- | --- | --- |
| DB p95 high, one `operation` | missing index / N+1 query / sequential scan | add index (`EXPLAIN ANALYZE`), batch the query |
| DB p95 high across ops | RDS CPU/connection saturation | scale RDS instance / raise pool, check `max_connections` |
| App p95 high, DB normal | CPU-bound event loop, sync work, GC | profile, offload work, add replicas (autoscaling) |
| Latency only under load | too few tasks/pods | autoscaling should react — verify min/max capacity |
| Cold starts | Fargate task churn / just-deployed | check deploy history |

## Mitigation

- **DB-bound:** add/adjust the index in a migration, or scale the RDS instance
  class; consider caching hot reads.
- **App-bound:** scale out — ECS Application Auto Scaling (CPU + ALB request
  count) and the Kubernetes HPA (CPU/memory) are already configured; verify the
  min/max bounds are not too tight.
- **Under load test:** the k6 stress script (`tests/load/`) is the fastest way
  to reproduce and validate a fix; run it before and after.

## Post-incident

1. Confirm `sli:http_latency_p95:rate5m < 0.3` for 15 minutes and the alert cleared.
2. If a query was the cause, add a regression performance test or an index in a
   migration so it cannot regress.
3. Record the change in the relevant ADR if it altered an architectural decision.
