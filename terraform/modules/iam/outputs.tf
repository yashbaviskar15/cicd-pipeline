output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions OIDC role (set as AWS_GITHUB_ACTIONS_ROLE_ARN)"
  value       = aws_iam_role.github_actions.arn
}

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

output "codedeploy_role_arn" {
  description = "ARN of the CodeDeploy service role"
  value       = aws_iam_role.codedeploy.arn
}
