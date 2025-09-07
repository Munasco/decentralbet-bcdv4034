const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getMarkets,
  getMarket,
  createMarket,
  getTrendingMarkets,
  getMarketsByCategory,
  updateMarket,
  getMarketStats
} = require('../controllers/marketController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Public routes
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(['Politics', 'Sports', 'Crypto', 'Economics', 'Entertainment', 'Technology', 'Other']),
  query('status').optional().isIn(['active', 'resolved', 'ending-soon']),
  query('sort').optional().isIn(['recent', 'volume', 'ending-soon', 'popular']),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('featured').optional().isBoolean()
], getMarkets);

router.get('/trending', [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('timeframe').optional().isInt({ min: 1, max: 168 }) // Max 1 week
], getTrendingMarkets);

router.get('/stats', getMarketStats);

router.get('/category/:category', [
  param('category').isIn(['Politics', 'Sports', 'Crypto', 'Economics', 'Entertainment', 'Technology', 'Other']),
  query('limit').optional().isInt({ min: 1, max: 100 })
], getMarketsByCategory);

router.get('/:id', [
  param('id').isMongoId()
], getMarket);

// Protected routes
router.post('/', [
  auth,
  authorize(['market_creator', 'admin']),
  body('question').isLength({ min: 10, max: 500 }).withMessage('Question must be 10-500 characters'),
  body('description').optional().isLength({ max: 2000 }),
  body('category').isIn(['Politics', 'Sports', 'Crypto', 'Economics', 'Entertainment', 'Technology', 'Other']),
  body('subcategory').optional().isLength({ max: 100 }),
  body('outcomes').isArray({ min: 2, max: 10 }).withMessage('Must have 2-10 outcomes'),
  body('outcomes.*').isLength({ min: 1, max: 200 }).withMessage('Outcome descriptions must be 1-200 characters'),
  body('endTime').isISO8601().withMessage('End time must be valid date').custom((value) => {
    const endTime = new Date(value);
    const now = new Date();
    const minEnd = new Date(now.getTime() + 60 * 60 * 1000); // At least 1 hour from now
    const maxEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // Max 1 year
    
    if (endTime < minEnd) throw new Error('End time must be at least 1 hour in the future');
    if (endTime > maxEnd) throw new Error('End time cannot be more than 1 year in the future');
    return true;
  }),
  body('imageUrl').optional().isURL(),
  body('tags').optional().isArray({ max: 10 }),
  body('tags.*').optional().isLength({ min: 1, max: 50 }),
  body('feePercentage').optional().isFloat({ min: 0, max: 10 }),
  body('oracleSource').optional().isLength({ max: 200 }),
  body('region').optional().isLength({ max: 100 })
], createMarket);

router.put('/:id', [
  auth,
  authorize(['admin']),
  param('id').isMongoId(),
  body('description').optional().isLength({ max: 2000 }),
  body('imageUrl').optional().isURL(),
  body('tags').optional().isArray({ max: 10 }),
  body('tags.*').optional().isLength({ min: 1, max: 50 }),
  body('isVerified').optional().isBoolean(),
  body('isPaused').optional().isBoolean(),
  body('oracleSource').optional().isLength({ max: 200 }),
  body('resolutionSource').optional().isLength({ max: 200 })
], updateMarket);

module.exports = router;
