###############################################################################
# OPTIONAL MODULE - EKS
#
# ⚠️  COST WARNING
# This module is NOT wired into envs/dev|staging|prod on purpose. An EKS
# control plane alone costs ~$0.10/hour (~$73/month) and managed node groups
# add EC2 + NAT + EBS on top. Expect roughly $150-$250/month for a small
# cluster. It exists to demonstrate an EKS/IaC path and to contrast with the
# (near-free-tier) ECS Fargate deployment used by default. Destroy it when you
# are done: `terraform destroy`.
###############################################################################

variable "name" {
  description = "Name prefix for the cluster and its resources"
  type        = string
}

variable "kubernetes_version" {
  description = "EKS control plane version"
  type        = string
  default     = "1.30"
}

variable "vpc_id" {
  description = "VPC to deploy the cluster into"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the cluster and node group (private recommended)"
  type        = list(string)
}

variable "node_instance_types" {
  description = "EC2 instance types for the managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 3
}

variable "enable_irsa" {
  description = "Create an IAM OIDC provider for IRSA (recommended)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags applied to every resource"
  type        = map(string)
  default     = {}
}
