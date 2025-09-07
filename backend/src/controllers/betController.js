const Bet = require('../models/Bet');
const Market = require('../models/Market');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Mock blockchain betting service
const mockBettingService = {
  async placeBet(marketContract, marketId, outcomeId, amount) {
    // Simulate blockchain bet placement
    const shares = (parseFloat(amount) / (1 + Math.random())).toString(); // Mock AMM calculation
    
    return {
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      blockNumber: Math.floor(Math.random() * 1000000),
      shares,
      gasUsed: Math.floor(Math.random() * 100000 + 21000).toString(),
      gasPrice: Math.floor(Math.random() * 50 + 10).toString()
    };
  },

  async claimWinnings(marketContract, marketId, userAddress) {
    // Mock winnings claim
    const winnings = (Math.random() * 1000 + 100).toString();
    
    return {
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      blockNumber: Math.floor(Math.random() * 1000000),
      winnings,
      gasUsed: Math.floor(Math.random() * 80000 + 21000).toString(),
      gasPrice: Math.floor(Math.random() * 50 + 10).toString()
    };
  },

  async calculateWinnings(marketContract, marketId, userAddress) {
    // Mock winnings calculation
    return {
      potentialWinnings: (Math.random() * 500 + 50).toString(),
      isWinning: Math.random() < 0.4
    };
  }
};

/**
 * @desc    Place a bet on a market outcome
 * @route   POST /api/bets
 * @access  Private
 */
const placeBet = async (req, res) => {
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
      marketId,
      outcomeId,
      amount
    } = req.body;

    // Get market details
    const market = await Market.findById(marketId);
    if (!market) {
      return res.status(404).json({
        success: false,
        message: 'Market not found'
      });
    }

    // Check if market is active
    if (!market.isActive || market.isResolved || new Date() > market.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Market is not available for betting'
      });
    }

    // Validate outcome
    const outcome = market.outcomes.find(o => o.outcomeId === outcomeId);
    if (!outcome || !outcome.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid outcome selection'
      });
    }

    // Mock blockchain bet placement
    const blockchainResult = await mockBettingService.placeBet(
      market.contractAddress,
      market.marketId,
      outcomeId,
      amount
    );

    // Create bet record
    const betData = {
      marketContract: market.contractAddress,
      marketId: market.marketId,
      outcomeId,
      userAddress: req.user.walletAddress || req.user.id,
      userId: req.user.id,
      shares: blockchainResult.shares,
      amountBacked: amount,
      transactionHash: blockchainResult.transactionHash,
      blockNumber: blockchainResult.blockNumber,
      gasUsed: blockchainResult.gasUsed,
      gasPrice: blockchainResult.gasPrice,
      status: 'confirmed', // Mock immediate confirmation
      outcomeDescription: outcome.description,
      marketQuestion: market.question,
      marketRef: market._id,
      platform: 'web',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    };

    const bet = await Bet.create(betData);

    // Update user betting history and stats
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        bettingHistory: {
          marketId: market._id,
          betId: bet._id,
          transactionHash: blockchainResult.transactionHash,
          bettedAt: new Date()
        }
      },
      $inc: {
        'tradingStats.totalBets': 1
      }
    });

    // Update market stats (mock)
    await Market.findByIdAndUpdate(marketId, {
      $inc: {
        totalParticipants: 1,
        [`outcomes.${outcomeId - 1}.totalBacked`]: parseFloat(amount)
      }
    });

    logger.info(`Bet placed: ${bet._id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Bet placed successfully',
      data: bet,
      blockchain: {
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber
      }
    });

  } catch (error) {
    logger.error('Place bet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while placing bet'
    });
  }
};

/**
 * @desc    Get user's bets
 * @route   GET /api/bets/my-bets
 * @access  Private
 */
const getUserBets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      marketId
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {
      userAddress: req.user.walletAddress || req.user.id
    };

    if (status) {
      query.status = status;
    }

    if (marketId) {
      query.marketRef = marketId;
    }

    const bets = await Bet.find(query)
      .populate('marketRef', 'question category endTime isResolved winningOutcome')
      .sort({ betTimestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Bet.countDocuments(query);

    // Add potential winnings for unresolved bets
    const betsWithWinnings = await Promise.all(
      bets.map(async (bet) => {
        if (!bet.marketRef.isResolved && bet.status === 'confirmed') {
          const winningsData = await mockBettingService.calculateWinnings(
            bet.marketContract,
            bet.marketId,
            bet.userAddress
          );
          
          return {
            ...bet.toObject(),
            potentialWinnings: winningsData.potentialWinnings,
            isCurrentlyWinning: winningsData.isWinning
          };
        }
        
        return bet.toObject();
      })
    );

    res.status(200).json({
      success: true,
      count: bets.length,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: betsWithWinnings
    });

  } catch (error) {
    logger.error('Get user bets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bets'
    });
  }
};

/**
 * @desc    Get single bet details
 * @route   GET /api/bets/:id
 * @access  Private
 */
const getBet = async (req, res) => {
  try {
    const bet = await Bet.findById(req.params.id)
      .populate('marketRef', 'question category endTime isResolved winningOutcome outcomes')
      .populate('userId', 'username');

    if (!bet) {
      return res.status(404).json({
        success: false,
        message: 'Bet not found'
      });
    }

    // Check if user owns this bet or is admin
    if (bet.userAddress !== (req.user.walletAddress || req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this bet'
      });
    }

    // Add current potential winnings if market not resolved
    let betData = bet.toObject();
    if (!bet.marketRef.isResolved && bet.status === 'confirmed') {
      const winningsData = await mockBettingService.calculateWinnings(
        bet.marketContract,
        bet.marketId,
        bet.userAddress
      );
      
      betData.currentPotentialWinnings = winningsData.potentialWinnings;
      betData.isCurrentlyWinning = winningsData.isWinning;
    }

    res.status(200).json({
      success: true,
      data: betData
    });

  } catch (error) {
    logger.error('Get bet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bet'
    });
  }
};

/**
 * @desc    Claim winnings from resolved market
 * @route   POST /api/bets/:id/claim
 * @access  Private
 */
const claimWinnings = async (req, res) => {
  try {
    const bet = await Bet.findById(req.params.id)
      .populate('marketRef');

    if (!bet) {
      return res.status(404).json({
        success: false,
        message: 'Bet not found'
      });
    }

    // Check ownership
    if (bet.userAddress !== (req.user.walletAddress || req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to claim this bet'
      });
    }

    // Check if market is resolved
    if (!bet.marketRef.isResolved) {
      return res.status(400).json({
        success: false,
        message: 'Market is not yet resolved'
      });
    }

    // Check if already claimed
    if (bet.claimed) {
      return res.status(400).json({
        success: false,
        message: 'Winnings already claimed'
      });
    }

    // Check if this is a winning bet
    if (bet.outcomeId !== bet.marketRef.winningOutcome) {
      return res.status(400).json({
        success: false,
        message: 'This bet did not win'
      });
    }

    // Mock blockchain claim transaction
    const claimResult = await mockBettingService.claimWinnings(
      bet.marketContract,
      bet.marketId,
      bet.userAddress
    );

    // Update bet as claimed
    bet.claimed = true;
    bet.claimTransactionHash = claimResult.transactionHash;
    bet.actualWinnings = claimResult.winnings;
    await bet.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        'tradingStats.totalWinnings': parseFloat(claimResult.winnings)
      }
    });

    logger.info(`Winnings claimed: ${bet._id} by user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Winnings claimed successfully',
      data: {
        amount: claimResult.winnings,
        transactionHash: claimResult.transactionHash,
        blockNumber: claimResult.blockNumber
      }
    });

  } catch (error) {
    logger.error('Claim winnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while claiming winnings'
    });
  }
};

/**
 * @desc    Get market betting activity
 * @route   GET /api/bets/market/:marketId/activity
 * @access  Public
 */
const getMarketActivity = async (req, res) => {
  try {
    const { marketId } = req.params;
    const { limit = 20, timeframe = 24 } = req.query;

    const market = await Market.findById(marketId);
    if (!market) {
      return res.status(404).json({
        success: false,
        message: 'Market not found'
      });
    }

    // Get recent bets
    const recentBets = await Bet.findByMarket(
      market.contractAddress,
      market.marketId,
      parseInt(limit)
    );

    // Get betting activity statistics
    const activityStats = await Bet.getMarketActivity(
      market.contractAddress,
      market.marketId,
      parseInt(timeframe)
    );

    res.status(200).json({
      success: true,
      data: {
        recentBets,
        activityStats,
        market: {
          id: market._id,
          question: market.question,
          category: market.category
        }
      }
    });

  } catch (error) {
    logger.error('Get market activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching market activity'
    });
  }
};

/**
 * @desc    Get user betting statistics
 * @route   GET /api/bets/stats
 * @access  Private
 */
const getBettingStats = async (req, res) => {
  try {
    const userAddress = req.user.walletAddress || req.user.id;
    
    // Get comprehensive betting stats
    const stats = await Bet.getUserStats(userAddress);
    
    // Get unclaimed winnings
    const unclaimedBets = await Bet.findUnclaimedWinnings(userAddress);
    
    // Add additional calculated metrics
    const enhancedStats = {
      ...stats,
      unclaimedBetsCount: unclaimedBets.length,
      averageBetSize: stats.totalBets > 0 ? stats.totalBacked / stats.totalBets : 0,
      roi: stats.totalBacked > 0 ? ((stats.totalWinnings - stats.totalBacked) / stats.totalBacked) * 100 : 0,
      profitFactor: stats.totalBacked > 0 ? stats.totalWinnings / stats.totalBacked : 0
    };

    res.status(200).json({
      success: true,
      data: enhancedStats
    });

  } catch (error) {
    logger.error('Get betting stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching betting statistics'
    });
  }
};

/**
 * @desc    Get unclaimed winnings
 * @route   GET /api/bets/unclaimed
 * @access  Private
 */
const getUnclaimedWinnings = async (req, res) => {
  try {
    const userAddress = req.user.walletAddress || req.user.id;
    
    const unclaimedBets = await Bet.findUnclaimedWinnings(userAddress);
    
    const totalUnclaimed = unclaimedBets.reduce((sum, bet) => {
      return sum + parseFloat(bet.actualWinnings || '0');
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        bets: unclaimedBets,
        totalAmount: totalUnclaimed.toString(),
        count: unclaimedBets.length
      }
    });

  } catch (error) {
    logger.error('Get unclaimed winnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching unclaimed winnings'
    });
  }
};

module.exports = {
  placeBet,
  getUserBets,
  getBet,
  claimWinnings,
  getMarketActivity,
  getBettingStats,
  getUnclaimedWinnings
};
