/**
 * Mock authentication middleware for development
 * TODO: Implement real JWT validation in production
 */

const auth = (req, res, next) => {
  try {
    // Mock user for development
    req.user = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'trader'
    };
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = auth;
