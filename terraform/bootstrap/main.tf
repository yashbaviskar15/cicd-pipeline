###############################################################################
# Terraform remote-state bootstrap
#
# Creates the S3 bucket (state) and DynamoDB table (locking) used by the
# dev/staging/prod environments. Run this ONCE per AWS account with LOCAL state
# before initialising any environment.
#
#   cd terraform/bootstrap
#   terraform init
#   terraform apply -var="state_bucket_name=<globally-unique-name>"
#
# Then initialise each environment with:
#   terraform init \
#     -backend-config="bucket=<state_bucket_name>" \
#     -backend-config="region=<aws_region>" \
#     -backend-config="dynamodb_table=terraform-locks"
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for the state bucket and lock table"
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "Globally unique S3 bucket name for Terraform state"
  type        = string
}

variable "lock_table_name" {
  description = "DynamoDB table name used for state locking"
  type        = string
  default     = "terraform-locks"
}

resource "aws_s3_bucket" "state" {
  bucket = var.state_bucket_name

  tags = {
    Name      = var.state_bucket_name
    Purpose   = "terraform-state"
    ManagedBy = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_dynamodb_table" "locks" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name      = var.lock_table_name
    Purpose   = "terraform-locking"
    ManagedBy = "terraform"
  }
}

output "state_bucket_name" {
  value       = aws_s3_bucket.state.id
  description = "S3 bucket name to pass via -backend-config"
}

output "lock_table_name" {
  value       = aws_dynamodb_table.locks.name
  description = "DynamoDB table name to pass via -backend-config"
}

output "backend_config" {
  value       = "bucket=${aws_s3_bucket.state.id},region=${var.aws_region},dynamodb_table=${aws_dynamodb_table.locks.name},encrypt=true"
  description = "Ready-to-paste -backend-config string"
}
