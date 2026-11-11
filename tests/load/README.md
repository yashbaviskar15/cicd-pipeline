# Load tests (k6)

Scripts driven by [k6](https://k6.io) that exercise a **real running backend**.

| Script | When it runs | Purpose |
| --- | --- | --- |
| `smoke.js` | every PR / main pipeline (CI) | low, fixed load to prove the service works and meets the SLO thresholds |
| `stress.js` | on demand | ramp to 150 VUs to find the latency knee and exercise autoscaling |

Both scenarios enforce thresholds derived from the SLOs in
[`docs/slo.md`](../../docs/slo.md): availability ≥ 99.5% (`http_req_failed < 0.005`)
and p95 latency < 300 ms.

## Run locally

```bash
# start the stack
docker compose up -d --build postgres backend

# smoke (SLO thresholds) — expected to pass
k6 run -e BASE_URL=http://localhost:3000 tests/load/smoke.js

# stress (find the knee) — results in a browser dashboard
k6 run --out web-dashboard -e BASE_URL=http://localhost:3000 tests/load/stress.js
```

## Run against a deployment

```bash
k6 run -e BASE_URL=https://api.example.com tests/load/smoke.js
```

A non-zero exit code means a threshold was breached, which fails CI — that is
intentional: a performance regression should block a merge just like a failing
unit test.
