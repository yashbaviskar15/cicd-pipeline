output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.this.id
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.this.name
}

output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.this.name
}

output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.this.arn
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.this.name
}

output "codedeploy_app_name" {
  description = "CodeDeploy application name (empty when rolling deployments are used)"
  value       = local.use_blue_green ? aws_codedeploy_app.this[0].name : ""
}

output "codedeploy_deployment_group_name" {
  description = "CodeDeploy deployment group name (empty when rolling deployments are used)"
  value       = local.use_blue_green ? aws_codedeploy_deployment_group.this[0].deployment_group_name : ""
}

output "autoscaling_target_resource_id" {
  description = "Application Auto Scaling resource id (empty when disabled)"
  value       = var.enable_autoscaling ? aws_appautoscaling_target.this[0].resource_id : ""
}
