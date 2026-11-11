output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  description = "API server endpoint"
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64-encoded certificate authority data"
  value       = aws_eks_cluster.this.certificate_authority[0].data
}

output "cluster_version" {
  description = "Kubernetes version"
  value       = aws_eks_cluster.this.version
}

output "oidc_provider_arn" {
  description = "IAM OIDC provider ARN for IRSA (empty when disabled)"
  value       = var.enable_irsa ? aws_iam_openid_connect_provider.this[0].arn : ""
}

output "oidc_provider_url" {
  description = "IAM OIDC provider URL for IRSA (empty when disabled)"
  value       = var.enable_irsa ? aws_iam_openid_connect_provider.this[0].url : ""
}

output "node_group_name" {
  description = "Managed node group name"
  value       = aws_eks_node_group.this.node_group_name
}
