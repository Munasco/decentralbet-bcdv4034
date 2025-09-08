# DecentralBet AKS Infrastructure
terraform {
  required_version = ">=1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~>3.1"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
}

# Random ID for unique resource naming
resource "random_id" "main" {
  byte_length = 8
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "DecentralBet"
    ManagedBy   = "Terraform"
    Component   = "Infrastructure"
  }
}

# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.main.name
  location           = azurerm_resource_group.main.location
  sku                = "Standard"
  admin_enabled      = true

  tags = {
    Environment = var.environment
    Project     = "DecentralBet"
    ManagedBy   = "Terraform"
    Component   = "ContainerRegistry"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${var.prefix}-vnet"
  location           = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.1.0.0/16"]

  tags = {
    Environment = var.environment
    Project     = "DecentralBet"
    ManagedBy   = "Terraform"
  }
}

# AKS Subnet
resource "azurerm_subnet" "aks" {
  name                 = "${var.prefix}-aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.1.1.0/24"]
}

# Log Analytics Workspace for AKS monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.prefix}-logs"
  location           = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                = "PerGB2018"
  retention_in_days   = 30

  tags = {
    Environment = var.environment
    Project     = "DecentralBet"
    ManagedBy   = "Terraform"
  }
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location           = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix         = "${var.prefix}-aks"
  kubernetes_version = var.kubernetes_version

  default_node_pool {
    name               = "default"
    node_count         = var.node_count
    vm_size           = var.node_vm_size
    vnet_subnet_id    = azurerm_subnet.aks.id
    enable_auto_scaling = true
    min_count          = 1
    max_count          = 5
    
    upgrade_settings {
      max_surge = "10%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
    service_cidr      = "10.2.0.0/24"
    dns_service_ip    = "10.2.0.10"
  }

  # Enable RBAC
  role_based_access_control_enabled = true

  # Enable Azure AD integration
  azure_active_directory_role_based_access_control {
    managed            = true
    admin_group_object_ids = var.admin_group_object_ids
  }

  tags = {
    Environment = var.environment
    Project     = "DecentralBet"
    ManagedBy   = "Terraform"
    Component   = "AKS"
  }
}


# Application Gateway (for ingress)
resource "azurerm_public_ip" "gateway" {
  name                = "${var.prefix}-gateway-ip"
  resource_group_name = azurerm_resource_group.main.name
  location           = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                = "Standard"

  tags = {
    Environment = var.environment
    Project     = "DecentralBet"
    ManagedBy   = "Terraform"
  }
}

# Application Gateway Subnet
resource "azurerm_subnet" "gateway" {
  name                 = "${var.prefix}-gateway-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.1.2.0/24"]
}

# Application Gateway
resource "azurerm_application_gateway" "main" {
  name                = "${var.prefix}-appgateway"
  resource_group_name = azurerm_resource_group.main.name
  location           = azurerm_resource_group.main.location

  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 1
  }

  gateway_ip_configuration {
    name      = "gateway-ip-config"
    subnet_id = azurerm_subnet.gateway.id
  }

  frontend_port {
    name = "frontend-port"
    port = 80
  }

  frontend_port {
    name = "frontend-port-https"
    port = 443
  }

  frontend_ip_configuration {
    name                 = "frontend-ip-config"
    public_ip_address_id = azurerm_public_ip.gateway.id
  }

  backend_address_pool {
    name = "backend-pool"
  }

  backend_http_settings {
    name                  = "backend-http-settings"
    cookie_based_affinity = "Disabled"
    port                 = 80
    protocol             = "Http"
    request_timeout      = 60
  }

  http_listener {
    name                           = "http-listener"
    frontend_ip_configuration_name = "frontend-ip-config"
    frontend_port_name            = "frontend-port"
    protocol                      = "Http"
  }

  request_routing_rule {
    name                       = "routing-rule"
    rule_type                 = "Basic"
    http_listener_name        = "http-listener"
    backend_address_pool_name = "backend-pool"
    backend_http_settings_name = "backend-http-settings"
    priority                  = 1
  }

  tags = {
    Environment = var.environment
    Project     = "DecentralBet"
    ManagedBy   = "Terraform"
  }
}

# Key Vault and secrets commented out for simplified deployment
# Will be added back in production
# resource "azurerm_key_vault" "main" { ... }

# Data source for current Azure configuration
data "azurerm_client_config" "current" {}

# MongoDB/Cosmos DB commented out - using in-memory storage for demo
# resource "azurerm_cosmosdb_account" "main" { ... }
