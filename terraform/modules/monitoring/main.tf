resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.name}-${var.service_name}-cpu-high"
  alarm_description   = "ECS CPU utilisation above ${var.cpu_threshold}% for 10 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = var.cpu_threshold
  datapoints_to_alarm = 2
  treat_missing_data  = "notBreaching"

  namespace   = "AWS/ECS"
  metric_name = "CPUUtilization"
  statistic   = "Average"
  period      = 300

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = merge(var.tags, { Name = "${var.name}-${var.service_name}-cpu-high" })
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "${var.name}-${var.service_name}-memory-high"
  alarm_description   = "ECS memory utilisation above ${var.memory_threshold}% for 10 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = var.memory_threshold
  datapoints_to_alarm = 2
  treat_missing_data  = "notBreaching"

  namespace   = "AWS/ECS"
  metric_name = "MemoryUtilization"
  statistic   = "Average"
  period      = 300

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = merge(var.tags, { Name = "${var.name}-${var.service_name}-memory-high" })
}

resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  alarm_name          = "${var.name}-${var.service_name}-unhealthy-hosts"
  alarm_description   = "More than ${var.unhealthy_host_threshold} unhealthy ALB target(s)"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  threshold           = var.unhealthy_host_threshold
  treat_missing_data  = "notBreaching"

  namespace   = "AWS/ApplicationELB"
  metric_name = "UnHealthyHostCount"
  statistic   = "Maximum"
  period      = 60

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = merge(var.tags, { Name = "${var.name}-${var.service_name}-unhealthy-hosts" })
}

resource "aws_cloudwatch_metric_alarm" "errors_5xx" {
  alarm_name          = "${var.name}-${var.service_name}-5xx"
  alarm_description   = "5xx responses above ${var.error_5xx_threshold}/min (error-rate burn)"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = var.error_5xx_threshold
  datapoints_to_alarm = 2
  treat_missing_data  = "notBreaching"

  namespace   = "AWS/ApplicationELB"
  metric_name = "HTTPCode_Target_5XX_Count"
  statistic   = "Sum"
  period      = 60

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = merge(var.tags, { Name = "${var.name}-${var.service_name}-5xx" })
}

resource "aws_cloudwatch_metric_alarm" "p95_latency" {
  alarm_name          = "${var.name}-${var.service_name}-p95-latency"
  alarm_description   = "p95 target response time above ${var.p95_target_seconds}s (latency SLO burn)"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = var.p95_target_seconds
  datapoints_to_alarm = 2
  extended_statistic  = "p95"
  treat_missing_data  = "notBreaching"

  namespace   = "AWS/ApplicationELB"
  metric_name = "TargetResponseTime"
  period      = 60

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = merge(var.tags, { Name = "${var.name}-${var.service_name}-p95-latency" })
}

resource "aws_cloudwatch_dashboard" "this" {
  count          = var.create_dashboard ? 1 : 0
  dashboard_name = "${var.name}-${var.service_name}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 2
        properties = {
          markdown = "## ${var.name} / ${var.service_name}\nAvailability SLO: **${var.slo_availability_target}%** · Latency SLO: **p95 < ${var.p95_target_seconds * 1000} ms**"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 2
        width  = 12
        height = 6
        properties = {
          title  = "ALB requests & errors"
          region = "default"
          stat   = "Sum"
          period = 60
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 2
        width  = 12
        height = 6
        properties = {
          title  = "Latency (avg & p95)"
          region = "default"
          view   = "timeSeries"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix, { stat = "Average" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix, { stat = "p95" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 8
        width  = 12
        height = 6
        properties = {
          title  = "ECS CPU & memory"
          region = "default"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.cluster_name, "ServiceName", var.service_name],
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.cluster_name, "ServiceName", var.service_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 8
        width  = 12
        height = 6
        properties = {
          title  = "Healthy vs unhealthy targets"
          region = "default"
          stat   = "Average"
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix],
            ["AWS/ApplicationELB", "UnHealthyHostCount", "LoadBalancer", var.alb_arn_suffix, "TargetGroup", var.target_group_arn_suffix]
          ]
        }
      }
    ]
  })
}
