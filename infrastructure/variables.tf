# General Variables
variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
  default     = "decentralbet-rg"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "decentralbet"
}

# Container Registry Variables
variable "acr_name" {
  description = "Name of the Azure Container Registry"
  type        = string
  default     = "decentralbetacr"
}

variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Standard"
}

# Networking Variables
variable "vnet_name" {
  description = "Name of the virtual network"
  type        = string
  default     = "decentralbet-vnet"
}

variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_config" {
  description = "Subnet configuration"
  type = object({
    aks_subnet = object({
      name             = string
      address_prefixes = list(string)
    })
    private_subnet = object({
      name             = string
      address_prefixes = list(string)
    })
    gateway_subnet = object({
      name             = string
      address_prefixes = list(string)
    })
  })
  default = {
    aks_subnet = {
      name             = "aks-subnet"
      address_prefixes = ["10.0.1.0/24"]
    }
    private_subnet = {
      name             = "private-subnet"
      address_prefixes = ["10.0.2.0/24"]
    }
    gateway_subnet = {
      name             = "gateway-subnet"
      address_prefixes = ["10.0.3.0/24"]
    }
  }
}

# Key Vault Variables
variable "key_vault_name" {
  description = "Name of the Azure Key Vault"
  type        = string
  default     = "decentralbet-kv"
}

# CosmosDB Variables
variable "cosmosdb_name" {
  description = "Name of the CosmosDB account"
  type        = string
  default     = "decentralbet-cosmosdb"
}

variable "database_name" {
  description = "Name of the MongoDB database"
  type        = string
  default     = "decentralbet"
}

# AKS Variables
variable "aks_cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
  default     = "decentralbet-aks"
}

variable "aks_dns_prefix" {
  description = "DNS prefix for the AKS cluster"
  type        = string
  default     = "decentralbet"
}

variable "kubernetes_version" {
  description = "Kubernetes version for AKS cluster"
  type        = string
  default     = "1.28.5"
}

variable "node_pool_config" {
  description = "Configuration for AKS node pools"
  type = object({
    default_pool = object({
      name                = string
      node_count          = number
      vm_size            = string
      availability_zones = list(string)
      max_pods           = number
    })
    user_pool = object({
      name                = string
      node_count          = number
      vm_size            = string
      availability_zones = list(string)
      max_pods           = number
    })
  })
  default = {
    default_pool = {
      name                = "system"
      node_count          = 2
      vm_size            = "Standard_D2s_v3"
      availability_zones = ["1", "2", "3"]
      max_pods           = 30
    }
    user_pool = {
      name                = "user"
      node_count          = 3
      vm_size            = "Standard_D4s_v3"
      availability_zones = ["1", "2", "3"]
      max_pods           = 50
    }
  }
}

# Monitoring Variables
variable "log_analytics_name" {
  description = "Name of the Log Analytics workspace"
  type        = string
  default     = "decentralbet-logs"
}

variable "application_insights_name" {
  description = "Name of the Application Insights instance"
  type        = string
  default     = "decentralbet-insights"
}

# Common Tags
variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "DecentralBet"
    Environment = "Production"
    ManagedBy   = "Terraform"
    Owner       = "BCDV-4034"
  }
}
