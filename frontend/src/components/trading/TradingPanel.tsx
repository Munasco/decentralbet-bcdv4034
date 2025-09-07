'use client';

import { useState, useMemo } from 'react';
import { focusRing } from '@/styles/accessibility-colors';
import { useAccount } from 'wagmi'
import { PolymarketAMM, type MarketPricing } from '@/lib/trading/ammPricing'
import { formatUSDC, parseUSDC, validateUSDCAmount } from '@/lib/decimals'
import { useTokenBalance } from '@/hooks/usePredictionMarket'

interface Market {
  id: number
  question: string
  yesShares: bigint
  noShares: bigint
  totalVolume: bigint
}

interface TradingPanelProps {
  market: Market
  onPlaceBet?: (outcome: 'yes' | 'no', amount: string) => void
  variant?: 'light' | 'dark'
  isLoading?: boolean
}

export function TradingPanel({ market, onPlaceBet, variant = 'dark', isLoading: externalLoading = false }: TradingPanelProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes')
  const [betAmount, setBetAmount] = useState('1') // Default to $1 bet
  const [internalLoading, setInternalLoading] = useState(false)
  
  const { address } = useAccount()
  const { data: balance } = useTokenBalance()
  
  // Calculate real-time pricing using AMM
  const pricing: MarketPricing = useMemo(() => {
    return PolymarketAMM.getMarketPricing(
      market.yesShares,
      market.noShares,
      betAmount,
      selectedOutcome
    )
  }, [market.yesShares, market.noShares, betAmount, selectedOutcome])
  
  // const currentPrice = selectedOutcome === 'yes' ? pricing.yesPrice : pricing.noPrice
  // const oppositePrice = selectedOutcome === 'yes' ? pricing.noPrice : pricing.yesPrice
  
  // Validate bet amount
  const validation = useMemo(() => {
    if (!betAmount) return { isValid: true, error: undefined }
    return validateUSDCAmount(betAmount)
  }, [betAmount])
  
  // Check if user has sufficient balance
  const hasSufficientBalance = useMemo(() => {
    if (!betAmount || !balance) return true
    try {
      const betAmountWei = parseUSDC(betAmount)
      return betAmountWei <= balance
    } catch {
      return false
    }
  }, [betAmount, balance])
  
  // Quick amount buttons
  const handleQuickAmount = (amount: string) => {
    if (amount === 'Max' && balance) {
      setBetAmount(formatUSDC(balance))
    } else {
      setBetAmount(amount)
    }
  }
  
  const handlePlaceBet = async () => {
    if (!validation.isValid || !hasSufficientBalance || !betAmount) return
    
    setInternalLoading(true)
    try {
      await onPlaceBet?.(selectedOutcome, betAmount)
    } catch (error) {
      console.error('Failed to place bet:', error)
    } finally {
      setInternalLoading(false)
    }
  }
  
  const isLoading = externalLoading || internalLoading
  const isDisabled = !validation.isValid || !hasSufficientBalance || !betAmount || isLoading

  const isLight = variant === 'light'
  
  return (
    <div className={`${isLight ? 'bg-white border border-gray-200 text-gray-900' : 'bg-gray-900 border border-gray-800'} rounded-lg`}>
      {/* Header */}
      <div className={`p-4 border-b ${isLight ? 'border-gray-200' : 'border-gray-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>Trade</h3>
          {address && (
            <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-200'}`}>
              Balance: <span className={`${isLight ? 'text-gray-900' : 'text-gray-50'}`}>${formatUSDC(balance || BigInt(0))}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Outcome Selection */}
        <div className={`grid grid-cols-2 gap-0 rounded-lg border overflow-hidden ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          <button
            onClick={() => setSelectedOutcome('yes')}
            className={`py-4 px-4 font-medium transition-all relative ${focusRing} ${
              selectedOutcome === 'yes'
                ? 'bg-success text-white'
                : (isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-800 text-gray-200 hover:bg-gray-700')
            }`}
            aria-pressed={selectedOutcome === 'yes'}
          >
            <div className="text-xs opacity-90 mb-1 flex items-center justify-center gap-1">
              <span role="img" aria-label="bullish">↗️</span>
              YES
            </div>
            <div className="text-lg font-bold">{Math.round(pricing.yesPrice * 100)}¢</div>
            {selectedOutcome === 'yes' && (
              <div className="absolute inset-0 bg-success/20 border-2 border-success rounded-lg"></div>
            )}
          </button>
          
          <button
            onClick={() => setSelectedOutcome('no')}
            className={`py-4 px-4 font-medium transition-all relative ${focusRing} ${
              selectedOutcome === 'no'
                ? 'bg-error text-white'
                : (isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-800 text-gray-200 hover:bg-gray-700')
            }`}
            aria-pressed={selectedOutcome === 'no'}
          >
            <div className="text-xs opacity-90 mb-1 flex items-center justify-center gap-1">
              <span role="img" aria-label="bearish">↘️</span>
              NO
            </div>
            <div className="text-lg font-bold">{Math.round(pricing.noPrice * 100)}¢</div>
            {selectedOutcome === 'no' && (
              <div className="absolute inset-0 bg-error/20 border-2 border-error rounded-lg"></div>
            )}
          </button>
        </div>
        
        {/* Amount Input */}
        <div className="space-y-2">
          <label className={`block text-sm font-medium ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
            Amount
          </label>
          
          <div className="relative">
            <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-sm ${isLight ? 'text-gray-500' : 'text-gray-200'}`}>
              $
            </span>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className={`w-full rounded-lg py-3 pl-8 pr-4 text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                isLight
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-600 focus:ring-offset-2 focus:ring-offset-white'
                  : 'bg-gray-800 border border-gray-600 text-gray-50 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900'
              }`}
              placeholder="Enter amount (min $0.01)"
              step="0.01"
              min="0.01"
            />
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {['1', '5', '20', 'Max'].map(amount => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className={`py-2 px-3 text-sm rounded border transition-colors ${
                  isLight
                    ? 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-800 border-gray-700 text-gray-200 hover:border-gray-600 hover:bg-gray-700'
                }`}
              >
                {amount === 'Max' ? 'Max' : `$${amount}`}
              </button>
            ))}
          </div>
          
          {/* Validation Error */}
          {validation.error && (
            <p className="text-sm text-error">{validation.error}</p>
          )}
          {!hasSufficientBalance && betAmount && (
            <p className="text-sm text-error">Insufficient balance</p>
          )}
        </div>
        
        {/* Simple Return Info */}
        {betAmount && validation.isValid && (
          <div className={`${isLight ? 'bg-gray-50' : 'bg-gray-800/50'} rounded-lg p-3 space-y-2`}>
            <div className="flex justify-between text-sm">
              <span className={`${isLight ? 'text-gray-700' : 'text-gray-200'}`}>You pay</span>
              <span className={`${isLight ? 'text-gray-900' : 'text-gray-50'}`}>
                ${parseFloat(betAmount || '0').toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={`${isLight ? 'text-gray-700' : 'text-gray-200'}`}>You get if right</span>
              <span className={`font-medium text-lg ${isLight ? 'text-success' : 'text-success'}`}>
                ${(parseFloat(betAmount || '0') / (selectedOutcome === 'yes' ? pricing.yesPrice : pricing.noPrice)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={`${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Profit</span>
              <span className={`${isLight ? 'text-success' : 'text-success'}`}>
                ${((parseFloat(betAmount || '0') / (selectedOutcome === 'yes' ? pricing.yesPrice : pricing.noPrice)) - parseFloat(betAmount || '0')).toFixed(2)}
              </span>
            </div>
          </div>
        )}
        
        {/* Buy Button - Always Visible */}
        <button
          onClick={handlePlaceBet}
          disabled={isDisabled}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
            selectedOutcome === 'yes'
              ? 'bg-success hover:bg-success/90 disabled:bg-gray-600'
              : 'bg-error hover:bg-error/90 disabled:bg-gray-600'
          } ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg'} text-white`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Placing Bet...
            </div>
          ) : isDisabled ? (
            !address ? 'Connect Wallet' :
            !betAmount ? 'Enter Amount' :
            !validation.isValid ? 'Invalid Amount' :
            !hasSufficientBalance ? 'Insufficient Balance' :
            'Place Bet'
          ) : (
            `Bet $${betAmount || '0'} on ${selectedOutcome.toUpperCase()}`
          )}
        </button>
        
        {/* Minimum Bet Notice */}
        <div className={`text-center text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          Minimum bet: $0.01 USDC
        </div>
        
        {/* Market Info */}
        <div className={`pt-2 border-t space-y-1 text-xs ${isLight ? 'border-gray-200 text-gray-600' : 'border-gray-700 text-gray-200'}`}>
          <div className="flex justify-between">
            <span>Total Volume</span>
            <span>${formatUSDC(market.totalVolume)}</span>
          </div>
          <div className="flex justify-between">
            <span>Market ID</span>
            <span>#{market.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
