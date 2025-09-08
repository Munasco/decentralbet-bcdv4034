# Azure CI/CD Setup Instructions

## 🚀 Your CI/CD Pipeline is Ready!

The GitHub Actions workflow has been created and configured. Follow these steps to complete the setup:

## 1. Create Azure Service Principal

Since we don't have directory admin permissions, you'll need to create a service principal using the Azure Portal or ask an admin to do it:

### Option A: Azure Portal (Recommended)
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name: `github-actions-decentralbet`
5. Click **Register**
6. Go to **Certificates & secrets** → **New client secret**
7. Copy the **Value** (this is your client secret)
8. Go to **Overview** and copy:
   - Application (client) ID
   - Directory (tenant) ID

### Option B: Azure CLI (if you have admin rights)
```bash
az ad sp create-for-rbac --name "github-actions-decentralbet" \
  --role contributor \
  --scopes /subscriptions/dc2e2dae-a50e-4824-9c19-0e883f396b36 \
  --json-auth
```

## 2. Assign Permissions to Resource Group

```bash
# Replace <service-principal-object-id> with the Object ID from step 1
az role assignment create \
  --assignee <service-principal-object-id> \
  --role Contributor \
  --scope /subscriptions/dc2e2dae-a50e-4824-9c19-0e883f396b36/resourceGroups/decentralbet-rg
```

## 3. Add GitHub Secret

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `AZURE_CREDENTIALS`
5. Value (replace with your actual values):

```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "subscriptionId": "dc2e2dae-a50e-4824-9c19-0e883f396b36",
  "tenantId": "b5dc206c-17fd-4b06-8bc8-24f0bb650229"
}
```

## 4. Test the Pipeline

Once the secret is added, any push to the `main` branch will trigger the CI/CD pipeline:

1. Make a small change to any file
2. Commit and push: `git commit -am "test ci/cd" && git push`
3. Go to GitHub → **Actions** tab to see the workflow running

## 🎯 What the Pipeline Does

1. **Build & Test**: Runs tests and linting for both frontend and backend
2. **Docker Build**: Builds Docker images with correct linux/amd64 platform
3. **Push to ACR**: Pushes images to Azure Container Registry (`dbacr1757292120`)
4. **Deploy to AKS**: Updates Kubernetes manifests and deploys to AKS
5. **Smoke Tests**: Tests the deployed application endpoints
6. **Security Scan**: Runs Trivy security scanner on pull requests

## 🔧 Pipeline Features

- ✅ Automatic deployment on push to `main`
- ✅ Security scanning on pull requests  
- ✅ Smoke tests verify deployment health
- ✅ Multi-platform Docker builds
- ✅ Zero-downtime rolling updates
- ✅ Automatic image tag management

## 🌐 Your Live Application

After the pipeline runs successfully, your app will be live at:
- **Frontend**: http://20.232.231.105/
- **Backend**: http://20.232.231.105/api/
- **Health**: http://20.232.231.105/health

## 🎉 Test Change

I've added a bright badge to your homepage that says "🚀 Live on Azure Kubernetes Service" - this will be visible once the pipeline deploys!

## 📊 Monitoring

Check your deployment status:
```bash
kubectl get all -n decentralbet
kubectl get ingress -n decentralbet
kubectl logs -n decentralbet deployment/backend
kubectl logs -n decentralbet deployment/frontend
```

Your fully automated CI/CD pipeline is now ready! 🚀
