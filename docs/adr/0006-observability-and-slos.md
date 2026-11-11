# 0006 · Observability stack and SLO-based alerting

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deciders:** SRE

## Context

"You can't operate what you can't see." The platform needs to answer three
questions quickly: **is it up?**, **is it fast?**, and **is it erroring?** —
and it must alert on user-visible symptoms (burn rate) rather than raw resource
usage, to avoid alert fatigue.

## Decision

We will expose **Prometheus** metrics from the app (`prom-client`), aggregate
them with Prometheus, visualise with **Grafana** (dashboards as code),
aggregate logs with **Loki + Promtail**, and export **OpenTelemetry** traces to
**Jaeger**. Alerting is **SLO-based**: multi-window burn-rate alerts on a 99.5%
availability SLO and a p95 < 300 ms latency SLO, documented in
[../slo.md](../slo.md) with runbooks in [../runbooks/](../runbooks/).

## Consequences

**Positive**

- Alerts fire on what users feel (errors, latency), not on noisy CPU graphs.
- Error-budget alerting gives a principled release policy instead of gut feel.
- Dashboards and datasources are version-controlled JSON/YAML, so they are
  reproducible and reviewable.
- Traces correlate a slow/erroring request to the exact span (e.g. a slow DB
  query), and `trace_id` links logs to traces.
- All components are open source and run for free via docker compose locally.

**Negative / trade-offs**

- Self-hosted Prometheus/Loki/Grafana is more operational work than a managed
  service (Amazon Managed Prometheus / Grafana Cloud); the trade-off is cost and
  portability.
- Cardinality must be controlled: we label metrics with the matched **route
  pattern**, never the raw path.

**Neutral**

- OpenTelemetry export is opt-in (`OTEL_ENABLED=true`) so local dev and CI stay
  lightweight.
