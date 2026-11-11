# Architecture

> High-level design of the **Production-Ready DevSecOps Platform**. For the
> rationale behind individual choices see the [ADRs](./adr/), and for an
> end-to-end operator walkthrough see the
> [deployment guide](./deployment-guide.md).

## 1. System context

```mermaid
flowchart TB
    subgraph Users["Users"]
        Browser["Browser / API client"]
    end

    subgraph Edge["Edge"]
        Vercel["Vercel (static frontend, optional)"]
        ALB["AWS Application Load Balancer (HTTPS)"]
        Ingress["Kubernetes Ingress / NGINX (K8s track)"]
    end

    subgraph Compute["Compute"]
        ECS["ECS Fargate service (blue/green)"]
        K8s["Kubernetes Deployment + HPA (Alt track)"]
    end

    subgraph Data["Data"]
        RDS[("RDS PostgreSQL\ndb.t4g.micro")]
        SM["AWS Secrets Manager"]
    end

    subgraph Obs["Observability"]
        Prom["Prometheus"]
        Graf["Grafana"]
        Loki["Loki + Promtail"]
        Jaeger["Jaeger (OTel traces)"]
        CW["CloudWatch alarms/dashboard"]
    end

    subgraph CICD["CI/CD"]
        GHA["GitHub Actions (OIDC)"]
        ECR["Amazon ECR"]
        CD["CodeDeploy"]
    end

    Browser -->|HTTPS| Vercel
    Browser -->|HTTPS| ALB
    Browser -->|HTTPS| Ingress
    ALB --> ECS
    Ingress --> K8s
    ECS --> RDS
    K8s --> RDS
    ECS -.->|read secrets| SM
    ECS --> CW
    ECS --> Prom
    K8s --> Prom
    Prom --> Graf
    Loki --> Graf
    Jaeger --> Graf
    GHA -->|push image| ECR
    ECR --> CD
    CD -->|blue/green| ECS
    CD --> ALB
```

There are **two deployment tracks** that share the same application artifact:

1. **AWS track (primary):** ECS Fargate behind an ALB with CodeDeploy blue/green
   and CloudWatch-driven rollback. Provisioned by the multi-environment
   Terraform in [`terraform/`](../terraform).
2. **Kubernetes track (alternative):** the same image deployed via a Helm chart
   / Kustomize overlays, synced by Argo CD (app-of-apps). Lives in
   [`deploy/`](../deploy). Useful for teams already on Kubernetes; the Terraform
   for EKS is optional and carries a cost warning.

## 2. Application

A single Node.js 20 / Express service:

| Concern | Implementation |
| --- | --- |
| API | Express router, `zod` request validation, central error handler |
| Auth | JWT access + refresh tokens, bcrypt password hashing |
| Data | Prisma ORM over PostgreSQL |
| Hardening | `helmet`, CORS allow-list, `express-rate-limit` (global + stricter on auth) |
| Config | `zod`-validated environment schema — fail fast at boot |
| Logging | `pino` structured JSON with a per-request correlation id |
| Metrics | `prom-client`: RED metrics, DB latency histogram, business counters |
| Tracing | OpenTelemetry (opt-in) HTTP + Express instrumentation |
| Docs | OpenAPI 3.0.3 served with Swagger UI at `/docs` |
| Lifecycle | `/health/live` (liveness), `/health/ready` (DB readiness), graceful shutdown on `SIGTERM` |

### Request lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as helmet / CORS / rate-limit
    participant R as Router
    participant V as zod validate
    participant A as auth (JWT)
    participant S as Service
    participant P as Prisma → Postgres
    participant M as Metrics middleware

    C->>H: HTTP request
    H->>M: pass (or 429 / blocked)
    M->>R: start timer
    R->>V: validate body/query/params
    V-->>R: 422 on invalid input
    R->>A: verify Bearer token
    A-->>R: 401 if invalid
    R->>S: business logic
    S->>P: parameterised query (timed)
    P-->>S: rows
    S-->>R: DTO
    R-->>M: response
    M->>M: observe duration + status (RED)
    M-->>C: JSON response
```

## 3. CI/CD pipeline

```mermaid
flowchart LR
    Dev["Developer"] -->|PR| PR["PR workflows\nlint · test · coverage\nCodeQL · Trivy · Gitleaks · Checkov/tfsec\nTerraform plan + Infracost\nhelm lint · kustomize build\nintegration · k6 smoke"]
    PR -->|squash merge| Main["main"]
    Main --> Build["Build · scan · SBOM · cosign sign"]
    Build -->|push| ECR["ECR"]
    ECR --> Deploy["CodeDeploy blue/green"]
    Deploy --> Smoke{"Post-deploy\nsmoke test"}
    Smoke -->|pass| Live["Live (green)"]
    Smoke -->|fail| Rollback["Auto-rollback\nto previous task def"]
    Main --> Release["semantic-release\n→ tag + GitHub Release + changelog"]
```

**Security gates** (all fail the build on violation): CodeQL SAST, `npm audit`,
Trivy image scan (HIGH/CRITICAL), Gitleaks secret scan, Hadolint Dockerfile
lint, Checkov + tfsec IaC scan, Syft SBOM, Cosign keyless signature.

**Supply chain:** images are signed with Cosign (keyless, tied to the GitHub
OIDC identity) and verified, and an SBOM is produced for every build.

## 4. Multi-environment infrastructure

```mermaid
flowchart TB
    subgraph Bootstrap["terraform/bootstrap (once)"]
        S3[("S3 state bucket\nversioned + encrypted")]
        DDB[("DynamoDB\nstate lock")]
    end

    subgraph Modules["terraform/modules (shared)"]
        VPC[vpc] --- ALB[alb] --- ECS[ecs] --- RDS[rds] --- ECR[ecr] --- IAM[iam] --- MON[monitoring]
    end

    subgraph Envs["terraform/environments"]
        DEV["dev (1 NAT, small, in-place)"] --> Modules
        STG["staging (blue/green)"] --> Modules
        PRD["prod (HA NAT, multi-AZ DB, auto-rollback)"] --> Modules
    end

    Envs --> Bootstrap
```

Each environment is an independent root module with its **own state** in S3
(locked via DynamoDB) and its own `terraform.tfvars`. Differences between
environments are parameters, not topology.

## 5. Reliability model

- **Health:** liveness vs readiness separated — a dependency outage drains
  traffic instead of causing a restart loop.
- **Autoscaling:** ECS Application Auto Scaling on CPU and ALB
  request-count-per-target; Kubernetes HPA on CPU/memory.
- **Deploys:** blue/green with automatic rollback on failure/alarm + post-deploy
  smoke test rollback.
- **SLOs:** 99.5% availability, p95 < 300 ms, enforced by burn-rate alerts
  ([slo.md](./slo.md)).
- **Runbooks:** [service-down](./runbooks/service-down.md),
  [high-error-rate](./runbooks/high-error-rate.md),
  [high-latency](./runbooks/high-latency.md).
- **Drills:** documented, repeatable failure injections in
  [chaos-drill.md](./chaos-drill.md).
