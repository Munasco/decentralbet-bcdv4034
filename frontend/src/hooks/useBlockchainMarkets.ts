import { useState, useEffect } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { CONTRACTS, PREDICTION_MARKET_ABI } from '../config/contracts'
import { formatUSDC } from '../lib/decimals'

export interface BlockchainMarket {
  id: number
  question: string
  category: string
  description: string
  endTime: number
  creator: string
  isResolved: boolean
  winningOutcome: number
  totalVolume: bigint
  outcomeCount: number
  resolutionTime: number
}

export function useMarketCount() {
  return useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'marketCounter',
  })
}

export function useBlockchainMarket(marketId: number) {
  return useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
    query: {
      enabled: marketId > 0,
    },
  })
}

export function useAllBlockchainMarkets() {
  const [markets, setMarkets] = useState<BlockchainMarket[]>([])
  const { data: marketCount, refetch: refetchCount, isLoading: countLoading, error: countError } = useMarketCount()


  // Create contract calls for all markets only if we have a valid count
  const marketIds = marketCount && Number(marketCount) > 0 ? Array.from({ length: Number(marketCount) }, (_, i) => i + 1) : []
  
  const { data: marketData, isLoading: marketsLoading, refetch, error: marketsError } = useReadContracts({
    contracts: marketIds.map((marketId) => ({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getMarket',
      args: [BigInt(marketId)],
    })),
    query: {
      enabled: Boolean(marketIds.length > 0),
    },
  })

  useEffect(() => {
    // Handle the case where contract calls fail or return no data
    if (countError) {
      console.warn('Failed to read market count:', countError)
      setMarkets([])
      return
    }

    if (marketsError) {
      console.warn('Failed to read markets:', marketsError)
      setMarkets([])
      return
    }

    if (!marketData || marketIds.length === 0) {
      setMarkets([])
      return
    }

    try {
      const validMarkets: BlockchainMarket[] = []
      
      marketData.forEach((result, index) => {
        if (result.status === 'success' && result.result) {
          const data = result.result as unknown as [bigint, string, string, string, bigint, bigint, string, boolean, bigint, bigint, bigint]
          
          const market: BlockchainMarket = {
            id: Number(data[0]),
            question: data[1],
            category: data[2], 
            description: data[3],
            endTime: Number(data[4]),
            resolutionTime: Number(data[5]),
            creator: data[6],
            isResolved: data[7],
            winningOutcome: Number(data[8]),
            totalVolume: data[9],
            outcomeCount: Number(data[10]),
          }
          
          // Only add valid markets (with non-empty questions)
          if (market.question && market.question.length > 0) {
            validMarkets.push(market)
          }
        } else if (result.status === 'failure') {
          console.warn(`Failed to fetch market ${index + 1}:`, result.error)
        }
      })
      
      setMarkets(validMarkets)
    } catch (error) {
      console.error('Error parsing blockchain markets:', error)
      setMarkets([])
    }
  }, [marketData, marketIds.length, countError, marketsError])

  return { 
    markets, 
    isLoading: countLoading || marketsLoading, 
    refetch: () => {
      refetchCount()
      refetch()
    },
    error: countError || marketsError
  }
}

// Hook to show only real blockchain markets
export function useCombinedMarkets() {
  const { markets: blockchainMarkets, isLoading, error } = useAllBlockchainMarkets()
  const { data: marketCount } = useMarketCount()
  

  // Convert blockchain markets to display format
  const formattedBlockchainMarkets = blockchainMarkets.map(market => ({
    id: market.id,
    question: market.question,
    category: market.category,
    description: market.description,
    yesPrice: 0.5, // Default until we implement price calculation
    noPrice: 0.5,
    volume: `$${formatUSDC(market.totalVolume)}`, // Properly format USDC volume
    ends: new Date(market.endTime * 1000).toLocaleDateString(),
    image: getCategoryIcon(market.category),
    isBlockchain: true
  }))

  return {
    allMarkets: formattedBlockchainMarkets, // Only real blockchain markets
    blockchainMarkets: formattedBlockchainMarkets,
    marketCount: Number(marketCount || 0),
    isLoading,
    error,
    hasBlockchainMarkets: formattedBlockchainMarkets.length > 0
  }
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Crypto': '🪙',
    'Technology': '🤖',
    'Politics': '🏛️',
    'Sports': '⚽',
    'Economics': '📊',
    'Space': '🚀',
    'Science': '🔬',
    'Entertainment': '🎬'
  }
  return icons[category] || '❓'
}
