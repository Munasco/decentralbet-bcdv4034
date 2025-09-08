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

# Download GitHub Actions Runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract it
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

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
echo "Example config command (replace with your actual token):"
echo "./config.sh --url https://github.com/Munasco/decentralbet-bcdv4034 --token YOUR_TOKEN_HERE"
