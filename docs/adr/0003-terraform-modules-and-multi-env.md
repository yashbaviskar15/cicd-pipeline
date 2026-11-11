# 0003 · Reusable Terraform modules with per-environment tfvars

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deciders:** Platform

## Context

We need three environments (dev, staging, prod) that differ in size, resilience
and cost — not in topology. The original code was a flat set of `*.tf` files
with a single `terraform.tfvars`, which cannot express "same shape, different
parameters" without copy-paste drift.

## Decision

We will refactor into **reusable modules** (`vpc`, `alb`, `ecs`, `rds`, `ecr`,
`iam`, `monitoring`, optional `eks`) and thin **environment roots** under
`terraform/environments/{dev,staging,prod}` that compose the modules and pass
differences via `terraform.tfvars`. State is per-environment in **S3 with
DynamoDB locking**, bootstrapped by a dedicated `terraform/bootstrap` module.

## Consequences

**Positive**

- One definition of each resource; environments differ only by variables.
- Independent state per environment → a bad `apply` in dev cannot touch prod.
- State locking prevents concurrent applies corrupting state.
- The module boundary is a natural place to enforce tags, encryption and naming.

**Negative / trade-offs**

- More files and an extra layer of indirection; simple changes may touch a
  module and several env roots.
- Terraform version/provider upgrades must be rolled out across envs.

**Neutral**

- The original flat configuration is preserved under `terraform/legacy/` for
  reference and is excluded from `terraform fmt` in CI.
