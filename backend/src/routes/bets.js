const express = require('express');
const { body, param, query } = require('express-validator');
const {
  placeBet,
  getUserBets,
  getBet,
  claimWinnings,
  getMarketActivity,
  getBettingStats,
  getUnclaimedWinnings
} = require('../controllers/betController');
const auth = require('../middleware/auth');

const router = express.Router();

// All bet routes require authentication
router.use(auth);

// Place a new bet
router.post('/', [
  body('marketId').isMongoId().withMessage('Valid market ID required'),
  body('outcomeId').isInt({ min: 1, max: 10 }).withMessage('Valid outcome ID required'),
  body('amount').isFloat({ min: 0.01, max: 10000 }).withMessage('Amount must be between 0.01 and 10,000')
], placeBet);

// Get user's bets
router.get('/my-bets', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'confirmed', 'failed']),
  query('marketId').optional().isMongoId()
], getUserBets);

// Get user betting statistics
router.get('/stats', getBettingStats);

// Get unclaimed winnings
router.get('/unclaimed', getUnclaimedWinnings);

// Get market betting activity (public access through auth)
router.get('/market/:marketId/activity', [
  param('marketId').isMongoId(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('timeframe').optional().isInt({ min: 1, max: 168 })
], getMarketActivity);

// Get single bet details
router.get('/:id', [
  param('id').isMongoId()
], getBet);

// Claim winnings from a bet
router.post('/:id/claim', [
  param('id').isMongoId()
], claimWinnings);

module.exports = router;
