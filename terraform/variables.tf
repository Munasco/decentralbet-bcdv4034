# Variables for DecentralBet AKS Infrastructure

variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
  default     = "decentralbet-rg"
}

variable "location" {
  description = "The Azure location for all resources"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "The environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "prefix" {
  description = "A prefix for resource names"
  type        = string
  default     = "decentralbet"
}

variable "acr_name" {
  description = "The name of the Azure Container Registry"
  type        = string
  default     = "decentralbetacr"
}

variable "cluster_name" {
  description = "The name of the AKS cluster"
  type        = string
  default     = "decentralbet-aks"
}

variable "kubernetes_version" {
  description = "The version of Kubernetes to use"
  type        = string
  default     = "1.31.3"
}

variable "node_count" {
  description = "The initial number of nodes in the AKS cluster"
  type        = number
  default     = 2
}

variable "node_vm_size" {
  description = "The size of the Virtual Machine for AKS nodes"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "admin_group_object_ids" {
  description = "A list of Object IDs of Azure AD Groups which should have Admin Role on the Cluster"
  type        = list(string)
  default     = []
}

variable "ethereum_rpc_url" {
  description = "The Ethereum RPC URL for blockchain interactions"
  type        = string
  default     = "https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g"
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  default     = "decentralbet-jwt-secret-2024-production"
  sensitive   = true
}

variable "enable_mongodb" {
  description = "Whether to create a MongoDB Cosmos DB instance"
  type        = bool
  default     = false
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default = {
    Project     = "DecentralBet"
    Environment = "Production"
    ManagedBy   = "Terraform"
    Team        = "DevOps"
  }
}
