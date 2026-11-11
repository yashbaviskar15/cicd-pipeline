# Failure Drills (Chaos Engineering)

> "Hope is not a strategy." This document describes three failure drills that
> prove the platform **detects, contains and recovers** from the incidents a
> production system will inevitably face. Each drill lists the injection, the
> expected behaviour (what should happen automatically), the evidence to
> capture, and the recovery/verification steps.

Run these in a **non-production** environment (`dev` or `staging`) first.
Add the captured evidence (screenshot/GIF) under `docs/screenshots/` using the
placeholders below so the README and this document render the proof.

| Drill | Injects | Proves |
| --- | --- | --- |
| [1. Kill a task](#drill-1--kill-a-running-task) | abrupt process death | self-healing / desired-count reconciliation |
| [2. Break the database](#drill-2--break-the-database) | dependency outage | readiness gating, alerting, graceful degradation |
| [3. Bad deploy](#drill-3--bad-deploy) | a broken release | blue/green **automatic rollback** |

---

## Drill 1 · Kill a running task

**Hypothesis:** killing a single task/pod causes no user-visible errors; the
platform replaces it and the ALB/Ingress only routes to healthy targets.

### Inject

**ECS (Fargate)**

```bash
TASK_ARN=$(aws ecs list-tasks --cluster "$CLUSTER" --service-name "$SERVICE" \
  --query 'taskArns[0]' --output text)
aws ecs stop-task --cluster "$CLUSTER" --task "$TASK_ARN" --reason "chaos drill: kill task"
```

**Kubernetes**

```bash
kubectl -n cicd-pipeline delete pod -l app.kubernetes.io/name=backend --grace-period=0 --force
```

### Expected

- The task/pod is deregistered from the load balancer before termination
  (connection draining), so in-flight requests complete.
- A replacement task starts automatically (ECS `desired_count`; K8s
  Deployment/ReplicaSet) and passes its health checks.
- `up{job="backend"}` may briefly dip but no sustained `ServiceDown` alert fires.
- No spike in `http_errors_total` — the SLO dashboards stay green.

### Evidence

<!-- Replace with an animated capture of the task being killed and a new one starting. -->
![ECS task kill and self-heal](screenshots/chaos-1-task-kill.gif)

### Verify

```bash
# ECS: a new task should appear with a later startedAt
aws ecs list-tasks --cluster "$CLUSTER" --service-name "$SERVICE"
# K8s: a new pod should reach Ready
kubectl -n cicd-pipeline get pods -l app.kubernetes.io/name=backend -w
```

---

## Drill 2 · Break the database

**Hypothesis:** with the database unavailable the service fails fast and
honestly — readiness returns 503, the load balancer stops sending traffic to the
unhealthy targets, alerts fire, and no data is corrupted.

### Inject (non-prod only)

**Local / compose**

```bash
docker compose stop postgres      # or: docker compose kill postgres
```

**RDS (use with care; never in prod without an approved window)**

```bash
# Simulate loss of connectivity with a security-group change, or:
aws rds stop-db-instance --db-instance-identifier "$DB"
```

### Expected

- `GET /health/ready` returns **503** with `checks.database = "down"`
  (the liveness probe keeps returning 200 — we do not want a restart loop).
- Within ≤ 2 scrape intervals the ALB/Ingress target becomes unhealthy and stops
  receiving traffic; the ALB returns a 5xx *at the edge* instead of hanging.
- `ServiceDown` / `ErrorBudgetFastBurn` fire in Alertmanager.
- Application logs show a structured error with the failing DB operation.

### Evidence

<!-- Replace with a capture of the ready-check going 503 and the alert firing. -->
![Readiness failing while DB is down](screenshots/chaos-2-db-down.gif)

### Verify

```bash
curl -i http://<host>/health/ready          # expect 503 + {"status":"not-ready"}
curl -i http://<host>/health/live           # expect 200 + {"status":"alive"}
# Grafana → "SLO overview": availability dips, burn-rate alert fires.
```

### Recover

```bash
docker compose start postgres               # or restore the RDS SG / start the instance
curl -s http://<host>/health/ready          # expect 200 + {"status":"ready"}
```
Confirm the burn-rate alert clears and availability returns to ~100%.

---

## Drill 3 · Bad deploy

**Hypothesis:** shipping a broken release is automatically detected by the
post-deploy smoke test and **rolled back** to the previous known-good revision
without human intervention.

### Inject

Push a change that breaks a critical path, e.g. change the readiness endpoint to
return 500, or point `DATABASE_URL` at an unreachable host, and merge to `main`.

### Expected

1. `Main · Build, Sign & Deploy` builds, scans and signs the image.
2. CodeDeploy performs the blue/green swap of the new (green) revision.
3. The **post-deploy smoke test** ([`smoke` job](../.github/workflows/deploy.yml))
   runs against the live URL and fails.
4. The workflow **automatically** triggers a fresh blue/green deployment of the
   previously-captured known-good task definition, swapping traffic back.
5. The workflow then fails loudly so the on-call engineer is paged.

Additionally, the CodeDeploy deployment group has
`auto_rollback_configuration` enabled on `DEPLOYMENT_FAILURE` and
`DEPLOYMENT_STOP_ON_ALARM`, so a release that trips a CloudWatch alarm
(e.g. `5xx` or target-response-time) is rolled back by CodeDeploy itself —
belt and braces.

### Evidence

<!-- Replace with a capture of the failed smoke step and the rollback deployment. -->
![Automatic rollback after a failed smoke test](screenshots/chaos-3-rollback.gif)

### Verify

```bash
# The new deployment should have been superseded by the rollback deployment.
aws deploy list-deployments --application-name "$APP" --deployment-group-name "$GROUP" --max-items 5
# The service should be serving the previous task definition revision.
aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" \
  --query 'services[0].taskDefinition'
```

### Local dry-run (no AWS required)

You can rehearse the *detection* half locally: start the stack, break the
backend (e.g. `docker compose exec backend sh -c 'kill 1'` after editing the
readiness route), and run `BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs`
— it exits non-zero, exactly what gates the automatic rollback in CI.

---

## Scheduling these drills

Drills are cheap insurance. The recommended cadence:

- **Drill 1** — monthly, in staging, during business hours.
- **Drill 2** — quarterly.
- **Drill 3** — every release (it is automated by the post-deploy smoke test).

Record outcomes (what surprised you, what you changed) in the relevant
[ADR](./adr/) or runbook so the platform gets safer over time.
