locals {
  name         = "${var.project}-${var.environment}"
  service_name = "backend"

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "Terraform"
    Repository  = "${var.github_owner}/${var.github_repo}"
  }

  # Deterministic alarm names produced by the monitoring module. Defined here so
  # the ECS module (CodeDeploy auto-rollback) can reference them without creating
  # a dependency cycle with the monitoring module.
  alarm_names = [
    "${local.name}-${local.service_name}-cpu-high",
    "${local.name}-${local.service_name}-memory-high",
    "${local.name}-${local.service_name}-unhealthy-hosts",
    "${local.name}-${local.service_name}-5xx",
    "${local.name}-${local.service_name}-p95-latency",
  ]
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------

module "vpc" {
  source = "../../modules/vpc"

  name                 = local.name
  cidr_block           = var.vpc_cidr
  azs                  = var.azs
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  enable_nat_gateway   = var.enable_nat_gateway
  single_nat_gateway   = var.single_nat_gateway
  app_port             = 3000
  tags                 = local.tags
}

# ---------------------------------------------------------------------------
# Container registry
# ---------------------------------------------------------------------------

module "ecr" {
  source = "../../modules/ecr"

  name             = local.name
  repositories     = ["backend", "frontend"]
  keep_last_images = var.ecr_keep_last_images
  tags             = local.tags
}

# ---------------------------------------------------------------------------
# Database (RDS PostgreSQL, private subnets) + credentials in Secrets Manager
# ---------------------------------------------------------------------------

module "rds" {
  source = "../../modules/rds"

  name                = local.name
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  security_group_ids  = [module.vpc.db_security_group_id]
  db_name             = var.db_name
  master_username     = var.db_master_username
  instance_class      = var.db_instance_class
  allocated_storage   = var.db_allocated_storage
  multi_az            = var.db_multi_az
  deletion_protection = var.db_deletion_protection
  skip_final_snapshot = var.db_skip_final_snapshot
  tags                = local.tags
}

# ---------------------------------------------------------------------------
# Application secrets (never hardcoded; generated and stored in Secrets Manager)
# ---------------------------------------------------------------------------

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "app" {
  name = "${local.name}-app"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    JWT_SECRET         = random_password.jwt_secret.result
    JWT_REFRESH_SECRET = random_password.jwt_refresh_secret.result
  })
}

# ---------------------------------------------------------------------------
# IAM (GitHub OIDC deploy role + ECS task roles)
# ---------------------------------------------------------------------------

module "iam" {
  source = "../../modules/iam"

  name                 = local.name
  github_owner         = var.github_owner
  github_repo          = var.github_repo
  create_oidc_provider = var.create_oidc_provider
  allowed_branches     = var.allowed_branches
  ecr_repository_arns  = module.ecr.repository_arns
  secrets_arns         = [module.rds.secret_arn, aws_secretsmanager_secret.app.arn]
  tags                 = local.tags
}

# ---------------------------------------------------------------------------
# Load balancer (blue + green target groups, HTTPS optional)
# ---------------------------------------------------------------------------

module "alb" {
  source = "../../modules/alb"

  name               = local.name
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.public_subnet_ids
  security_group_ids = [module.vpc.alb_security_group_id]
  app_port           = 3000
  health_check_path  = var.health_check_path
  certificate_arn    = var.certificate_arn
  enable_https       = var.enable_https
  tags               = local.tags
}

# ---------------------------------------------------------------------------
# ECS Fargate service (rolling or CodeDeploy blue/green)
# ---------------------------------------------------------------------------

module "ecs" {
  source = "../../modules/ecs"

  name         = local.name
  cluster_name = "${local.name}-cluster"
  service_name = local.service_name
  image        = var.backend_image
  cpu          = var.task_cpu
  memory       = var.task_memory

  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.vpc.app_security_group_id]
  assign_public_ip   = false

  execution_role_arn = module.iam.ecs_task_execution_role_arn
  task_role_arn      = module.iam.ecs_task_role_arn

  environment = [
    { name = "NODE_ENV", value = var.environment == "prod" ? "production" : "development" },
    { name = "PORT", value = "3000" },
    { name = "LOG_LEVEL", value = var.log_level },
    { name = "CORS_ORIGIN", value = var.cors_origin },
    { name = "SERVICE_VERSION", value = var.service_version },
    { name = "RUN_MIGRATIONS", value = "true" },
    { name = "TRUST_PROXY", value = "true" },
  ]

  secrets = [
    { name = "DATABASE_URL", valueFrom = "${module.rds.secret_arn}:database_url::" },
    { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_SECRET::" },
    { name = "JWT_REFRESH_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_REFRESH_SECRET::" },
  ]

  health_check_path = var.health_check_path

  # Blue/green wiring (ignored when deployment_controller = "ECS")
  target_group_arn        = module.alb.target_group_blue_arn
  prod_listener_arn       = module.alb.prod_listener_arn
  test_listener_arn       = module.alb.test_listener_arn
  blue_target_group_name  = module.alb.target_group_blue_name
  green_target_group_name = module.alb.target_group_green_name
  codedeploy_role_arn     = module.iam.codedeploy_role_arn
  deployment_controller   = var.deployment_controller
  alarm_names             = local.alarm_names

  desired_count          = var.desired_count
  enable_autoscaling     = var.enable_autoscaling
  min_capacity           = var.min_capacity
  max_capacity           = var.max_capacity
  cpu_target_utilization = var.cpu_target_utilization
  requests_per_target    = var.requests_per_target
  alb_metric_label       = "${module.alb.alb_arn_suffix}/${module.alb.target_group_blue_arn_suffix}"

  capacity_providers = var.use_fargate_spot ? [
    { capacity_provider = "FARGATE_SPOT", weight = 1, base = 0 }
  ] : []

  tags = local.tags
}

# ---------------------------------------------------------------------------
# Monitoring (CloudWatch alarms + dashboard) and alarm notifications
# ---------------------------------------------------------------------------

resource "aws_sns_topic" "alarms" {
  name = "${local.name}-alarms"
  tags = local.tags
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

module "monitoring" {
  source = "../../modules/monitoring"

  name                    = local.name
  cluster_name            = module.ecs.cluster_name
  service_name            = module.ecs.service_name
  alb_arn_suffix          = module.alb.alb_arn_suffix
  target_group_arn_suffix = module.alb.target_group_blue_arn_suffix
  alarm_actions           = [aws_sns_topic.alarms.arn]
  create_dashboard        = var.create_dashboard
  tags                    = local.tags
}

# ---------------------------------------------------------------------------
# Optional Route53 alias record pointing a domain at the ALB
# ---------------------------------------------------------------------------

resource "aws_route53_record" "app" {
  count   = var.domain_name != "" && var.hosted_zone_id != "" ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}
