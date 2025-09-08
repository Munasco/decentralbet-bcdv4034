import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage using Map (resets on server restart)
const portfolioData = new Map<string, {
  address: string;
  totalBets: number;
  totalWinnings: bigint;
  totalLosses: bigint;
  winStreak: number;
  trades: Array<{
    marketId: number;
    outcome: string;
    amount: string;
    timestamp: string;
    won?: boolean;
  }>;
}>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  const portfolio = portfolioData.get(address.toLowerCase()) || {
    address: address.toLowerCase(),
    totalBets: 0,
    totalWinnings: BigInt(0),
    totalLosses: BigInt(0),
    winStreak: 0,
    trades: []
  };

  // Convert BigInt to string for JSON serialization
  return NextResponse.json({
    ...portfolio,
    totalWinnings: portfolio.totalWinnings.toString(),
    totalLosses: portfolio.totalLosses.toString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, marketId, outcome, amount, won } = body;

    if (!address || !marketId || !outcome || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const addressKey = address.toLowerCase();
    const currentPortfolio = portfolioData.get(addressKey) || {
      address: addressKey,
      totalBets: 0,
      totalWinnings: BigInt(0),
      totalLosses: BigInt(0),
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

    // Update portfolio stats
    const amountBigInt = BigInt(amount);
    if (won) {
      currentPortfolio.totalWinnings += amountBigInt;
      currentPortfolio.winStreak += 1;
    } else {
      currentPortfolio.totalLosses += amountBigInt;
      currentPortfolio.winStreak = 0;
    }

    // Store updated portfolio
    portfolioData.set(addressKey, currentPortfolio);

    console.log(`📊 Portfolio updated for ${address}:`, {
      totalBets: currentPortfolio.totalBets,
      totalWinnings: currentPortfolio.totalWinnings.toString(),
      totalLosses: currentPortfolio.totalLosses.toString(),
      winStreak: currentPortfolio.winStreak
    });

    return NextResponse.json({ 
      success: true, 
      portfolio: {
        ...currentPortfolio,
        totalWinnings: currentPortfolio.totalWinnings.toString(),
        totalLosses: currentPortfolio.totalLosses.toString(),
      }
    });

  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Debug endpoint to see all portfolios
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug');
  
  if (debug === 'all') {
    const allPortfolios = Array.from(portfolioData.entries()).map(([address, data]) => ({
      address,
      ...data,
      totalWinnings: data.totalWinnings.toString(),
      totalLosses: data.totalLosses.toString(),
    }));
    
    return NextResponse.json({ portfolios: allPortfolios });
  }

  return NextResponse.json({ error: 'Invalid debug request' }, { status: 400 });
}
