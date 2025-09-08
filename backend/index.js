const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Simple in-memory storage using Map (no Redis needed for now)
const portfolioData = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Portfolio API endpoints
app.get('/api/portfolio', (req, res) => {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'Address required' });
  }

  const portfolio = portfolioData.get(address.toLowerCase()) || {
    address: address.toLowerCase(),
    totalBets: 0,
    totalWinnings: '0',
    totalLosses: '0',
    winStreak: 0,
    trades: []
  };

  res.json(portfolio);
});

app.post('/api/portfolio', (req, res) => {
  try {
    const { address, marketId, outcome, amount, won } = req.body;

    if (!address || !marketId || !outcome || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const addressKey = address.toLowerCase();
    const currentPortfolio = portfolioData.get(addressKey) || {
      address: addressKey,
      totalBets: 0,
      totalWinnings: '0',
      totalLosses: '0',
      winStreak: 0,
      trades: []
    };

    // Add new trade
    const newTrade = {
      marketId: Number(marketId),
      outcome,
      amount,
      timestamp: new Date().toISOString(),
      won: Boolean(won)
    };

    currentPortfolio.trades.push(newTrade);
    currentPortfolio.totalBets += 1;

    // Update portfolio stats (keep as strings to avoid BigInt issues)
    const currentWinnings = BigInt(currentPortfolio.totalWinnings);
    const currentLosses = BigInt(currentPortfolio.totalLosses);
    const amountBigInt = BigInt(amount);

    if (won) {
      currentPortfolio.totalWinnings = (currentWinnings + amountBigInt).toString();
      currentPortfolio.winStreak += 1;
    } else {
      currentPortfolio.totalLosses = (currentLosses + amountBigInt).toString();
      currentPortfolio.winStreak = 0;
    }

    // Store updated portfolio
    portfolioData.set(addressKey, currentPortfolio);

    console.log(`📊 Portfolio updated for ${address}:`, {
      totalBets: currentPortfolio.totalBets,
      totalWinnings: currentPortfolio.totalWinnings,
      totalLosses: currentPortfolio.totalLosses,
      winStreak: currentPortfolio.winStreak
    });

    res.json({ 
      success: true, 
      portfolio: currentPortfolio
    });

  } catch (error) {
    console.error('Portfolio API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to see all portfolios
app.get('/api/debug/portfolios', (req, res) => {
  const allPortfolios = Array.from(portfolioData.entries()).map(([address, data]) => ({
    address,
    ...data
  }));
  
  res.json({ portfolios: allPortfolios });
});

// Add some test data for demo
const addTestData = () => {
  const testAddress = '0x742d35cc6635c0532925a3b8d2b2a9f1a3f1f2f0';
  portfolioData.set(testAddress, {
    address: testAddress,
    totalBets: 5,
    totalWinnings: '2500000000000000000000', // 2500 USDC
    totalLosses: '1000000000000000000000',   // 1000 USDC
    winStreak: 3,
    trades: [
      {
        marketId: 1,
        outcome: 'YES',
        amount: '500000000000000000000',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        won: true
      },
      {
        marketId: 2,
        outcome: 'NO',
        amount: '300000000000000000000',
        timestamp: new Date(Date.now() - 43200000).toISOString(),
        won: false
      }
    ]
  });
  console.log(`🎲 Test portfolio added for ${testAddress}`);
};

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DecentralBet Backend running on port ${PORT}`);
  addTestData();
  console.log(`📊 Portfolio storage initialized (${portfolioData.size} portfolios)`);
});
