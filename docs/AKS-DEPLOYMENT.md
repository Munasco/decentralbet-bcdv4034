# DecentralBet - AKS Deployment Documentation

This document provides comprehensive instructions for deploying the DecentralBet prediction market platform to Azure Kubernetes Service (AKS).

## 🏗️ Architecture Overview

The DecentralBet platform consists of:
- **Frontend**: Next.js React application with Web3 integration
- **Backend**: Node.js/Express API with WebSocket support
- **Database**: MongoDB for application data
- **Cache**: Redis for session management
- **Blockchain**: Ethereum Sepolia testnet integration
- **Infrastructure**: Azure Kubernetes Service with monitoring

## 📋 Prerequisites

Before deployment, ensure you have:

### Required Tools
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (latest version)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (v1.20+)
- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli) (v1.0+) - Optional for infrastructure

### Azure Setup
```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "your-subscription-id"

# Register required providers
az provider register --namespace Microsoft.ContainerService
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.Network
```

## 🚀 Quick Deployment

The fastest way to deploy is using the automated script:

```bash
# Navigate to project root
cd /path/to/fullstack-blockchain-integration

# Run the deployment script
./scripts/deploy-aks.sh
```

The script will guide you through deployment options:
1. **Full deployment** - Infrastructure + Images + Deploy
2. **Build and deploy** - Images + Deploy only  
3. **Deploy only** - Use existing images
4. **Infrastructure only** - Terraform resources only
5. **Show current status** - Check deployment status

## 🏭 Manual Infrastructure Deployment

### Using Terraform (Recommended)

```bash
cd terraform/

# Initialize Terraform
terraform init

# Review the deployment plan
terraform plan

# Apply the infrastructure
terraform apply
```

This creates:
- Resource Group
- Azure Container Registry (ACR)
- AKS Cluster with autoscaling
- Virtual Network with subnets
- Application Gateway
- Key Vault for secrets
- Log Analytics workspace

### Using Azure CLI (Alternative)

```bash
# Create resource group
az group create --name decentralbet-rg --location "East US"

# Create ACR
az acr create --resource-group decentralbet-rg \
  --name decentralbetacr --sku Basic

# Create AKS cluster
az aks create \
  --resource-group decentralbet-rg \
  --name decentralbet-aks \
  --node-count 2 \
  --enable-addons monitoring \
  --attach-acr decentralbetacr \
  --generate-ssh-keys
```

## 🐳 Container Images

### Build and Push Images

```bash
# Login to ACR
az acr login --name decentralbetacr

# Build and push frontend
cd frontend/
docker build --target production -t decentralbetacr.azurecr.io/decentralbet-frontend:latest .
docker push decentralbetacr.azurecr.io/decentralbet-frontend:latest

# Build and push backend
cd ../backend/
docker build --target production -t decentralbetacr.azurecr.io/decentralbet-backend:latest .
docker push decentralbetacr.azurecr.io/decentralbet-backend:latest
```

### Multi-stage Docker Builds

Our Dockerfiles use multi-stage builds for optimal production images:

**Frontend Dockerfile:**
- Development stage with hot reload
- Build stage for optimized production build
- Production stage with minimal runtime

**Backend Dockerfile:**
- Development stage with nodemon
- Production stage with minimal dependencies

## ☸️ Kubernetes Deployment

### Connect to AKS Cluster

```bash
# Get cluster credentials
az aks get-credentials --resource-group decentralbet-rg --name decentralbet-aks

# Verify connection
kubectl cluster-info
```

### Deploy Application

```bash
cd k8s/

# Create namespace
kubectl create namespace decentralbet

# Deploy configuration
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml

# Deploy services
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml

# Deploy networking
kubectl apply -f ingress.yaml

# Optional: Deploy monitoring
kubectl apply -f monitoring/
```

## 🔧 Configuration

### Environment Variables

The application uses the following key configurations:

**Blockchain Configuration:**
- `NEXT_PUBLIC_CHAIN_ID`: "11155111" (Sepolia)
- `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`: Smart contract address
- `NEXT_PUBLIC_MOCK_USDC_ADDRESS`: Test token address
- `ETHEREUM_RPC_URL`: Alchemy or Infura RPC endpoint

**Database Configuration:**
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string

**API Configuration:**
- `NODE_ENV`: "production"
- `CORS_ORIGIN`: Allowed origins
- `JWT_SECRET`: Authentication secret

### Secrets Management

Sensitive data is stored in Kubernetes secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: decentralbet-secrets
type: Opaque
stringData:
  MONGODB_URI: "mongodb://mongo:27017/decentralbet"
  REDIS_URL: "redis://redis:6379"
  JWT_SECRET: "your-jwt-secret"
  ETHEREUM_RPC_URL: "https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
```

## 📊 Monitoring and Observability

### Health Checks

Both services expose health endpoints:
- Frontend: `/api/health`
- Backend: `/health`

### Monitoring Stack

The monitoring directory includes:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **AlertManager**: Alert notifications
- **Node Exporter**: System metrics

```bash
# Deploy monitoring
kubectl apply -f k8s/monitoring/

# Access Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring
```

### Logs

View application logs:

```bash
# Frontend logs
kubectl logs -f deployment/frontend -n decentralbet

# Backend logs
kubectl logs -f deployment/backend -n decentralbet

# All pods in namespace
kubectl logs -f -l app=decentralbet -n decentralbet
```

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy-aks.yml`) provides:

### Triggers
- Push to `main` branch
- Manual workflow dispatch
- Pull request validation

### Pipeline Stages
1. **Test & Lint**: Run tests and code quality checks
2. **Build**: Create Docker images with commit SHA tags
3. **Push**: Upload images to Azure Container Registry
4. **Deploy**: Update Kubernetes manifests and deploy
5. **Verify**: Run smoke tests against deployed services

### Secrets Required

Add these secrets to your GitHub repository:

```
AZURE_CREDENTIALS      # Service principal JSON
REGISTRY_LOGIN_SERVER  # ACR login server
REGISTRY_USERNAME      # ACR username  
REGISTRY_PASSWORD      # ACR password
```

## 🌐 Network Configuration

### Ingress Controller

The platform uses NGINX Ingress Controller for external access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: decentralbet-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: decentralbet.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 5000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 3000
```

### Network Policies

Network policies provide micro-segmentation:
- Frontend can communicate with backend
- Backend can access database
- External access only through ingress

## 🔒 Security

### RBAC Configuration

Role-based access control limits pod permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: decentralbet-sa
  namespace: decentralbet
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: decentralbet
  name: decentralbet-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
```

### Pod Security

- Non-root containers
- Read-only root filesystem where possible
- Resource limits and requests
- Network policies for segmentation

## 📈 Scaling

### Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Cluster Autoscaling

AKS cluster autoscaling automatically adjusts node count based on demand.

## 🛠️ Troubleshooting

### Common Issues

**Pod Not Starting:**
```bash
# Check pod status
kubectl describe pod <pod-name> -n decentralbet

# Check resource limits
kubectl top pods -n decentralbet
```

**Image Pull Errors:**
```bash
# Verify ACR integration
az aks check-acr --name decentralbet-aks --resource-group decentralbet-rg --acr decentralbetacr

# Check image exists
az acr repository list --name decentralbetacr
```

**Network Issues:**
```bash
# Test service connectivity
kubectl exec -it <pod-name> -n decentralbet -- wget -qO- http://backend-service:5000/health

# Check ingress status
kubectl get ingress -n decentralbet
```

### Debugging Commands

```bash
# Get all resources
kubectl get all -n decentralbet

# Describe deployment
kubectl describe deployment frontend -n decentralbet

# Check events
kubectl get events -n decentralbet --sort-by='.lastTimestamp'

# Port forward for local testing
kubectl port-forward svc/frontend-service 3000:3000 -n decentralbet
kubectl port-forward svc/backend-service 5000:5000 -n decentralbet
```

## 🔄 Updates and Maintenance

### Rolling Updates

```bash
# Update image tag
kubectl set image deployment/frontend frontend=decentralbetacr.azurecr.io/decentralbet-frontend:v1.2.0 -n decentralbet

# Check rollout status
kubectl rollout status deployment/frontend -n decentralbet

# Rollback if needed
kubectl rollout undo deployment/frontend -n decentralbet
```

### Backup and Recovery

```bash
# Backup namespace configuration
kubectl get all -n decentralbet -o yaml > decentralbet-backup.yaml

# Backup secrets and configmaps
kubectl get secrets,configmaps -n decentralbet -o yaml > decentralbet-config-backup.yaml
```

## 📞 Support

For deployment issues:
1. Check this documentation
2. Review application logs
3. Check Kubernetes events
4. Verify network connectivity
5. Review resource utilization

## 📝 Additional Resources

- [AKS Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Azure Container Registry](https://docs.microsoft.com/en-us/azure/container-registry/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Note**: This platform is configured for Ethereum Sepolia testnet. For mainnet deployment, update the contract addresses and RPC endpoints in the configuration files.
