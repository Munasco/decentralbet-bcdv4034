# BCDV-4034 Final Project - DecentralBet DApp

## Project Overview
A blockchain-based prediction market platform built with Next.js frontend, Node.js backend, MongoDB database, Redis cache, and Ethereum smart contracts.

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js (React)
- **Backend**: Node.js with Express
- **Database**: MongoDB & Redis
- **Blockchain**: Ethereum/Hardhat (local) / Polygon (production)
- **Infrastructure**: Azure AKS, Terraform
- **Containerization**: Docker & Docker Compose

## Infrastructure as Code

### Terraform Configuration
✅ **Completed**: Full Terraform configuration for Azure infrastructure including:

1. **Resource Group**: Using existing `rg-aks-final`
2. **Container Registry**: Azure Container Registry for Docker images
3. **Virtual Network**: VNet with subnets for AKS and private services
4. **AKS Cluster**: Kubernetes cluster with auto-scaling node pools
5. **CosmosDB**: MongoDB-compatible database service
6. **Key Vault**: Secure secrets management
7. **Monitoring**: Log Analytics and Application Insights

### Infrastructure Modules Created:
- `modules/container_registry/` - Azure Container Registry
- `modules/networking/` - VNet and subnet configuration
- `modules/aks/` - Azure Kubernetes Service
- `modules/mongodb/` - CosmosDB with MongoDB API
- `modules/key_vault/` - Azure Key Vault
- `modules/monitoring/` - Log Analytics and Application Insights

### Terraform Validation
```bash
terraform init    # ✅ SUCCESS
terraform plan     # ✅ SUCCESS - Shows 20+ resources to be created
```

## Local Development Environment

### Successfully Running Services:
1. **MongoDB**: Running on localhost:27017
2. **Redis**: Running on localhost:6379  
3. **Hardhat Blockchain**: Running on localhost:8545 (Chain ID: 1337)
4. **Backend API**: Running on localhost:5000
5. **Frontend**: Running on localhost:3000

### Smart Contracts Deployed:
- **PredictionMarket.sol**: Contract address configured
- **Network**: Local Hardhat node (development)

## Application Features

### Core Functionality:
- ✅ Market creation and management
- ✅ Betting/prediction placement
- ✅ Real-time market data
- ✅ User authentication
- ✅ Blockchain integration
- ✅ Responsive UI design

### Database Collections:
- `users` - User profiles and authentication
- `markets` - Prediction markets data
- `bets` - User betting records

## Deployment Strategy

### Production Readiness:
1. **Docker Images**: Configured for backend/frontend
2. **Kubernetes Manifests**: Available in `k8s/` directory
3. **CI/CD Pipeline**: GitHub Actions workflow configured
4. **Environment Configuration**: Separate configs for dev/prod

### Blockchain Network Options:
- **Development**: Local Hardhat (current setup)
- **Production**: Polygon Mumbai testnet or Ethereum Sepolia
- **Infrastructure**: External RPC providers (Infura/Alchemy)

## Challenges and Solutions

### Subscription Limitations:
**Issue**: Azure for Students subscription marked as read-only
**Solution**: 
1. Comprehensive infrastructure code developed
2. Local development environment fully functional
3. All deployment configurations prepared
4. Documentation shows production-ready setup

### Technical Achievements:
- ✅ Complete Terraform infrastructure code
- ✅ Working local blockchain development setup
- ✅ Full-stack application integration
- ✅ Container and Kubernetes configurations
- ✅ CI/CD pipeline preparation

## Screenshots & Evidence

### 1. Terraform Infrastructure
- Terraform modules successfully created
- Configuration validates without errors
- Resources planned for deployment

### 2. Local Development
- All services running locally
- Smart contracts deployed on Hardhat
- Frontend connecting to backend successfully

### 3. Application Functionality
- Market creation interface
- Betting placement system
- Real-time data updates

## Future Production Deployment

When subscription access is restored:
1. `terraform apply` - Deploy infrastructure
2. Build and push Docker images to ACR
3. Deploy to AKS using kubectl
4. Configure testnet blockchain connection
5. Update DNS and SSL certificates

## Conclusion

This project demonstrates:
- **Infrastructure as Code**: Complete Terraform setup
- **Blockchain Development**: Smart contracts and Web3 integration
- **Full-Stack Development**: End-to-end application
- **DevOps Practices**: Containerization and CI/CD
- **Cloud Architecture**: Production-ready Azure infrastructure

The project is fully developed and deployment-ready, with only Azure subscription access preventing live deployment.
