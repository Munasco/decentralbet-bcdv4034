# Self-Hosted CI/CD Setup for DecentralBet

Since you have Azure VMs and don't have Azure AD access, here are two approaches for CI/CD:

## 🚀 Option 1: Simple Script Deployment (Ready Now!)

### Quick Deploy
You can immediately deploy by running this script on your Azure VM:

```bash
# Copy the script to your VM
scp scripts/simple-cicd.sh your-vm-user@your-vm-ip:/tmp/

# SSH to your VM and run
ssh your-vm-user@your-vm-ip
sudo chmod +x /tmp/simple-cicd.sh
sudo /tmp/simple-cicd.sh
```

### What it does:
- ✅ Pulls latest code from GitHub
- ✅ Builds Docker images with correct platform
- ✅ Pushes to your ACR (`dbacr1757292120`)
- ✅ Deploys to your AKS cluster
- ✅ Runs smoke tests
- ✅ Shows deployment status

## 🤖 Option 2: GitHub Self-Hosted Runner (Automated)

### Step 1: Set up GitHub Runner on your Azure VM

1. **SSH to your Azure VM**:
```bash
# Replace with your actual VM details
az vm show --resource-group RG-TERRAFORM-DEMO --name demo-vm-vm --show-details --query publicIps -o tsv
ssh azureuser@<your-vm-ip>
```

2. **Install GitHub Runner**:
```bash
# Create a folder for the runner
mkdir actions-runner && cd actions-runner

# Download the latest runner package
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract the installer
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Go to your GitHub repo -> Settings -> Actions -> Runners -> New self-hosted runner
# Follow the instructions to get your token

# Configure the runner
./config.sh --url https://github.com/Munasco/decentralbet-bcdv4034 --token YOUR_GITHUB_TOKEN

# Install as a service
sudo ./svc.sh install
sudo ./svc.sh start
```

3. **Install Prerequisites on the Runner VM**:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Login to Azure (will store credentials)
az login --use-device-code

# Get AKS credentials (will be cached)
az aks get-credentials --resource-group decentralbet-rg --name decentralbet-aks --admin
```

### Step 2: Test the GitHub Runner

Once your runner is set up, the updated workflow will automatically use it:

```bash
# Make a small change to test
echo "# CI/CD Test $(date)" >> README.md
git add README.md
git commit -m "test: self-hosted runner deployment"
git push origin main
```

## 🎯 Workflow Features

Both approaches provide:

- ✅ **Automated builds** with correct linux/amd64 platform
- ✅ **Push to ACR** (`dbacr1757292120.azurecr.io`)
- ✅ **Deploy to AKS** with rolling updates
- ✅ **Smoke tests** to verify deployment
- ✅ **Status reporting** with pod/service info

## 🌐 Your Live Application

After deployment, your app will be live at:
- **Frontend**: http://20.232.231.105/
- **Backend API**: http://20.232.231.105/api/
- **Health Check**: http://20.232.231.105/health

## 🔧 Manual Deployment Options

### Option A: Run the Script Manually
```bash
# On your Azure VM
wget https://raw.githubusercontent.com/Munasco/decentralbet-bcdv4034/main/scripts/simple-cicd.sh
chmod +x simple-cicd.sh
sudo ./simple-cicd.sh
```

### Option B: Use the GitHub Workflow
The workflow is already configured for self-hosted runners. Just push to main!

### Option C: Deploy from Local Machine
```bash
# From your current machine
./scripts/simple-cicd.sh
```

## 🛠️ Troubleshooting

### Check Runner Status
```bash
# On the VM
cd actions-runner
sudo ./svc.sh status
```

### View Runner Logs
```bash
# On the VM
cd actions-runner
sudo ./svc.sh status
tail -f _diag/Runner_*.log
```

### Manual Deploy Test
```bash
# Test the simple script
./scripts/simple-cicd.sh
```

## 🎉 Ready to Go!

Your CI/CD pipeline is now configured for self-hosted deployment! 

- **Immediate**: Use the simple script approach
- **Automated**: Set up the GitHub runner for full automation

Both will deploy your DecentralBet app with the "🚀 Live on Azure Kubernetes Service" badge visible!
