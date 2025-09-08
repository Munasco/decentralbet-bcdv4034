import { useQuery } from '@tanstack/react-query';
import { 
  generateStableMarketMetrics, 
  generateStableTopHolders, 
  generateStableMarketActivity,
  generateStableContextInsights,
  generateStableOrderBook
} from '@/lib/mockData';

// Types
export interface Holder {
  id: string;
  address: string;
  position: 'YES' | 'NO';
  shares: number;
  value: number;
  pnl: number;
  percentage: number;
}

export interface MarketActivity {
  id: string;
  type: 'trade' | 'large_trade' | 'milestone' | 'resolution';
  user: string;
  action: string;
  amount?: number;
  price?: number;
  timestamp: Date;
  significance?: 'high' | 'medium' | 'low';
}

export interface ContextInsight {
  id: string;
  category: 'news' | 'social' | 'analysis' | 'prediction';
  title: string;
  content: string;
  confidence: number;
  source: string;
  timestamp: Date;
}

export interface MarketMetrics {
  participantCount: number;
  priceChange24h: number;
  volumeChange24h: number;
  liquidityMultiplier: number;
}

export interface OrderBookData {
  yes: Array<{ price: number; amount: number; total: number }>;
  no: Array<{ price: number; amount: number; total: number }>;
}

// Hook for stable market metrics
export function useMarketMetrics(marketId: number | string, totalVolume: bigint) {
  return useQuery({
    queryKey: ['market-metrics', marketId, totalVolume.toString()],
    queryFn: () => generateStableMarketMetrics(marketId, totalVolume),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Hook for top holders data
export function useTopHolders(marketId: number | string) {
  return useQuery({
    queryKey: ['top-holders', marketId],
    queryFn: () => generateStableTopHolders(marketId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
  });
}

// Hook for market activity feed  
export function useMarketActivity(marketId: number | string) {
  return useQuery({
    queryKey: ['market-activity', marketId],
    queryFn: () => generateStableMarketActivity(marketId),
    staleTime: 1000 * 60, // 1 minute - shorter for activity
    gcTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 90, // Gentle 90-second updates for activity
    refetchIntervalInBackground: false, // Only when tab is active
  });
}

// Hook for AI context insights
export function useContextInsights(marketId: number | string) {
  return useQuery({
    queryKey: ['context-insights', marketId],
    queryFn: () => generateStableContextInsights(marketId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,
  });
}

// Hook for order book data
export function useOrderBook(
  marketId: number | string, 
  yesPrice: number, 
  noPrice: number
) {
  // Create a stable seed from marketId for consistent order book
  const seed = typeof marketId === 'string' ? 
    marketId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 
    marketId;
    
  return useQuery({
    queryKey: ['order-book', marketId, Math.round(yesPrice * 100), Math.round(noPrice * 100)],
    queryFn: () => generateStableOrderBook(yesPrice, noPrice, seed),
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5
    // Removed refetchInterval to prevent interference with betting
  });
}

// Combined hook for all market social data
export function useMarketSocialData(marketId: number | string, totalVolume: bigint) {
  const metrics = useMarketMetrics(marketId, totalVolume);
  const holders = useTopHolders(marketId);
  const activity = useMarketActivity(marketId);
  const insights = useContextInsights(marketId);
  
  return {
    metrics,
    holders,
    activity,
    insights,
    isLoading: metrics.isLoading || holders.isLoading || activity.isLoading || insights.isLoading,
    isError: metrics.isError || holders.isError || activity.isError || insights.isError,
  };
}

// Hook for simulating real-time price updates (stable but refreshing)
export function useRealTimePricing(marketId: number | string, baseYesPrice: number) {
  return useQuery({
    queryKey: ['realtime-pricing', marketId, Math.round(baseYesPrice * 100)],
    queryFn: async () => {
      // Generate immediate pricing data
      
      // Generate small price variations (±2%) around base price
      const seed = typeof marketId === 'string' ? 
        marketId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 
        marketId;
      
      // Use current timestamp to create slow variations
      const timeVariation = Math.sin(Date.now() / 10000) * 0.02; // ±2% over time
      const priceVariation = (Math.sin(seed) * 0.01); // Small consistent offset per market
      
      const yesPrice = Math.max(0.01, Math.min(0.99, baseYesPrice + timeVariation + priceVariation));
      const noPrice = Math.max(0.01, Math.min(0.99, 1 - yesPrice));
      
      return {
        yesPrice,
        noPrice,
        lastUpdate: new Date(),
      };
    },
    staleTime: 1000 * 60, // 1 minute  
    gcTime: 1000 * 60 * 5
    // Removed refetchInterval to prevent interference with betting
  });
}
