# 🚀 DecentralBet Deployment Status & Instructions

## Current Status: **READY FOR DEPLOYMENT** ✅

### 🎯 Application Features Completed
- ✅ **Blockchain Integration**: Connected to Alchemy (Sepolia testnet)
- ✅ **Smart Contract Interaction**: Market creation, betting, portfolio tracking
- ✅ **Frontend**: Next.js app with wallet connection, market creation, betting interface
- ✅ **Backend API**: Express.js server with portfolio tracking (port 3001)
- ✅ **Real-time Updates**: Portfolio values display in navbar
- ✅ **Data Persistence**: In-memory storage for demo, Redis-ready for production

### 📦 Docker Images Built
- **Frontend**: `decentralbet-frontend:latest` (466MB)
- **Backend**: `decentralbet-backend:latest` (229MB)

### 🏗️ Infrastructure Ready
- **Terraform**: Complete AKS cluster configuration
- **Kubernetes**: Production manifests for deployment, services, ingress
- **CI/CD**: GitHub Actions pipeline for automated deployments
- **Monitoring**: Application Gateway, Log Analytics, Key Vault integration

## 🚫 Current Blocker

**Azure Subscription Issue**: 
```
Error: ReadOnlyDisabledSubscription - The subscription '69a0ceb2-4ba6-4cd4-bbf7-a35a58b1be1e' 
is disabled and therefore marked as read only.
```

**Required Action**: Reactivate Azure for Students subscription or use alternative Azure subscription.

## 🚀 Deployment Options

### Option 1: Automated GitHub Actions Deployment (Recommended)

1. **Reactivate Azure Subscription**
2. **Set GitHub Secrets** in repository:
   - `AZURE_CREDENTIALS`: Azure service principal credentials
   - Configure in GitHub repo settings > Secrets and variables > Actions

3. **Push to Main Branch**:
   ```bash
   git add .
   git commit -m "Deploy DecentralBet to AKS"
   git push origin main
   ```

4. **GitHub Actions will automatically**:
   - Build and test both frontend and backend
   - Push Docker images to Azure Container Registry
   - Deploy Terraform infrastructure (AKS cluster)
   - Deploy applications to Kubernetes
   - Run smoke tests and health checks

### Option 2: Manual Deployment

#### Step 1: Deploy Infrastructure
```bash
# Login to Azure (ensure subscription is active)
az login

# Initialize and apply Terraform
cd terraform
terraform init
terraform plan
terraform apply

# Note the outputs: ACR name, AKS cluster name, resource group
```

#### Step 2: Build and Push Docker Images
```bash
# Login to Azure Container Registry
az acr login --name [ACR_NAME_FROM_TERRAFORM_OUTPUT]

# Tag and push images
docker tag decentralbet-frontend:latest [ACR_NAME].azurecr.io/decentralbet-frontend:latest
docker tag decentralbet-backend:latest [ACR_NAME].azurecr.io/decentralbet-backend:latest

docker push [ACR_NAME].azurecr.io/decentralbet-frontend:latest
docker push [ACR_NAME].azurecr.io/decentralbet-backend:latest
```

#### Step 3: Deploy to Kubernetes
```bash
# Get AKS credentials
az aks get-credentials --resource-group decentralbet-rg --name decentralbet-aks

# Update image references in manifests
cd k8s
# Edit frontend.yaml and backend.yaml to use your ACR images

# Deploy to Kubernetes
kubectl apply -f namespace.yaml
kubectl apply -f rbac.yaml
kubectl apply -f network-policies.yaml
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml
kubectl apply -f ingress.yaml

# Check deployment status
kubectl get pods -n decentralbet
kubectl get services -n decentralbet
kubectl get ingress -n decentralbet
```

## 🔍 Verification Steps

### 1. Check Application Health
```bash
# Backend health check
kubectl port-forward -n decentralbet svc/backend-service 3001:3001
curl http://localhost:3001/health

# Frontend access
kubectl port-forward -n decentralbet svc/frontend-service 3000:3000
# Open http://localhost:3000 in browser
```

### 2. Test Core Features
- Connect MetaMask wallet
- Create a test market
- Place a bet
- Check portfolio value in navbar

### 3. Monitor Deployment
```bash
# View application logs
kubectl logs -n decentralbet deployment/frontend
kubectl logs -n decentralbet deployment/backend

# Monitor resource usage
kubectl top pods -n decentralbet
```

## 🌐 Production URLs (After Deployment)

- **Frontend**: Will be available via Application Gateway public IP
- **Backend API**: Internal service, accessible through frontend
- **Azure Portal**: Monitor via Log Analytics workspace

## 📋 Environment Variables Configured

### Frontend
- `NEXT_PUBLIC_BACKEND_URL`: Points to backend service
- `NEXT_PUBLIC_ALCHEMY_KEY`: Blockchain connection (configured)

### Backend
- `PORT`: 3001
- `NODE_ENV`: production
- Secrets managed via Azure Key Vault

## 🔧 Local Development Alternative

If Azure deployment is blocked, you can run the complete stack locally:

```bash
# Start backend
cd backend && npm start

# Start frontend (new terminal)
cd frontend && npm run dev

# Access application at http://localhost:3000
```

## 📊 Architecture Overview

```
Internet → Application Gateway → AKS Cluster
                                ├── Frontend Pod (Next.js)
                                ├── Backend Pod (Express.js)
                                └── Ingress Controller

External Services:
├── Alchemy (Blockchain RPC)
├── Azure Container Registry
├── Azure Key Vault (Secrets)
└── Log Analytics (Monitoring)
```

## ✅ Ready for Submission

The DecentralBet platform is **fully developed** with:
- Complete blockchain prediction market functionality
- Production-ready infrastructure code
- Automated CI/CD pipeline
- Comprehensive documentation

**Only requirement**: Active Azure subscription for deployment.

---

*Last Updated: 2025-09-08*
*Status: Ready for Production Deployment*
