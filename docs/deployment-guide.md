# Deployment Guide

End-to-end operator guide: from a fresh clone to a deployment, plus promotion,
rollback and teardown. For a first-time AWS setup, work top to bottom.

> **Cost note:** non-prod environments are designed to be cheap (single NAT
> gateway, one small Fargate task, `db.t4g.micro`). The ALB and NAT gateway are
> the main always-on costs — see the cost breakdown in the
> [README](../README.md#cost-breakdown). Run `terraform destroy` when finished.

---

## 0. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Terraform | ≥ 1.6 (CI pins 1.9.8) | `terraform version` |
| AWS CLI | v2 | `aws --version`, credentials configured |
| Docker | recent | `docker version` |
| Node.js | ≥ 20 | `node --version` |
| Helm / kubectl / kind | optional | Kubernetes track only |
| k6 | optional | load testing |

Run `make doctor` to check what is installed.

---

## 1. Bootstrap the Terraform remote state (once per AWS account)

Terraform state must live outside the environment stacks so it survives them.

```bash
cd terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars   # set a globally-unique bucket name
terraform init
terraform apply
```

This creates:

- an **S3 bucket** (versioned, encrypted, public access blocked, old versions
  expired) for state, and
- a **DynamoDB table** (`terraform-locks`) for state locking.

Note the outputs — you will paste them into each environment's
`backend.hcl`.

---

## 2. Configure an environment

Each environment is its own root module.

```bash
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
```

Edit `backend.hcl` with the bucket/table from step 1 (each environment already
uses a distinct state `key`):

```hcl
bucket         = "<your-state-bucket>"
key            = "cicd-pipeline/dev/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
encrypt        = true
```

Edit `terraform.tfvars` for anything account-specific (`github_owner`,
`github_repo`, certificate/domain, sizes).

```bash
terraform init -backend-config=backend.hcl
terraform fmt && terraform validate
terraform plan
terraform apply
```

Useful outputs afterwards: `alb_dns_name`, `app_url`, `ecr_backend_repository_url`,
`github_actions_role_arn`, `db_secret_arn`, `codedeploy_app_name`,
`codedeploy_deployment_group_name`.

### HTTPS with a custom domain (optional)

1. Request/import an ACM certificate for your domain (in the ALB's region).
2. Set `certificate_arn` (and `enable_https = true`) in `terraform.tfvars`.
3. If you host DNS in Route 53, set `domain_name` and `hosted_zone_id` to have a
   record created automatically.

Without a certificate the ALB still works over plain HTTP on port 80.

---

## 3. Connect GitHub Actions with OIDC

The `iam` module creates a GitHub OIDC provider and a role whose trust policy is
scoped to your repo/branch. Because OIDC relies on the provider already
existing, apply the IAM part first (it is part of the same `apply`), then add:

**Repository variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Example | Purpose |
| --- | --- | --- |
| `AWS_GITHUB_ACTIONS_ROLE_ARN` | `arn:aws:iam::123:role/...` | Role assumed by CI |
| `AWS_REGION` | `us-east-1` | Target region |
| `TF_STATE_BUCKET` | `my-tf-state` | Enables Terraform PR plans |
| `ENABLE_AWS_DEPLOY` | `true` | Push images to ECR + sign |
| `ENABLE_DEPLOY` | `true` | Trigger the blue/green deploy |
| `CODEDEPLOY_APP_NAME` | from Terraform output | Deploy target |
| `CODEDEPLOY_GROUP_NAME` | from Terraform output | Deploy target |
| `ECS_CLUSTER_NAME` / `ECS_SERVICE_NAME` | from Terraform output | Rollback support |
| `ECS_TASK_DEFINITION_ARN` | registered task def | Revision to deploy |
| `APP_BASE_URL` | `https://api.example.com` | Post-deploy smoke test target |

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret | Purpose |
| --- | --- |
| `INFRACOST_API_KEY` | Enables the Infracost cost estimate on PRs |

See [branch-protection.md](./branch-protection.md) for the required status
checks that gate merges.

---

## 4. Deploy

### Automated (recommended)

1. Open a PR → CI runs lint/tests/scans/Terraform plan/Infracost.
2. Merge to `main` → `Main · Build, Sign & Deploy` builds, scans, signs and
   pushes both images, then triggers a **blue/green** deploy.
3. The post-deploy **smoke test** runs against `APP_BASE_URL`; on failure the
   workflow **automatically rolls back** to the previous known-good task
   definition.

### Infrastructure changes

- **PR:** `reusable-terraform-plan.yml` runs `fmt`/`validate`/`plan` for dev,
  staging and prod and comments the plan on the PR.
- **Apply:** run the `Terraform · Apply` workflow (`workflow_dispatch`) for a
  chosen environment. `prod` is gated by a GitHub **Environment** with required
  reviewers, so apply waits for manual approval.

### Kubernetes track (alternative)

```bash
make k8s-up                 # kind cluster + dev overlay
# or, with Argo CD installed:
kubectl apply -f deploy/argocd/app-of-apps.yaml
```

```bash
helm upgrade --install backend deploy/helm/backend \
  -f deploy/helm/backend/values-prod.yaml \
  --namespace cicd-pipeline --create-namespace
```

---

## 5. Promote between environments

Promotion is **deliberate**, not automatic:

1. Verify staging: `curl https://staging.../health/ready`, watch the SLO
   dashboards, run the k6 smoke (`make load-test BASE_URL=...`).
2. Apply the same image digest in prod by pointing `backend_image` (or the
   `ECS_TASK_DEFINITION_ARN`) at that digest and running the deploy workflow.
3. Watch the SLO dashboards / alerts for the first 15 minutes.

---

## 6. Rollback

| Situation | Action |
| --- | --- |
| Failed post-deploy smoke test | Automatic — workflow redeploys the previous task definition |
| Bad release noticed later | Re-run `Main · Build, Sign & Deploy` on the last good commit, or CodeDeploy → **Stop and roll back** |
| Bad Kubernetes release | `kubectl -n cicd-pipeline rollout undo deployment/backend` |
| Bad infra change | Revert the PR and let `Terraform · Apply` reconcile, or `terraform apply` the previous commit |

See [chaos-drill.md](./chaos-drill.md) drill 3 for a rehearsal.

---

## 7. Teardown

```bash
# destroy an environment
cd terraform/environments/dev && terraform destroy

# destroy the Kubernetes demo
make k8s-down

# stop local stacks
make down && make obs-down
```

The bootstrap state bucket/table are intentionally kept; destroy
`terraform/bootstrap` only if you are done with the account entirely.
