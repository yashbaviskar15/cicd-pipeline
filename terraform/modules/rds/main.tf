terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_subnet_group" "this" {
  name        = "${var.name}-db-subnet-group"
  description = "Subnet group for the ${var.name} database"
  subnet_ids  = var.subnet_ids

  tags = merge(var.tags, { Name = "${var.name}-db-subnet-group" })
}

resource "aws_db_instance" "this" {
  identifier = "${var.name}-postgres"

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = var.storage_type
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.master_username
  password = random_password.master.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = var.security_group_ids
  publicly_accessible    = false

  multi_az                  = var.multi_az
  backup_retention_period   = var.backup_retention_period
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.name}-final-snapshot"

  apply_immediately = var.apply_immediately

  auto_minor_version_upgrade = true

  tags = merge(var.tags, { Name = "${var.name}-postgres" })
}

# Credentials are stored in Secrets Manager; the app reads DATABASE_URL from it.
resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.name}/db"
  description             = "PostgreSQL credentials for ${var.name}"
  recovery_window_in_days = 0

  tags = merge(var.tags, { Name = "${var.name}-db-secret" })
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username     = var.master_username
    password     = random_password.master.result
    host         = aws_db_instance.this.address
    port         = aws_db_instance.this.port
    dbname       = var.db_name
    engine       = "postgres"
    database_url = "postgresql://${var.master_username}:${urlencode(random_password.master.result)}@${aws_db_instance.this.address}:${aws_db_instance.this.port}/${var.db_name}?schema=public&sslmode=require"
  })
}
