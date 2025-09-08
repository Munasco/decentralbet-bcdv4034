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
        NEXT_PUBLIC_API_URL: 'http://localhost:5000/api/v1',
        NEXT_PUBLIC_WS_URL: 'ws://localhost:5000',
        NEXT_PUBLIC_ALCHEMY_RPC: 'https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g'
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
        PORT: 5000,
        MONGODB_URI: 'mongodb://localhost:27017/decentralbet_prod',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'your-production-jwt-secret-here',
        CORS_ORIGIN: 'http://localhost:3000'
      }
    }
  ]
};
