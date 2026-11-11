output "alb_arn" {
  description = "ARN of the ALB"
  value       = aws_lb.this.arn
}

output "alb_dns_name" {
  description = "Public DNS name of the ALB"
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  description = "Route53 zone ID of the ALB (for alias records)"
  value       = aws_lb.this.zone_id
}

output "alb_arn_suffix" {
  description = "ARN suffix used for CloudWatch metrics/dimensions"
  value       = aws_lb.this.arn_suffix
}

output "target_group_blue_arn" {
  description = "ARN of the blue target group"
  value       = aws_lb_target_group.blue.arn
}

output "target_group_green_arn" {
  description = "ARN of the green target group"
  value       = aws_lb_target_group.green.arn
}

output "target_group_blue_name" {
  description = "Name of the blue target group"
  value       = aws_lb_target_group.blue.name
}

output "target_group_green_name" {
  description = "Name of the green target group"
  value       = aws_lb_target_group.green.name
}

output "target_group_blue_arn_suffix" {
  description = "ARN suffix of the blue target group (CloudWatch)"
  value       = aws_lb_target_group.blue.arn_suffix
}

output "prod_listener_arn" {
  description = "ARN of the production listener (443 when HTTPS, else 80)"
  value       = local.https_enabled ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
}

output "test_listener_arn" {
  description = "ARN of the CodeDeploy test listener"
  value       = aws_lb_listener.test.arn
}
