# Service Level Objectives (SLOs)

This document defines the reliability targets for the Task/Notes API and the
error-budget policy that governs how much risk we are allowed to take with
deploys. The numbers here are enforced in code by the Prometheus recording
rules and alerting rules in [`observability/prometheus/alerts.yml`](../observability/prometheus/alerts.yml).

## Service Level Indicators (SLIs)

An SLI is the measurement. An SLO is the target we set for that measurement.

| SLI | Definition | Source metric |
| --- | --- | --- |
| **Availability** | share of requests that did **not** return a 5xx | `http_requests_total{status_code!~"5.."} / http_requests_total` |
| **Latency** | p95 of server-side request duration | `histogram_quantile(0.95, http_request_duration_seconds_bucket)` |
| **DB latency** | p95 of database operation duration | `histogram_quantile(0.95, db_query_duration_seconds_bucket)` |

All of these are computed from the RED (Rate, Errors, Duration) metrics exposed
by the backend at `GET /metrics` and scraped by Prometheus every 15 seconds.

## SLOs

| SLO | Target | Measurement window | Error budget |
| --- | --- | --- | --- |
| **Availability** | 99.5% of requests succeed | rolling 30 days | 0.5% of requests (≈ 3h 39m of full outage / 30d) |
| **Latency** | p95 request latency < 300 ms | rolling 30 days | — (see latency policy below) |
| **DB latency** | p95 DB operation < 250 ms | rolling 30 days | — |

99.5% availability is a deliberately honest target for a single-region,
free-tier-friendly deployment. A "three nines" (99.9%) target would be
disingenuous given a single NAT gateway and a single-AZ-capable database in
non-prod environments.

## Error budget

For a 30-day window the availability budget is:

```
error budget = (1 - 0.995) * total_requests = 0.005 * total_requests
```

In wall-clock terms, 0.5% of 30 days is **3 hours 39 minutes** of 100% failure,
or any equivalent mix of partial failures.

**Budget policy**

- **Budget healthy (> 50% remaining):** ship normally.
- **Budget in warning (25–50% remaining):** only reliability-improving changes
  and feature work already in review; no risky migrations.
- **Budget exhausted (< 25% remaining):** freeze feature deploys, page the
  on-call engineer, and switch to reliability work until the budget recovers.

## Multi-window burn-rate alerting

Burn rate = how fast we are consuming the budget relative to the "allowed" rate.
A burn rate of 1 means we will consume exactly the budget in 30 days. Following
the Google SRE workbook we use two windows:

| Alert | Burn rate | Long window | Short window | Severity | Meaning |
| --- | --- | --- | --- | --- | --- |
| `ErrorBudgetFastBurn` | 14.4x | — | 5m (for 2m) | critical | 2% of the 30-day budget in ~1h |
| `ErrorBudgetSlowBurn` | 6x | 30m (for 15m) | — | warning | 5% of the budget in ~6h |
| `HighLatencyP95` | — | 5m (for 5m) | — | warning | p95 latency above the 300 ms SLO |
| `ServiceDown` | — | 1m | — | critical | Prometheus cannot scrape the backend |

Alert `runbook_url` annotations point at the runbooks in
[`docs/runbooks/`](./runbooks/).

## Where to look when an SLO burns

1. **Grafana → "SLO overview"** dashboard (`observability/grafana/dashboards/slo.json`)
   shows availability vs. target, latency vs. target, and live burn rate.
2. **Grafana → "Backend overview"** dashboard shows per-route request rate,
   error rate, latency percentiles, DB latency and business metrics.
3. **Loki** (via the logs panel) for correlated structured logs by `service`.
4. **Jaeger** for end-to-end traces of the slow/erroring request path.
5. The relevant runbook in [`docs/runbooks/`](./runbooks/).

## Review cadence

SLOs are reviewed monthly against actual performance. If the availability SLI
consistently sits above 99.9% for two consecutive months, the target is raised;
if it consistently misses, either the target is lowered (with a documented ADR)
or reliability work is prioritised.
