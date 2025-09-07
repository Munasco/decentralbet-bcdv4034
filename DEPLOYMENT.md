# 🚀 DecentralBet Deployment Guide

Complete deployment instructions for the DecentralBet prediction markets platform.

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

## 🛠️ Prerequisites

### Required Tools
```bash
# Node.js and npm
node --version  # Should be 18+
npm --version

# Docker and Docker Compose
docker --version
docker-compose --version

# Azure CLI (for production)
az --version

# Kubernetes CLI (for production)
kubectl version --client

# Terraform (for infrastructure)
terraform --version
```

### Installation Commands
```bash
# macOS (using Homebrew)
brew install node docker docker-compose azure-cli kubernetes-cli terraform

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs docker.io docker-compose-plugin
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Windows (using Chocolatey)
choco install nodejs docker-desktop azure-cli kubernetes-cli terraform
```

## 🏠 Local Development

### Quick Start
```bash
# 1. Clone the repository
git clone <your-repo-url>
cd fullstack-blockchain-integration

# 2. Run the automated setup script
./scripts/dev-deploy.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Setup environment files
- ✅ Install dependencies
- ✅ Compile smart contracts
- ✅ Start databases (MongoDB, Redis)
- ✅ Deploy contracts to local blockchain
- ✅ Start backend and frontend servers
- ✅ Run health checks

### Manual Setup

If you prefer manual setup:

#### 1. Environment Configuration
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# Frontend  
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your values
```

#### 2. Install Dependencies
```bash
# Smart Contracts
cd smart-contracts && npm install && cd ..

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

#### 3. Start Infrastructure
```bash
# Start databases
docker-compose up -d mongodb redis

# Start local blockchain
cd smart-contracts
npx hardhat node &
```

#### 4. Deploy Smart Contracts
```bash
cd smart-contracts
npx hardhat run scripts/deploy.ts --network localhost
cd ..
```

#### 5. Start Applications
```bash
# Start backend (in new terminal)
cd backend && npm run dev

# Start frontend (in new terminal)  
cd frontend && npm run dev
```

### Service URLs
- 📱 **Frontend**: http://localhost:3000
- 🔌 **Backend API**: http://localhost:5000
- 📊 **API Health**: http://localhost:5000/health
- 📋 **API Info**: http://localhost:5000/api/v1/info
- ⛓️ **Local Blockchain**: http://localhost:8545
- 🗄️ **MongoDB**: mongodb://localhost:27017
- 🚀 **Redis**: redis://localhost:6379

### Stopping Services
```bash
./scripts/stop-dev.sh
```

## ☁️ Production Deployment

### Azure Infrastructure Setup

#### 1. Azure Login
```bash
az login
az account set --subscription "Your-Subscription-ID"
```

#### 2. Create Terraform State Storage
```bash
# Create resource group for Terraform state
az group create --name decentralbet-tfstate-rg --location "East US"

# Create storage account
az storage account create \
  --resource-group decentralbet-tfstate-rg \
  --name decentralbettfstate \
  --sku Standard_LRS \
  --encryption-services blob

# Create container
az storage container create \
  --name tfstate \
  --account-name decentralbettfstate
```

#### 3. Deploy Infrastructure
```bash
./scripts/prod-deploy.sh
```

The script will:
- ✅ Check prerequisites and Azure login
- ✅ Deploy infrastructure with Terraform
- ✅ Build and push Docker images to ACR
- ✅ Deploy applications to AKS
- ✅ Configure ingress and SSL
- ✅ Run health checks

### Manual Production Deployment

#### 1. Deploy Infrastructure
```bash
cd infrastructure
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

#### 2. Build and Push Images
```bash
# Login to ACR
az acr login --name decentralbetacr

# Build and push backend
docker build -t decentralbetacr.azurecr.io/decentralbet-backend:latest --target production ./backend
docker push decentralbetacr.azurecr.io/decentralbet-backend:latest

# Build and push frontend
docker build -t decentralbetacr.azurecr.io/decentralbet-frontend:latest --target production ./frontend
docker push decentralbetacr.azurecr.io/decentralbet-frontend:latest
```

#### 3. Deploy to Kubernetes
```bash
# Get AKS credentials
az aks get-credentials --resource-group decentralbet-rg --name decentralbet-aks

# Deploy applications
kubectl apply -f k8s/
```

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

1. **Add Repository Secrets**:
   ```
   AZURE_CREDENTIALS         # Service principal JSON
   AZURE_ACR_USERNAME        # ACR admin username
   AZURE_ACR_PASSWORD        # ACR admin password
   ```

2. **Service Principal Creation**:
   ```bash
   az ad sp create-for-rbac \
     --name "decentralbet-github-actions" \
     --role contributor \
     --scopes /subscriptions/{subscription-id}/resourceGroups/decentralbet-rg \
     --sdk-auth
   ```

3. **Pipeline Triggers**:
   - Push to `main` branch → Production deployment
   - Push to `develop` branch → Testing
   - Pull requests → Testing only

### Pipeline Stages

1. **Testing**:
   - Smart contract tests with coverage
   - Backend API tests with MongoDB/Redis
   - Frontend tests and build verification
   - Security scanning with Trivy

2. **Build & Push**:
   - Docker image builds
   - Push to Azure Container Registry
   - Image scanning and optimization

3. **Deploy**:
   - Deploy to AKS
   - Health checks
   - Smoke tests
   - Notification

## ⚙️ Environment Configuration

### Required Environment Variables

#### Backend (.env)
```bash
# Server
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb://admin:password@cosmosdb:10255/decentralbet?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@decentralbet@
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-production-jwt-secret

# Blockchain
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your-private-key

# Contracts
CONTRACT_FACTORY_ADDRESS=0x...
CONTRACT_USDC_ADDRESS=0x...
```

#### Frontend (.env.local)
```bash
# API
NEXT_PUBLIC_API_URL=https://api.decentralbet.azurewebsites.net/api/v1
NEXT_PUBLIC_WS_URL=wss://api.decentralbet.azurewebsites.net

# Blockchain
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Contracts
NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x...
```

### Azure Key Vault Integration

```bash
# Store secrets in Key Vault
az keyvault secret set --vault-name decentralbet-kv --name "mongodb-uri" --value "your-mongodb-uri"
az keyvault secret set --vault-name decentralbet-kv --name "jwt-secret" --value "your-jwt-secret"
az keyvault secret set --vault-name decentralbet-kv --name "private-key" --value "your-private-key"
```

## 🔧 Management Commands

### Kubernetes Management
```bash
# Check pod status
kubectl get pods -n decentralbet

# View logs
kubectl logs -f deployment/backend -n decentralbet
kubectl logs -f deployment/frontend -n decentralbet

# Scale deployments
kubectl scale deployment/backend --replicas=5 -n decentralbet

# Restart deployments
kubectl rollout restart deployment/backend -n decentralbet

# Port forwarding (for debugging)
kubectl port-forward svc/backend-service 5000:5000 -n decentralbet
```

### Docker Commands
```bash
# View running containers
docker ps

# View logs
docker logs decentralbet-backend
docker logs decentralbet-frontend

# Restart services
docker-compose restart backend
docker-compose restart frontend

# Clean up
docker-compose down
docker system prune -f
```

### Azure Management
```bash
# Check AKS status
az aks show --resource-group decentralbet-rg --name decentralbet-aks

# Scale node pool
az aks nodepool scale \
  --resource-group decentralbet-rg \
  --cluster-name decentralbet-aks \
  --name user \
  --node-count 5

# View ACR images
az acr repository list --name decentralbetacr
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Smart Contract Deployment Fails
```bash
# Check Hardhat configuration
cd smart-contracts
npx hardhat compile
npx hardhat test

# Verify network connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

#### 2. Backend Connection Issues
```bash
# Check database connectivity
docker exec -it decentralbet-mongodb mongosh --username admin --password password123

# Check Redis connectivity  
docker exec -it decentralbet-redis redis-cli ping

# View backend logs
tail -f backend/logs/combined.log
```

#### 3. Frontend Build Errors
```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run build

# Check environment variables
cat .env.local
```

#### 4. Kubernetes Issues
```bash
# Check cluster connectivity
kubectl cluster-info

# Check node status
kubectl get nodes

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check DNS resolution
kubectl exec -it deployment/backend -n decentralbet -- nslookup kubernetes.default
```

#### 5. CI/CD Pipeline Failures
- Verify GitHub secrets are set correctly
- Check service principal permissions
- Review build logs in GitHub Actions
- Ensure Docker images build successfully locally

### Performance Monitoring

#### Application Insights Queries
```kusto
# API response times
requests
| where timestamp > ago(1h)
| summarize avg(duration) by name
| order by avg_duration desc

# Error rates
exceptions
| where timestamp > ago(1h)
| summarize count() by type
```

#### Kubernetes Monitoring
```bash
# Resource usage
kubectl top nodes
kubectl top pods -n decentralbet

# HPA status
kubectl get hpa -n decentralbet
```

## 📈 Scaling and Optimization

### Horizontal Pod Autoscaling
```bash
# Scale based on CPU/Memory
kubectl autoscale deployment backend --cpu-percent=70 --min=2 --max=10 -n decentralbet
```

### Database Optimization
```bash
# MongoDB indexing
db.markets.createIndex({ "category": 1, "status": 1 })
db.bets.createIndex({ "user": 1, "createdAt": -1 })
```

### CDN and Caching
- Frontend assets → Azure CDN
- API responses → Redis caching
- Static content → Azure Blob Storage

## 🛡️ Security Checklist

- ✅ HTTPS/TLS enabled
- ✅ API rate limiting configured
- ✅ Database authentication enabled
- ✅ Secrets stored in Azure Key Vault
- ✅ Network security groups configured
- ✅ Container image scanning enabled
- ✅ RBAC enabled on AKS
- ✅ Regular security updates scheduled

---

**🎯 Success!** Your DecentralBet platform should now be running smoothly in both development and production environments!
