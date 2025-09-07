const logger = require('../utils/logger');

/**
 * Role-based authorization middleware
 * @param {Array} roles - Array of allowed roles
 */
const authorize = (roles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No user found.'
        });
      }

      // Check if user has required role
      if (!roles.includes(req.user.role)) {
        logger.warn(`Authorization failed: User ${req.user.id} with role ${req.user.role} attempted to access ${req.path}`);
        
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
        });
      }

      // Check if user account is active
      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Account is deactivated.'
        });
      }

      next();
      
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during authorization'
      });
    }
  };
};

module.exports = authorize;
