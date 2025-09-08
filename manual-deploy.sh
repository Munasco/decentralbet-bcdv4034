#!/bin/bash

# Manual deployment script for DecentralBet
# Use this for testing deployments without pushing to GitHub

set -e

echo "🚀 Manual DecentralBet Deployment"
echo "=================================="

echo "📥 Pulling latest changes..."
cd /opt/decentralbet
git pull origin main

echo "🏗️ Building frontend..."
cd frontend
rm -f package-lock.json
yarn install --frozen-lockfile
yarn build

echo "🏗️ Building backend..."
cd ../backend
rm -f package-lock.json
npm install

echo "🔄 Restarting services..."
cd ..
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

echo "⏳ Waiting for services to start..."
sleep 10

echo "📊 Service status:"
pm2 status

echo "🔍 Health checks:"
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: http://52.191.8.251:3000"
else
    echo "❌ Frontend health check failed"
fi

if curl -s http://localhost:5000 | grep -q "Cannot GET\|Error\|html"; then
    echo "✅ Backend: http://52.191.8.251:5000"
else
    echo "❌ Backend health check failed"
fi

echo "🎉 Manual deployment complete!"
