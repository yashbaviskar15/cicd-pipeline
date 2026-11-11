variable "name" {
  description = "Name prefix for all resources"
  type        = string
}

variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "service_name" {
  description = "ECS service name"
  type        = string
  default     = "backend"
}

variable "container_name" {
  description = "Container name inside the task definition"
  type        = string
  default     = "backend"
}

variable "image" {
  description = "Container image URI"
  type        = string
}

variable "cpu" {
  description = "Fargate task CPU units (256 = 0.25 vCPU)"
  type        = string
  default     = "256"
}

variable "memory" {
  description = "Fargate task memory in MiB"
  type        = string
  default     = "512"
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 1
}

variable "subnet_ids" {
  description = "Subnet IDs for the tasks"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for the tasks"
  type        = list(string)
}

variable "assign_public_ip" {
  description = "Assign a public IP to tasks (required when using public subnets without NAT)"
  type        = bool
  default     = false
}

variable "execution_role_arn" {
  description = "ECS task execution role ARN"
  type        = string
}

variable "task_role_arn" {
  description = "ECS task role ARN"
  type        = string
}

variable "environment" {
  description = "Plain environment variables for the container"
  type        = list(object({ name = string, value = string }))
  default     = []
}

variable "secrets" {
  description = "Secrets passed to the container (valueFrom = Secrets Manager / SSM ARN)"
  type        = list(object({ name = string, valueFrom = string }))
  default     = []
}

variable "log_group_name" {
  description = "CloudWatch log group name"
  type        = string
  default     = ""
}

variable "log_retention_in_days" {
  description = "CloudWatch log retention"
  type        = number
  default     = 7
}

variable "health_check_path" {
  description = "Path used by the ALB health check"
  type        = string
  default     = "/health/live"
}

variable "health_check_command" {
  description = "Optional container-level healthcheck command"
  type        = list(string)
  default     = []
}

variable "target_group_arn" {
  description = "Blue target group ARN attached to the service"
  type        = string
}

variable "prod_listener_arn" {
  description = "Production listener ARN (CodeDeploy blue/green)"
  type        = string
  default     = ""
}

variable "test_listener_arn" {
  description = "Test listener ARN (CodeDeploy blue/green)"
  type        = string
  default     = ""
}

variable "blue_target_group_name" {
  description = "Blue target group name (CodeDeploy blue/green)"
  type        = string
  default     = ""
}

variable "green_target_group_name" {
  description = "Green target group name (CodeDeploy blue/green)"
  type        = string
  default     = ""
}

variable "codedeploy_role_arn" {
  description = "CodeDeploy service role ARN"
  type        = string
  default     = ""
}

variable "deployment_controller" {
  description = "Deployment controller: ECS (rolling) or CODE_DEPLOY (blue/green)"
  type        = string
  default     = "ECS"

  validation {
    condition     = contains(["ECS", "CODE_DEPLOY"], var.deployment_controller)
    error_message = "deployment_controller must be ECS or CODE_DEPLOY."
  }
}

variable "deployment_config_name" {
  description = "CodeDeploy deployment config for blue/green"
  type        = string
  default     = "CodeDeployDefault.ECSLinear10PercentEvery1Minutes"
}

variable "termination_wait_minutes" {
  description = "Minutes to keep the old (blue) task set before termination"
  type        = number
  default     = 5
}

variable "alarm_names" {
  description = "CloudWatch alarm names that trigger an automatic rollback"
  type        = list(string)
  default     = []
}

variable "enable_autoscaling" {
  description = "Create Application Auto Scaling target and policies"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum number of tasks for autoscaling"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks for autoscaling"
  type        = number
  default     = 4
}

variable "cpu_target_utilization" {
  description = "Target average CPU utilisation (%)"
  type        = number
  default     = 65
}

variable "requests_per_target" {
  description = "Target ALB requests per target per minute for request-based scaling"
  type        = number
  default     = 1000
}

variable "alb_metric_label" {
  description = "ALB metrics label (alb_arn_suffix/target_group_arn_suffix) used by the request-count scaling policy"
  type        = string
  default     = ""
}

variable "capacity_providers" {
  description = "Optional capacity provider strategy (e.g. FARGATE_SPOT for cost savings)"
  type        = list(object({ capacity_provider = string, weight = number, base = number }))
  default     = []
}

variable "tags" {
  description = "Additional tags applied to every resource"
  type        = map(string)
  default     = {}
}
