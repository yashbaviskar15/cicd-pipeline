# Architecture Decision Records (ADRs)

Short, dated records of the significant architectural decisions behind this
platform — **why** a choice was made, what the alternatives were, and what we
accept as a consequence. Reviewers and interviewers care about the trade-offs
more than the final diagram.

Format: [MADR](https://adr.github.io/madr/)-lite (see [template.md](template.md)).

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-ecs-fargate-over-eks.md) | Run the workload on ECS Fargate instead of EKS | Accepted |
| [0002](0002-blue-green-over-rolling-deploys.md) | Blue/green deployments over rolling updates | Accepted |
| [0003](0003-terraform-modules-and-multi-env.md) | Reusable Terraform modules with per-environment tfvars | Accepted |
| [0004](0004-github-oidc-over-static-keys.md) | GitHub OIDC role assumption instead of static AWS keys | Accepted |
| [0005](0005-postgresql-prisma.md) | PostgreSQL + Prisma for the data layer | Accepted |
| [0006](0006-observability-and-slos.md) | Prometheus/Grafana/Loki/OTel with SLO-based alerting | Accepted |

> Add a new ADR by copying [template.md](template.md) to
> `NNNN-short-title.md`, then add a row above.
