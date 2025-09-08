#!/bin/bash

# DecentralBet - AKS Deployment Script
# Complete deployment script for Azure Kubernetes Service

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
RESOURCE_GROUP="decentralbet-rg"
CLUSTER_NAME="decentralbet-aks"
ACR_NAME="decentralbetacr"
NAMESPACE="decentralbet"
LOCATION="East US"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 DecentralBet AKS Deployment${NC}"
echo -e "${BLUE}===============================${NC}\n"

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI not found. Please install Azure CLI."
        exit 1
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker."
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_warning "Terraform not found. Infrastructure deployment will be skipped."
        TERRAFORM_AVAILABLE=false
    else
        TERRAFORM_AVAILABLE=true
    fi
    
    # Check Azure login
    if ! az account show &> /dev/null; then
        print_error "Not logged into Azure. Please run: az login"
        exit 1
    fi
    
    print_status "Prerequisites check completed"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    if [ "$TERRAFORM_AVAILABLE" = true ]; then
        print_info "Deploying infrastructure with Terraform..."
        
        cd "$PROJECT_DIR/terraform"
        
        # Initialize Terraform
        terraform init
        
        # Plan deployment
        terraform plan -out=tfplan
        
        # Apply deployment
        terraform apply -auto-approve tfplan
        
        # Get outputs
        CLUSTER_NAME=$(terraform output -raw aks_cluster_name)
        RESOURCE_GROUP=$(terraform output -raw resource_group_name)
        ACR_NAME=$(terraform output -raw acr_login_server | cut -d'.' -f1)
        
        print_status "Infrastructure deployed successfully"
        cd "$PROJECT_DIR"
    else
        print_warning "Skipping infrastructure deployment (Terraform not available)"
        print_info "Please ensure AKS cluster exists: $CLUSTER_NAME in $RESOURCE_GROUP"
    fi
}

# Build and push images
build_and_push_images() {
    print_info "Building and pushing Docker images..."
    
    # Login to ACR
    az acr login --name $ACR_NAME
    
    # Build and push frontend
    print_info "Building frontend image..."
    cd "$PROJECT_DIR/frontend"
    
    docker build --target production \
        -t $ACR_NAME.azurecr.io/decentralbet-frontend:latest \
        -t $ACR_NAME.azurecr.io/decentralbet-frontend:$(date +%Y%m%d-%H%M%S) \
        .
    
    docker push $ACR_NAME.azurecr.io/decentralbet-frontend:latest
    docker push $ACR_NAME.azurecr.io/decentralbet-frontend:$(date +%Y%m%d-%H%M%S)
    
    # Build and push backend
    print_info "Building backend image..."
    cd "$PROJECT_DIR/backend"
    
    docker build --target production \
        -t $ACR_NAME.azurecr.io/decentralbet-backend:latest \
        -t $ACR_NAME.azurecr.io/decentralbet-backend:$(date +%Y%m%d-%H%M%S) \
        .
    
    docker push $ACR_NAME.azurecr.io/decentralbet-backend:latest
    docker push $ACR_NAME.azurecr.io/decentralbet-backend:$(date +%Y%m%d-%H%M%S)
    
    cd "$PROJECT_DIR"
    print_status "Images built and pushed successfully"
}

# Connect to AKS cluster
connect_to_cluster() {
    print_info "Connecting to AKS cluster..."
    
    # Get cluster credentials
    az aks get-credentials \
        --resource-group $RESOURCE_GROUP \
        --name $CLUSTER_NAME \
        --overwrite-existing
    
    # Verify connection
    kubectl cluster-info
    
    print_status "Connected to AKS cluster"
}

# Deploy to AKS
deploy_to_aks() {
    print_info "Deploying to AKS..."
    
    cd "$PROJECT_DIR/k8s"
    
    # Create namespace
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Update configmap with working blockchain config
    cat > temp-configmap.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: decentralbet-config
  namespace: $NAMESPACE
data:
  NODE_ENV: "production"
  API_PREFIX: "/api/v1"
  MONGODB_DATABASE: "decentralbet"
  REDIS_DATABASE: "0"
  NEXT_TELEMETRY_DISABLED: "1"
  CORS_ORIGIN: "*"
  SOCKET_CORS_ORIGIN: "*"
  # Blockchain configuration
  NEXT_PUBLIC_CHAIN_ID: "11155111"
  NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS: "0x0825840aA80d49100218E8B655F126D26bD24e1D"
  NEXT_PUBLIC_MOCK_USDC_ADDRESS: "0xC8bAD4974f4A6Cf62B39141d79De5c875a66ee3d"
  NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS: "0x70ff7fedDb900f9e254aEfA8b9b8f81f5d770460"
---
apiVersion: v1
kind: Secret
metadata:
  name: decentralbet-secrets
  namespace: $NAMESPACE
type: Opaque
stringData:
  MONGODB_URI: "mongodb://localhost:27017/decentralbet"
  REDIS_URL: "redis://localhost:6379"
  JWT_SECRET: "decentralbet-jwt-secret-2024-production"
  ETHEREUM_RPC_URL: "https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g"
EOF
    
    # Apply configurations in order
    kubectl apply -f temp-configmap.yaml
    kubectl apply -f rbac.yaml || true
    kubectl apply -f network-policies.yaml || true
    kubectl apply -f backend.yaml
    kubectl apply -f frontend.yaml
    kubectl apply -f ingress.yaml
    
    # Apply monitoring if exists
    if [ -d "monitoring" ]; then
        print_info "Deploying monitoring stack..."
        kubectl apply -f monitoring/
    fi
    
    # Clean up
    rm -f temp-configmap.yaml
    
    cd "$PROJECT_DIR"
    print_status "Deployed to AKS successfully"
}

# Wait for deployment
wait_for_deployment() {
    print_info "Waiting for deployments to be ready..."
    
    # Wait for deployments
    kubectl rollout status deployment/backend -n $NAMESPACE --timeout=300s
    kubectl rollout status deployment/frontend -n $NAMESPACE --timeout=300s
    
    print_status "All deployments are ready"
}

# Show deployment status
show_status() {
    print_info "Deployment Status:"
    echo ""
    
    # Get all resources
    kubectl get all -n $NAMESPACE
    
    echo ""
    print_info "Service URLs:"
    
    # Get service details
    FRONTEND_IP=$(kubectl get service frontend-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    BACKEND_IP=$(kubectl get service backend-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    
    if [ "$FRONTEND_IP" != "pending" ] && [ -n "$FRONTEND_IP" ]; then
        echo "🌐 Frontend: http://$FRONTEND_IP"
    else
        echo "🌐 Frontend: http://localhost:3000 (use port-forward)"
        echo "   kubectl port-forward svc/frontend-service 3000:3000 -n $NAMESPACE"
    fi
    
    if [ "$BACKEND_IP" != "pending" ] && [ -n "$BACKEND_IP" ]; then
        echo "🔧 Backend: http://$BACKEND_IP:5000"
    else
        echo "🔧 Backend: http://localhost:5000 (use port-forward)"
        echo "   kubectl port-forward svc/backend-service 5000:5000 -n $NAMESPACE"
    fi
    
    # Ingress info
    INGRESS_IP=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    if [ "$INGRESS_IP" != "pending" ] && [ -n "$INGRESS_IP" ]; then
        echo "🌐 Ingress: http://$INGRESS_IP"
    fi
    
    echo ""
    print_info "Useful commands:"
    echo "📊 Check pods: kubectl get pods -n $NAMESPACE"
    echo "📋 Check logs: kubectl logs -f deployment/frontend -n $NAMESPACE"
    echo "🔍 Debug: kubectl describe pod <pod-name> -n $NAMESPACE"
    echo "🔄 Restart: kubectl rollout restart deployment/frontend -n $NAMESPACE"
}

# Run tests
run_tests() {
    print_info "Running smoke tests..."
    
    # Wait for services
    sleep 30
    
    # Test health endpoints
    print_info "Testing backend health..."
    if kubectl port-forward svc/backend-service 8080:5000 -n $NAMESPACE > /dev/null 2>&1 & then
        PORT_FORWARD_PID=$!
        sleep 5
        
        if curl -f http://localhost:8080/health > /dev/null 2>&1; then
            print_status "Backend health check passed"
        else
            print_warning "Backend health check failed"
        fi
        
        kill $PORT_FORWARD_PID 2>/dev/null || true
    fi
    
    print_status "Tests completed"
}

# Main execution
main() {
    print_info "Starting AKS deployment process..."
    
    # Menu for deployment options
    echo ""
    echo "Choose deployment option:"
    echo "1) Full deployment (Infrastructure + Images + Deploy)"
    echo "2) Build and deploy (Images + Deploy only)"
    echo "3) Deploy only (use existing images)"
    echo "4) Infrastructure only"
    echo "5) Show current status"
    echo -n "Enter your choice (1-5): "
    
    read -r choice
    
    check_prerequisites
    
    case $choice in
        1)
            deploy_infrastructure
            build_and_push_images
            connect_to_cluster
            deploy_to_aks
            wait_for_deployment
            run_tests
            show_status
            ;;
        2)
            build_and_push_images
            connect_to_cluster
            deploy_to_aks
            wait_for_deployment
            run_tests
            show_status
            ;;
        3)
            connect_to_cluster
            deploy_to_aks
            wait_for_deployment
            show_status
            ;;
        4)
            deploy_infrastructure
            ;;
        5)
            connect_to_cluster
            show_status
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_status "🎉 AKS deployment completed successfully!"
    print_info "Your DecentralBet platform is now running on Azure Kubernetes Service!"
    
    # Final deployment info
    if [ "$TERRAFORM_AVAILABLE" = true ]; then
        echo ""
        print_info "Terraform outputs:"
        cd "$PROJECT_DIR/terraform"
        terraform output deployment_info 2>/dev/null || true
        cd "$PROJECT_DIR"
    fi
}

# Run main function
main "$@"
