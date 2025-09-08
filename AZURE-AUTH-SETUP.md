# 🔐 Azure Authentication Setup Guide

## For Kubernetes & Terraform Deployments

You need to set up Azure service principal authentication to use the AKS and Terraform workflows.

### 1. Create Azure Service Principal

```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac --name "github-actions-sp" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth
```

### 2. Required GitHub Secrets

Add these to your repository secrets (Settings → Secrets and variables → Actions):

**For OIDC Authentication (Recommended):**
- `AZURE_CLIENT_ID` - The service principal client ID
- `AZURE_TENANT_ID` - Your Azure tenant ID  
- `AZURE_SUBSCRIPTION_ID` - Your Azure subscription ID

**For Container Registry:**
- `ACR_USERNAME` - Azure Container Registry username
- `ACR_PASSWORD` - Azure Container Registry password

### 3. Get the Values

```bash
# Get subscription ID
az account show --query id -o tsv

# Get tenant ID  
az account show --query tenantId -o tsv

# Get client ID (from service principal creation output)
# This is the "clientId" field from the JSON output above
```

### 4. Deployment Strategy

**🎯 Current Setup:**

1. **`main` branch** → **Self-hosted Runner** → **VM Deployment** 
   - Fast, simple deployment
   - Direct to http://52.191.8.251:3000

2. **`develop` branch** OR **Manual Trigger** → **AKS Deployment**
   - Full Kubernetes deployment
   - Uses Azure Container Registry
   - Terraform infrastructure management

3. **K8s/Terraform changes** → **AKS Pipeline**
   - Triggered by changes in `k8s/` or `terraform/` folders
   - Professional production environment

### 5. Usage Examples

**For VM deployment (current):**
```bash
git push origin main  # Auto-deploys to VM
```

**For AKS deployment:**
```bash
# Option 1: Push to develop branch
git checkout -b develop
git push origin develop

# Option 2: Manual trigger from GitHub Actions tab
# Go to Actions → Deploy to AKS → Run workflow

# Option 3: Update K8s/Terraform files
# Any changes to k8s/ or terraform/ folders trigger AKS deployment
```

**🎉 You now have both deployment options available!**
