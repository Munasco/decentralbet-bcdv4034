#!/bin/bash

# DecentralBet Private Blockchain Setup
# A simple Ethereum-compatible private network for demonstration

set -e

echo "🚀 Setting up DecentralBet Private Blockchain Network..."

# Create directories
mkdir -p ./private-chain/{node1,node2,node3,data}
cd ./private-chain

# Create genesis configuration
cat > genesis.json << 'EOF'
{
  "config": {
    "chainId": 1337420,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "berlinBlock": 0,
    "londonBlock": 0,
    "clique": {
      "period": 5,
      "epoch": 30000
    }
  },
  "difficulty": "0x1",
  "gasLimit": "0x8000000",
  "extradata": "0x0000000000000000000000000000000000000000000000000000000000000000b5d4f6f97c4beabd3df1b5b0cb77b4e1e4b8c9d20000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "alloc": {
    "0xb5d4f6f97c4beabd3df1b5b0cb77b4e1e4b8c9d2": {
      "balance": "0x21e19e0c9bab2400000"
    },
    "0x3f17f1962B36e491b30A40b2405849e597Ba5FB5": {
      "balance": "0x21e19e0c9bab2400000"  
    },
    "0x8965349fb649A33a30d90D4956C43a10cb24a2D0": {
      "balance": "0x21e19e0c9bab2400000"
    }
  }
}
EOF

# Create password files
echo "password123" > node1/password.txt
echo "password123" > node2/password.txt  
echo "password123" > node3/password.txt

# Initialize nodes
echo "📦 Initializing blockchain nodes..."

# Check if geth is available
if ! command -v geth &> /dev/null; then
    echo "❌ Geth not found. Installing via Homebrew..."
    brew tap ethereum/ethereum
    brew install ethereum
fi

# Initialize each node
geth --datadir ./node1 init genesis.json
geth --datadir ./node2 init genesis.json
geth --datadir ./node3 init genesis.json

# Create start script for node 1 (bootnode + validator)
cat > start-node1.sh << 'EOF'
#!/bin/bash
geth --datadir ./node1 \
     --networkid 1337420 \
     --port 30301 \
     --http \
     --http.addr "0.0.0.0" \
     --http.port 8541 \
     --http.corsdomain "*" \
     --http.api "eth,net,web3,personal,miner,admin" \
     --ws \
     --ws.addr "0.0.0.0" \
     --ws.port 8551 \
     --ws.origins "*" \
     --ws.api "eth,net,web3" \
     --mine \
     --miner.threads 1 \
     --miner.etherbase "0xb5d4f6f97c4beabd3df1b5b0cb77b4e1e4b8c9d2" \
     --unlock "0xb5d4f6f97c4beabd3df1b5b0cb77b4e1e4b8c9d2" \
     --password ./node1/password.txt \
     --allow-insecure-unlock \
     --nodiscover \
     --verbosity 3 \
     --console
EOF

# Create start script for node 2
cat > start-node2.sh << 'EOF'
#!/bin/bash  
geth --datadir ./node2 \
     --networkid 1337420 \
     --port 30302 \
     --http \
     --http.addr "0.0.0.0" \
     --http.port 8542 \
     --http.corsdomain "*" \
     --http.api "eth,net,web3,personal,miner" \
     --bootnodes "enode://BOOTNODE_ENODE_HERE@127.0.0.1:30301" \
     --mine \
     --miner.threads 1 \
     --miner.etherbase "0x3f17f1962B36e491b30A40b2405849e597Ba5FB5" \
     --unlock "0x3f17f1962B36e491b30A40b2405849e597Ba5FB5" \
     --password ./node2/password.txt \
     --allow-insecure-unlock \
     --verbosity 3
EOF

# Create start script for node 3  
cat > start-node3.sh << 'EOF'
#!/bin/bash
geth --datadir ./node3 \
     --networkid 1337420 \
     --port 30303 \
     --http \
     --http.addr "0.0.0.0" \
     --http.port 8543 \
     --http.corsdomain "*" \
     --http.api "eth,net,web3,personal,miner" \
     --bootnodes "enode://BOOTNODE_ENODE_HERE@127.0.0.1:30301" \
     --mine \
     --miner.threads 1 \
     --miner.etherbase "0x8965349fb649A33a30d90D4956C43a10cb24a2D0" \
     --unlock "0x8965349fb649A33a30d90D4956C43a10cb24a2D0" \
     --password ./node3/password.txt \
     --allow-insecure-unlock \
     --verbosity 3
EOF

# Make scripts executable
chmod +x start-node1.sh start-node2.sh start-node3.sh

# Create docker-compose for easier management
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  bootnode:
    image: ethereum/client-go:stable
    container_name: decentralbet-bootnode
    ports:
      - "8541:8545"
      - "30301:30303"
    volumes:
      - ./node1:/data
      - ./genesis.json:/genesis.json
    command: |
      sh -c "
        geth init /genesis.json --datadir /data &&
        geth --datadir /data \
             --networkid 1337420 \
             --port 30303 \
             --http --http.addr 0.0.0.0 \
             --http.corsdomain '*' \
             --http.api eth,net,web3,personal,miner,admin \
             --mine --miner.threads 1 \
             --miner.etherbase 0xb5d4f6f97c4beabd3df1b5b0cb77b4e1e4b8c9d2 \
             --allow-insecure-unlock \
             --nodiscover
      "
    networks:
      - blockchain

  validator1:
    image: ethereum/client-go:stable  
    container_name: decentralbet-validator1
    ports:
      - "8542:8545"
    volumes:
      - ./node2:/data
      - ./genesis.json:/genesis.json
    command: |
      sh -c "
        sleep 10 &&
        geth init /genesis.json --datadir /data &&
        geth --datadir /data \
             --networkid 1337420 \
             --port 30303 \
             --http --http.addr 0.0.0.0 \
             --http.corsdomain '*' \
             --http.api eth,net,web3,personal,miner \
             --bootnodes enode://DISCOVER_FROM_BOOTNODE \
             --mine --miner.threads 1 \
             --allow-insecure-unlock
      "
    depends_on:
      - bootnode
    networks:
      - blockchain

networks:
  blockchain:
    driver: bridge
EOF

# Create monitoring script
cat > monitor.sh << 'EOF'  
#!/bin/bash
echo "🔍 DecentralBet Private Blockchain Status:"
echo "=========================================="

for port in 8541 8542 8543; do
    if curl -s http://localhost:$port > /dev/null; then
        echo "✅ Node on port $port: ONLINE"
        
        # Get block number
        block_num=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            http://localhost:$port | jq -r '.result')
        
        echo "   Latest block: $((16#${block_num:2}))"
        
        # Get peer count
        peer_count=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' \
            http://localhost:$port | jq -r '.result')
            
        echo "   Connected peers: $((16#${peer_count:2}))"
        echo
    else
        echo "❌ Node on port $port: OFFLINE"
        echo
    fi
done
EOF

chmod +x monitor.sh

# Create README
cat > README.md << 'EOF'
# DecentralBet Private Blockchain Network

## Overview
This is a 3-node Ethereum-compatible private blockchain network for DecentralBet development and testing.

## Network Details
- **Chain ID**: 1337420
- **Consensus**: Clique (Proof of Authority)  
- **Block time**: 5 seconds
- **Pre-funded accounts**: 3 validators with 10,000 ETH each

## Nodes
- **Node 1 (Bootnode)**: http://localhost:8541
- **Node 2 (Validator)**: http://localhost:8542  
- **Node 3 (Validator)**: http://localhost:8543

## Quick Start

### Option 1: Native Geth
```bash
# Start each node in separate terminals
./start-node1.sh
./start-node2.sh  
./start-node3.sh
```

### Option 2: Docker Compose
```bash
docker-compose up -d
./monitor.sh
```

## Connect Your DApp
```javascript
// Update your frontend to connect to private chain
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8541');

// Chain ID for MetaMask
Network Name: DecentralBet Private
New RPC URL: http://localhost:8541
Chain ID: 1337420
Currency Symbol: ETH
```

## Validator Addresses
```
0xb5d4f6f97c4beabd3df1b5b0cb77b4e1e4b8c9d2  (Node 1)
0x3f17f1962B36e491b30A40b2405849e597Ba5FB5  (Node 2)  
0x8965349fb649A33a30d90D4956C43a10cb24a2D0  (Node 3)
```

## Monitoring
```bash
./monitor.sh  # Check network status
```
EOF

echo "✅ DecentralBet Private Blockchain setup complete!"
echo ""
echo "📁 Created files:"
echo "   - genesis.json (network configuration)"
echo "   - start-node*.sh (node startup scripts)" 
echo "   - docker-compose.yml (containerized setup)"
echo "   - monitor.sh (network monitoring)"
echo "   - README.md (documentation)"
echo ""
echo "🚀 To start your private blockchain:"
echo "   Option 1: ./start-node1.sh (then start other nodes)"
echo "   Option 2: docker-compose up -d"
echo ""
echo "🔗 Your private network will be available at:"
echo "   - http://localhost:8541 (primary node)"
echo "   - http://localhost:8542 (validator 1)"  
echo "   - http://localhost:8543 (validator 2)"
echo ""
echo "💡 This demonstrates enterprise blockchain infrastructure knowledge!"
