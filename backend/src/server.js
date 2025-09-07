const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Internal imports
const config = require('./config/config');
const database = require('./config/database');
const logger = require('./utils/logger');
const blockchainService = require('./services/blockchainService');
const MarketSocketEvents = require('./sockets/marketEvents');
const oracleService = require('./services/oracleService');

// Create Express app
const app = express();

// Create HTTP server
const server = createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: config.socket.corsOrigin,
    methods: ["GET", "POST"]
  }
});

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS middleware
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const blockchainHealth = await blockchainService.healthCheck();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: config.api.version,
      services: {
        database: dbHealth,
        blockchain: blockchainHealth
      }
    };
    
    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API info endpoint
app.get('/api/v1/info', (req, res) => {
  res.json({
    name: 'DecentralBet API',
    version: config.api.version,
    environment: config.nodeEnv,
    description: 'Prediction Markets Platform with Blockchain Integration',
    endpoints: {
      auth: `${config.api.prefix}/auth`,
      markets: `${config.api.prefix}/markets`,
      bets: `${config.api.prefix}/bets`,
      oracle: `${config.api.prefix}/oracle`,
      users: `${config.api.prefix}/users`,
      dashboard: `${config.api.prefix}/dashboard`
    },
    features: {
      realTimeUpdates: true,
      blockchainIntegration: true,
      oracleResolution: true,
      webSockets: true
    },
    documentation: '/api-docs',
    health: '/health',
    websocket: true
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  // Initialize market events handler
  const marketEvents = new MarketSocketEvents(io, socket);
  marketEvents.init();
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
    marketEvents.cleanup();
  });
});

// Make io available to routes
app.set('socketio', io);

// API routes
app.use(config.api.prefix + '/auth', require('./routes/auth'));
app.use(config.api.prefix + '/markets', require('./routes/markets'));
app.use(config.api.prefix + '/bets', require('./routes/bets'));
app.use(config.api.prefix + '/oracle', require('./routes/oracle'));
app.use(config.api.prefix + '/users', require('./routes/users'));
app.use(config.api.prefix + '/dashboard', require('./routes/dashboard'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The route ${req.method} ${req.originalUrl} does not exist`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  
  // Don't leak error details in production
  const errorMessage = config.nodeEnv === 'production' 
    ? 'Internal server error' 
    : error.message;
  
  res.status(error.status || 500).json({
    success: false,
    error: errorMessage,
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown handler
const gracefulShutdown = async () => {
  logger.info('🛑 Graceful shutdown initiated...');
  
  server.close(() => {
    logger.info('🔌 HTTP server closed');
  });
  
  // Close database connection
  try {
    await database.disconnect();
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
  
  // Clean up blockchain service
  try {
    blockchainService.removeAllListeners();
  } catch (error) {
    logger.error('Error cleaning up blockchain service:', error);
  }
  
  logger.info('👋 Server shutdown complete');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
// Connect to database (optional for caching only)
    try {
      await database.connect();
      logger.info('📄 Database connected for caching');
    } catch (error) {
      logger.warn('⚠️ Database connection failed - continuing without caching:', error.message);
    }
    
    // Initialize blockchain service (optional, continues if failed)
    try {
      await blockchainService.initialize();
    } catch (error) {
      logger.warn('⚠️  Blockchain service initialization failed, continuing with limited functionality');
    }
    
    // Initialize oracle service
    try {
      await oracleService.initialize();
      logger.info('🔮 Oracle service initialized successfully');
    } catch (error) {
      logger.warn('⚠️  Oracle service initialization failed, continuing with limited functionality');
    }
    
    // Start HTTP server
    server.listen(config.port, () => {
      logger.info(`🚀 Server started successfully`);
      logger.info(`📡 HTTP Server: http://localhost:${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🔌 WebSocket Server: ws://localhost:${config.port}`);
      logger.info(`📋 Health Check: http://localhost:${config.port}/health`);
      logger.info(`📋 API Info: http://localhost:${config.port}/api/v1/info`);
      
      if (config.nodeEnv === 'development') {
        logger.info('🛠️  Development mode - detailed logs enabled');
      }
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = { app, server, io };
