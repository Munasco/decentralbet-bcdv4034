'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useTokenBalance, useTokenFaucet } from '../hooks/usePredictionMarket'
import { formatUSDC, validateFaucetAmount } from '../lib/decimals'

export function USDCManager() {
  const { isConnected } = useAccount()
  const { data: balance, refetch } = useTokenBalance()
  const [amount, setAmount] = useState('1000')
  const [error, setError] = useState('')

  const { getTokens, isLoading } = useTokenFaucet(() => {
    // Success callback - refetch balance after tokens are received
    setTimeout(() => refetch(), 2000)
    setAmount('1000') // Reset form
  })

  const handleAmountChange = (value: string) => {
    setAmount(value)
    // Validate in real-time with faucet limits
    const validation = validateFaucetAmount(value)
    setError(validation.isValid ? '' : (validation.error || ''))
  }

  const handleGetTokens = () => {
    const validation = validateFaucetAmount(amount)
    if (!validation.isValid) {
      setError(validation.error || 'Invalid amount')
      return
    }
    setError('')
    getTokens(amount)
  }

  if (!isConnected) return null

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-50">💰 Your USDC Balance</h3>
        <div className="text-3xl font-bold text-blue-300 mt-2">
          {formatUSDC(balance)} USDC
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-center space-x-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            min="1"
            max="1000"
            step="1"
            className={`w-32 px-3 py-2 border rounded-lg text-center bg-gray-800 text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-600' : 'border-gray-600'
            }`}
            placeholder="1000"
          />
          <button
            onClick={handleGetTokens}
            disabled={isLoading || !!error || !amount}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            {isLoading ? '⏳ Getting...' : '🎁 Get Free USDC'}
          </button>
        </div>
        
        {error && (
          <div className="text-center">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>
      
      <div className="text-center mt-3">
        <p className="text-sm text-gray-300">
          Get free test tokens to bet on prediction markets!
        </p>
        <p className="text-xs text-green-300 mt-1">
          ✅ Minimum bet: 0.01 USDC • Maximum faucet: 1,000 USDC per request
        </p>
      </div>
    </div>
  )
}
