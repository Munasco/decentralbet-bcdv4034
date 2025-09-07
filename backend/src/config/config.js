const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/decentralvote',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/decentralvote_test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0
    }
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
    expire: process.env.JWT_EXPIRE || '30d',
    cookieExpire: process.env.JWT_COOKIE_EXPIRE || 30
  },
  
  // Ethereum Configuration
  ethereum: {
    network: process.env.ETHEREUM_NETWORK || 'localhost',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
    sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL || '',
    privateKey: process.env.PRIVATE_KEY || '',
    gasLimit: process.env.GAS_LIMIT || 3000000,
    gasPrice: process.env.GAS_PRICE || '20000000000', // 20 gwei
  },
  
  // Smart Contract Addresses
  contracts: {
    votingContract: process.env.VOTING_CONTRACT_ADDRESS || '',
    electionFactory: process.env.ELECTION_FACTORY_ADDRESS || ''
  },
  
  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logFile: process.env.LOG_FILE || 'logs/combined.log',
    errorLogFile: process.env.ERROR_LOG_FILE || 'logs/error.log'
  },
  
  // Socket.IO Configuration
  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000'
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '5MB',
    uploadPath: process.env.UPLOAD_PATH || 'uploads/'
  },
  
  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    }
  },
  
  // Admin Configuration
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@decentralvote.com',
    password: process.env.ADMIN_PASSWORD || 'DefaultAdminPass123!'
  },
  
  // API Configuration
  api: {
    prefix: '/api/v1',
    version: '1.0.0'
  }
};

// Validation for required environment variables
const requiredEnvVars = ['JWT_SECRET'];

if (config.nodeEnv === 'production') {
  requiredEnvVars.push(
    'MONGODB_URI',
    'VOTING_CONTRACT_ADDRESS',
    'ELECTION_FACTORY_ADDRESS'
  );
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Required environment variable ${envVar} is missing`);
    process.exit(1);
  }
}

// Log configuration in development
if (config.nodeEnv === 'development') {
  console.log('📋 Server Configuration:');
  console.log(`   Port: ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Database URI: ${config.database.uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`);
  console.log(`   Ethereum Network: ${config.ethereum.network}`);
  console.log(`   CORS Origin: ${config.security.corsOrigin}`);
}

module.exports = config;
