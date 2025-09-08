'use client'

import React from 'react'
import { BarChart3 } from 'lucide-react'
import { useAllMarkets } from '@/hooks/usePredictionMarket'
import { formatUSDC } from '@/lib/decimals'
import { Button } from '@/components/ui/button'

interface MarketDiscoveryProps {
  onMarketSelect?: (marketId: number) => void
  onCreateMarket?: () => void
  searchQuery?: string
  selectedCategory?: string
}

export default function MarketDiscovery({ 
  onMarketSelect, 
  onCreateMarket, 
  searchQuery = '', 
  selectedCategory = 'all' 
}: MarketDiscoveryProps) {
  const { markets, isLoading: loading } = useAllMarkets()
  const error = null // useAllMarkets doesn't return error in current implementation

  // Filter markets based on search query
  const filteredMarkets = markets.filter(market => {
    if (searchQuery && !market.question.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const getTimeRemaining = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = endTime - now

    if (diff <= 0) return 'Ended'

    const days = Math.floor(diff / 86400)
    const hours = Math.floor((diff % 86400) / 3600)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h`
    return 'Soon'
  }

  // For now, return 50/50 since we don't have outcome data in the simplified Market interface
  const getYesPrice = () => 0.5

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Prediction Markets
          </h1>
          <p className="mt-2 text-muted-foreground">
            Explore and bet on blockchain-powered prediction markets
          </p>
        </div>
        <Button onClick={onCreateMarket} size="lg">
          Create Market
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive">
            Failed to load markets: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-muted rounded mb-4"></div>
              <div className="h-3 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded mb-4"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-muted rounded w-20"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Markets Grid */}
      {!loading && filteredMarkets.length > 0 && (
        <>
          <div className="mb-4 text-sm text-muted-foreground">
            Showing {filteredMarkets.length} market{filteredMarkets.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => {
              const yesPrice = getYesPrice()
              const noPrice = 1 - yesPrice
              const isActive = !market.isResolved && market.endTime > Math.floor(Date.now() / 1000)
              
              return (
                <div
                  key={market.id}
                  onClick={() => onMarketSelect?.(market.id)}
                  className="bg-card rounded-lg p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer border border-border"
                >
                  {/* Market Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        isActive ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isActive ? 'Active' : market.isResolved ? 'Resolved' : 'Ended'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getTimeRemaining(market.endTime)}
                    </div>
                  </div>

                  {/* Market Question */}
                  <h3 className="font-semibold text-card-foreground mb-4 line-clamp-2">
                    {market.question}
                  </h3>

                  {/* Outcomes */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">YES</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-card-foreground">
                          {Math.round(yesPrice * 100)}%
                        </span>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success transition-all"
                            style={{ width: `${yesPrice * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">NO</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-card-foreground">
                          {Math.round(noPrice * 100)}%
                        </span>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-error transition-all"
                            style={{ width: `${noPrice * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Market Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      <span>${formatUSDC(market.totalVolume)} volume</span>
                    </div>
                    <div className="text-xs">
                      Market #{market.id}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && filteredMarkets.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="text-muted-foreground text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-card-foreground mb-2">
            No markets found
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? `No markets match your search for "${searchQuery}"`
              : markets.length === 0 
              ? 'No markets have been created yet' 
              : 'No markets match the current filters'}
          </p>
          <Button onClick={onCreateMarket} size="lg">
            Create First Market
          </Button>
        </div>
      )}
    </div>
  )
}
