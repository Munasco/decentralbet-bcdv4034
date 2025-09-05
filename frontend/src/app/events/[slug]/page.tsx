"use client"

import * as React from 'react'
import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useCombinedMarkets, useBlockchainMarket } from '@/hooks/useBlockchainMarkets'
import { PolymarketAMM } from '@/lib/trading/ammPricing'
import { slugify } from '@/lib/slug'
import { MarketChart, type ChartDataPoint } from '@/components/markets/MarketChart'
import { TradingPanel } from '@/components/trading/TradingPanel'
import OrderBook from '@/components/trading/OrderBook'
import MarketStats from '@/components/trading/MarketStats'
import Navbar from '@/components/layout/Navbar'
import Comments from '@/components/events/Comments'
import toast from 'react-hot-toast'
import { useTokenBalance, usePlaceBet, useTokenAllowance, useTokenApproval } from '@/hooks/usePredictionMarket'
import { parseUSDC } from '@/lib/decimals'
import { useQueryClient } from '@tanstack/react-query'

interface EventsPageProps {
  params: { slug: string }
}

export default function EventPage({ params }: EventsPageProps) {
  const router = useRouter()
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const { allMarkets, isLoading: listLoading } = useCombinedMarkets()
  const { data: cashUSDC } = useTokenBalance()
  const portfolioUSDC = BigInt(0)

  // Next 15: unwrap dynamic params in client components
  const { slug } = React.use(params as unknown as Promise<{ slug: string }>)

  const matched = useMemo(() => {
    const found = allMarkets.find(m => slugify(m.question) === slug)
    return found || null
  }, [allMarkets, slug])

  const marketId = matched?.id || 0
  const { data: marketData, isLoading, error } = useBlockchainMarket(marketId)

  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

  useEffect(() => {
    if (!marketData) return
    const now = Date.now()
    const points = 50

    // For demo purposes, derive current prices; in real app use onchain/state
    const totalVolume = marketData[9] || BigInt(0)
    const yesShares = totalVolume / BigInt(2)
    const noShares = totalVolume / BigInt(2)
    const p = PolymarketAMM.getMarketPricing(yesShares, noShares)

    let priceYes = p.yesPrice
    let priceNo = p.noPrice
    
    // Create stable seed from marketId to prevent oscillation
    const marketId = marketData[0] || 1
    const seedBase = Number(marketId) * 123456

    const data: ChartDataPoint[] = []
    for (let i = points; i >= 0; i--) {
      const timestamp = now - (i * 60 * 60 * 1000)
      // Use seeded "random" for stable chart data
      const seed = seedBase + i
      const pseudoRandom1 = Math.sin(seed * 0.1) * 0.5 + 0.5 // 0-1 range
      const pseudoRandom2 = Math.sin(seed * 0.2) * 0.5 + 0.5 // 0-1 range
      
      const vol = BigInt(Math.floor(pseudoRandom1 * 100000 * 1e18))
      const date = new Date(timestamp)
      // Stable price walk using seeded values
      const priceChange = (pseudoRandom2 - 0.5) * 0.02
      priceYes = Math.max(0.01, Math.min(0.99, priceYes + priceChange))
      priceNo = 1 - priceYes
      data.push({
        timestamp,
        yesPrice: priceYes,
        noPrice: priceNo,
        volume: vol,
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
    }
    setChartData(data)
  }, [marketData])

  // State for managing the betting flow
  const [isProcessingBet, setIsProcessingBet] = useState(false)
  const [pendingBet, setPendingBet] = useState<{ outcome: 'yes' | 'no'; amount: string } | null>(null)
  
  // Hooks for betting flow
  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance()
  const { data: balance } = useTokenBalance()
  
  // Approval hook with callback to continue with bet
  const { approveTokens, isLoading: isApproving } = useTokenApproval(() => {
    // After approval succeeds, automatically place the pending bet
    if (pendingBet) {
      // Approval successful, placing pending bet
      setTimeout(() => {
        const { outcome, amount } = pendingBet
        const outcomeId = outcome === 'yes' ? 1 : 2 // Use 1-based indexing
        // About to place pending bet
        placeBet(marketId, outcomeId, amount)
        setPendingBet(null)
      },500) // Longer delay to let approval settle
    }
  })
  
  // Betting hook with callback to finish the flow and invalidate cache
  const { placeBet, isLoading: isBetting } = usePlaceBet(() => {
    setIsProcessingBet(false)
    setPendingBet(null)
    
    // Invalidate relevant caches after successful bet
    setTimeout(async () => {
      // Invalidate market data queries
      await queryClient.invalidateQueries({ queryKey: ['market-metrics', Number(marketId)] })
      await queryClient.invalidateQueries({ queryKey: ['top-holders', Number(marketId)] })
      await queryClient.invalidateQueries({ queryKey: ['market-activity', Number(marketId)] })
      await queryClient.invalidateQueries({ queryKey: ['order-book', Number(marketId)] })
      await queryClient.invalidateQueries({ queryKey: ['blockchain-market', marketId] })
      await queryClient.invalidateQueries({ queryKey: ['token-balance'] })
      
      // Force refetch to show updated values
      await queryClient.refetchQueries({ queryKey: ['market-metrics', Number(marketId)] })
      await queryClient.refetchQueries({ queryKey: ['blockchain-market', marketId] })
    }, 1500) // Give blockchain time to update
  })
  
  const handlePlaceBet = async (outcome: 'yes' | 'no', amount: string) => {
    if (!address) {
      toast.error('Please connect your wallet')
      return
    }
    
    if (!marketId || marketId <= 0) {
      toast.error(`Invalid market ID: ${marketId}`)
      setIsProcessingBet(false)
      return
    }
    
    if (isProcessingBet) {
      return // Prevent multiple clicks
    }
    
    setIsProcessingBet(true)
    
    try {
      // Validate outcome count from market data
      const outcomeCount = marketData ? Number(marketData[10]) : 0
      const isResolved = marketData ? marketData[7] : false
      
      // Check if market is resolved
      if (isResolved) {
        toast.error('Cannot bet on resolved market')
        setIsProcessingBet(false)
        return
      }
      
      // Contract uses 1-based indexing for outcome IDs
      const outcomeId = outcome === 'yes' ? 1 : 2
      
      if (outcomeCount < 2) {
        toast.error(`Market has insufficient outcomes: ${outcomeCount}`)
        setIsProcessingBet(false)
        return
      }
      
      const amountWei = parseUSDC(amount)
      
      // Check if user has enough balance
      if (balance && amountWei > balance) {
        toast.error('Insufficient USDC balance')
        setIsProcessingBet(false)
        return
      }
      
      // Refresh allowance to get latest value
      await refetchAllowance()
      
      // Balance and allowance are checked by the UI validation
      
      // Check if we need approval first
      if (!allowance || allowance < amountWei) {
        // Need approval first
        
        // Store the bet details for after approval
        setPendingBet({ outcome, amount })
        
        // Request approval - the success callback will handle placing the bet
        toast.loading('Step 1/2: Approving USDC...', { id: 'bet-flow' })
        approveTokens(amount)
      } else {
        // We have enough allowance, place bet directly
        // Sufficient allowance, place bet directly
        toast.loading('Placing bet...', { id: 'bet-flow' })
        placeBet(marketId, outcomeId, amount)
      }
      
    } catch (error) {
      console.error('Error in handlePlaceBet:', error)
      toast.error('Failed to place bet: ' + (error as Error).message)
      setIsProcessingBet(false)
      setPendingBet(null)
    }
  }

  if (listLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-200">Loading market...</p>
        </div>
      </div>
    )
  }

  if (!matched || error || !marketData) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Market Not Found</h2>
          <p className="text-gray-200 mb-4">The market you&apos;re looking for doesn&apos;t exist.</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            Back to Markets
          </button>
        </div>
      </div>
    )
  }

  const id = marketData[0]
  const question = marketData[1]
  const endTime = marketData[4]
  const creator = marketData[6]
  const isResolved = marketData[7]
  const totalVolume = marketData[9]

  const yesShares = totalVolume / BigInt(2)
  const noShares = totalVolume / BigInt(2)
  const pricing = PolymarketAMM.getMarketPricing(yesShares, noShares)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar cashUSDC={cashUSDC} portfolioUSDC={portfolioUSDC} />

      {/* Main */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Chart & Stats */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg">
              <MarketChart 
                data={chartData}
                currentYesPrice={pricing.yesPrice}
                currentNoPrice={pricing.noPrice}
                totalVolume={totalVolume}
              />
            </div>

            <MarketStats 
              marketId={Number(id)}
              marketData={{ totalVolume, yesShares, noShares, endTime: BigInt(endTime), isResolved, creator }}
              pricing={pricing}
            />
          </div>

          {/* Right: Trading & Orderbook */}
          <div className="space-y-6">
            <TradingPanel 
              market={{ id: Number(id), question, yesShares, noShares, totalVolume }} 
              onPlaceBet={handlePlaceBet}
              isLoading={isProcessingBet || isApproving || isBetting}
            />
            <OrderBook marketId={Number(id)} yesPrice={pricing.yesPrice * 100} noPrice={pricing.noPrice * 100} />
          </div>
        </div>
        
        {/* Comments Section - Full width below main content */}
        <div className="mt-8">
          <Comments />
        </div>
      </div>
    </div>
  )
}

