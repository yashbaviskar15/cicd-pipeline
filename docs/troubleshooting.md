# Troubleshooting

Symptom → cause → fix for the issues you are most likely to hit. For live
incidents see the [runbooks](./runbooks/); this page is for local/dev and CI.

## Local development

### `docker compose up` → backend exits with "Invalid environment configuration"

The app validates all env vars with `zod` at boot and refuses to start with a
bad config. The log lists the offending variable(s).

**Fix:** copy the example env and fill it in:

```bash
cp backend/.env.example backend/.env
```

Most common cause: `JWT_SECRET` shorter than 16 chars, or `PORT` not a number.

### Backend is `unhealthy` / `/health/ready` returns 503

`/health/ready` returns 503 when the database is unreachable — this is correct
behaviour (readiness gates traffic).

```bash
docker compose ps                 # is postgres healthy?
docker compose logs postgres
# run migrations manually:
docker compose exec backend npx prisma migrate deploy
```

### Port already in use (`bind: address already in use`)

Something else owns 3000/8080/5432/9090.

```bash
ss -ltnp | grep -E ':(3000|8080|5432|9090)'   # find the squatter
# or change the published port in docker-compose.yml
```

### `prisma generate` / Prisma engine errors after a fresh clone

```bash
cd backend && npm install      # postinstall runs `prisma generate`
```

### Frontend loads but API calls fail (CORS)

Set `CORS_ORIGIN` in the environment to the exact frontend origin (comma-separate
multiple). `*` is only meaningful for non-credentialed requests.

---

## CI / GitHub Actions

### "secrets cannot be used in `if:`" / a scan step is skipped

GitHub forbids `secrets` in `if:`. Optional integrations (e.g. Infracost) are
exposed via a job-level `env:` and gated on `env.X != ''`. Set the corresponding
secret/variable to enable them.

### Trivy fails with HIGH/CRITICAL vulnerabilities

Either bump the dependency/base image, or — if the fix is genuinely not
available yet — document the exception with a dated comment and a scope-limited
`.trivyignore`. Prefer upgrading; Dependabot opens PRs for base-image and
dependency bumps.

### Terraform plan step fails on a PR

- `terraform fmt` failure → run `make fmt` (or `terraform fmt -recursive`).
- `validate` failure → usually a missing variable in `terraform.tfvars.example`.
- Backend init failure → `TF_STATE_BUCKET`/OIDC role not configured. The plan job
  is designed to skip the remote init (and only `validate`) when those are unset.

### `npm ci` fails: "lock file out of sync"

You edited `package.json` without updating the lockfile. Run `npm install` (root
or `backend/`) and commit the updated `package-lock.json`.

---

## Kubernetes

### Backend pod `CrashLoopBackOff` with "Invalid environment configuration"

The ConfigMap/Secret is missing a required key. Check:

```bash
kubectl -n cicd-pipeline logs deploy/backend --previous
kubectl -n cicd-pipeline get cm backend-config -o yaml
```

### Pod stuck `Pending` — "insufficient cpu/memory"

The dev overlay requests resources a small single-node cluster cannot satisfy.
Lower `resources.requests` in `deploy/k8s/overlays/dev/patch-dev.yaml`, or give
kind more capacity in `deploy/kind/kind-config.yaml`.

### `readOnlyRootFilesystem` breaks the container

The images write nothing to disk at runtime; the charts mount an `emptyDir` at
`/tmp`. If you add code that writes elsewhere, mount a writable volume for that
path instead of disabling the security context.

---

## AWS / Terraform

### `Error acquiring the state lock`

A previous run did not release the lock (crashed/interrupted).

```bash
terraform force-unlock <LOCK_ID>     # only after confirming no apply is running
```

### ECS service stuck at 0 running tasks

Check the service events:

```bash
aws ecs describe-services --cluster <cluster> --services <service> \
  --query 'services[0].events[0:5]'
```

Typical causes: the image tag does not exist in ECR, the task role cannot read
the Secrets Manager secret, or the DB security group does not allow the app SG
on 5432.

### Target group unhealthy (502/503 from the ALB)

- Verify the health-check path/port (`/health/live` on 3000).
- Confirm the task SG allows inbound 3000 from the ALB SG.
- Check `/health/ready` — if the DB is down, tasks are alive but not ready.

### Blue/green deployment fails / rolls back

Open the deployment in CodeDeploy for the failing event. Common causes: the new
task definition cannot pull the image, or the CloudWatch alarm
(`5xx`/response-time) tripped. This is the system working — fix forward, or rely
on the automatic rollback and bisect the change.

---

## Observability

### Grafana shows "datasource not found" / empty dashboards

The provisioned datasources reference Prometheus/Loki/Jaeger by container name.
Make sure you started the **combined** stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

### Prometheus target `backend` is down

Prometheus scrapes `backend:3000` on the compose network — it only works when the
app stack is up on the same network (the combined command above). Confirm with
`docker compose exec prometheus wget -qO- http://backend:3000/metrics`.

### No traces in Jaeger

Tracing is opt-in. Set `OTEL_ENABLED=true` on the backend (already set in the
observability overlay/compose env) and point
`OTEL_EXPORTER_OTLP_ENDPOINT` at the collector (`http://otel-collector:4318`).

---

## Performance

### p95 latency above the 300 ms SLO

Run the k6 stress script to reproduce, then follow the
[high-latency runbook](./runbooks/high-latency.md): the split between app time
and DB time (the `db_query_duration_seconds` histogram) tells you where to look.

### `429 Too Many Requests` under load

Rate limiting is working. Raise `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX`, or keep
the load test below the limit. Remember the limit is per-task (in-process).
