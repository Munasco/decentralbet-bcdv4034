#!/bin/bash

# Setup VM as GitHub Self-Hosted Runner
# Run this on your Azure VM: ssh azureuser@52.191.8.251

set -e

echo "🚀 Setting up VM as GitHub Self-Hosted Runner..."

# Update system
sudo apt update

# Install required dependencies
sudo apt install -y curl git build-essential

# Create runner user if doesn't exist
if ! id "runner" &>/dev/null; then
    sudo useradd -m -s /bin/bash runner
    sudo usermod -aG sudo runner
fi

# Switch to runner user directory
sudo -u runner bash << 'EOF'
cd /home/runner

# Create a folder
mkdir actions-runner && cd actions-runner

# Download the latest runner package
curl -o actions-runner-linux-x64-2.328.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz

# Optional: Validate the hash
echo "01066fad3a2893e63e6ca880ae3a1fad5bf9329d60e77ee15f2b97c148c3cd4e  actions-runner-linux-x64-2.328.0.tar.gz" | shasum -a 256 -c

# Extract the installer
tar xzf ./actions-runner-linux-x64-2.328.0.tar.gz

# Make runner executable
chmod +x ./config.sh ./run.sh
EOF

echo "✅ Runner files downloaded and extracted"
echo ""
echo "🔧 Next steps:"
echo "1. Go to your GitHub repo: https://github.com/Munasco/decentralbet-bcdv4034/settings/actions/runners"
echo "2. Click 'New self-hosted runner'"
echo "3. Select Linux x64"
echo "4. Copy the config command and run it as the runner user:"
echo "   sudo -u runner bash"
echo "   cd /home/runner"
echo "   # paste the config command from GitHub here"
echo ""
echo "5. Install and start the runner service:"
echo "   sudo ./svc.sh install"
echo "   sudo ./svc.sh start"
echo ""
echo "🚀 Ready to configure! Run these commands as the runner user:"
echo "sudo -u runner bash"
echo "cd /home/runner/actions-runner"
echo "./config.sh --url https://github.com/Munasco/decentralbet-bcdv4034 --token AJTNQL7BFVKQYLZDHNVRIKLIXZZN2"
echo ""
echo "Then start the runner:"
echo "./run.sh"
echo ""
echo "Or install as service:"
echo "sudo ./svc.sh install"
echo "sudo ./svc.sh start"
