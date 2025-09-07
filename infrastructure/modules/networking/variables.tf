variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "vnet_name" {
  description = "Name of the virtual network"
  type        = string
}

variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
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
}

variable "tags" {
  description = "Tags for the resources"
  type        = map(string)
  default     = {}
}
