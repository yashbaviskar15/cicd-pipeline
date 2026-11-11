# 0004 · GitHub OIDC role assumption instead of static AWS keys

- **Status:** Accepted
- **Date:** 2026-11-11
- **Deciders:** Security / Platform

## Context

The CI/CD pipeline needs AWS credentials to push images to ECR, run Terraform
and trigger CodeDeploy. The conventional approach is to create an IAM user and
store `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` as long-lived GitHub
secrets.

Long-lived keys are a well-known liability: they never expire, they are copied
into many places, and leaking one (e.g. via a compromised action or a log) grants
persistent access. This project already runs secret scanning (Gitleaks) and
dependency/build scanning — static keys would undermine that posture.

## Decision

We will use **GitHub Actions OIDC** to assume a short-lived IAM role. The
`iam` Terraform module provisions an OIDC identity provider and a role whose
trust policy is scoped to this repository and branch, and workflows authenticate
with `aws-actions/configure-aws-credentials` using `id-token: write`.

## Consequences

**Positive**

- No long-lived AWS credentials stored anywhere; tokens are short-lived and
  scoped by the trust policy.
- Access can be scoped per repository, branch and environment (audience/sub
  conditions).
- Credentials in logs are useless — they expire in minutes.
- Auditable: CloudTrail shows role assumption with the GitHub actor.

**Negative / trade-offs**

- Slightly more setup: bootstrap the OIDC provider and role once (documented in
  the deployment guide).
- Workflows must request `id-token: write` and cannot run on forked PRs with
  secrets — which is a feature, not a bug.
- The `AWS_GITHUB_ACTIONS_ROLE_ARN` is a repository **variable**, not a secret,
  because an ARN is not sensitive and variables are visible to reusable
  workflows without extra plumbing.

**Neutral**

- Local development still uses a normal AWS SSO/CLI profile.
