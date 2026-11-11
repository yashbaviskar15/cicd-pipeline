terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.72"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state (S3 + DynamoDB locking) is configured at init time so the same
  # configuration can be reused for every environment:
  #
  #   terraform init -backend-config=backend.hcl
  #
  # See backend.hcl.example and terraform/bootstrap/ for how the bucket and
  # lock table are created.
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.tags
  }
}
