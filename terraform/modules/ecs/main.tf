locals {
  log_group_name = var.log_group_name != "" ? var.log_group_name : "/ecs/${var.name}-${var.service_name}"
  use_blue_green = var.deployment_controller == "CODE_DEPLOY"

  container_definitions = jsonencode([
    merge(
      {
        name      = var.container_name
        image     = var.image
        essential = true
        portMappings = [
          {
            containerPort = var.container_port
            protocol      = "tcp"
          }
        ]
        environment = var.environment
        logConfiguration = {
          logDriver = "awslogs"
          options = {
            "awslogs-group"         = aws_cloudwatch_log_group.this.name
            "awslogs-region"        = data.aws_region.current.name
            "awslogs-stream-prefix" = "ecs"
            "mode"                  = "non-blocking"
          }
        }
        stopTimeout = 20
        linuxParameters = {
          initProcessEnabled = true
        }
      },
      length(var.secrets) > 0 ? { secrets = var.secrets } : {},
      length(var.health_check_command) > 0 ? {
        healthCheck = {
          command     = var.health_check_command
          interval    = 30
          timeout     = 5
          retries     = 3
          startPeriod = 20
        }
      } : {}
    )
  ])
}

data "aws_region" "current" {}

resource "aws_cloudwatch_log_group" "this" {
  name              = local.log_group_name
  retention_in_days = var.log_retention_in_days

  tags = merge(var.tags, { Name = local.log_group_name })
}

resource "aws_ecs_cluster" "this" {
  name = var.cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.tags, { Name = var.cluster_name })
}

resource "aws_ecs_task_definition" "this" {
  family                   = "${var.name}-${var.service_name}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = local.container_definitions

  tags = merge(var.tags, { Name = "${var.name}-${var.service_name}" })
}

resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count

  launch_type = length(var.capacity_providers) > 0 ? null : "FARGATE"

  dynamic "capacity_provider_strategy" {
    for_each = var.capacity_providers
    content {
      capacity_provider = capacity_provider_strategy.value.capacity_provider
      weight            = capacity_provider_strategy.value.weight
      base              = capacity_provider_strategy.value.base
    }
  }

  health_check_grace_period_seconds = 30

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = var.assign_public_ip
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  deployment_controller {
    type = var.deployment_controller
  }

  lifecycle {
    # CI (CodeDeploy) and Application Auto Scaling own these attributes.
    ignore_changes = [task_definition, desired_count, load_balancer]
  }

  tags = merge(var.tags, { Name = var.service_name })

  depends_on = [aws_cloudwatch_log_group.this]
}

# --- Application Auto Scaling (CPU + ALB request count) ---

resource "aws_appautoscaling_target" "this" {
  count = var.enable_autoscaling ? 1 : 0

  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.this.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${var.name}-${var.service_name}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this[0].resource_id
  scalable_dimension = aws_appautoscaling_target.this[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.this[0].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.cpu_target_utilization
    scale_in_cooldown  = 60
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_appautoscaling_policy" "requests" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${var.name}-${var.service_name}-requests"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this[0].resource_id
  scalable_dimension = aws_appautoscaling_target.this[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.this[0].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = var.requests_per_target
    scale_in_cooldown  = 60
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = var.alb_metric_label
    }
  }
}

# --- CodeDeploy blue/green ---

resource "aws_codedeploy_app" "this" {
  count            = local.use_blue_green ? 1 : 0
  name             = "${var.name}-${var.service_name}"
  compute_platform = "ECS"
}

resource "aws_codedeploy_deployment_group" "this" {
  count = local.use_blue_green ? 1 : 0

  app_name               = aws_codedeploy_app.this[0].name
  deployment_group_name  = "${var.name}-${var.service_name}-dg"
  service_role_arn       = var.codedeploy_role_arn
  deployment_config_name = var.deployment_config_name

  auto_rollback_configuration {
    enabled = true
    events  = var.alarm_names != [] ? ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"] : ["DEPLOYMENT_FAILURE"]
  }

  dynamic "alarm_configuration" {
    for_each = length(var.alarm_names) > 0 ? [1] : []
    content {
      enabled = true
      alarms  = var.alarm_names
    }
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = var.termination_wait_minutes
    }
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  ecs_service {
    cluster_name = aws_ecs_cluster.this.name
    service_name = aws_ecs_service.this.name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [var.prod_listener_arn]
      }

      test_traffic_route {
        listener_arns = [var.test_listener_arn]
      }

      target_group {
        name = var.blue_target_group_name
      }

      target_group {
        name = var.green_target_group_name
      }
    }
  }

  tags = merge(var.tags, { Name = "${var.name}-${var.service_name}-dg" })
}
