# Azure Container Registry
resource "azurerm_container_registry" "acr" {
  name                = var.acr_name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = var.acr_sku
  admin_enabled       = true

  tags = var.tags
}

# Generate a random password for ACR admin
resource "random_password" "acr_password" {
  length  = 32
  special = true
}
