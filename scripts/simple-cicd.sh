#!/bin/bash

# Simple CI/CD Script for DecentralBet
# Run this on your Azure VM to deploy latest changes

set -e  # Exit on any error

# Configuration
REPO_DIR="/opt/decentralbet"
ACR_NAME="dbacr1757292120"
RESOURCE_GROUP="decentralbet-rg"
CLUSTER_NAME="decentralbet-aks"
NAMESPACE="decentralbet"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v git &> /dev/null; then
        error "git is not installed"
    fi
    
    if ! command -v docker &> /dev/null; then
        error "docker is not installed"
    fi
    
    if ! command -v az &> /dev/null; then
        error "Azure CLI is not installed"
    fi
    
    if ! command -v kubectl &> /dev/null; then
        warn "kubectl not found, will install it"
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        chmod +x kubectl
        sudo mv kubectl /usr/local/bin/
    fi
    
    log "Prerequisites check completed ✅"
}

# Pull latest code
pull_code() {
    log "Pulling latest code..."
    
    if [ ! -d "$REPO_DIR" ]; then
        log "Cloning repository..."
        git clone https://github.com/Munasco/decentralbet-bcdv4034.git "$REPO_DIR"
    fi
    
    cd "$REPO_DIR"
    git fetch origin
    git reset --hard origin/main
    
    log "Code updated to latest main branch ✅"
}

# Build and push Docker images
build_and_push() {
    log "Building and pushing Docker images..."
    
    cd "$REPO_DIR"
    
    # Get commit SHA for tagging
    COMMIT_SHA=$(git rev-parse --short HEAD)
    
    # Login to ACR
    log "Logging into Azure Container Registry..."
    az acr login --name "$ACR_NAME"
    
    # Build frontend
    log "Building frontend image..."
    docker build --platform linux/amd64 \
        -t "$ACR_NAME.azurecr.io/decentralbet-frontend:latest" \
        -t "$ACR_NAME.azurecr.io/decentralbet-frontend:$COMMIT_SHA" \
        ./frontend
    
    log "Pushing frontend image..."
    docker push "$ACR_NAME.azurecr.io/decentralbet-frontend:latest"
    docker push "$ACR_NAME.azurecr.io/decentralbet-frontend:$COMMIT_SHA"
    
    # Build backend
    log "Building backend image..."
    docker build --platform linux/amd64 \
        -t "$ACR_NAME.azurecr.io/decentralbet-backend:latest" \
        -t "$ACR_NAME.azurecr.io/decentralbet-backend:$COMMIT_SHA" \
        ./backend
    
    log "Pushing backend image..."
    docker push "$ACR_NAME.azurecr.io/decentralbet-backend:latest"
    docker push "$ACR_NAME.azurecr.io/decentralbet-backend:$COMMIT_SHA"
    
    log "Docker images built and pushed ✅"
}

# Deploy to Kubernetes
deploy_to_k8s() {
    log "Deploying to Kubernetes..."
    
    cd "$REPO_DIR"
    
    # Get AKS credentials
    log "Getting AKS credentials..."
    az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --admin
    
    # Apply manifests
    log "Applying Kubernetes manifests..."
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/rbac.yaml
    kubectl apply -f k8s/backend.yaml
    kubectl apply -f k8s/frontend.yaml
    kubectl apply -f k8s/ingress.yaml
    
    # Restart deployments to pull latest images
    log "Restarting deployments..."
    kubectl rollout restart deployment/frontend -n "$NAMESPACE"
    kubectl rollout restart deployment/backend -n "$NAMESPACE"
    
    # Wait for rollout to complete
    log "Waiting for deployments to complete..."
    kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=300s
    
    log "Kubernetes deployment completed ✅"
}

# Run smoke tests
run_tests() {
    log "Running smoke tests..."
    
    # Get ingress IP
    INGRESS_IP=$(kubectl get ingress decentralbet-ingress -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [ -n "$INGRESS_IP" ]; then
        log "Testing deployment at IP: $INGRESS_IP"
        
        # Test backend health
        if curl -f "http://$INGRESS_IP/health" > /dev/null 2>&1; then
            log "✅ Backend health check passed"
        else
            warn "❌ Backend health check failed"
        fi
        
        # Test backend API
        if curl -f "http://$INGRESS_IP/api/debug/portfolios" > /dev/null 2>&1; then
            log "✅ Backend API test passed"
        else
            warn "❌ Backend API test failed"
        fi
        
        # Test frontend
        if curl -f "http://$INGRESS_IP/" | grep -q "DecentralBet"; then
            log "✅ Frontend test passed"
        else
            warn "❌ Frontend test failed"
        fi
        
        log "🌐 Application is live at: http://$INGRESS_IP/"
    else
        warn "⚠️ Ingress IP not available yet, skipping smoke tests"
    fi
}

# Show deployment status
show_status() {
    log "Deployment status:"
    echo
    kubectl get pods -n "$NAMESPACE"
    echo
    kubectl get services -n "$NAMESPACE"
    echo
    kubectl get ingress -n "$NAMESPACE"
}

# Main execution
main() {
    log "🚀 Starting DecentralBet CI/CD Pipeline"
    echo
    
    check_prerequisites
    pull_code
    build_and_push
    deploy_to_k8s
    run_tests
    show_status
    
    log "🎉 Deployment completed successfully!"
    log "🌐 Your application is live at: http://20.232.231.105/"
}

# Run main function
main "$@"
