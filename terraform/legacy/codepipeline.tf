resource "aws_iam_role" "codepipeline" {
  name = "${var.project_name}-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codepipeline.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "codepipeline" {
  name        = "${var.project_name}-codepipeline-policy"
  description = "Policy for CodePipeline"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow",
        Action   = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject"
        ],
        Resource = "${aws_s3_bucket.artifacts.arn}/*"
      },
      {
        Effect   = "Allow",
        Action   = [
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild"
        ],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = [
          "codedeploy:CreateDeployment",
          "codedeploy:GetDeployment",
          "codedeploy:GetDeploymentConfig",
          "codedeploy:GetApplicationRevision",
          "codedeploy:RegisterApplicationRevision"
        ],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = [
          "codestar-connections:UseConnection"
        ],
        Resource = var.codestar_connection_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "codepipeline" {
  role       = aws_iam_role.codepipeline.name
  policy_arn = aws_iam_policy.codepipeline.arn
}

resource "aws_codepipeline" "main" {
  name     = "${var.project_name}-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["SourceArtifact"]
      configuration = {
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = "${var.github_owner}/${var.github_repo}"
        BranchName       = "main"
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["SourceArtifact"]
      output_artifacts = ["BuildArtifact"]
      version          = "1"
      configuration = {
        ProjectName = aws_codebuild_project.main.name
      }
    }
  }

  stage {
    name = "DeployBackend"

    action {
      name            = "DeployBackend"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "CodeDeployToECS"
      input_artifacts = ["BuildArtifact"]
      version         = "1"
      configuration = {
        ApplicationName                = aws_codedeploy_app.backend.name
        DeploymentGroupName            = aws_codedeploy_deployment_group.backend.deployment_group_name
        TaskDefinitionTemplateArtifact = "BuildArtifact"
        TaskDefinitionTemplatePath     = "backend-task-def.json"
        AppSpecTemplateArtifact        = "BuildArtifact"
        AppSpecTemplatePath            = "backend-appspec.yaml"
      }
    }
  }

  stage {
    name = "DeployFrontend"

    action {
      name            = "DeployFrontend"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "CodeDeployToECS"
      input_artifacts = ["BuildArtifact"]
      version         = "1"
      configuration = {
        ApplicationName                = aws_codedeploy_app.frontend.name
        DeploymentGroupName            = aws_codedeploy_deployment_group.frontend.deployment_group_name
        TaskDefinitionTemplateArtifact = "BuildArtifact"
        TaskDefinitionTemplatePath     = "frontend-task-def.json"
        AppSpecTemplateArtifact        = "BuildArtifact"
        AppSpecTemplatePath            = "frontend-appspec.yaml"
      }
    }
  }
}
