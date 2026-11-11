output "alarm_names" {
  description = "List of CloudWatch alarm names (used for CodeDeploy auto-rollback)"
  value = [
    aws_cloudwatch_metric_alarm.cpu_high.alarm_name,
    aws_cloudwatch_metric_alarm.memory_high.alarm_name,
    aws_cloudwatch_metric_alarm.unhealthy_hosts.alarm_name,
    aws_cloudwatch_metric_alarm.errors_5xx.alarm_name,
    aws_cloudwatch_metric_alarm.p95_latency.alarm_name,
  ]
}

output "alarm_arns" {
  description = "List of CloudWatch alarm ARNs"
  value = [
    aws_cloudwatch_metric_alarm.cpu_high.arn,
    aws_cloudwatch_metric_alarm.memory_high.arn,
    aws_cloudwatch_metric_alarm.unhealthy_hosts.arn,
    aws_cloudwatch_metric_alarm.errors_5xx.arn,
    aws_cloudwatch_metric_alarm.p95_latency.arn,
  ]
}

output "dashboard_name" {
  description = "CloudWatch dashboard name (empty when disabled)"
  value       = var.create_dashboard ? aws_cloudwatch_dashboard.this[0].dashboard_name : ""
}
