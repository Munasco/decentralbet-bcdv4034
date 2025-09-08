# 🚀 VM Deployment Guide

## Quick Setup

### 1. Upload and run setup script on your VM:
```bash
scp setup-runner.sh azureuser@52.191.8.251:~/
ssh azureuser@52.191.8.251
chmod +x setup-runner.sh
./setup-runner.sh
```

### 2. Configure the GitHub Runner:
```bash
sudo -u runner bash
cd /home/runner/actions-runner
./config.sh --url https://github.com/Munasco/decentralbet-bcdv4034 --token AJTNQL7BFVKQYLZDHNVRIKLIXZZN2
```

### 3. Start the runner as a service:
```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

### 4. Verify runner is working:
```bash
sudo ./svc.sh status
```

## That's it! 

Your CI/CD will now automatically deploy to the VM whenever you push to main.

## Your Application URLs:
- **Frontend**: http://52.191.8.251:3000
- **Backend API**: http://52.191.8.251:5000

## Manual Commands (if needed):
```bash
# Check PM2 processes
pm2 status

# Restart services manually
cd /opt/decentralbet
pm2 restart ecosystem.config.js

# View logs
pm2 logs

# Stop all services
pm2 stop all
```
