const express = require('express');
const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');
const oracleService = require('../services/oracleService');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const logger = require('../utils/logger');

const router = express.Router();

// All oracle routes require authentication
router.use(auth);

/**
 * @desc    Get resolution status for a market
 * @route   GET /api/oracle/status/:marketId
 * @access  Public (authenticated)
 */
router.get('/status/:marketId', [
  param('marketId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const status = await oracleService.getResolutionStatus(req.params.marketId);
    
    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Get resolution status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @desc    Register market for automated resolution
 * @route   POST /api/oracle/register/:marketId
 * @access  Private (market_creator, admin)
 */
router.post('/register/:marketId', [
  authorize(['market_creator', 'admin']),
  param('marketId').isMongoId(),
  body('resolutionConfig').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const result = await oracleService.registerMarket(
      req.params.marketId, 
      req.body.resolutionConfig
    );
    
    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Register market for resolution error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @desc    Manually resolve a market
 * @route   POST /api/oracle/resolve/:marketId
 * @access  Private (resolver, admin)
 */
router.post('/resolve/:marketId', [
  authorize(['resolver', 'admin']),
  param('marketId').isMongoId(),
  body('winningOutcome').isInt({ min: 1, max: 10 }).withMessage('Valid winning outcome required'),
  body('resolutionSource').optional().isLength({ min: 1, max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { winningOutcome, resolutionSource } = req.body;
    
    const result = await oracleService.manualResolve(
      req.params.marketId,
      winningOutcome,
      req.user.id,
      resolutionSource
    );
    
    res.status(200).json({
      success: true,
      message: 'Market resolved successfully',
      data: result
    });

  } catch (error) {
    logger.error('Manual resolve error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @desc    Get pending resolutions (admin view)
 * @route   GET /api/oracle/pending
 * @access  Private (admin)
 */
router.get('/pending', [
  authorize(['admin'])
], async (req, res) => {
  try {
    const pendingResolutions = oracleService.getPendingResolutions();
    
    res.status(200).json({
      success: true,
      data: pendingResolutions
    });

  } catch (error) {
    logger.error('Get pending resolutions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pending resolutions'
    });
  }
});

/**
 * @desc    Force resolution attempt (admin only)
 * @route   POST /api/oracle/force/:marketId
 * @access  Private (admin)
 */
router.post('/force/:marketId', [
  authorize(['admin']),
  param('marketId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const result = await oracleService.forceResolution(req.params.marketId);
    
    res.status(200).json({
      success: true,
      message: 'Force resolution attempted',
      data: result
    });

  } catch (error) {
    logger.error('Force resolution error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
