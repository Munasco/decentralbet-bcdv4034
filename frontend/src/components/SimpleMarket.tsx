"use client";

// Static component - no hooks needed

interface Market {
  id: number;
  question: string;
  category: string;
  description: string;
  endTime: number;
  totalVolume: string;
  isResolved: boolean;
}

export default function SimpleMarket() {
  // Static market data - we know we have 1 market from our blockchain test
  const markets: Market[] = [
    {
      id: 1,
      question: "Will Bitcoin reach $100,000 by end of 2025?",
      category: "Crypto",
      description: "This market resolves to YES if Bitcoin reaches $100K by Dec 31, 2025",
      endTime: Math.floor(new Date('2025-10-07').getTime() / 1000),
      totalVolume: "0.00",
      isResolved: false
    }
  ];
  const loading = false;
  const error = null;

  if (loading) {
    return (
      <div className="col-span-2 text-center py-12">
        <div className="text-gray-500">Loading real blockchain markets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-2 text-center py-12">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (markets.length === 0) {
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

  return (
    <>
      {markets.map((market) => (
        <div 
          key={market.id} 
          className="bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
          onClick={() => window.location.href = `/events/will-bitcoin-reach-100000-by-end-of-2025`}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🪙</span>
                <div>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                    {market.category} • LIVE
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-400">${market.totalVolume}</div>
                  <div className="text-xs text-gray-500">Volume</div>
                </div>
                {/* Placeholder gauge - in real app would calculate from outcomes */}
                <div className="relative w-12 h-12" aria-label="chance gauge">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(#10b981 67%, #374151 0)`
                    }}
                  />
                  <div className="absolute inset-1 bg-gray-900 rounded-full flex items-center justify-center text-xs text-gray-100 font-medium">
                    67%
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-4 line-clamp-2">
              {market.question}
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-800 border border-gray-700 text-gray-200 font-medium py-3 px-4 rounded-lg">
                <div className="text-xs opacity-75">YES</div>
                <div className="text-lg font-bold text-green-400">67¢</div>
              </div>
              <div className="bg-gray-800 border border-gray-700 text-gray-200 font-medium py-3 px-4 rounded-lg">
                <div className="text-xs opacity-75">NO</div>
                <div className="text-lg font-bold text-red-400">33¢</div>
              </div>
            </div>

            <div className="flex justify-between text-sm text-gray-300">
              <span>Ends {new Date(market.endTime * 1000).toLocaleDateString()}</span>
              <span>🔗 On-Chain</span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
