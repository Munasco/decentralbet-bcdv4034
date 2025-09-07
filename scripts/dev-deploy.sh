#!/bin/bash

# DecentralBet Local Development Deployment Script
# This script sets up the entire local development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command_exists docker; then
        missing_tools+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_tools+=("docker-compose")
    fi
    
    if ! command_exists node; then
        missing_tools+=("node")
    fi
    
    if ! command_exists npm; then
        missing_tools+=("npm")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install the missing tools and run this script again."
        exit 1
    fi
    
    print_success "All prerequisites are installed!"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        print_warning "Created backend/.env from template. Please update with your values."
    else
        print_success "Backend .env file already exists"
    fi
    
    # Frontend environment
    if [ ! -f "frontend/.env.local" ]; then
        cp frontend/.env.example frontend/.env.local
        print_warning "Created frontend/.env.local from template. Please update with your values."
    else
        print_success "Frontend .env.local file already exists"
    fi
    
    # Smart contracts environment
    if [ ! -f "smart-contracts/.env" ]; then
        echo "# Smart Contracts Environment" > smart-contracts/.env
        echo "PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" >> smart-contracts/.env
        echo "INFURA_PROJECT_ID=your-infura-project-id" >> smart-contracts/.env
        print_warning "Created smart-contracts/.env with default local keys. Update INFURA_PROJECT_ID for testnet deployment."
    else
        print_success "Smart contracts .env file already exists"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Smart contracts
    print_status "Installing smart contract dependencies..."
    cd smart-contracts
    npm install
    cd ..
    
    # Backend
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Frontend
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    print_success "All dependencies installed!"
}

# Compile smart contracts
compile_contracts() {
    print_status "Compiling smart contracts..."
    cd smart-contracts
    
    # Clean previous artifacts
    npx hardhat clean
    
    # Compile contracts
    npx hardhat compile
    
    print_success "Smart contracts compiled successfully!"
    cd ..
}

# Start services with Docker Compose
start_services() {
    print_status "Starting services with Docker Compose..."
    
    # Stop any existing containers
    docker-compose down
    
    # Build and start services
    docker-compose up -d mongodb redis
    
    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    sleep 10
    
    print_success "Database services started!"
}

# Deploy smart contracts locally
deploy_contracts() {
    print_status "Starting local blockchain and deploying contracts..."
    cd smart-contracts
    
    # Start local blockchain in background
    print_status "Starting Hardhat network..."
    npx hardhat node &
    HARDHAT_PID=$!
    
    # Wait for network to be ready
    sleep 5
    
    # Deploy contracts
    print_status "Deploying smart contracts..."
    npx hardhat run scripts/deploy.ts --network localhost
    
    print_success "Smart contracts deployed to local network!"
    
    # Keep hardhat running
    print_warning "Hardhat network is running in background (PID: $HARDHAT_PID)"
    echo $HARDHAT_PID > ../hardhat.pid
    
    cd ..
}

# Start backend and frontend
start_apps() {
    print_status "Starting backend and frontend applications..."
    
    # Start backend
    print_status "Starting backend API server..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    cd ..
    
    # Wait for backend to start
    sleep 3
    
    # Start frontend
    print_status "Starting frontend application..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    
    print_success "Applications started!"
    print_success "Backend PID: $BACKEND_PID"
    print_success "Frontend PID: $FRONTEND_PID"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Wait for services to be ready
    sleep 10
    
    # Check backend health
    if curl -f http://localhost:5000/health >/dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
    fi
    
    # Check local blockchain
    if curl -f -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545 >/dev/null 2>&1; then
        print_success "Local blockchain health check passed"
    else
        print_error "Local blockchain health check failed"
    fi
}

# Display service URLs
show_urls() {
    print_success "🚀 DecentralBet is running!"
    echo ""
    echo "📱 Frontend:          http://localhost:3000"
    echo "🔌 Backend API:       http://localhost:5000"
    echo "📊 API Health:        http://localhost:5000/health"
    echo "📋 API Info:          http://localhost:5000/api/v1/info"
    echo "⛓️  Local Blockchain:  http://localhost:8545"
    echo "🗄️  MongoDB:          mongodb://localhost:27017"
    echo "🚀 Redis:             redis://localhost:6379"
    echo ""
    echo "📝 Logs:"
    echo "   Backend:           tail -f backend/logs/combined.log"
    echo "   Smart Contracts:   Check smart-contracts/logs/"
    echo ""
    echo "🛑 To stop all services:"
    echo "   ./scripts/stop-dev.sh"
    echo ""
}

# Cleanup function for interruption
cleanup() {
    print_warning "Received interrupt signal. Cleaning up..."
    
    # Kill background processes
    if [ -f hardhat.pid ]; then
        kill $(cat hardhat.pid) 2>/dev/null || true
        rm hardhat.pid
    fi
    
    if [ -f backend.pid ]; then
        kill $(cat backend.pid) 2>/dev/null || true
        rm backend.pid
    fi
    
    if [ -f frontend.pid ]; then
        kill $(cat frontend.pid) 2>/dev/null || true
        rm frontend.pid
    fi
    
    # Stop Docker services
    docker-compose down
    
    exit 1
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Main deployment flow
main() {
    echo "🎲 DecentralBet Local Development Deployment"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    setup_environment
    install_dependencies
    compile_contracts
    start_services
    deploy_contracts
    start_apps
    health_check
    show_urls
    
    print_success "Deployment completed successfully!"
    print_warning "Press Ctrl+C to stop all services"
    
    # Keep script running to handle cleanup
    while true; do
        sleep 1
    done
}

# Run main function
main "$@"
