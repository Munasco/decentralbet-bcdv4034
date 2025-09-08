"use client";

import { useState, useEffect } from 'react';
import { useMarketCount, useMarket } from '../hooks/usePredictionMarket';

interface Market {
  id: number;
  question: string;
  category: string;
  description: string;
  endTime: number;
  totalVolume: bigint;
  isResolved: boolean;
}

export default function DynamicMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get market count first
  const { data: marketCount, isLoading: countLoading, error: countError } = useMarketCount();
  
  useEffect(() => {
    async function fetchMarkets() {
      if (countLoading || countError || !marketCount) {
        return;
      }
      
      console.log('🏪 DynamicMarkets: Fetching', marketCount.toString(), 'markets...');
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedMarkets: Market[] = [];
        const count = Number(marketCount);
        
        // Fetch each market individually (we'll optimize this later)
        for (let i = 1; i <= count; i++) {
          console.log(`🏪 DynamicMarkets: Fetching market ${i}...`);
          
          // For now, we'll create a hook-based component for each market
          // This is not ideal but will work for debugging
        }
        
        setMarkets(fetchedMarkets);
        console.log('🏪 DynamicMarkets: Successfully loaded', fetchedMarkets.length, 'markets');
        
      } catch (error) {
        console.error('🏪 DynamicMarkets: Error fetching markets:', error);
        setError('Failed to load markets from blockchain');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMarkets();
  }, [marketCount, countLoading, countError]);
  
  if (countLoading || isLoading) {
    return (
      <div className="col-span-2 text-center py-12">
        <div className="text-gray-500">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          Loading markets from blockchain...
        </div>
      </div>
    );
  }

  if (countError || error) {
    return (
      <div className="col-span-2 text-center py-12">
        <div className="text-red-500">
          <p>Error loading markets: {countError?.message || error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!marketCount || marketCount === 0n) {
    return (
      <div className="col-span-2 text-center py-12">
        <div className="text-gray-500 space-y-2">
          <p className="text-lg">No markets found on blockchain!</p>
          <p className="text-sm">Create the first prediction market.</p>
          <button 
            onClick={() => window.open('/create', '_self')}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            🎯 Create First Market
          </button>
        </div>
      </div>
    );
  }

  // For now, show simple market count and use individual market components
  const marketIds = Array.from({ length: Number(marketCount) }, (_, i) => i + 1);

  return (
    <>
      {marketIds.map((marketId) => (
        <MarketCard key={marketId} marketId={marketId} />
      ))}
    </>
  );
}

// Individual market component using the hook
function MarketCard({ marketId }: { marketId: number }) {
  const { data: marketData, isLoading, error } = useMarket(marketId);
  
  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>
    );
  }
  
  if (error || !marketData) {
    return (
      <div className="bg-gray-900 rounded-lg border border-red-800 p-6">
        <div className="text-red-400 text-sm">
          Error loading market {marketId}: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }
  
  // Parse market data - marketData is a tuple from the contract
  const [
    id,           // 0: uint256 id
    question,     // 1: string question  
    category,     // 2: string category
    description,  // 3: string description
    endTime,      // 4: uint256 endTime
    resolutionTime, // 5: uint256 resolutionTime
    creator,      // 6: address creator
    isResolved,   // 7: bool isResolved
    winningOutcome, // 8: uint256 winningOutcome
    totalVolume,  // 9: uint256 totalVolume
    outcomeCount  // 10: uint256 outcomeCount
  ] = marketData;
  
  // Create a slug for the URL
  const slug = question.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  const formatVolume = (volume: bigint) => {
    const volInUSDC = Number(volume) / 1e18;
    return volInUSDC.toFixed(2);
  };
  
  return (
    <div 
      className="bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
      onClick={() => window.location.href = `/events/${slug}`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🎯</span>
            <div>
              <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                {category} • {isResolved ? 'RESOLVED' : 'LIVE'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">${formatVolume(totalVolume)}</div>
              <div className="text-xs text-gray-500">Volume</div>
            </div>
            <div className="relative w-12 h-12" aria-label="chance gauge">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#10b981 50%, #374151 0)`
                }}
              />
              <div className="absolute inset-1 bg-gray-900 rounded-full flex items-center justify-center text-xs text-gray-100 font-medium">
                50%
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-white mb-4 line-clamp-2">
          {question}
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-800 border border-gray-700 text-gray-200 font-medium py-3 px-4 rounded-lg">
            <div className="text-xs opacity-75">YES</div>
            <div className="text-lg font-bold text-green-400">50¢</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 text-gray-200 font-medium py-3 px-4 rounded-lg">
            <div className="text-xs opacity-75">NO</div>
            <div className="text-lg font-bold text-red-400">50¢</div>
          </div>
        </div>

        <div className="flex justify-between text-sm text-gray-300">
          <span>Ends {new Date(Number(endTime) * 1000).toLocaleDateString()}</span>
          <span>🔗 Market #{Number(id)}</span>
        </div>
      </div>
    </div>
  );
}
