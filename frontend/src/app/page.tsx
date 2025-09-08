"use client";

import { useState, useMemo } from "react";
import { useCombinedMarkets } from '../hooks/useBlockchainMarkets';
import ActivityFeed from '../components/activity/ActivityFeed';
import Navbar from '@/components/layout/Navbar';
import { useTokenBalance } from '@/hooks/usePredictionMarket';
import { usePortfolio } from '@/hooks/usePortfolio';
import { slugify } from '@/lib/slug';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'volume' | 'trending' | 'ending_soon' | 'newest'>('trending');
  
  const { allMarkets, isLoading } = useCombinedMarkets();
  const { data: cashUSDC } = useTokenBalance();
  const { portfolioValue } = usePortfolio(); // Get portfolio from backend!

  const filteredAndSortedMarkets = useMemo(() => {
    // Filter by category (only apply if not "All" and not sorting by trending/newest)
    let filtered = selectedCategory === "All" 
      ? allMarkets 
      : allMarkets.filter(market => market.category === selectedCategory);
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(market => 
        market.question.toLowerCase().includes(query) ||
        market.category.toLowerCase().includes(query)
      );
    }
    
    // Sort markets
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          // Parse volume string (e.g., "$1.2M" -> 1200000)
          const parseVolume = (vol: string) => {
            const num = parseFloat(vol.replace(/[$,M]/g, ''));
            return vol.includes('M') ? num * 1000000 : num;
          };
          return parseVolume(b.volume) - parseVolume(a.volume);
        
        case 'ending_soon':
          // Mock ending dates - in real app would use actual timestamps
          return Math.random() - 0.5; // Random for demo
        
        case 'newest':
          return b.id - a.id; // Higher ID = newer
        
        case 'trending':
        default:
          // Mock trending score based on volume and activity
          const getTrendingScore = (market: typeof allMarkets[0]) => {
            const volumeScore = parseFloat(market.volume.replace(/[$,M]/g, ''));
            const priceVolatility = Math.abs(market.yesPrice - 0.5); // Distance from 50/50
            return volumeScore + priceVolatility * 100;
          };
          return getTrendingScore(b) - getTrendingScore(a);
      }
    });
    
    return sorted;
  }, [allMarkets, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onSelectSort={(s) => setSortBy(s)}
        sortBy={sortBy}
        cashUSDC={cashUSDC}
        portfolioUSDC={portfolioValue}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-50 mb-4">
            Predict the Future, Earn Rewards
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Trade on the outcomes of real-world events. Powered by blockchain technology
            for transparent, secure, and decentralized prediction markets.
          </p>
          {/* CI/CD Test Badge */}
          <div className="mt-6">
            <div className="inline-block bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 p-1 rounded-2xl">
              <div className="bg-gray-900 px-6 py-3 rounded-xl">
                <span className="text-white font-bold text-lg animate-pulse">
                  🚀 Live on Azure Kubernetes Service
                </span>
                <div className="text-center mt-1">
                  <span className="text-xs text-green-400 font-mono">
                    CI/CD Pipeline Active ✅
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Markets Column */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoading ? (
                <div className="col-span-2 text-center py-12">
                  <div className="text-gray-500">Loading markets from blockchain...</div>
                </div>
              ) : filteredAndSortedMarkets.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <div className="text-gray-500 space-y-2">
                    <p className="text-lg">No markets available yet!</p>
                    <p className="text-sm">Be the first to create a prediction market.</p>
                    <button 
                      onClick={() => window.open('/create', '_self')}
                      className="mt-4 bg-success hover:bg-success/90 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      🎯 Create First Market
                    </button>
                  </div>
                </div>
              ) : (
                filteredAndSortedMarkets.map((market) => (
                  <div 
                    key={market.id} 
                    className="bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
                    onClick={() => window.location.href = `/events/${slugify(market.question)}`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{market.image}</span>
                          <div>
                            <span className="px-2 py-1 text-xs font-medium bg-info-muted/30 text-info rounded-full">
                              {market.category} • LIVE
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-gray-400">{market.volume}</div>
                            <div className="text-xs text-gray-500">Volume</div>
                          </div>
                          {/* Gauge ring showing Yes chance */}
                          <div className="relative w-12 h-12" aria-label="chance gauge">
                            <div
                              className="absolute inset-0 rounded-full"
                              style={{
                                background: `conic-gradient(var(--success) ${(market.yesPrice * 100).toFixed(0)}%, #374151 0)`
                              }}
                            />
                            <div className="absolute inset-1 bg-gray-900 rounded-full flex items-center justify-center text-xs text-gray-100 font-medium">
                              {(market.yesPrice * 100).toFixed(0)}%
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
                          <div className="text-lg font-bold text-success">{(market.yesPrice * 100).toFixed(0)}¢</div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 text-gray-200 font-medium py-3 px-4 rounded-lg">
                          <div className="text-xs opacity-75">NO</div>
                          <div className="text-lg font-bold text-error">{(market.noPrice * 100).toFixed(0)}¢</div>
                        </div>
                      </div>

                      <div className="flex justify-between text-sm text-gray-300">
                        <span>Ends {market.ends}</span>
                        <span>🔥 Trending</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Activity Feed Sidebar */}
          <div className="lg:col-span-1">
            <ActivityFeed className="sticky top-6" maxItems={15} />
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <button 
            onClick={() => window.open('/create', '_self')}
            className="bg-success hover:bg-success/90 text-white font-bold py-3 px-8 rounded-lg text-lg"
          >
            🎯 Create Market
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2025 DecentralBet. Powered by Ethereum blockchain technology.</p>
            <p className="mt-2 text-sm text-gray-500">Trade responsibly. Past performance does not guarantee future results.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
