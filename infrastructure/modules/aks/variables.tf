variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "dns_prefix" {
  description = "DNS prefix for the AKS cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version for AKS cluster"
  type        = string
}

variable "subnet_id" {
  description = "ID of the subnet where AKS will be deployed"
  type        = string
}

variable "acr_id" {
  description = "ID of the Azure Container Registry"
  type        = string
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
}

variable "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace for monitoring"
  type        = string
  default     = null
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "tags" {
  description = "Tags for the resources"
  type        = map(string)
  default     = {}
}
