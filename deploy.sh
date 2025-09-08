#!/bin/bash
set -e

echo "🚀 DecentralBet Deployment Script"
echo "================================="

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install it first."
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install it first."
    exit 1
fi

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not found. Please install it first."
    exit 1
fi

# Login to Azure
echo "🔐 Logging into Azure..."
az login

# Set variables
RESOURCE_GROUP="rg-decentralbet-dev"
LOCATION="eastus"
ACR_NAME="acrdecentralbetdev"
CLUSTER_NAME="aks-decentralbet-dev"

# Deploy infrastructure with Terraform
echo "🏗️  Deploying infrastructure..."
cd terraform
terraform init
terraform plan -var="environment=dev"
terraform apply -auto-approve -var="environment=dev"
cd ..

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query "loginServer" --output tsv)
echo "📦 Container Registry: $ACR_LOGIN_SERVER"

# Build and push Docker images
echo "🐳 Building and pushing Docker images..."

# Build backend
echo "📦 Building backend..."
cd backend
az acr build --registry $ACR_NAME --image decentralbet-backend:latest .
cd ..

# Build frontend
echo "📦 Building frontend..."
cd frontend
az acr build --registry $ACR_NAME --image decentralbet-frontend:latest .
cd ..

# Get AKS credentials
echo "☸️  Getting AKS credentials..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --overwrite-existing

# Check if namespace exists, create if not
kubectl get namespace decentralbet 2>/dev/null || kubectl create namespace decentralbet

# Apply Kubernetes manifests (if they exist)
if [ -f "k8s/deployment.yaml" ]; then
    echo "📋 Applying Kubernetes manifests..."
    kubectl apply -f k8s/ -n decentralbet
fi

# Update deployment with new image
echo "🔄 Updating deployment..."
kubectl set image deployment/decentralbet-frontend frontend=$ACR_LOGIN_SERVER/decentralbet-frontend:latest -n decentralbet

# Wait for rollout
echo "⏳ Waiting for deployment to complete..."
kubectl rollout status deployment/decentralbet-frontend -n decentralbet --timeout=300s

# Get service information
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Information:"
kubectl get services -n decentralbet
echo ""
echo "🚀 Pods Status:"
kubectl get pods -n decentralbet

# Try to get external IP
EXTERNAL_IP=$(kubectl get service decentralbet-frontend-service -n decentralbet -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending...")
if [ "$EXTERNAL_IP" != "Pending..." ] && [ "$EXTERNAL_IP" != "" ]; then
    echo ""
    echo "🌐 Your app is available at: http://$EXTERNAL_IP"
else
    echo ""
    echo "🔄 External IP is still being assigned. Check again in a few minutes:"
    echo "   kubectl get service decentralbet-frontend-service -n decentralbet"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "Useful commands:"
echo "  kubectl get pods -n decentralbet                    # Check pod status"
echo "  kubectl logs -f deployment/decentralbet-frontend -n decentralbet  # View logs"
echo "  kubectl describe deployment decentralbet-frontend -n decentralbet # Deployment details"
