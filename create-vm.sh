#!/bin/bash

# Simple VM Creation for DecentralBet
set -e

# Configuration
RESOURCE_GROUP="decentralbet-vm-rg"
VM_NAME="decentralbet-vm"
LOCATION="eastus"
VM_SIZE="Standard_B2s"  # 2 vCPUs, 4GB RAM - affordable
IMAGE="Ubuntu2204"
ADMIN_USERNAME="azureuser"

echo "🚀 Creating VM for DecentralBet deployment..."

# Create resource group
echo "📦 Creating resource group: $RESOURCE_GROUP"
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create VM
echo "💻 Creating VM: $VM_NAME"
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image $IMAGE \
  --size $VM_SIZE \
  --admin-username $ADMIN_USERNAME \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --public-ip-address-allocation static

# Open ports for web traffic
echo "🌐 Opening ports..."
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 80 --priority 900
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 443 --priority 901
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 3000 --priority 902
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 5000 --priority 903

# Get VM details
VM_IP=$(az vm show -g $RESOURCE_GROUP -n $VM_NAME -d --query publicIps -o tsv)

echo "✅ VM Created!"
echo "🌍 Public IP: $VM_IP"
echo "🔑 SSH: ssh $ADMIN_USERNAME@$VM_IP"
echo ""
echo "Next steps:"
echo "1. SSH to the VM"
echo "2. Install Docker, Node.js, Git"
echo "3. Clone your repo and deploy"
