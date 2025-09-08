#!/bin/bash

# DecentralBet - Kubernetes Deployment Script
# This script deploys the complete DecentralBet application to Kubernetes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="decentralbet"
NAMESPACE="decentralbet"
REGISTRY="decentralbetacr.azurecr.io"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 DecentralBet Kubernetes Deployment${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Function to print status
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
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if we can connect to Kubernetes cluster
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Build and push Docker images
build_and_push_images() {
    print_info "Building and pushing Docker images..."
    
    # Build frontend image
    print_info "Building frontend image..."
    cd "$PROJECT_DIR/frontend"
    
    # Update the RPC URL in the config (using working Alchemy endpoint)
    echo "Updating contract configuration..."
    
    docker build --target production -t "$REGISTRY/$PROJECT_NAME-frontend:latest" .
    docker push "$REGISTRY/$PROJECT_NAME-frontend:latest"
    print_status "Frontend image built and pushed"
    
    # Build backend image
    print_info "Building backend image..."
    cd "$PROJECT_DIR/backend"
    
    docker build -t "$REGISTRY/$PROJECT_NAME-backend:latest" .
    docker push "$REGISTRY/$PROJECT_NAME-backend:latest"
    print_status "Backend image built and pushed"
    
    cd "$PROJECT_DIR"
}

# Update Kubernetes configurations
update_k8s_configs() {
    print_info "Updating Kubernetes configurations..."
    
    # Update the ConfigMap with working contract addresses and RPC
    cd "$PROJECT_DIR/k8s"
    
    # Create a temporary configmap with our working values
    cat > temp-config.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: decentralbet-config
  namespace: decentralbet
data:
  NODE_ENV: "production"
  API_PREFIX: "/api/v1"
  MONGODB_DATABASE: "decentralbet"
  REDIS_DATABASE: "0"
  NEXT_TELEMETRY_DISABLED: "1"
  CORS_ORIGIN: "https://decentralbet.example.com"
  SOCKET_CORS_ORIGIN: "https://decentralbet.example.com"
  # Updated with working blockchain config
  NEXT_PUBLIC_CHAIN_ID: "11155111"
  NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS: "0x0825840aA80d49100218E8B655F126D26bD24e1D"
  NEXT_PUBLIC_MOCK_USDC_ADDRESS: "0xC8bAD4974f4A6Cf62B39141d79De5c875a66ee3d"
  NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS: "0x70ff7fedDb900f9e254aEfA8b9b8f81f5d770460"
---
apiVersion: v1
kind: Secret
metadata:
  name: decentralbet-secrets
  namespace: decentralbet
type: Opaque
stringData:
  MONGODB_URI: "mongodb://admin:decentralbet2024@mongodb:27017/decentralbet?authSource=admin"
  REDIS_URL: "redis://:decentralbet2024@redis:6379"
  JWT_SECRET: "decentralbet-jwt-secret-2024-production"
  PRIVATE_KEY: "your-ethereum-private-key-here"
  ETHEREUM_RPC_URL: "https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g"
EOF
    
    print_status "Kubernetes configurations updated"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    print_info "Deploying to Kubernetes..."
    
    cd "$PROJECT_DIR/k8s"
    
    # Create namespace and basic configs
    print_info "Creating namespace and configurations..."
    kubectl apply -f namespace.yaml
    kubectl apply -f temp-config.yaml  # Use our updated config
    kubectl apply -f rbac.yaml
    
    # Deploy network policies
    print_info "Applying network policies..."
    kubectl apply -f network-policies.yaml
    
    # Deploy backend
    print_info "Deploying backend..."
    kubectl apply -f backend.yaml
    
    # Deploy frontend
    print_info "Deploying frontend..."
    kubectl apply -f frontend.yaml
    
    # Deploy ingress
    print_info "Deploying ingress..."
    kubectl apply -f ingress.yaml
    
    # Deploy monitoring (if available)
    if [ -d "monitoring" ]; then
        print_info "Deploying monitoring..."
        kubectl apply -f monitoring/
    fi
    
    print_status "All components deployed to Kubernetes"
}

# Wait for deployments to be ready
wait_for_deployments() {
    print_info "Waiting for deployments to be ready..."
    
    kubectl wait --for=condition=available --timeout=300s deployment/backend -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/frontend -n $NAMESPACE
    
    print_status "All deployments are ready"
}

# Show deployment status
show_status() {
    print_info "Deployment Status:"
    echo ""
    
    kubectl get all -n $NAMESPACE
    
    echo ""
    print_info "Service URLs:"
    
    # Get ingress info
    INGRESS_IP=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    INGRESS_HOST=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "localhost")
    
    if [ "$INGRESS_IP" != "pending" ] && [ -n "$INGRESS_IP" ]; then
        echo "🌐 Frontend: http://$INGRESS_IP"
        echo "🌐 Frontend (hostname): http://$INGRESS_HOST"
    else
        echo "🌐 Frontend: http://localhost (port-forward required)"
        echo "   Run: kubectl port-forward svc/frontend-service 3000:3000 -n $NAMESPACE"
    fi
    
    echo "🔧 Backend API: http://backend-service:5000 (internal)"
    echo "   Run: kubectl port-forward svc/backend-service 5000:5000 -n $NAMESPACE"
    
    echo ""
    print_info "Useful commands:"
    echo "📊 Check pods: kubectl get pods -n $NAMESPACE"
    echo "📋 Check logs: kubectl logs -f deployment/frontend -n $NAMESPACE"
    echo "🔍 Debug: kubectl describe pod <pod-name> -n $NAMESPACE"
}

# Cleanup function
cleanup() {
    print_info "Cleaning up temporary files..."
    cd "$PROJECT_DIR/k8s"
    rm -f temp-config.yaml
}

# Main execution
main() {
    trap cleanup EXIT
    
    print_info "Starting deployment process..."
    
    check_prerequisites
    
    # Ask user what they want to do
    echo ""
    echo "What would you like to do?"
    echo "1) Full deployment (build images + deploy)"
    echo "2) Deploy only (use existing images)"
    echo "3) Update configs only"
    echo "4) Show current status"
    echo -n "Enter your choice (1-4): "
    
    read -r choice
    
    case $choice in
        1)
            build_and_push_images
            update_k8s_configs
            deploy_to_kubernetes
            wait_for_deployments
            show_status
            ;;
        2)
            update_k8s_configs
            deploy_to_kubernetes
            wait_for_deployments
            show_status
            ;;
        3)
            update_k8s_configs
            kubectl apply -f temp-config.yaml
            print_status "Configurations updated"
            ;;
        4)
            show_status
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_status "🎉 DecentralBet deployment completed successfully!"
    print_info "Your blockchain prediction market platform is now running on Kubernetes!"
}

# Run main function
main "$@"
