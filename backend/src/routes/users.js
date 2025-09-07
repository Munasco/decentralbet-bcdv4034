const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'trader',
        tradingStats: {
          totalBets: 25,
          wonBets: 15,
          lostBets: 10,
          winRate: 60.0,
          totalStaked: 2500,
          totalWon: 3750,
          netProfit: 1250,
          roi: 50.0
        },
        createdAt: new Date('2024-01-01'),
        isActive: true
      }
    }
  });
});

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', (req, res) => {
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'trader',
        updatedAt: new Date()
      }
    }
  });
});

/**
 * @route   GET /api/v1/users/:id/stats
 * @desc    Get user trading statistics
 * @access  Public
 */
router.get('/:id/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      stats: {
        totalBets: 25,
        wonBets: 15,
        lostBets: 10,
        winRate: 60.0,
        totalStaked: 2500,
        totalWon: 3750,
        netProfit: 1250,
        roi: 50.0,
        activePositions: 5,
        marketsTraded: 12,
        averageBetSize: 100,
        biggestWin: 500,
        longestStreak: 7
      }
    }
  });
});

/**
 * @route   GET /api/v1/users/leaderboard
 * @desc    Get user leaderboard
 * @access  Public
 */
router.get('/leaderboard', (req, res) => {
  res.json({
    success: true,
    data: {
      leaderboard: [
        {
          rank: 1,
          userId: 'user-001',
          username: 'toptrader',
          netProfit: 5000,
          roi: 200.0,
          winRate: 75.0,
          totalBets: 100
        },
        {
          rank: 2,
          userId: 'user-002',
          username: 'smartbetter',
          netProfit: 3500,
          roi: 150.0,
          winRate: 70.0,
          totalBets: 80
        },
        {
          rank: 3,
          userId: 'user-123',
          username: 'testuser',
          netProfit: 1250,
          roi: 50.0,
          winRate: 60.0,
          totalBets: 25
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 3,
        pages: 1
      }
    }
  });
});

module.exports = router;
