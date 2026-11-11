output "alb_dns_name" {
  description = "Public DNS name of the load balancer"
  value       = module.alb.alb_dns_name
}

output "app_url" {
  description = "Base URL of the application"
  value       = var.enable_https ? "https://${module.alb.alb_dns_name}" : "http://${module.alb.alb_dns_name}"
}

output "ecr_backend_repository_url" {
  description = "ECR repository URL for the backend image"
  value       = module.ecr.repository_urls["backend"]
}

output "ecr_frontend_repository_url" {
  description = "ECR repository URL for the frontend image"
  value       = module.ecr.repository_urls["frontend"]
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "codedeploy_app_name" {
  description = "CodeDeploy application name (empty for rolling deployments)"
  value       = module.ecs.codedeploy_app_name
}

output "codedeploy_deployment_group_name" {
  description = "CodeDeploy deployment group name (empty for rolling deployments)"
  value       = module.ecs.codedeploy_deployment_group_name
}

output "github_actions_role_arn" {
  description = "OIDC role ARN to set as the AWS_GITHUB_ACTIONS_ROLE_ARN repo variable"
  value       = module.iam.github_actions_role_arn
}

output "db_secret_arn" {
  description = "Secrets Manager ARN holding the database credentials"
  value       = module.rds.secret_arn
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = module.monitoring.dashboard_name
}

output "alarm_topic_arn" {
  description = "SNS topic ARN notified when alarms fire"
  value       = aws_sns_topic.alarms.arn
}
