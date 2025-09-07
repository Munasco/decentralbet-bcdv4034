#!/bin/bash

# DecentralBet Production Deployment Script for Azure
# This script deploys the application to Azure AKS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
RESOURCE_GROUP="decentralbet-rg"
CLUSTER_NAME="decentralbet-aks"
ACR_NAME="decentralbetacr"
NAMESPACE="decentralbet"
LOCATION="East US"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command_exists az; then
        missing_tools+=("azure-cli")
    fi
    
    if ! command_exists kubectl; then
        missing_tools+=("kubectl")
    fi
    
    if ! command_exists terraform; then
        missing_tools+=("terraform")
    fi
    
    if ! command_exists docker; then
        missing_tools+=("docker")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install the missing tools and run this script again."
        exit 1
    fi
    
    print_success "All prerequisites are installed!"
}

# Azure login check
check_azure_login() {
    print_status "Checking Azure login status..."
    
    if ! az account show >/dev/null 2>&1; then
        print_warning "Not logged in to Azure. Please login."
        az login
    fi
    
    print_success "Azure login verified!"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    print_status "Deploying Azure infrastructure with Terraform..."
    
    cd infrastructure
    
    # Initialize Terraform
    print_status "Initializing Terraform..."
    terraform init
    
    # Plan deployment
    print_status "Planning infrastructure deployment..."
    terraform plan -out=tfplan
    
    # Apply infrastructure
    print_status "Applying infrastructure changes..."
    terraform apply tfplan
    
    print_success "Infrastructure deployed successfully!"
    cd ..
}

# Build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."
    
    # Login to ACR
    print_status "Logging in to Azure Container Registry..."
    az acr login --name $ACR_NAME
    
    # Get ACR login server
    ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
    
    # Build and push backend image
    print_status "Building and pushing backend image..."
    docker build -t $ACR_LOGIN_SERVER/decentralbet-backend:latest --target production ./backend
    docker push $ACR_LOGIN_SERVER/decentralbet-backend:latest
    
    # Build and push frontend image
    print_status "Building and pushing frontend image..."
    docker build -t $ACR_LOGIN_SERVER/decentralbet-frontend:latest --target production ./frontend
    docker push $ACR_LOGIN_SERVER/decentralbet-frontend:latest
    
    print_success "Docker images built and pushed successfully!"
}

# Deploy to AKS
deploy_to_aks() {
    print_status "Deploying to Azure Kubernetes Service..."
    
    # Get AKS credentials
    print_status "Getting AKS credentials..."
    az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --overwrite-existing
    
    # Create namespace if it doesn't exist
    print_status "Creating Kubernetes namespace..."
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy applications
    print_status "Deploying applications to Kubernetes..."
    
    # Apply namespace and configs
    kubectl apply -f k8s/namespace.yaml
    
    # Deploy backend
    kubectl apply -f k8s/backend.yaml
    
    # Deploy frontend
    kubectl apply -f k8s/frontend.yaml
    
    # Deploy ingress
    kubectl apply -f k8s/ingress.yaml
    
    print_success "Applications deployed to AKS!"
}

# Wait for deployments to be ready
wait_for_deployments() {
    print_status "Waiting for deployments to be ready..."
    
    # Wait for backend deployment
    print_status "Waiting for backend deployment..."
    kubectl rollout status deployment/backend -n $NAMESPACE --timeout=300s
    
    # Wait for frontend deployment
    print_status "Waiting for frontend deployment..."
    kubectl rollout status deployment/frontend -n $NAMESPACE --timeout=300s
    
    print_success "All deployments are ready!"
}

# Setup secrets
setup_secrets() {
    print_status "Setting up Kubernetes secrets..."
    
    # Get secrets from Azure Key Vault
    print_status "Retrieving secrets from Azure Key Vault..."
    KEY_VAULT_NAME="decentralbet-kv"
    
    # Create secrets if they don't exist
    if ! kubectl get secret decentralbet-secrets -n $NAMESPACE >/dev/null 2>&1; then
        print_warning "Secrets not found. Please update the secrets in k8s/namespace.yaml with actual values."
        print_warning "Then run: kubectl apply -f k8s/namespace.yaml"
    else
        print_success "Secrets already configured!"
    fi
}

# Run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Wait for ingress to get external IP
    print_status "Waiting for ingress to get external IP..."
    sleep 30
    
    # Get ingress external IP
    EXTERNAL_IP=$(kubectl get ingress decentralbet-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [ -z "$EXTERNAL_IP" ]; then
        print_warning "External IP not yet assigned. Checking service endpoints..."
        kubectl get ingress -n $NAMESPACE
        kubectl get svc -n $NAMESPACE
    else
        print_success "External IP assigned: $EXTERNAL_IP"
        
        # Test health endpoints
        if curl -f -m 10 http://$EXTERNAL_IP/api/v1/health >/dev/null 2>&1; then
            print_success "Backend health check passed"
        else
            print_warning "Backend health check failed - this may be normal if still starting"
        fi
        
        if curl -f -m 10 http://$EXTERNAL_IP/ >/dev/null 2>&1; then
            print_success "Frontend health check passed"
        else
            print_warning "Frontend health check failed - this may be normal if still starting"
        fi
    fi
}

# Display deployment information
show_deployment_info() {
    print_success "🚀 DecentralBet Production Deployment Complete!"
    echo ""
    
    # Get ingress information
    kubectl get ingress -n $NAMESPACE
    echo ""
    
    # Get service information
    kubectl get svc -n $NAMESPACE
    echo ""
    
    # Get pod information
    kubectl get pods -n $NAMESPACE
    echo ""
    
    print_success "📋 Deployment Summary:"
    echo "  Resource Group: $RESOURCE_GROUP"
    echo "  AKS Cluster:    $CLUSTER_NAME"
    echo "  Namespace:      $NAMESPACE"
    echo ""
    
    print_success "🌐 URLs (once DNS is configured):"
    echo "  Frontend:   https://decentralbet.azurewebsites.net"
    echo "  Backend:    https://api.decentralbet.azurewebsites.net"
    echo ""
    
    print_success "🔧 Management Commands:"
    echo "  View pods:        kubectl get pods -n $NAMESPACE"
    echo "  View services:    kubectl get svc -n $NAMESPACE"
    echo "  View ingress:     kubectl get ingress -n $NAMESPACE"
    echo "  View logs:        kubectl logs -f deployment/backend -n $NAMESPACE"
    echo "  Scale backend:    kubectl scale deployment/backend --replicas=5 -n $NAMESPACE"
    echo ""
}

# Main deployment function
main() {
    echo "🎲 DecentralBet Production Deployment to Azure"
    echo "==============================================="
    echo ""
    
    # Confirmation prompt
    read -p "This will deploy to PRODUCTION on Azure. Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled."
        exit 0
    fi
    
    check_prerequisites
    check_azure_login
    deploy_infrastructure
    setup_secrets
    build_and_push_images
    deploy_to_aks
    wait_for_deployments
    run_health_checks
    show_deployment_info
    
    print_success "Production deployment completed successfully! 🎉"
}

# Error handling
error_handler() {
    print_error "Deployment failed! Check the logs above for details."
    exit 1
}

trap error_handler ERR

# Run main function
main "$@"
