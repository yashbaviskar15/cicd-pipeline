variable "name" {
  description = "Name prefix for all resources"
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability zones to use (defaults to the first two in the region)"
  type        = list(string)
  default     = []
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "enable_nat_gateway" {
  description = "Create NAT gateway(s) so private subnets have egress (needed for ECR pulls)"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT gateway to save cost (not HA). Set false for one per AZ"
  type        = bool
  default     = true
}

variable "app_port" {
  description = "Container port the application listens on"
  type        = number
  default     = 3000
}

variable "db_port" {
  description = "Database port allowed from the application security group"
  type        = number
  default     = 5432
}

variable "tags" {
  description = "Additional tags applied to every resource"
  type        = map(string)
  default     = {}
}
