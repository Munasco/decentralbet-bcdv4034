# Outputs for DecentralBet AKS Infrastructure

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_id" {
  description = "ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.id
}

output "aks_kubeconfig" {
  description = "Raw kubeconfig for the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "acr_login_server" {
  description = "Login server for the Azure Container Registry"
  value       = azurerm_container_registry.main.login_server
}

output "acr_admin_username" {
  description = "Admin username for the Azure Container Registry"
  value       = azurerm_container_registry.main.admin_username
}

output "acr_admin_password" {
  description = "Admin password for the Azure Container Registry"
  value       = azurerm_container_registry.main.admin_password
  sensitive   = true
}

output "application_gateway_public_ip" {
  description = "Public IP address of the Application Gateway"
  value       = azurerm_public_ip.gateway.ip_address
}

# Key Vault outputs commented out for simplified deployment
# output "key_vault_name" { ... }

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

# MongoDB outputs commented out for simplified deployment
# output "mongodb_connection_string" { ... }

# Outputs for CI/CD
output "cluster_credentials_command" {
  description = "Command to get AKS cluster credentials"
  value       = "az aks get-credentials --resource-group ${azurerm_resource_group.main.name} --name ${azurerm_kubernetes_cluster.main.name}"
}

output "acr_login_command" {
  description = "Command to login to ACR"
  value       = "az acr login --name ${azurerm_container_registry.main.name}"
}

# Deployment info
output "deployment_info" {
  description = "Information for deployment"
  value = {
    resource_group     = azurerm_resource_group.main.name
    cluster_name      = azurerm_kubernetes_cluster.main.name
    acr_name         = azurerm_container_registry.main.name
    public_ip        = azurerm_public_ip.gateway.ip_address
    frontend_url     = "http://${azurerm_public_ip.gateway.ip_address}"
    environment      = var.environment
  }
}
