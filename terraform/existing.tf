# Use existing resources as data sources
data "azurerm_kubernetes_cluster" "existing" {
  name                = var.cluster_name
  resource_group_name = var.resource_group_name
}

# Only create new resources if they don't exist
# For now, we'll just use the existing AKS cluster
