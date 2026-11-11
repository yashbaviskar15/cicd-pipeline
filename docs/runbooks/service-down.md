# Runbook: ServiceDown

**Alert:** `ServiceDown` — `up{job="backend"} == 0` for 1 minute
**Severity:** critical
**SLO impact:** availability (every second down consumes error budget)

## What it means

Prometheus has failed to scrape the backend `/metrics` endpoint for more than a
minute. Either the process is not running, is not reachable on the network, is
crash-looping, or has become so overloaded it cannot serve scrapes.

## Immediate triage (first 5 minutes)

1. **Confirm the outage** — is it real, or is Prometheus the problem?
   ```bash
   curl -sf http://<backend-host>:3000/health/live   # process alive?
   curl -sf http://<backend-host>:3000/health/ready  # deps OK?
   curl -sf http://<backend-host>:3000/metrics | head
   ```
   If `/metrics` responds but `up == 0`, the scrape target/label is misconfigured
   (check `observability/prometheus/prometheus.yml`).

2. **Check the deployment platform**

   | Platform | Command |
   | --- | --- |
   | ECS Fargate | `aws ecs describe-services --cluster <cluster> --services <service>` and `aws ecs list-tasks` |
   | Kubernetes | `kubectl -n cicd-pipeline get pods -l app.kubernetes.io/name=backend` and `kubectl -n cicd-pipeline describe pod <pod>` |
   | Compose (local) | `docker compose ps` and `docker compose logs backend --tail=100` |

3. **Read the logs** — structured JSON from pino:
   ```bash
   # ECS
   aws logs tail /ecs/<service> --since 10m --follow
   # Kubernetes
   kubectl -n cicd-pipeline logs -l app.kubernetes.io/name=backend --tail=200
   # Loki (in Grafana) → query: {service="backend"} | json
   ```

## Common causes and fixes

| Symptom in logs | Likely cause | Fix |
| --- | --- | --- |
| `Invalid environment configuration` then exit | missing/mis-typed env var or secret | fix the ECS task definition / Secret / ConfigMap, redeploy |
| DB connection refused / `P1001` | RDS down, SG misconfig, wrong `DATABASE_URL` | check RDS status + security group + Secrets Manager value |
| `RUN_MIGRATIONS` failed at boot | schema drift or migration lock | run migrations manually, verify `DATABASE_URL` |
| OOMKilled (K8s) / task stopped (ECS) | memory limit too low or leak | raise memory, check `process_resident_memory_bytes` trend |
| Crash loop with no logs | entrypoint/permission error | `docker run` the image locally, check `docker-entrypoint.sh` |

## Mitigation

- **Bad deploy suspected** → roll back. Blue/green on ECS: re-deploy the
  previous task-definition revision / CodeDeploy "Stop and roll back".
  Kubernetes: `kubectl -n cicd-pipeline rollout undo deployment/backend`.
- **Dependency (DB) down** → fail fast and surface a 503 from `/health/ready`
  so the ALB/Ingress drains traffic instead of erroring.
- **Capacity** → scale out: `aws application-autoscaling` is already configured
  on CPU + ALB request count; for K8s the HPA reacts automatically.

## Post-incident

1. Confirm `/health/ready` is green and `up{job="backend"} == 1`.
2. Confirm the error-budget burn rate has returned to ~0 in Grafana → SLO overview.
3. Open a blameless post-incident review; add an alert or test that would have
   caught this earlier.
4. If the outage lasted long enough to exhaust the budget, follow the
   [error-budget policy](../slo.md#error-budget).
