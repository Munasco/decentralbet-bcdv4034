import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { Address } from 'viem'
import { toast } from 'react-hot-toast'
import { useState, useCallback, useEffect } from 'react'
import { CONTRACTS, PREDICTION_MARKET_ABI, MOCK_USDC_ABI } from '../config/contracts'
import { parseUSDC, validateUSDCAmount, validateFaucetAmount } from '../lib/decimals'



// Types
export interface Market {
  id: number
  question: string
  category: string
  description: string
  endTime: number
  resolutionTime: number
  creator: Address
  isResolved: boolean
  winningOutcome: number
  totalVolume: bigint
  outcomeCount: number
}

export interface Outcome {
  id: number
  description: string
  totalShares: bigint
  totalBacked: bigint
  isActive: boolean
}

export interface CreateMarketParams {
  question: string
  category: string
  description: string
  endTime: Date
  outcomes: string[]
  feePercentage: number
}

// Hook for reading market count
export function useMarketCount() {
  return useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'marketCounter',
  })
}

// Hook for reading market data
export function useMarket(marketId: number) {
  return useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
    query: {
      enabled: Boolean(marketId > 0),
    },
  })
}



// Hook for creating markets with success callback
export function useCreateMarket(onSuccess?: () => void) {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const createMarket = useCallback(
    (params: CreateMarketParams) => {

      const endTimeUnix = Math.floor(params.endTime.getTime() / 1000)

      writeContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'createMarket',
        args: [
          params.question,
          params.category,
          params.description,
          BigInt(endTimeUnix),
          params.outcomes,
          params.feePercentage,
        ],
      })
    },
    [writeContract]
  )

  useEffect(() => {
    if (isPending) {
      toast.loading('Creating market...', { id: 'create-market' })
    } else if (isConfirming) {
      toast.loading('Confirming transaction...', { id: 'create-market' })
    } else if (isSuccess) {
      toast.success('Market created successfully!', { id: 'create-market' })
      // Call success callback
      onSuccess?.()
    } else if (error) {
      toast.error('Failed to create market', { id: 'create-market' })
    }
  }, [isPending, isConfirming, isSuccess, error, onSuccess])

  return {
    createMarket,
    isLoading: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Hook for placing bets with success callback
export function usePlaceBet(onSuccess?: () => void) {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const placeBet = useCallback(
    (marketId: number, outcomeId: number, amount: string) => {
      // Validate amount first
      const validation = validateUSDCAmount(amount)
      if (!validation.isValid) {
        toast.error(validation.error || 'Invalid amount')
        return
      }

      try {
        const amountWei = parseUSDC(amount)
        
        writeContract({
          address: CONTRACTS.PREDICTION_MARKET,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'placeBet',
          args: [BigInt(marketId), BigInt(outcomeId), amountWei],
        })
      } catch (error) {
        console.error('Error in placeBet:', error)
        toast.error('Invalid amount format')
      }
    },
    [writeContract]
  )

  useEffect(() => {
    if (isPending) {
      toast.loading('Step 2/2: Placing bet...', { id: 'bet-flow' })
    } else if (isConfirming) {
      toast.loading('Confirming bet transaction...', { id: 'bet-flow' })
    } else if (isSuccess) {
      toast.success('🎉 Bet placed successfully!', { id: 'bet-flow' })
      // Call success callback to close modal and update UI
      onSuccess?.()
    } else if (error) {
      toast.error('Failed to place bet', { id: 'bet-flow' })
    }
  }, [isPending, isConfirming, isSuccess, error, onSuccess])

  return {
    placeBet,
    isLoading: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Hook for getting all markets (by iterating through market count)
export function useAllMarkets() {
  const { data: marketCount } = useMarketCount()
  const [markets, setMarkets] = useState<Market[]>([])
  const [isLoading, setIsLoading] = useState(true)

  
  

  const fetchMarkets = useCallback(async () => {
    if (!marketCount || !CONTRACTS.PREDICTION_MARKET) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const marketPromises = []

      for (let i = 1; i <= Number(marketCount); i++) {
        const marketPromise = fetch('/api/market/' + i) // You'll need to implement this API endpoint
          .then(res => res.json())
          .catch(() => null)
        marketPromises.push(marketPromise)
      }

      const marketResults = await Promise.all(marketPromises)
      const validMarkets = marketResults.filter(Boolean)
      setMarkets(validMarkets)
    } catch (error) {
      console.error('Error fetching markets:', error)
      toast.error('Failed to load markets')
    } finally {
      setIsLoading(false)
    }
  }, [marketCount])

  useEffect(() => {
    fetchMarkets()
  }, [fetchMarkets])

  return { 
    markets, 
    isLoading, 
    refetch: () => {
      // Use proper refetch instead of window.location.reload to prevent infinite loops
      setMarkets([])
      setIsLoading(true)
      fetchMarkets()
    }
  }
}

// Hook for token balance
export function useTokenBalance() {
  const { address } = useAccount()

  return useReadContract({
    address: CONTRACTS.MOCK_USDC,
    abi: MOCK_USDC_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: {
      enabled: Boolean(address),
    },
  })
}

// Hook for token allowance
export function useTokenAllowance() {
  const { address } = useAccount()

  return useReadContract({
    address: CONTRACTS.MOCK_USDC,
    abi: MOCK_USDC_ABI,
    functionName: 'allowance',
    args: [address!, CONTRACTS.PREDICTION_MARKET],
    query: {
      enabled: Boolean(address),
    },
  })
}

// Hook for getting tokens from faucet with better validation
export function useTokenFaucet(onSuccess?: () => void) {
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const getTokens = useCallback(
    (amount: string) => {
      console.log('🚰 Faucet: Starting with amount:', amount)
      
      // Validate amount first with faucet limits
      const validation = validateFaucetAmount(amount)
      console.log('🚰 Faucet: Validation result:', validation)
      
      if (!validation.isValid) {
        toast.error(validation.error || 'Invalid amount')
        return
      }

      try {
        const amountNum = parseFloat(amount)
        // Faucet limit: max 1000 USDC per call (contract limit)
        const cappedAmount = Math.min(amountNum, 1000);
        const amountWei = parseUSDC(cappedAmount.toString())
        
        console.log('🚰 Faucet: Amount details:', {
          original: amount,
          parsed: amountNum,
          capped: cappedAmount,
          wei: amountWei.toString(),
          contractAddress: CONTRACTS.MOCK_USDC
        })

        writeContract({
          address: CONTRACTS.MOCK_USDC,
          abi: MOCK_USDC_ABI,
          functionName: 'faucet',
          args: [amountWei],
        })
        
        console.log('🚰 Faucet: writeContract called successfully')
      } catch {
        console.error('🚰 Faucet: Error in getTokens')
        toast.error('Invalid amount format')
      }
    },
    [writeContract]
  )

  useEffect(() => {
    console.log('🚰 Faucet: Status update:', { isPending, isConfirming, isSuccess, error: error?.message || error })
    
    if (isPending) {
      toast.loading('Getting tokens...', { id: 'faucet' })
    } else if (isConfirming) {
      toast.loading('Confirming transaction...', { id: 'faucet' })
    } else if (isSuccess) {
      toast.success('Tokens received!', { id: 'faucet' })
      console.log('🎉 Faucet: Success! Calling onSuccess callback')
      onSuccess?.()
    } else if (error) {
      console.error('🚰 Faucet: Error occurred:', error)
      toast.error('Failed to get tokens: ' + (error.message || 'Unknown error'), { id: 'faucet' })
    }
  }, [isPending, isConfirming, isSuccess, error, onSuccess])

  return {
    getTokens,
    isLoading: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Hook for approving tokens with success callback
export function useTokenApproval(onSuccess?: () => void) {
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const approveTokens = useCallback(
    (amount: string) => {
      // Validate amount first
      const validation = validateUSDCAmount(amount)
      if (!validation.isValid) {
        toast.error(validation.error || 'Invalid amount')
        return
      }

      try {
        const amountWei = parseUSDC(amount)

        writeContract({
          address: CONTRACTS.MOCK_USDC,
          abi: MOCK_USDC_ABI,
          functionName: 'approve',
          args: [CONTRACTS.PREDICTION_MARKET, amountWei],
        })
      } catch {
        toast.error('Invalid amount format')
      }
    },
    [writeContract]
  )

  useEffect(() => {
    if (isPending) {
      toast.loading('Step 1/2: Approving USDC...', { id: 'bet-flow' })
    } else if (isConfirming) {
      toast.loading('Confirming approval...', { id: 'bet-flow' })
    } else if (isSuccess) {
      toast.success('✅ USDC approved! Placing bet...', { id: 'bet-flow' })
      onSuccess?.()
    } else if (error) {
      toast.error('Failed to approve tokens', { id: 'bet-flow' })
    }
  }, [isPending, isConfirming, isSuccess, error, onSuccess])

  return {
    approveTokens,
    isLoading: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}
