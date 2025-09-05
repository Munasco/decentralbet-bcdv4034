/**
 * Stable mock data utilities to prevent oscillating values
 * This replaces Math.random() calls that cause constant re-renders
 */

// Deterministic pseudo-random generator using a seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Hash a string to get a consistent number
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate stable market metrics based on market data
export function generateStableMarketMetrics(marketId: number | string, totalVolume: bigint) {
  const seed = typeof marketId === 'string' ? hashString(marketId) : marketId;
  const volumeNum = Number(totalVolume) / 1e18;
  
  // Make metrics respond to actual volume changes
  const volumeBonus = Math.floor(volumeNum / 1000); // More participants with higher volume
  const volumeActivity = Math.min(volumeNum / 10000, 0.1); // More price activity with volume
  
  return {
    participantCount: 50 + Math.floor(seededRandom(seed * 1) * 450) + volumeBonus, // Volume affects participants
    priceChange24h: (seededRandom(seed * 2) - 0.5) * (0.2 + volumeActivity), // Volume affects volatility
    volumeChange24h: (seededRandom(seed * 3) - 0.5) * 0.3, // -0.15 to +0.15 (15% range)
    liquidityMultiplier: 0.08 + seededRandom(seed * 4) * 0.04, // 8-12% of volume
  };
}

// Generate stable top holders data
export function generateStableTopHolders(marketId: number | string) {
  const seed = typeof marketId === 'string' ? hashString(marketId) : marketId;
  const holders = [];
  
  const addresses = [
    '0x1234567890abcdef1234567890abcdef12345678',
    '0x9876543210fedcba9876543210fedcba98765432', 
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    '0xfedcbafedcbafedcbafedcbafedcbafedcbafed',
    '0x5555555555555555555555555555555555555555',
    '0x7777777777777777777777777777777777777777',
    '0xbeefc0febeefc0febeefc0febeefc0febeefc0fe',
    '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
  ];

  for (let i = 0; i < 5; i++) {
    const holderSeed = seed + i * 100;
    const shares = 15000 - (i * 2000) + Math.floor(seededRandom(holderSeed * 1) * 1000);
    const price = 0.6 + seededRandom(holderSeed * 2) * 0.3; // 60-90 cents
    const value = shares * price;
    const pnl = (seededRandom(holderSeed * 3) - 0.4) * value * 0.3; // Slightly positive bias
    
    holders.push({
      id: (i + 1).toString(),
      address: addresses[i],
      position: seededRandom(holderSeed * 4) > 0.4 ? 'YES' : 'NO' as 'YES' | 'NO',
      shares,
      value: Math.round(value * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      percentage: Math.round((12 - i * 2 + seededRandom(holderSeed * 5) * 2) * 10) / 10
    });
  }
  
  return holders;
}

// Generate stable market activity
export function generateStableMarketActivity(marketId: number | string) {
  const seed = typeof marketId === 'string' ? hashString(marketId) : marketId;
  const activities = [];
  
  // Add some time-based variation to make it feel more alive
  const timeSeed = Math.floor(Date.now() / (1000 * 60 * 5)); // Changes every 5 minutes
  const activityVariation = seededRandom(seed * timeSeed);
  
  const users = [
    '0x1234...5678', '0xabcd...efgh', '0x9876...5432', 
    '0xdef0...1234', '0x5555...aaaa', '0x7777...bbbb'
  ];
  
  const actions = [
    'Bought {amount} YES shares',
    'Sold {amount} NO shares', 
    'Bought {amount} NO shares',
    'Sold {amount} YES shares'
  ];
  
  const milestones = [
    'Market reached $50K volume',
    'Price crossed 70¢ threshold',
    'New 24h volume high',
    '100+ participants joined'
  ];

  for (let i = 0; i < 5; i++) {
    const activitySeed = seed + i * 200 + timeSeed;
    const isLargeTrade = seededRandom(activitySeed * 1) > (0.7 + activityVariation * 0.1);
    const isMilestone = seededRandom(activitySeed * 2) > (0.85 - activityVariation * 0.05);
    
    if (isMilestone) {
      activities.push({
        id: (i + 1).toString(),
        type: 'milestone' as const,
        user: 'System',
        action: milestones[Math.floor(seededRandom(activitySeed * 3) * milestones.length)],
        timestamp: new Date(Date.now() - (i * 5 + 2) * 60 * 1000),
        significance: 'high' as const
      });
    } else {
      const amount = isLargeTrade 
        ? 1500 + Math.floor(seededRandom(activitySeed * 4) * 2000)  // 1500-3500
        : 200 + Math.floor(seededRandom(activitySeed * 5) * 800);   // 200-1000
      
      const price = 0.35 + seededRandom(activitySeed * 6) * 0.45; // 35-80 cents
      const action = actions[Math.floor(seededRandom(activitySeed * 7) * actions.length)]
        .replace('{amount}', amount.toLocaleString());
      
      activities.push({
        id: (i + 1).toString(),
        type: isLargeTrade ? 'large_trade' as const : 'trade' as const,
        user: users[Math.floor(seededRandom(activitySeed * 8) * users.length)],
        action,
        amount: Math.round(amount * price),
        price,
        timestamp: new Date(Date.now() - (i * 5 + 2) * 60 * 1000),
        significance: isLargeTrade ? 'high' as const : 'medium' as const
      });
    }
  }
  
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// Generate stable context insights
export function generateStableContextInsights(marketId: number | string) {
  const seed = typeof marketId === 'string' ? hashString(marketId) : marketId;
  
  const newsInsights = [
    {
      title: 'Related News Coverage Increasing',
      content: 'Major news outlets have increased coverage of this topic by 35% in the last 48 hours. This correlates with the recent price movement.',
    },
    {
      title: 'Expert Analysis Published',
      content: 'Leading analysts have published bullish reports citing strong fundamentals and positive momentum indicators.',
    },
    {
      title: 'Regulatory Clarity Emerging',
      content: 'Recent regulatory updates provide clearer guidelines, reducing uncertainty in the market.',
    }
  ];
  
  const socialInsights = [
    {
      title: 'Social Media Sentiment Shift', 
      content: 'Twitter mentions show a 28% increase in positive sentiment toward the YES outcome. Key influencers are driving the conversation.',
    },
    {
      title: 'Community Engagement Rising',
      content: 'Discord and Telegram communities show 45% increase in active discussions about this market.',
    },
    {
      title: 'Influencer Endorsements',
      content: 'Notable figures in the space have begun expressing interest, driving organic engagement.',
    }
  ];
  
  const analysisInsights = [
    {
      title: 'Technical Pattern Recognition',
      content: 'Price action shows a bullish flag pattern forming. Historical similar patterns have a 67% success rate.',
    },
    {
      title: 'Volume Profile Analysis',
      content: 'Trading volume distribution indicates strong support at current levels with healthy accumulation.',
    },
    {
      title: 'Market Structure Health',
      content: 'Order book depth and spread analysis shows improving market structure and liquidity.',
    }
  ];
  
  const predictionInsights = [
    {
      title: 'Whale Activity Alert',
      content: 'Large holders have been accumulating YES positions. This represents a 15% increase in whale holdings over 24h.',
    },
    {
      title: 'Smart Money Tracking',
      content: 'Wallets with historically high accuracy are showing consistent accumulation patterns.',
    },
    {
      title: 'Cross-Market Correlation',
      content: 'Similar markets are showing correlated movements, suggesting broader trend alignment.',
    }
  ];
  
  const insights = [
    {
      category: 'news' as const,
      ...newsInsights[Math.floor(seededRandom(seed * 1) * newsInsights.length)],
      confidence: 0.75 + seededRandom(seed * 2) * 0.2,
      source: 'News Sentiment AI',
      timestamp: new Date(Date.now() - 30 * 60 * 1000)
    },
    {
      category: 'social' as const,
      ...socialInsights[Math.floor(seededRandom(seed * 3) * socialInsights.length)],
      confidence: 0.65 + seededRandom(seed * 4) * 0.25,
      source: 'Social Analytics',
      timestamp: new Date(Date.now() - 45 * 60 * 1000)
    },
    {
      category: 'analysis' as const,
      ...analysisInsights[Math.floor(seededRandom(seed * 5) * analysisInsights.length)],
      confidence: 0.60 + seededRandom(seed * 6) * 0.25,
      source: 'Technical Analysis AI', 
      timestamp: new Date(Date.now() - 60 * 60 * 1000)
    },
    {
      category: 'prediction' as const,
      ...predictionInsights[Math.floor(seededRandom(seed * 7) * predictionInsights.length)],
      confidence: 0.80 + seededRandom(seed * 8) * 0.15,
      source: 'On-chain Analytics',
      timestamp: new Date(Date.now() - 75 * 60 * 1000)
    }
  ];
  
  return insights.map((insight, index) => ({
    id: (index + 1).toString(),
    ...insight
  }));
}

// Generate stable order book data
export function generateStableOrderBook(yesPrice: number, noPrice: number, seed: number) {
  const orders = {
    yes: [] as Array<{ price: number; amount: number; total: number }>,
    no: [] as Array<{ price: number; amount: number; total: number }>
  };
  
  // Generate YES orders around current price
  let total = 0;
  for (let i = 0; i < 8; i++) {
    const priceOffset = (seededRandom(seed * 10 + i) - 0.5) * 0.15; // ±15%
    const price = Math.max(0.01, Math.min(0.99, yesPrice + priceOffset));
    const amount = 100 + Math.floor(seededRandom(seed * 20 + i) * 500);
    total += amount;
    
    orders.yes.push({
      price: Math.round(price * 100) / 100,
      amount,
      total
    });
  }
  
  // Generate NO orders
  total = 0;
  for (let i = 0; i < 8; i++) {
    const priceOffset = (seededRandom(seed * 30 + i) - 0.5) * 0.15;
    const price = Math.max(0.01, Math.min(0.99, noPrice + priceOffset));
    const amount = 100 + Math.floor(seededRandom(seed * 40 + i) * 500);
    total += amount;
    
    orders.no.push({
      price: Math.round(price * 100) / 100,
      amount,
      total
    });
  }
  
  return orders;
}
