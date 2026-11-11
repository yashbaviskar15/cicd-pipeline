output "db_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.this.id
}

output "db_endpoint" {
  description = "Connection endpoint (host:port)"
  value       = aws_db_instance.this.endpoint
}

output "db_address" {
  description = "Database hostname"
  value       = aws_db_instance.this.address
}

output "db_port" {
  description = "Database port"
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "Database name"
  value       = var.db_name
}

output "secret_arn" {
  description = "ARN of the Secrets Manager secret holding the credentials"
  value       = aws_secretsmanager_secret.db.arn
}

output "secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.db.name
}

output "database_url" {
  description = "Full PostgreSQL connection string (stored in Secrets Manager)"
  value       = "postgresql://${var.master_username}:${urlencode(random_password.master.result)}@${aws_db_instance.this.address}:${aws_db_instance.this.port}/${var.db_name}?schema=public&sslmode=require"
  sensitive   = true
}
