# 0001 · Run the workload on ECS Fargate instead of EKS

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deciders:** Platform / SRE

## Context

The application is a single Node.js/Express API plus a static Nginx frontend.
It must run in containers on AWS with zero-downtime deploys, health checks,
autoscaling and a small operational footprint. The team is small and the goal is
a portfolio-grade but genuinely runnable platform on a low budget.

The realistic options were:

1. **Amazon ECS on Fargate** — serverless containers, no nodes to patch.
2. **Amazon EKS** — managed Kubernetes, the industry default for large
   multi-team platforms.
3. **AWS App Runner** — even more managed but limited control over networking,
   blue/green and load balancing.

## Decision

We will run the production workload on **ECS Fargate**, and provide EKS as a
clearly-marked, **optional** Terraform module for teams that need Kubernetes.

## Consequences

**Positive**

- No control-plane cost and no worker nodes to patch — the smallest possible
  operational surface for a single service.
- Native integration with ALB target groups, CodeDeploy blue/green,
  Application Auto Scaling and CloudWatch.
- Fargate Spot can cut compute cost further for non-prod.
- Free-tier-friendly: ECS itself has no control-plane charge.

**Negative / trade-offs**

- Less portable than Kubernetes; the deployment manifests are AWS-specific
  (this repo also ships Kubernetes manifests + a Helm chart to cover that gap).
- Fewer ecosystem tools (no operators/CRDs, no service mesh by default).

**Neutral**

- The application is already containerised, so migrating to EKS later is a
  matter of reusing the same images and the provided Helm chart.
