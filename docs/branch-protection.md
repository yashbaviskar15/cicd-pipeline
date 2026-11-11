# Branch protection & required checks

This document describes the recommended GitHub repository settings that turn
the workflows in `.github/workflows/` into enforced merge gates. Configure them
under **Settings → Branches → Branch protection rules** for the `main` branch.

## `main` branch rules

| Setting | Value | Why |
| --- | --- | --- |
| Require a pull request before merging | ✅ | No direct pushes to `main` |
| Require approvals | 1 | Human review of infra/app changes |
| Dismiss stale pull request approvals | ✅ | Re-review after new commits |
| Require status checks to pass | ✅ | CI must be green |
| Require branches to be up to date | ✅ | Avoid merge skew |
| Require conversation resolution | ✅ | No unresolved review threads |
| Require linear history | ✅ | Clean history for semantic-release |
| Do not allow bypassing | ✅ (admins included when possible) | Enforce uniformly |
| Restrict force pushes / deletions | ✅ | Protect history |

## Required status checks

Add these context names (they appear once the workflows have run at least once):

- `Node CI (backend) / lint · test · coverage`
- `Docker (backend) / build · hadolint · trivy · sbom`
- `Docker (frontend) / build · hadolint · trivy · sbom`
- `Security scans / Gitleaks (secrets)`
- `Security scans / npm audit`
- `Security scans / Checkov + tfsec (IaC)`
- `Security scans / Trivy fs (deps & misconfig)`
- `CodeQL (SAST) / Analyze (javascript-typescript)`
- `Terraform fmt / validate / plan / fmt · validate · plan (dev)` (once the dev workspace is configured)

> Tip: required checks are matched by the **job name** produced by the
> workflow. Run the workflow once on a PR, then copy the exact names from the
> "Checks" tab.

## Repository variables & secrets

| Name | Type | Purpose |
| --- | --- | --- |
| `AWS_GITHUB_ACTIONS_ROLE_ARN` | secret | IAM role assumed via OIDC (no long-lived keys) |
| `AWS_REGION` | variable | e.g. `us-east-1` |
| `ENABLE_AWS_DEPLOY` | variable | `true` to publish images to ECR + sign |
| `ENABLE_DEPLOY` | variable | `true` to trigger the CodeDeploy blue/green deploy |
| `CODEDEPLOY_APP_NAME` | variable | CodeDeploy application name |
| `CODEDEPLOY_GROUP_NAME` | variable | CodeDeploy deployment group |
| `ECS_TASK_DEFINITION_ARN` | variable | Task definition ARN for the release |
| `INFRACOST_API_KEY` | secret | Enables the Infracost estimate on PRs |

See [docs/deployment-guide.md](deployment-guide.md) for how to create the OIDC
role and the rest of the AWS setup.

## Environment protection (prod apply)

Create a GitHub **Environment** named `prod` with:

- Required reviewers (manual approval) before `terraform apply`.
- Deployment branches restricted to `main`.

The Terraform CD workflow (`terraform-cd.yml`) targets the `prod` environment,
so `terraform apply` waits for a human approval.
