const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console logging
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Custom format for file logging
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: config.logging.level,
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true
  })
);

// File transports (only in production or if explicitly enabled)
if (config.nodeEnv === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: config.logging.logFile,
      level: config.logging.level,
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true
    })
  );

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: config.logging.errorLogFile,
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  transports,
  exitOnError: false,
  silent: config.nodeEnv === 'test' && process.env.ENABLE_TEST_LOGGING !== 'true'
});

// Add request logging method
logger.logRequest = (req, res, responseTime) => {
  const { method, url, ip } = req;
  const { statusCode } = res;
  const userAgent = req.get('User-Agent') || '';
  const userId = req.user?.id || 'anonymous';
  
  logger.info('HTTP Request', {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    ip,
    userId,
    userAgent
  });
};

// Add blockchain transaction logging method
logger.logTransaction = (txHash, type, details) => {
  logger.info('Blockchain Transaction', {
    txHash,
    type,
    details,
    timestamp: new Date().toISOString()
  });
};

// Add error logging method with context
logger.logError = (error, context = {}) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  });
};

// Add audit logging method
logger.logAudit = (action, userId, resource, details) => {
  logger.info('Audit Log', {
    action,
    userId,
    resource,
    details,
    timestamp: new Date().toISOString()
  });
};

// Add security event logging
logger.logSecurity = (event, severity, details) => {
  logger.warn('Security Event', {
    event,
    severity,
    details,
    timestamp: new Date().toISOString()
  });
};

// Log system startup
logger.info('Logger initialized', {
  level: config.logging.level,
  environment: config.nodeEnv,
  transportsCount: transports.length
});

module.exports = logger;
