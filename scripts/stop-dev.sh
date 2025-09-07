#!/bin/bash

# DecentralBet Stop Development Services Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🛑 Stopping DecentralBet Development Services"
echo "============================================="
echo ""

# Stop background processes
print_status "Stopping background processes..."

if [ -f hardhat.pid ]; then
    HARDHAT_PID=$(cat hardhat.pid)
    if kill -0 $HARDHAT_PID 2>/dev/null; then
        kill $HARDHAT_PID
        print_success "Stopped Hardhat network (PID: $HARDHAT_PID)"
    else
        print_warning "Hardhat process not running"
    fi
    rm hardhat.pid
fi

if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        print_success "Stopped backend server (PID: $BACKEND_PID)"
    else
        print_warning "Backend process not running"
    fi
    rm backend.pid
fi

if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        print_success "Stopped frontend server (PID: $FRONTEND_PID)"
    else
        print_warning "Frontend process not running"
    fi
    rm frontend.pid
fi

# Stop Docker Compose services
print_status "Stopping Docker Compose services..."
if docker-compose ps -q | grep -q .; then
    docker-compose down
    print_success "Stopped Docker Compose services"
else
    print_warning "No Docker Compose services running"
fi

# Kill any remaining Node processes on specific ports
print_status "Cleaning up any remaining processes..."

# Kill processes on port 3000 (frontend)
if lsof -ti:3000 >/dev/null 2>&1; then
    kill -9 $(lsof -ti:3000) 2>/dev/null || true
    print_success "Cleaned up processes on port 3000"
fi

# Kill processes on port 5000 (backend)
if lsof -ti:5000 >/dev/null 2>&1; then
    kill -9 $(lsof -ti:5000) 2>/dev/null || true
    print_success "Cleaned up processes on port 5000"
fi

# Kill processes on port 8545 (hardhat)
if lsof -ti:8545 >/dev/null 2>&1; then
    kill -9 $(lsof -ti:8545) 2>/dev/null || true
    print_success "Cleaned up processes on port 8545"
fi

print_success "🎯 All DecentralBet development services stopped!"
echo ""
echo "To start services again, run:"
echo "  ./scripts/dev-deploy.sh"
echo ""
