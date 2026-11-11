variable "name" {
  description = "Name prefix for all resources"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Public subnet IDs for the ALB"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs attached to the ALB"
  type        = list(string)
}

variable "app_port" {
  description = "Application container port"
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "Path used for target group health checks"
  type        = string
  default     = "/health/live"
}

variable "certificate_arn" {
  description = "ACM certificate ARN. When set (and enable_https=true) an HTTPS listener is created"
  type        = string
  default     = ""
}

variable "enable_https" {
  description = "Create an HTTPS listener and redirect HTTP to HTTPS"
  type        = bool
  default     = false
}

variable "ssl_policy" {
  description = "ELB security policy for the HTTPS listener"
  type        = string
  default     = "ELBSecurityPolicy-TLS13-1-2-2021-06"
}

variable "deregistration_delay" {
  description = "Seconds to wait before deregistering a target"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Additional tags applied to every resource"
  type        = map(string)
  default     = {}
}
