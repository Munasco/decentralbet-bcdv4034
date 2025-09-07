const Market = require('../models/Market');
const Bet = require('../models/Bet');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Hard-mocked blockchain service for immediate functionality
const mockBlockchainService = {
  async createMarket(marketData) {
    // Mock blockchain contract deployment
    return {
      contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      marketId: Math.floor(Math.random() * 10000),
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      blockNumber: Math.floor(Math.random() * 1000000)
    };
  },
  
  async getMarketData(contractAddress, marketId) {
    // Mock blockchain market data
    return {
      totalVolume: (Math.random() * 100000).toString(),
      totalLiquidity: (Math.random() * 50000).toString(),
      isResolved: Math.random() < 0.3,
      winningOutcome: Math.random() < 0.3 ? Math.floor(Math.random() * 2) + 1 : null,
      outcomes: [
        {
          totalShares: (Math.random() * 10000).toString(),
          totalBacked: (Math.random() * 25000).toString(),
          isActive: true
        },
        {
          totalShares: (Math.random() * 10000).toString(),
          totalBacked: (Math.random() * 25000).toString(),
          isActive: true
        }
      ]
    };
  }
};

/**
 * @desc    Get all markets with filtering and pagination
 * @route   GET /api/markets
 * @access  Public
 */
const getMarkets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      status = 'active',
      sort = 'recent',
      search,
      featured
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status === 'active') {
      query.isActive = true;
      query.isResolved = false;
      query.endTime = { $gt: new Date() };
    } else if (status === 'resolved') {
      query.isResolved = true;
    } else if (status === 'ending-soon') {
      const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
      query.isActive = true;
      query.isResolved = false;
      query.endTime = { $gte: new Date(), $lte: next24Hours };
    }

    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (featured === 'true') {
      query.isVerified = true;
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case 'volume':
        sortQuery = { totalVolume: -1 };
        break;
      case 'recent':
        sortQuery = { creationTime: -1 };
        break;
      case 'ending-soon':
        sortQuery = { endTime: 1 };
        break;
      case 'popular':
        sortQuery = { totalParticipants: -1 };
        break;
      default:
        sortQuery = { creationTime: -1 };
    }

    const markets = await Market.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const total = await Market.countDocuments(query);

    // Add mock blockchain data for immediate demo
    const marketsWithBlockchainData = await Promise.all(
      markets.map(async (market) => {
        const blockchainData = await mockBlockchainService.getMarketData(
          market.contractAddress, 
          market.marketId
        );
        
        return {
          ...market.toObject(),
          ...blockchainData,
          // Calculate implied probabilities
          outcomes: market.outcomes.map((outcome, index) => ({
            ...outcome,
            impliedProbability: blockchainData.outcomes[index] ? 
              Math.random() * 0.8 + 0.1 : outcome.impliedProbability
          }))
        };
      })
    );

    res.status(200).json({
      success: true,
      count: markets.length,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: marketsWithBlockchainData
    });

  } catch (error) {
    logger.error('Get markets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching markets'
    });
  }
};

/**
 * @desc    Get single market by ID
 * @route   GET /api/markets/:id
 * @access  Public
 */
const getMarket = async (req, res) => {
  try {
    const market = await Market.findById(req.params.id);

    if (!market) {
      return res.status(404).json({
        success: false,
        message: 'Market not found'
      });
    }

    // Get recent betting activity
    const recentBets = await Bet.findByMarket(
      market.contractAddress, 
      market.marketId, 
      10
    );

    // Mock blockchain data for immediate demo
    const blockchainData = await mockBlockchainService.getMarketData(
      market.contractAddress, 
      market.marketId
    );

    const marketData = {
      ...market.toObject(),
      ...blockchainData,
      recentActivity: recentBets
    };

    res.status(200).json({
      success: true,
      data: marketData
    });

  } catch (error) {
    logger.error('Get market error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching market'
    });
  }
};

/**
 * @desc    Create new market
 * @route   POST /api/markets
 * @access  Private (market_creator, admin)
 */
const createMarket = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      question,
      description,
      category,
      subcategory,
      outcomes,
      endTime,
      imageUrl,
      tags,
      feePercentage = 2,
      oracleSource,
      region
    } = req.body;

    // Mock blockchain deployment for immediate functionality
    const blockchainResult = await mockBlockchainService.createMarket({
      question,
      outcomes,
      endTime
    });

    // Create market in database
    const marketData = {
      contractAddress: blockchainResult.contractAddress,
      marketId: blockchainResult.marketId,
      question,
      description,
      category,
      subcategory,
      outcomes: outcomes.map((outcome, index) => ({
        outcomeId: index + 1,
        description: outcome,
        totalShares: '0',
        totalBacked: '0',
        isActive: true,
        impliedProbability: 1 / outcomes.length // Equal probability initially
      })),
      endTime: new Date(endTime),
      creator: req.user.walletAddress || req.user.id,
      imageUrl,
      tags: tags || [],
      feePercentage,
      oracleSource,
      region,
      isVerified: req.user.role === 'admin'
    };

    const market = await Market.create(marketData);

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'tradingStats.marketsCreated': 1 }
    });

    logger.info(`New market created: ${market._id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Market created successfully',
      data: market,
      blockchain: {
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber
      }
    });

  } catch (error) {
    logger.error('Create market error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating market'
    });
  }
};

/**
 * @desc    Get trending markets
 * @route   GET /api/markets/trending
 * @access  Public
 */
const getTrendingMarkets = async (req, res) => {
  try {
    const { limit = 10, timeframe = 24 } = req.query;
    
    // For immediate demo, return markets sorted by volume
    const markets = await Market.findTrending(parseInt(limit));

    // Add mock real-time data
    const trendingMarkets = markets.map(market => ({
      ...market.toObject(),
      volumeChange24h: (Math.random() - 0.5) * 200, // Mock 24h change
      participantChange24h: Math.floor((Math.random() - 0.5) * 20),
      trendScore: Math.random() * 100
    }));

    res.status(200).json({
      success: true,
      data: trendingMarkets
    });

  } catch (error) {
    logger.error('Get trending markets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trending markets'
    });
  }
};

/**
 * @desc    Get markets by category
 * @route   GET /api/markets/category/:category
 * @access  Public
 */
const getMarketsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const markets = await Market.findByCategory(category, parseInt(limit));

    res.status(200).json({
      success: true,
      data: markets
    });

  } catch (error) {
    logger.error('Get markets by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching markets by category'
    });
  }
};

/**
 * @desc    Update market (admin only)
 * @route   PUT /api/markets/:id
 * @access  Private (admin)
 */
const updateMarket = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = [
      'description', 'imageUrl', 'tags', 'isVerified', 
      'isPaused', 'oracleSource', 'resolutionSource'
    ];

    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const market = await Market.findByIdAndUpdate(
      id, 
      filteredUpdates, 
      { new: true, runValidators: true }
    );

    if (!market) {
      return res.status(404).json({
        success: false,
        message: 'Market not found'
      });
    }

    logger.info(`Market updated: ${id} by admin ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Market updated successfully',
      data: market
    });

  } catch (error) {
    logger.error('Update market error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating market'
    });
  }
};

/**
 * @desc    Get market statistics
 * @route   GET /api/markets/stats
 * @access  Public
 */
const getMarketStats = async (req, res) => {
  try {
    const [
      totalMarkets,
      activeMarkets,
      resolvedMarkets,
      totalVolume
    ] = await Promise.all([
      Market.countDocuments(),
      Market.countDocuments({ isActive: true, isResolved: false }),
      Market.countDocuments({ isResolved: true }),
      Market.aggregate([
        { $group: { _id: null, total: { $sum: { $toDouble: '$totalVolume' } } } }
      ])
    ]);

    const stats = {
      totalMarkets,
      activeMarkets,
      resolvedMarkets,
      totalVolume: totalVolume[0]?.total || 0,
      categories: await Market.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get market stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching market statistics'
    });
  }
};

module.exports = {
  getMarkets,
  getMarket,
  createMarket,
  getTrendingMarkets,
  getMarketsByCategory,
  updateMarket,
  getMarketStats
};
