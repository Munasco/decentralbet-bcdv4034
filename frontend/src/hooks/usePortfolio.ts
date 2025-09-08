import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface PortfolioData {
  address: string;
  totalBets: number;
  totalWinnings: string; // BigInt as string
  totalLosses: string;   // BigInt as string
  winStreak: number;
  trades: Array<{
    marketId: number;
    outcome: string;
    amount: string;
    timestamp: string;
    won?: boolean;
  }>;
}

export function usePortfolio() {
  const { address } = useAccount();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPortfolio = async (userAddress: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/portfolio?address=${userAddress}`);
      if (response.ok) {
        const data = await response.json();
        setPortfolio(data);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTrade = async (marketId: number, outcome: string, amount: string, won: boolean = false) => {
    if (!address) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, marketId, outcome, amount, won })
      });
      
      if (response.ok) {
        const result = await response.json();
        setPortfolio(result.portfolio);
        console.log('✅ Backend: Trade recorded:', { marketId, outcome, amount, won });
      }
    } catch (error) {
      console.error('Failed to add trade:', error);
    }
  };

  useEffect(() => {
    if (address) {
      fetchPortfolio(address);
    } else {
      setPortfolio(null);
    }
  }, [address]);

  const portfolioValue = portfolio ? BigInt(portfolio.totalWinnings) - BigInt(portfolio.totalLosses) : BigInt(0);

  return {
    portfolio,
    portfolioValue, // Net winnings as BigInt
    isLoading,
    addTrade,
    refetch: () => address && fetchPortfolio(address)
  };
}
