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
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch dimensions"
  type        = string
}

variable "target_group_arn_suffix" {
  description = "Target group ARN suffix for CloudWatch dimensions"
  type        = string
}

variable "alarm_actions" {
  description = "ARNs notified when an alarm fires (e.g. SNS topic)"
  type        = list(string)
  default     = []
}

variable "cpu_threshold" {
  description = "Average ECS CPU utilisation (%) that triggers the alarm"
  type        = number
  default     = 80
}

variable "memory_threshold" {
  description = "Average ECS memory utilisation (%) that triggers the alarm"
  type        = number
  default     = 80
}

variable "unhealthy_host_threshold" {
  description = "Number of unhealthy ALB targets that triggers the alarm"
  type        = number
  default     = 1
}

variable "error_5xx_threshold" {
  description = "Number of 5xx responses (per minute) that triggers the alarm"
  type        = number
  default     = 10
}

variable "p95_target_seconds" {
  description = "p95 target response time (seconds) for the SLO alert"
  type        = number
  default     = 0.3
}

variable "slo_availability_target" {
  description = "Availability SLO used in the dashboard description"
  type        = number
  default     = 99.5
}

variable "create_dashboard" {
  description = "Create a CloudWatch dashboard for the service"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags applied to every resource"
  type        = map(string)
  default     = {}
}
