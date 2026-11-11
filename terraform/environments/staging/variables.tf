variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name used as a resource name prefix"
  type        = string
  default     = "cicd-pipeline"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# --- Networking ---

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability zones to use (defaults to the first two)"
  type        = list(string)
  default     = []
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "enable_nat_gateway" {
  description = "Create a NAT gateway so private tasks have egress"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway (cheaper) instead of one per AZ"
  type        = bool
  default     = true
}

# --- GitHub OIDC ---

variable "github_owner" {
  description = "GitHub org/user that owns the repository"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "create_oidc_provider" {
  description = "Create the GitHub OIDC provider (only in one environment per AWS account)"
  type        = bool
  default     = false
}

variable "allowed_branches" {
  description = "Branches allowed to assume the CI/deploy role"
  type        = list(string)
  default     = ["main"]
}

# --- TLS / DNS ---

variable "certificate_arn" {
  description = "ACM certificate ARN for the ALB HTTPS listener"
  type        = string
  default     = ""
}

variable "enable_https" {
  description = "Create an HTTPS listener and redirect HTTP to HTTPS"
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Optional domain name to point at the ALB via Route53"
  type        = string
  default     = ""
}

variable "hosted_zone_id" {
  description = "Optional Route53 hosted zone ID for the domain"
  type        = string
  default     = ""
}

# --- Application (ECS) ---

variable "backend_image" {
  description = "Container image URI for the backend"
  type        = string
  default     = "public.ecr.aws/nginx/nginx:alpine"
}

variable "task_cpu" {
  description = "Fargate task CPU units"
  type        = string
  default     = "256"
}

variable "task_memory" {
  description = "Fargate task memory in MiB"
  type        = string
  default     = "512"
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "deployment_controller" {
  description = "ECS (rolling) or CODE_DEPLOY (blue/green)"
  type        = string
  default     = "ECS"
}

variable "enable_autoscaling" {
  description = "Enable Application Auto Scaling"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum tasks for autoscaling"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum tasks for autoscaling"
  type        = number
  default     = 4
}

variable "cpu_target_utilization" {
  description = "Target average CPU utilisation for autoscaling"
  type        = number
  default     = 65
}

variable "requests_per_target" {
  description = "Target ALB requests per target per minute"
  type        = number
  default     = 1000
}

variable "use_fargate_spot" {
  description = "Use FARGATE_SPOT capacity provider for cost savings"
  type        = bool
  default     = false
}

variable "health_check_path" {
  description = "ALB / container health check path"
  type        = string
  default     = "/health/live"
}

# --- Application config ---

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "info"
}

variable "service_version" {
  description = "Service version reported in logs/metrics"
  type        = string
  default     = "dev"
}

variable "cors_origin" {
  description = "Allowed CORS origin(s) for the API"
  type        = string
  default     = "*"
}

# --- Database ---

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "app"
}

variable "db_master_username" {
  description = "RDS master username"
  type        = string
  default     = "app"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage (GB)"
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Enable Multi-AZ RDS"
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Prevent accidental RDS deletion"
  type        = bool
  default     = false
}

variable "db_skip_final_snapshot" {
  description = "Skip the final snapshot on destroy"
  type        = bool
  default     = true
}

# --- ECR / observability ---

variable "ecr_keep_last_images" {
  description = "How many tagged images to retain per repository"
  type        = number
  default     = 10
}

variable "create_dashboard" {
  description = "Create a CloudWatch dashboard"
  type        = bool
  default     = true
}

variable "alarm_email" {
  description = "Optional email address subscribed to alarm notifications"
  type        = string
  default     = ""
}
