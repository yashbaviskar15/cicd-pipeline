variable "name" {
  description = "Name prefix for all resources"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs allowed to reach the database"
  type        = list(string)
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.3"
}

variable "instance_class" {
  description = "RDS instance class (db.t4g.micro is free-tier eligible)"
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GB (20 GB free tier)"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Upper bound for storage autoscaling in GB (0 disables)"
  type        = number
  default     = 0
}

variable "storage_type" {
  description = "Storage type (gp2 is free-tier eligible)"
  type        = string
  default     = "gp2"
}

variable "db_name" {
  description = "Name of the initial database"
  type        = string
  default     = "app"
}

variable "master_username" {
  description = "Master username"
  type        = string
  default     = "app"
}

variable "multi_az" {
  description = "Enable Multi-AZ (not free tier)"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Days to retain automated backups"
  type        = number
  default     = 1
}

variable "deletion_protection" {
  description = "Prevent accidental deletion of the database"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip the final snapshot when the DB is destroyed"
  type        = bool
  default     = true
}

variable "apply_immediately" {
  description = "Apply modifications immediately instead of during the maintenance window"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags applied to every resource"
  type        = map(string)
  default     = {}
}
