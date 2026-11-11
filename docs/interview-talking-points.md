# Interview Talking Points

STAR-format answers (Situation · Task · Action · Result) for the questions that
come up when walking an interviewer through this project. Written in the first
person — say them out loud and make them your own.

> Golden rule: **lead with the outcome**, then explain the trade-off. Interviewers
> hire for judgment, not for a list of tools.

---

## 1. "Walk me through your pipeline."

**Situation** — I wanted a project that proved I could run a real service the way
a production team does, not just get a container to build.

**Task** — Design a CI/CD platform for a Node/Express API on AWS that was secure,
observable, cheap, and safe to deploy.

**Action** — I split it into two workflows. On every **PR** I run lint, the Jest
suite with an enforced **>80% coverage** gate, **CodeQL** SAST, `npm audit`,
**Trivy** filesystem + image scans that fail on HIGH/CRITICAL, **Gitleaks** for
secrets, **Hadolint** on the Dockerfiles, **Checkov/tfsec** on Terraform, a
`terraform plan` for dev/staging/prod that gets **commented back on the PR**, an
**Infracost** estimate, plus `helm lint`/`kustomize build` and a docker-compose
integration test and a k6 smoke test. On merge to **main**, a second workflow
builds both images once, scans them, generates an **SBOM with Syft**, **signs**
them with **Cosign** (keyless, tied to the GitHub OIDC identity), pushes to
**ECR**, and triggers a **CodeDeploy blue/green** deploy, followed by a
**post-deploy smoke test** that automatically rolls back on failure.

**Result** — A single change flows from PR to production with every security and
quality gate enforced, zero long-lived credentials, and an automatic safety net.
The interesting part isn't the number of tools — it's that each gate maps to a
specific risk.

*Follow-up you should expect:* "Why Cosign keyless?" → No key management; the
signature is bound to the workflow's OIDC identity and verified with
`--certificate-identity-regexp`, so a compromised token cannot forge a signature
for a different repo.

---

## 2. "How did you handle rollback?"

**Situation** — The scariest failure is a release that passes health checks but
breaks a real user journey, so a rolling update would already have shipped it
everywhere.

**Task** — Make every deploy atomic and instantly reversible, ideally without a
human in the loop.

**Action** — I chose **blue/green** over rolling updates ([ADR 0002](./adr/0002-blue-green-over-rolling-deploys.md)):
CodeDeploy stands up a parallel "green" task set and shifts traffic at the ALB.
I enabled **auto-rollback on deployment failure and on CloudWatch alarm**, and —
because alarms only cover metrics — I added a **post-deploy smoke test** that
exercises the real user journey (register, login, create/read/delete a task,
`/metrics`). The deploy job captures the currently-serving **known-good task
definition** *before* deploying; if the smoke test fails, the workflow triggers
a new blue/green deployment of that previous revision and then fails loudly.

**Result** — A bad release is detected within the deploy window and reverted
automatically; the green tasks are still running during the switch so the
rollback is instant. I rehearsed it in the [chaos drill](./chaos-drill.md).

*Follow-up:* "What if the smoke test is flaky?" → It retries twice with backoff,
and uses a unique user per run, so it is idempotent and not order-dependent.

---

## 3. "How did you secure it?"

**Situation** — A pipeline that can deploy to my AWS account is a high-value
target; long-lived keys in GitHub secrets are the classic footgun.

**Task** — Remove standing credentials, and fail the build on obvious
vulnerabilities and secrets.

**Action** — Four layers:

1. **Identity** — replaced static AWS keys with **GitHub OIDC** assuming a
   short-lived role scoped to the repo/branch ([ADR 0004](./adr/0004-github-oidc-over-static-keys.md)).
2. **Supply chain** — dependency and image scanning (**Trivy**, failing on
   HIGH/CRITICAL), **SBOM**, **Cosign** signing + verification, and a non-root,
   minimal, multi-stage image.
3. **Code/CI** — **CodeQL**, **Gitleaks** on the repo and in a **pre-commit
   hook**, **Checkov/tfsec** for IaC, **Hadolint** for Dockerfiles.
4. **Runtime** — least-privilege IAM, private subnets for tasks and RDS, TLS
   everywhere, `zod` validation on all input, rate limiting, `helmet`,
   read-only root filesystems in Kubernetes.

**Result** — No standing cloud credentials exist; a leaked log is useless because
tokens expire in minutes. Every control is a **required status check**, so a PR
cannot merge if any scan fails. The details are in [security.md](./security.md).

---

## 4. "How did you define reliability?"

**Situation** — "Is it up?" is not a reliability strategy; alerting on CPU graphs
creates fatigue and still misses user-visible failures.

**Task** — Define measurable objectives and alert on symptoms, not causes.

**Action** — I set an **availability SLO of 99.5%** and a **p95 latency SLO of
300 ms** ([slo.md](./slo.md)), computed from RED metrics exposed by
`prom-client`. From these I derived an **error budget** and implemented
**multi-window burn-rate alerts** (Google SRE workbook): a fast burn (14.4x)
pages immediately, a slow burn (6x) opens a ticket. Every alert links to a
**runbook**. I also wrote **failure drills** (kill a task, break the DB, ship a
bad deploy) so we practise recovery before we need it.

**Result** — Alerts fire when users are actually affected, and the error budget
gives a principled rule for when to stop shipping features and fix reliability.

---

## 5. "Why Terraform modules and multi-environment?"

**Situation** — The original infra was one flat set of `.tf` files with a single
tfvars — copy-paste drift waiting to happen, and one bad apply could touch
everything.

**Task** — Same topology across dev/staging/prod, different parameters, with
blast-radius isolation.

**Action** — I refactored into **reusable modules** (`vpc`, `alb`, `ecs`, `rds`,
`ecr`, `iam`, `monitoring`) and thin **environment roots** that differ only by
`terraform.tfvars` ([ADR 0003](./adr/0003-terraform-modules-and-multi-env.md)).
Each environment has **independent state** in **S3 with DynamoDB locking**,
bootstrapped by a dedicated `terraform/bootstrap` module. PRs get a plan for all
three environments; `apply` is manual and prod is gated by a GitHub Environment
with required reviewers.

**Result** — One definition per resource, no drift, and a dev change physically
cannot affect prod state. Cost per environment is tunable (single NAT, small
tasks in dev; HA NAT and multi-AZ in prod).

---

## 6. "Why Fargate and not EKS?"

**Situation** — Small team, one service, a low budget, and no desire to patch
worker nodes.

**Task** — Pick the smallest operational surface that still gives zero-downtime
deploys, autoscaling and health checks.

**Action** — Chose **ECS Fargate** ([ADR 0001](./adr/0001-ecs-fargate-over-eks.md))
for native ALB/CodeDeploy/Auto Scaling integration and no control-plane cost,
and I *also* shipped a Kubernetes track (Helm chart, Kustomize overlays, Argo CD
app-of-apps) plus an **optional** EKS Terraform module with an explicit cost
warning.

**Result** — The default path is cheap and boring; teams that need Kubernetes
have an on-ramp that reuses the same container images. This is the trade-off
answer: I optimised for the team's constraints, not for resumé-driven design.

---

## 7. "What would you do differently / what are the gaps?"

Showing you know the limits is a strength:

- **WAF / CloudFront** in front of the ALB for edge protection and caching.
- **Distributed rate limiting** (Redis) — the current limiter is per-task.
- **Progressive delivery** — start a blue/green or canary at 10% traffic with
  automated analysis before 100%.
- **Policy as code** — OPA/Conftest or Sentinel to enforce tagging/encryption
  rules rather than relying on review.
- **Managed observability** at scale (Amazon Managed Prometheus / Grafana Cloud)
  instead of self-hosted, once volume justifies the cost.
- **Secrets rotation** wired to a Lambda.

---

## 8. Rapid-fire one-liners

- **Idempotent deploys:** blue/green swaps at the LB; a re-run produces the same
  artifact from the same commit SHA.
- **Config vs secrets:** config is env vars/variables; secrets come from Secrets
  Manager injected via `valueFrom`.
- **Correlation:** every request has a `reqId` and, with tracing on, a
  `trace_id` that links logs (Loki) to traces (Jaeger).
- **Cardinality:** metrics are labelled by matched **route pattern**, never the
  raw URL path.
- **Fail fast:** the env schema is validated at boot; a misconfigured deploy
  crashes immediately instead of failing mysteriously under load.
- **Liveness vs readiness:** restart only on liveness; drain traffic on
  readiness (dependency down → 503, no restart loop).
