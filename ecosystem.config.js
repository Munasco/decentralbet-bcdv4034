module.exports = {
  apps: [
    {
      name: 'decentralbet-frontend',
      script: 'yarn',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'http://localhost:3001/api/v1',
        NEXT_PUBLIC_WS_URL: 'ws://localhost:3001',
        NEXT_PUBLIC_ALCHEMY_RPC: 'https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g',
        NEXT_PUBLIC_CHAIN_ID: '11155111',
        NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS: '0x70ff7fedDb900f9e254aEfA8b9b8f81f5d770460',
        NEXT_PUBLIC_MOCK_USDC_ADDRESS: '0xC8bAD4974f4A6Cf62B39141d79De5c875a66ee3d'
      }
    },
    {
      name: 'decentralbet-backend',
      script: 'index.js',
      cwd: './backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        MONGODB_URI: 'mongodb://localhost:27017/decentralbet_prod',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'decentralbet-jwt-secret-2024-production',
        CORS_ORIGIN: 'http://localhost:3000',
        ETHEREUM_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g'
      }
    }
  ]
};
