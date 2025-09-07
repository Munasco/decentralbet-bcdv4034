const User = require('../models/User');
const Market = require('../models/Market');
const Bet = require('../models/Bet');
const logger = require('../utils/logger');
const blockchainService = require('../services/blockchainService');

class DashboardController {
  /**
   * Get comprehensive user dashboard data
   */
  static async getUserDashboard(req, res) {
    try {
      const { user } = req;
      
      // Get user with populated data
      const userData = await User.findById(user.id)
        .populate({
          path: 'bets',
          populate: {
            path: 'market',
            select: 'title category status outcomeResult endDate'
          }
        })
        .select('-password -resetPasswordToken -resetPasswordExpires');

      if (!userData) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get trading statistics
      const stats = await DashboardController.getUserTradingStats(user.id);
      
      // Get portfolio performance
      const portfolio = await DashboardController.getPortfolioData(user.id);
      
      // Get recent activity
      const recentActivity = await DashboardController.getRecentActivity(user.id);
      
      // Get active positions
      const activePositions = await DashboardController.getActivePositions(user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: userData._id,
            username: userData.username,
            email: userData.email,
            role: userData.role,
            isActive: userData.isActive,
            tradingStats: userData.tradingStats,
            createdAt: userData.createdAt
          },
          stats,
          portfolio,
          recentActivity,
          activePositions
        }
      });
    } catch (error) {
      logger.error('Error getting user dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data'
      });
    }
  }

  /**
   * Get user trading statistics
   */
  static async getUserTradingStats(userId) {
    try {
      const user = await User.findById(userId);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      
      // Get recent bets (last 30 days)
      const recentBets = await Bet.find({
        user: userId,
        createdAt: { $gte: thirtyDaysAgo }
      }).populate('market', 'status outcomeResult');

      // Calculate win/loss stats
      const resolvedBets = recentBets.filter(bet => bet.market.status === 'resolved');
      const wonBets = resolvedBets.filter(bet => bet.won);
      const lostBets = resolvedBets.filter(bet => !bet.won && bet.market.status === 'resolved');

      // Calculate performance metrics
      const totalStaked = recentBets.reduce((sum, bet) => sum + bet.amount, 0);
      const totalWon = wonBets.reduce((sum, bet) => sum + bet.payout, 0);
      const totalLost = lostBets.reduce((sum, bet) => sum + bet.amount, 0);
      const netProfit = totalWon - totalStaked;

      return {
        overall: user.tradingStats,
        recent30Days: {
          totalBets: recentBets.length,
          activeBets: recentBets.filter(bet => bet.market.status === 'active').length,
          wonBets: wonBets.length,
          lostBets: lostBets.length,
          winRate: resolvedBets.length > 0 ? (wonBets.length / resolvedBets.length) * 100 : 0,
          totalStaked,
          totalWon,
          netProfit,
          roi: totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0
        }
      };
    } catch (error) {
      logger.error('Error getting user trading stats:', error);
      throw error;
    }
  }

  /**
   * Get user portfolio data
   */
  static async getPortfolioData(userId) {
    try {
      // Get all user bets
      const bets = await Bet.find({ user: userId })
        .populate('market', 'title category status outcomeResult endDate')
        .sort({ createdAt: -1 });

      // Group by market categories
      const byCategory = {};
      const byOutcome = { won: 0, lost: 0, pending: 0 };
      const byMonth = {};

      bets.forEach(bet => {
        const category = bet.market.category;
        if (!byCategory[category]) {
          byCategory[category] = {
            totalBets: 0,
            totalStaked: 0,
            totalWon: 0,
            netProfit: 0
          };
        }

        byCategory[category].totalBets++;
        byCategory[category].totalStaked += bet.amount;

        if (bet.market.status === 'resolved') {
          if (bet.won) {
            byCategory[category].totalWon += bet.payout;
            byOutcome.won++;
          } else {
            byOutcome.lost++;
          }
        } else {
          byOutcome.pending++;
        }

        byCategory[category].netProfit = byCategory[category].totalWon - byCategory[category].totalStaked;

        // Group by month for performance chart
        const month = bet.createdAt.toISOString().slice(0, 7); // YYYY-MM
        if (!byMonth[month]) {
          byMonth[month] = {
            staked: 0,
            won: 0,
            netProfit: 0
          };
        }

        byMonth[month].staked += bet.amount;
        if (bet.won && bet.market.status === 'resolved') {
          byMonth[month].won += bet.payout;
        }
        byMonth[month].netProfit = byMonth[month].won - byMonth[month].staked;
      });

      return {
        byCategory,
        byOutcome,
        performanceOverTime: Object.entries(byMonth)
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => a.month.localeCompare(b.month))
      };
    } catch (error) {
      logger.error('Error getting portfolio data:', error);
      throw error;
    }
  }

  /**
   * Get recent user activity
   */
  static async getRecentActivity(userId, limit = 20) {
    try {
      const recentBets = await Bet.find({ user: userId })
        .populate('market', 'title category status outcomeResult')
        .sort({ createdAt: -1 })
        .limit(limit);

      const activities = recentBets.map(bet => ({
        id: bet._id,
        type: 'bet_placed',
        description: `Placed ${bet.amount} USDC on "${bet.market.title}" (${bet.outcome})`,
        market: {
          id: bet.market._id,
          title: bet.market.title,
          category: bet.market.category,
          status: bet.market.status
        },
        amount: bet.amount,
        outcome: bet.outcome,
        odds: bet.odds,
        status: bet.market.status === 'resolved' ? (bet.won ? 'won' : 'lost') : 'pending',
        payout: bet.payout,
        timestamp: bet.createdAt
      }));

      return activities;
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      throw error;
    }
  }

  /**
   * Get active positions
   */
  static async getActivePositions(userId) {
    try {
      const activeBets = await Bet.find({
        user: userId,
      })
      .populate({
        path: 'market',
        match: { status: 'active' },
        select: 'title category endDate totalPool yesPool noPool currentOdds'
      })
      .sort({ createdAt: -1 });

      // Filter out bets where market is null (resolved markets)
      const activePositions = activeBets
        .filter(bet => bet.market)
        .map(bet => ({
          id: bet._id,
          market: {
            id: bet.market._id,
            title: bet.market.title,
            category: bet.market.category,
            endDate: bet.market.endDate,
            totalPool: bet.market.totalPool,
            yesPool: bet.market.yesPool,
            noPool: bet.market.noPool,
            currentOdds: bet.market.currentOdds
          },
          amount: bet.amount,
          outcome: bet.outcome,
          odds: bet.odds,
          potentialPayout: bet.amount * bet.odds,
          placedAt: bet.createdAt,
          timeRemaining: Math.max(0, bet.market.endDate - Date.now())
        }));

      return activePositions;
    } catch (error) {
      logger.error('Error getting active positions:', error);
      throw error;
    }
  }

  /**
   * Get market performance analytics
   */
  static async getMarketAnalytics(req, res) {
    try {
      const { user } = req;
      const { category, timeframe = '30d' } = req.query;

      let dateFilter = {};
      const now = new Date();
      
      switch (timeframe) {
        case '7d':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
          break;
        case '30d':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 30)) };
          break;
        case '90d':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 90)) };
          break;
        case '1y':
          dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
          break;
        default:
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 30)) };
      }

      const matchFilter = {
        user: user.id,
        createdAt: dateFilter
      };

      if (category) {
        // Get markets in category first
        const marketsInCategory = await Market.find({ category }).select('_id');
        matchFilter.market = { $in: marketsInCategory.map(m => m._id) };
      }

      const analytics = await Bet.aggregate([
        { $match: matchFilter },
        {
          $lookup: {
            from: 'markets',
            localField: 'market',
            foreignField: '_id',
            as: 'marketData'
          }
        },
        { $unwind: '$marketData' },
        {
          $group: {
            _id: {
              category: '$marketData.category',
              outcome: '$outcome'
            },
            totalBets: { $sum: 1 },
            totalStaked: { $sum: '$amount' },
            totalWon: { 
              $sum: { 
                $cond: [
                  { $eq: ['$marketData.status', 'resolved'] },
                  { $cond: ['$won', '$payout', 0] },
                  0
                ]
              }
            },
            avgOdds: { $avg: '$odds' },
            winRate: {
              $avg: {
                $cond: [
                  { $eq: ['$marketData.status', 'resolved'] },
                  { $cond: ['$won', 1, 0] },
                  null
                ]
              }
            }
          }
        },
        {
          $group: {
            _id: '$_id.category',
            outcomes: {
              $push: {
                outcome: '$_id.outcome',
                totalBets: '$totalBets',
                totalStaked: '$totalStaked',
                totalWon: '$totalWon',
                avgOdds: '$avgOdds',
                winRate: '$winRate'
              }
            },
            categoryTotal: {
              totalBets: { $sum: '$totalBets' },
              totalStaked: { $sum: '$totalStaked' },
              totalWon: { $sum: '$totalWon' },
              netProfit: { $subtract: [{ $sum: '$totalWon' }, { $sum: '$totalStaked' }] }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      res.json({
        success: true,
        data: {
          timeframe,
          category,
          analytics
        }
      });
    } catch (error) {
      logger.error('Error getting market analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get market analytics'
      });
    }
  }

  /**
   * Get profit/loss over time
   */
  static async getProfitLossHistory(req, res) {
    try {
      const { user } = req;
      const { timeframe = '30d', granularity = 'daily' } = req.query;

      let dateFilter = {};
      let dateFormat = '%Y-%m-%d';
      const now = new Date();
      
      switch (timeframe) {
        case '7d':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
          dateFormat = '%Y-%m-%d';
          break;
        case '30d':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 30)) };
          dateFormat = '%Y-%m-%d';
          break;
        case '90d':
          dateFilter = { $gte: new Date(now.setDate(now.getDate() - 90)) };
          dateFormat = granularity === 'weekly' ? '%Y-%U' : '%Y-%m-%d';
          break;
        case '1y':
          dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
          dateFormat = '%Y-%m';
          break;
      }

      const profitLoss = await Bet.aggregate([
        { 
          $match: { 
            user: user.id,
            createdAt: dateFilter
          }
        },
        {
          $lookup: {
            from: 'markets',
            localField: 'market',
            foreignField: '_id',
            as: 'marketData'
          }
        },
        { $unwind: '$marketData' },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: '$createdAt'
              }
            },
            totalStaked: { $sum: '$amount' },
            totalWon: { 
              $sum: { 
                $cond: [
                  { $and: [
                    { $eq: ['$marketData.status', 'resolved'] },
                    { $eq: ['$won', true] }
                  ]},
                  '$payout',
                  0
                ]
              }
            },
            betsPlaced: { $sum: 1 }
          }
        },
        {
          $project: {
            date: '$_id',
            totalStaked: 1,
            totalWon: 1,
            netProfit: { $subtract: ['$totalWon', '$totalStaked'] },
            betsPlaced: 1
          }
        },
        { $sort: { date: 1 } }
      ]);

      // Calculate cumulative profit/loss
      let cumulativeProfit = 0;
      const enrichedData = profitLoss.map(item => {
        cumulativeProfit += item.netProfit;
        return {
          ...item,
          cumulativeProfit,
          roi: item.totalStaked > 0 ? (item.netProfit / item.totalStaked) * 100 : 0
        };
      });

      res.json({
        success: true,
        data: {
          timeframe,
          granularity,
          profitLossHistory: enrichedData
        }
      });
    } catch (error) {
      logger.error('Error getting profit/loss history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profit/loss history'
      });
    }
  }
}

module.exports = DashboardController;
