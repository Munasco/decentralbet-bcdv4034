const express = require('express');
const router = express.Router();

const DashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');
const { validateQuery } = require('../middleware/validation');

/**
 * @route   GET /api/v1/dashboard
 * @desc    Get comprehensive user dashboard data
 * @access  Private
 */
router.get('/', 
  auth, 
  DashboardController.getUserDashboard
);

/**
 * @route   GET /api/v1/dashboard/analytics
 * @desc    Get market performance analytics by category/timeframe
 * @access  Private
 * @query   {string} category - Market category filter (optional)
 * @query   {string} timeframe - Time period (7d, 30d, 90d, 1y)
 */
router.get('/analytics',
  auth,
  validateQuery([
    {
      field: 'category',
      type: 'string',
      required: false,
      enum: ['sports', 'politics', 'crypto', 'economics', 'entertainment', 'other']
    },
    {
      field: 'timeframe',
      type: 'string',
      required: false,
      enum: ['7d', '30d', '90d', '1y'],
      default: '30d'
    }
  ]),
  DashboardController.getMarketAnalytics
);

/**
 * @route   GET /api/v1/dashboard/profit-loss
 * @desc    Get profit/loss history over time
 * @access  Private
 * @query   {string} timeframe - Time period (7d, 30d, 90d, 1y)
 * @query   {string} granularity - Data granularity (daily, weekly, monthly)
 */
router.get('/profit-loss',
  auth,
  validateQuery([
    {
      field: 'timeframe',
      type: 'string',
      required: false,
      enum: ['7d', '30d', '90d', '1y'],
      default: '30d'
    },
    {
      field: 'granularity',
      type: 'string',
      required: false,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    }
  ]),
  DashboardController.getProfitLossHistory
);

module.exports = router;
