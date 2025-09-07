const Market = require('../models/Market');
const Bet = require('../models/Bet');
const User = require('../models/User');
const logger = require('../utils/logger');

// Mock external data sources for oracle functionality
const mockDataSources = {
  // Sports results
  async getSportsResult(event) {
    const outcomes = ['Team A wins', 'Team B wins', 'Draw'];
    const winningIndex = Math.floor(Math.random() * outcomes.length);
    
    return {
      resolved: Math.random() < 0.8, // 80% chance resolved
      winner: winningIndex + 1,
      confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
      source: 'ESPN API',
      timestamp: new Date()
    };
  },

  // Political election results
  async getPoliticalResult(election) {
    const outcomes = ['Candidate A', 'Candidate B', 'Others'];
    const winningIndex = Math.floor(Math.random() * outcomes.length);
    
    return {
      resolved: Math.random() < 0.7, // 70% chance resolved
      winner: winningIndex + 1,
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      source: 'Reuters API',
      timestamp: new Date()
    };
  },

  // Crypto price data
  async getCryptoPrice(symbol, targetPrice) {
    const currentPrice = Math.random() * 100000 + 20000; // Mock BTC price
    const reached = currentPrice >= targetPrice;
    
    return {
      resolved: true,
      winner: reached ? 1 : 2, // Yes/No for price target
      confidence: 1.0,
      currentPrice,
      targetPrice,
      source: 'CoinGecko API',
      timestamp: new Date()
    };
  },

  // Economic indicators
  async getEconomicData(indicator) {
    const value = Math.random() * 10; // Mock economic value
    
    return {
      resolved: Math.random() < 0.9, // 90% chance resolved
      winner: Math.floor(Math.random() * 3) + 1,
      confidence: Math.random() * 0.2 + 0.8, // 80-100% confidence
      value,
      source: 'World Bank API',
      timestamp: new Date()
    };
  }
};

// Mock blockchain resolution service
const mockBlockchainResolver = {
  async resolveMarket(contractAddress, marketId, winningOutcome) {
    return {
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      blockNumber: Math.floor(Math.random() * 1000000),
      gasUsed: Math.floor(Math.random() * 200000 + 50000).toString(),
      gasPrice: Math.floor(Math.random() * 50 + 15).toString()
    };
  }
};

class OracleService {
  constructor() {
    this.resolvers = new Map();
    this.resolutionQueue = [];
    this.isProcessing = false;
    
    // Start resolution processor
    this.startResolutionProcessor();
  }

  /**
   * Register a market for automated resolution
   */
  async registerMarket(marketId, resolutionConfig) {
    try {
      const market = await Market.findById(marketId);
      if (!market) {
        throw new Error('Market not found');
      }

      // Add to resolution queue if end time is near
      const timeUntilEnd = market.endTime.getTime() - Date.now();
      if (timeUntilEnd <= 24 * 60 * 60 * 1000) { // Within 24 hours
        this.resolutionQueue.push({
          marketId,
          contractAddress: market.contractAddress,
          blockchainMarketId: market.marketId,
          category: market.category,
          question: market.question,
          endTime: market.endTime,
          resolutionConfig,
          attempts: 0
        });

        logger.info(`Market ${marketId} registered for automated resolution`);
      }

      return { success: true, message: 'Market registered for resolution' };

    } catch (error) {
      logger.error('Register market for resolution error:', error);
      throw error;
    }
  }

  /**
   * Manually resolve a market (admin/resolver only)
   */
  async manualResolve(marketId, winningOutcome, resolverId, resolutionSource) {
    try {
      const market = await Market.findById(marketId);
      if (!market) {
        throw new Error('Market not found');
      }

      if (market.isResolved) {
        throw new Error('Market already resolved');
      }

      if (new Date() < market.endTime) {
        throw new Error('Market has not ended yet');
      }

      if (winningOutcome < 1 || winningOutcome > market.outcomes.length) {
        throw new Error('Invalid winning outcome');
      }

      // Mock blockchain resolution
      const blockchainResult = await mockBlockchainResolver.resolveMarket(
        market.contractAddress,
        market.marketId,
        winningOutcome
      );

      // Update market in database
      market.isResolved = true;
      market.winningOutcome = winningOutcome;
      market.resolutionTime = new Date();
      market.resolver = resolverId;
      market.resolutionSource = resolutionSource || 'Manual Resolution';
      await market.save();

      // Update all bets for this market
      await this.updateBetsAfterResolution(market);

      // Update resolver stats
      await User.findByIdAndUpdate(resolverId, {
        $inc: { 'tradingStats.marketsResolved': 1 }
      });

      logger.info(`Market ${marketId} manually resolved by ${resolverId}`);

      return {
        success: true,
        market: market.toObject(),
        blockchain: blockchainResult
      };

    } catch (error) {
      logger.error('Manual resolve error:', error);
      throw error;
    }
  }

  /**
   * Automatically resolve a market using external data sources
   */
  async autoResolve(queueItem) {
    try {
      const { marketId, category, question } = queueItem;

      let resolutionData;
      
      // Route to appropriate data source based on category
      switch (category.toLowerCase()) {
        case 'sports':
          resolutionData = await mockDataSources.getSportsResult(question);
          break;
        case 'politics':
          resolutionData = await mockDataSources.getPoliticalResult(question);
          break;
        case 'crypto':
          resolutionData = await mockDataSources.getCryptoPrice('BTC', 100000);
          break;
        case 'economics':
          resolutionData = await mockDataSources.getEconomicData(question);
          break;
        default:
          throw new Error(`Unsupported category for auto-resolution: ${category}`);
      }

      if (!resolutionData.resolved) {
        logger.info(`Resolution data not yet available for market ${marketId}`);
        return { success: false, reason: 'Data not available' };
      }

      if (resolutionData.confidence < 0.7) {
        logger.info(`Low confidence resolution for market ${marketId}: ${resolutionData.confidence}`);
        return { success: false, reason: 'Low confidence' };
      }

      // Resolve the market
      const market = await Market.findById(marketId);
      if (!market || market.isResolved) {
        return { success: false, reason: 'Market not found or already resolved' };
      }

      // Mock blockchain resolution
      const blockchainResult = await mockBlockchainResolver.resolveMarket(
        market.contractAddress,
        market.marketId,
        resolutionData.winner
      );

      // Update market
      market.isResolved = true;
      market.winningOutcome = resolutionData.winner;
      market.resolutionTime = new Date();
      market.resolutionSource = `Automated: ${resolutionData.source}`;
      await market.save();

      // Update bets
      await this.updateBetsAfterResolution(market);

      logger.info(`Market ${marketId} automatically resolved: outcome ${resolutionData.winner}`);

      return {
        success: true,
        market: market.toObject(),
        resolutionData,
        blockchain: blockchainResult
      };

    } catch (error) {
      logger.error('Auto resolve error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update all bets after market resolution
   */
  async updateBetsAfterResolution(market) {
    try {
      const allBets = await Bet.find({
        marketContract: market.contractAddress,
        marketId: market.marketId,
        status: 'confirmed'
      });

      const winningBets = allBets.filter(bet => bet.outcomeId === market.winningOutcome);
      const totalWinningShares = winningBets.reduce((sum, bet) => sum + parseFloat(bet.shares), 0);

      if (totalWinningShares === 0) {
        logger.warn(`No winning bets for market ${market._id}`);
        return;
      }

      // Calculate and update winnings for each bet
      const totalPool = parseFloat(market.totalVolume);
      const platformFee = totalPool * (market.feePercentage / 100);
      const netPool = totalPool - platformFee;

      for (const bet of winningBets) {
        const userShares = parseFloat(bet.shares);
        const userProportion = userShares / totalWinningShares;
        const winnings = netPool * userProportion;

        bet.actualWinnings = winnings.toString();
        await bet.save();

        logger.info(`Updated winnings for bet ${bet._id}: ${winnings}`);
      }

      logger.info(`Updated ${winningBets.length} winning bets for market ${market._id}`);

    } catch (error) {
      logger.error('Update bets after resolution error:', error);
      throw error;
    }
  }

  /**
   * Start the resolution processor
   */
  startResolutionProcessor() {
    setInterval(async () => {
      if (this.isProcessing || this.resolutionQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        const queueItem = this.resolutionQueue.shift();
        
        // Check if market end time has passed
        if (new Date() < queueItem.endTime) {
          // Put back in queue for later
          this.resolutionQueue.push(queueItem);
          return;
        }

        // Attempt auto-resolution
        const result = await this.autoResolve(queueItem);
        
        if (!result.success) {
          queueItem.attempts += 1;
          
          // Retry up to 3 times
          if (queueItem.attempts < 3) {
            this.resolutionQueue.push(queueItem);
            logger.info(`Retrying resolution for market ${queueItem.marketId} (attempt ${queueItem.attempts})`);
          } else {
            logger.warn(`Failed to auto-resolve market ${queueItem.marketId} after 3 attempts`);
          }
        }

      } catch (error) {
        logger.error('Resolution processor error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 30000); // Check every 30 seconds

    logger.info('Oracle resolution processor started');
  }

  /**
   * Get resolution status for a market
   */
  async getResolutionStatus(marketId) {
    try {
      const market = await Market.findById(marketId);
      if (!market) {
        throw new Error('Market not found');
      }

      const queueItem = this.resolutionQueue.find(item => item.marketId === marketId);

      return {
        marketId,
        isResolved: market.isResolved,
        winningOutcome: market.winningOutcome,
        resolutionTime: market.resolutionTime,
        resolutionSource: market.resolutionSource,
        resolver: market.resolver,
        inQueue: !!queueItem,
        queuePosition: queueItem ? this.resolutionQueue.indexOf(queueItem) + 1 : null,
        attempts: queueItem ? queueItem.attempts : 0
      };

    } catch (error) {
      logger.error('Get resolution status error:', error);
      throw error;
    }
  }

  /**
   * Get pending resolutions (admin view)
   */
  getPendingResolutions() {
    return {
      queue: this.resolutionQueue.map(item => ({
        marketId: item.marketId,
        question: item.question,
        category: item.category,
        endTime: item.endTime,
        attempts: item.attempts
      })),
      isProcessing: this.isProcessing,
      queueLength: this.resolutionQueue.length
    };
  }

  /**
   * Force resolution attempt (admin only)
   */
  async forceResolution(marketId) {
    try {
      const queueItem = this.resolutionQueue.find(item => item.marketId === marketId);
      if (!queueItem) {
        throw new Error('Market not in resolution queue');
      }

      const result = await this.autoResolve(queueItem);
      
      if (result.success) {
        // Remove from queue
        const index = this.resolutionQueue.indexOf(queueItem);
        this.resolutionQueue.splice(index, 1);
      }

      return result;

    } catch (error) {
      logger.error('Force resolution error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const oracleService = new OracleService();

module.exports = oracleService;
