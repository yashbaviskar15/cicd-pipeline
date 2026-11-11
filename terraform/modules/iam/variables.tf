variable "name" {
  description = "Name prefix for IAM resources"
  type        = string
}

variable "github_owner" {
  description = "GitHub organization/user that owns the repository"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "create_oidc_provider" {
  description = "Create the GitHub OIDC provider (set false if it already exists in the account)"
  type        = bool
  default     = true
}

variable "allowed_branches" {
  description = "Branches allowed to assume the deploy role"
  type        = list(string)
  default     = ["main"]
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs the CI role may push/pull"
  type        = list(string)
  default     = []
}

variable "secrets_arns" {
  description = "Secrets Manager ARNs the task execution role may read"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags applied to every resource"
  type        = map(string)
  default     = {}
}
