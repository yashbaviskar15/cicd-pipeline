# Production-Ready DevSecOps Platform — developer entrypoint.
#
# One command surface for local dev, testing, security scanning, IaC and
# Kubernetes. Works on Linux/macOS and on Windows via Git Bash or WSL.
#
#   make help
#
# Override variables on the command line, e.g.:
#   make tf-plan TF_ENV=staging
#   make load-test SCENARIO=stress BASE_URL=https://api.example.com

SHELL := /bin/bash
.DEFAULT_GOAL := help

COMPOSE      ?= docker compose
OBS_COMPOSE  ?= docker compose -f docker-compose.yml -f docker-compose.observability.yml
BACKEND      ?= backend
TF_ENV       ?= dev
TF_DIR       := terraform/environments/$(TF_ENV)
BASE_URL     ?= http://localhost:3000
SCENARIO     ?= smoke
CLUSTER      ?= cicd-pipeline

.PHONY: help setup doctor lint fmt test test-coverage build up down restart logs ps smoke \
        scan scan-image tf-init tf-fmt tf-validate tf-plan tf-apply bootstrap load-test \
        k8s-up k8s-down helm-lint obs-up obs-down clean

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## --- Setup ----------------------------------------------------------------

setup: ## Install dependencies + git hooks (run once after cloning)
	cd $(BACKEND) && npm ci
	npm install
	@echo "Setup complete. Run 'make up' to start the stack."

doctor: ## Check that required tooling is available
	@command -v docker   >/dev/null 2>&1 && docker --version   || echo "MISSING: docker"
	@command -v docker   >/dev/null 2>&1 && docker info >/dev/null 2>&1 && echo "docker daemon: running" || echo "docker daemon: NOT running"
	@command -v node     >/dev/null 2>&1 && node --version     || echo "MISSING: node"
	@command -v terraform>/dev/null 2>&1 && terraform version | head -1 || echo "MISSING: terraform"
	@command -v helm     >/dev/null 2>&1 && helm version --short || echo "MISSING: helm"
	@command -v kubectl  >/dev/null 2>&1 && kubectl version --client=true --output=yaml >/dev/null 2>&1 && echo "kubectl: ok" || echo "MISSING: kubectl"
	@command -v kind     >/dev/null 2>&1 && kind --version      || echo "MISSING: kind"
	@command -v k6       >/dev/null 2>&1 && k6 version          || echo "MISSING: k6"
	@command -v gitleaks >/dev/null 2>&1 && gitleaks version    || echo "MISSING: gitleaks"

## --- Quality --------------------------------------------------------------

lint: ## Lint the backend, check Terraform formatting and lint the Helm chart
	cd $(BACKEND) && npm run lint
	terraform fmt -check -recursive terraform/environments terraform/modules terraform/bootstrap
	$(MAKE) helm-lint

fmt: ## Auto-format Terraform
	terraform fmt -recursive terraform/environments terraform/modules terraform/bootstrap

test: ## Run backend unit + integration tests
	cd $(BACKEND) && npm run test

test-coverage: ## Run backend tests with a coverage report
	cd $(BACKEND) && npm run test:coverage

smoke: ## Run the end-to-end smoke test against BASE_URL
	BASE_URL=$(BASE_URL) node scripts/smoke-test.mjs

## --- Build & run ----------------------------------------------------------

build: ## Build all Docker images
	$(COMPOSE) build

up: ## Start the app stack (postgres + backend + frontend)
	$(COMPOSE) up -d --build
	@echo "Backend http://localhost:3000 · Docs http://localhost:3000/docs · Frontend http://localhost:8080"

down: ## Stop the app stack
	$(COMPOSE) down

restart: down up ## Restart the app stack

logs: ## Tail logs from the app stack
	$(COMPOSE) logs -f

ps: ## Show running containers
	$(COMPOSE) ps

## --- Security -------------------------------------------------------------

scan: ## Run local secret + filesystem scans (gitleaks + trivy)
	@command -v gitleaks >/dev/null 2>&1 && gitleaks detect --no-banner --redact || echo "gitleaks not installed"
	@command -v trivy    >/dev/null 2>&1 && trivy fs --severity HIGH,CRITICAL --exit-code 1 . || echo "trivy not installed"

scan-image: ## Scan the built backend image (SERVICE=backend)
	trivy image --severity HIGH,CRITICAL --exit-code 1 $(or $(SERVICE),backend):latest

## --- Terraform ------------------------------------------------------------

tf-init: ## terraform init for TF_ENV using the remote backend
	cd $(TF_DIR) && terraform init -input=false -backend-config=backend.hcl

tf-fmt: ## terraform fmt for TF_ENV
	terraform fmt -recursive $(TF_DIR)

tf-validate: ## terraform init + validate for TF_ENV
	cd $(TF_DIR) && terraform init -input=false -backend=false && terraform validate

tf-plan: ## terraform plan for TF_ENV (TF_ENV=dev|staging|prod)
	cd $(TF_DIR) && terraform init -input=false -backend=false && terraform plan -var-file=terraform.tfvars

tf-apply: ## terraform apply for TF_ENV (requires TF_ENV and confirmation)
	cd $(TF_DIR) && terraform apply -var-file=terraform.tfvars

bootstrap: ## Create the S3 + DynamoDB remote-state resources
	cd terraform/bootstrap && terraform init && terraform apply -var-file=terraform.tfvars

## --- Performance ----------------------------------------------------------

load-test: ## Run k6 against BASE_URL (SCENARIO=smoke|stress)
	k6 run -e BASE_URL=$(BASE_URL) tests/load/$(SCENARIO).js

## --- Kubernetes -----------------------------------------------------------

helm-lint: ## helm lint + template the backend chart
	helm lint deploy/helm/backend
	helm template backend deploy/helm/backend -f deploy/helm/backend/values-dev.yaml >/dev/null

k8s-up: ## Create a local kind cluster and deploy the dev overlay
	kind create cluster --config deploy/kind/kind-config.yaml || true
	kubectl apply -k deploy/k8s/overlays/dev
	@echo "Wait for rollout: kubectl -n cicd-pipeline rollout status deploy/backend"

k8s-down: ## Delete the local kind cluster
	kind delete cluster --name $(CLUSTER)

## --- Observability --------------------------------------------------------

obs-up: ## Start the observability stack (Prometheus/Grafana/Loki/Jaeger)
	$(OBS_COMPOSE) up -d
	@echo "Grafana http://localhost:3001 · Prometheus http://localhost:9090 · Jaeger http://localhost:16686"

obs-down: ## Stop the observability stack
	$(OBS_COMPOSE) down

## --- Housekeeping ---------------------------------------------------------

clean: ## Remove build/test artifacts and stop the stacks
	$(COMPOSE) down -v || true
	rm -rf $(BACKEND)/coverage $(BACKEND)/node_modules/.cache k6-summary.json
