# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.dns_prefix
  kubernetes_version  = var.kubernetes_version

  # System node pool
  default_node_pool {
    name                = var.node_pool_config.default_pool.name
    node_count          = var.node_pool_config.default_pool.node_count
    vm_size            = var.node_pool_config.default_pool.vm_size
    zones              = var.node_pool_config.default_pool.availability_zones
    max_pods           = var.node_pool_config.default_pool.max_pods
    vnet_subnet_id     = var.subnet_id
    
    # Enable auto-scaling
    enable_auto_scaling = true
    min_count          = 1
    max_count          = 5

    # Node configuration
    os_disk_size_gb    = 30
    os_disk_type       = "Managed"
    type               = "VirtualMachineScaleSets"

    # Only system workloads
    only_critical_addons_enabled = true

    upgrade_settings {
      max_surge = "10%"
    }
  }

  # Service principal or managed identity
  identity {
    type = "SystemAssigned"
  }

  # Network configuration
  network_profile {
    network_plugin     = "azure"
    network_policy     = "azure"
    dns_service_ip     = "10.2.0.10"
    service_cidr       = "10.2.0.0/24"
    load_balancer_sku  = "standard"
  }

  # RBAC configuration
  role_based_access_control_enabled = true

  azure_active_directory_role_based_access_control {
    managed            = true
    azure_rbac_enabled = true
  }

  # Add-ons
  dynamic "oms_agent" {
    for_each = var.log_analytics_workspace_id != null ? [1] : []
    content {
      log_analytics_workspace_id = var.log_analytics_workspace_id
    }
  }

  http_application_routing_enabled = false

  # Private cluster settings
  private_cluster_enabled = false

  # Auto-upgrade configuration
  automatic_channel_upgrade = "patch"

  # Maintenance window
  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [2, 3, 4]
    }
  }

  tags = var.tags
}

# User node pool for application workloads
resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = var.node_pool_config.user_pool.name
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size              = var.node_pool_config.user_pool.vm_size
  zones              = var.node_pool_config.user_pool.availability_zones
  max_pods             = var.node_pool_config.user_pool.max_pods
  vnet_subnet_id       = var.subnet_id

  # Auto-scaling configuration
  enable_auto_scaling = true
  min_count          = 1
  max_count          = 10
  node_count         = var.node_pool_config.user_pool.node_count

  # Node configuration
  os_disk_size_gb = 50
  os_disk_type    = "Managed"
  os_type         = "Linux"

  # Node labels and taints
  node_labels = {
    "nodepool-type" = "user"
    "environment"   = var.environment
    "nodepoolos"    = "linux"
  }

  upgrade_settings {
    max_surge = "33%"
  }

  tags = var.tags
}

# Role assignment for ACR
resource "azurerm_role_assignment" "acr_pull" {
  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                           = var.acr_id
  skip_service_principal_aad_check = true
}
