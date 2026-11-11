# 0002 · Blue/green deployments over rolling updates

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deciders:** Platform / SRE

## Context

Releases must be safe and reversible. ECS supports two deployment strategies:
**rolling update** (replace tasks gradually in place) and **blue/green**
(stand up a parallel "green" task set, then shift traffic at the load balancer).

The failure mode we care about: a bad release that passes health checks but
breaks a real user journey. A rolling update has already replaced most tasks by
the time you notice — rollback is another rolling update, i.e. slow and partial.

## Decision

We will use **CodeDeploy-orchestrated blue/green** deployments for
staging/prod, with `auto_rollback_configuration` enabled on
`DEPLOYMENT_FAILURE` and `DEPLOYMENT_STOP_ON_ALARM`, plus a **post-deploy smoke
test** that triggers an automatic rollback of the previous known-good task
definition. Dev keeps the simpler in-place `ECS` controller.

## Consequences

**Positive**

- Atomic traffic cut-over: users are on exactly one version at a time.
- Instant rollback — the blue tasks are still running during the switch.
- We can run a test listener against green before shifting production traffic.
- A failed smoke test is automatically reverted, not just reported.

**Negative / trade-offs**

- Roughly double the compute during the deployment window (both fleets run) —
  acceptable because the window is short and dev uses rolling updates.
- More moving parts: CodeDeploy apps, deployment groups, two target groups and a
  test listener.

**Neutral**

- Requires two target groups and a test listener in the ALB, which the `alb`
  module provisions anyway.
