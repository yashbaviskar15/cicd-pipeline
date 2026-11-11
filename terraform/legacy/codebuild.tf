resource "aws_iam_role" "codebuild" {
  name = "${var.project_name}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "codebuild" {
  name        = "${var.project_name}-codebuild-policy"
  description = "Policy for CodeBuild to access ECR, S3, etc."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow",
        Action   = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:GetObjectVersion"
        ],
        Resource = "${aws_s3_bucket.artifacts.arn}/*"
      },
      {
        Effect   = "Allow",
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "codebuild" {
  role       = aws_iam_role.codebuild.name
  policy_arn = aws_iam_policy.codebuild.arn
}

resource "aws_codebuild_project" "main" {
  name          = "${var.project_name}-codebuild"
  service_role  = aws_iam_role.codebuild.arn
  artifacts {
    type = "CODEPIPELINE"
  }
  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true
    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }
    environment_variable {
      name  = "ECR_BACKEND_REPO"
      value = aws_ecr_repository.backend.repository_url
    }
    environment_variable {
      name  = "ECR_FRONTEND_REPO"
      value = aws_ecr_repository.frontend.repository_url
    }
  }
  source {
    type            = "CODEPIPELINE"
    buildspec       = "buildspec.yml"
  }
}

resource "aws_s3_bucket" "artifacts" {
  bucket_prefix = "${var.project_name}-artifacts-"
}
