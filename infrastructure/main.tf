# Configure the Azure Provider
terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }

  # Using local backend for now due to subscription limitations
  # backend "azurerm" {
  #   resource_group_name  = "decentralbet-tfstate-rg"
  #   storage_account_name = "decentralbettfstate"
  #   container_name       = "tfstate"
  #   key                  = "terraform.tfstate"
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

provider "random" {}

# Data sources
data "azurerm_client_config" "current" {}

# Reference existing Resource Group
data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

# For compatibility, create a local value
locals {
  resource_group_name = data.azurerm_resource_group.main.name
  location = data.azurerm_resource_group.main.location
}

# Container Registry Module
module "container_registry" {
  source = "./modules/container_registry"

  resource_group_name = local.resource_group_name
  location           = local.location
  acr_name          = var.acr_name
  acr_sku           = var.acr_sku

  tags = var.common_tags
}

# Virtual Network Module
module "networking" {
  source = "./modules/networking"

  resource_group_name = local.resource_group_name
  location           = local.location
  vnet_name         = var.vnet_name
  vnet_address_space = var.vnet_address_space
  subnet_config     = var.subnet_config

  tags = var.common_tags
}

# Key Vault Module
module "key_vault" {
  source = "./modules/key_vault"

  resource_group_name = local.resource_group_name
  location           = local.location
  key_vault_name     = var.key_vault_name
  tenant_id          = data.azurerm_client_config.current.tenant_id
  object_id          = data.azurerm_client_config.current.object_id

  tags = var.common_tags
}

# MongoDB (CosmosDB) Module
module "mongodb" {
  source = "./modules/mongodb"

  resource_group_name  = local.resource_group_name
  location            = local.location
  cosmosdb_name       = var.cosmosdb_name
  database_name       = var.database_name
  subnet_id           = module.networking.private_subnet_id

  tags = var.common_tags
}

# AKS Cluster Module
module "aks" {
  source = "./modules/aks"

  resource_group_name        = local.resource_group_name
  location                  = local.location
  cluster_name              = var.aks_cluster_name
  dns_prefix                = var.aks_dns_prefix
  kubernetes_version        = var.kubernetes_version
  subnet_id                 = module.networking.aks_subnet_id
  acr_id                    = module.container_registry.acr_id
  node_pool_config          = var.node_pool_config
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id
  environment               = var.environment

  tags = var.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  resource_group_name      = local.resource_group_name
  location                = local.location
  log_analytics_name       = var.log_analytics_name
  application_insights_name = var.application_insights_name
  aks_cluster_id          = module.aks.cluster_id

  tags = var.common_tags
}
