import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useSimulateContract } from 'wagmi'
import { Address, Abi } from 'viem'
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

// Hook for checking if contract is paused
export function useIsPaused() {
  return useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'paused',
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
  const { data: isPaused } = useIsPaused()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const createMarket = useCallback(
    (params: CreateMarketParams) => {
      console.log('🏗️ CreateMarket: Starting with params:', params)
      
      try {
        // Check if contract is paused
        if (isPaused) {
          throw new Error('Contract is currently paused. Market creation is disabled.')
        }
        
        // Basic validation
        if (!params.question || params.question.trim().length === 0) {
          throw new Error('Question is required')
        }
        if (!params.category || params.category.trim().length === 0) {
          throw new Error('Category is required')
        }
        if (!params.description || params.description.trim().length === 0) {
          throw new Error('Description is required')
        }
        if (!params.outcomes || params.outcomes.length < 2) {
          throw new Error('At least 2 outcomes are required')
        }
        // Filter out empty outcomes
        const validOutcomes = params.outcomes.filter(outcome => outcome && outcome.trim().length > 0)
        if (validOutcomes.length < 2) {
          throw new Error('At least 2 valid outcomes are required')
        }
        if (!params.endTime) {
          throw new Error('End time is required')
        }
        
        const endTimeUnix = Math.floor(params.endTime.getTime() / 1000)
        const currentTimeUnix = Math.floor(Date.now() / 1000)
        
        console.log('🏗️ CreateMarket: Time validation:', {
          endTimeUnix,
          currentTimeUnix,
          difference: endTimeUnix - currentTimeUnix,
          isInFuture: endTimeUnix > currentTimeUnix
        })
        
        // Contract requires endTime > block.timestamp + MIN_MARKET_DURATION (1 hour)
        const minEndTime = currentTimeUnix + (60 * 60) // 1 hour from now
        if (endTimeUnix <= minEndTime) {
          throw new Error('End time must be at least 1 hour from now')
        }
        
        // Contract has MAX_MARKET_DURATION (365 days)
        const maxEndTime = currentTimeUnix + (365 * 24 * 60 * 60) // 365 days from now
        if (endTimeUnix >= maxEndTime) {
          throw new Error('End time cannot be more than 365 days from now')
        }
        
        // Contract requires feePercentage <= 10
        const feePercentage = params.feePercentage || 0
        if (feePercentage > 10) {
          throw new Error('Fee percentage cannot be more than 10%')
        }
        const feePercentageUint8 = Math.floor(feePercentage)
        
        const args = [
          params.question.trim(),
          params.category.trim(),
          params.description.trim(),
          BigInt(endTimeUnix),
          validOutcomes,
          feePercentageUint8,
        ]
        
        console.log('🏗️ CreateMarket: Final args with types:', {
          question: { value: args[0], type: typeof args[0] },
          category: { value: args[1], type: typeof args[1] },
          description: { value: args[2], type: typeof args[2] },
          endTime: { value: args[3].toString(), type: typeof args[3] },
          outcomes: { value: args[4], type: typeof args[4], length: Array.isArray(args[4]) ? args[4].length : 'N/A' },
          feePercentage: { value: args[5], type: typeof args[5] }
        })
        
        console.log('🏗️ CreateMarket: Contract call details:', {
          address: CONTRACTS.PREDICTION_MARKET,
          functionName: 'createMarket',
          abiExists: !!PREDICTION_MARKET_ABI,
          abiLength: PREDICTION_MARKET_ABI?.length
        })
        
        writeContract({
          address: CONTRACTS.PREDICTION_MARKET,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'createMarket',
          args: args,
        })
        
      } catch (error) {
        console.error('🏗️ CreateMarket: Error:', error)
        toast.error(`Failed to create market: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [writeContract]
  )

  useEffect(() => {
    console.log('🏗️ CreateMarket: Status update:', { 
      isPending, 
      isConfirming, 
      isSuccess, 
      error: error?.message || error,
      hash
    })
    
    if (isPending) {
      toast.loading('Creating market...', { id: 'create-market' })
    } else if (isConfirming) {
      toast.loading('Confirming transaction...', { id: 'create-market' })
    } else if (isSuccess) {
      toast.success('Market created successfully!', { id: 'create-market' })
      console.log('🎉 CreateMarket: Success! Transaction hash:', hash)
      // Call success callback
      onSuccess?.()
    } else if (error) {
      console.error('🏗️ CreateMarket: Error occurred:', error)
      toast.error(`Failed to create market: ${error.message || 'Unknown error'}`, { id: 'create-market' })
    }
  }, [isPending, isConfirming, isSuccess, error, onSuccess, hash])

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
  const { address } = useAccount()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Store bet details for backend tracking
  const [currentBet, setCurrentBet] = useState<{
    marketId: number;
    outcomeId: number;
    amount: string;
  } | null>(null)

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
        
        // Store bet details for backend tracking (use wei amount for backend)
        setCurrentBet({ marketId, outcomeId, amount: amountWei.toString() })
        
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
    } else if (isSuccess && currentBet && address) {
      // Track the bet in backend
      const trackBet = async () => {
        try {
          const outcome = currentBet.outcomeId === 1 ? 'YES' : 'NO'
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/portfolio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              address, 
              marketId: currentBet.marketId, 
              outcome, 
              amount: currentBet.amount,
              won: false // We don't know if they won yet, will be updated when market resolves
            })
          })
          
          if (response.ok) {
            console.log('✅ Backend: Bet tracked successfully!')
          } else {
            console.warn('⚠️ Backend: Failed to track bet:', response.statusText)
          }
        } catch (error) {
          console.error('❌ Backend: Error tracking bet:', error)
        }
      }
      
      trackBet()
      setCurrentBet(null)
      toast.success('🎉 Bet placed successfully!', { id: 'bet-flow' })
      onSuccess?.()
    } else if (error) {
      setCurrentBet(null)
      toast.error('Failed to place bet', { id: 'bet-flow' })
    }
  }, [isPending, isConfirming, isSuccess, error, onSuccess, currentBet, address])

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
    setIsLoading(true)
    
    // TODO: Implement direct blockchain reading once we have proper market data structure
    // For now, return empty array to get app running without API dependencies
    try {
      console.log('📊 Markets: Blockchain-only mode - no markets to fetch yet')
      console.log('📊 Markets: Market count from contract:', marketCount)
      
      // Return empty array for now - will implement blockchain reading later
      setMarkets([])
    } catch (error) {
      console.error('Error in blockchain markets:', error)
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
        
        // Additional validation
        if (isNaN(amountNum) || amountNum <= 0) {
          throw new Error('Amount must be a positive number')
        }
        
        // Faucet limit: max 1000 USDC per call (contract limit)
        const cappedAmount = Math.min(amountNum, 1000);
        const amountWei = parseUSDC(cappedAmount.toString())
        
        // Validate BigInt conversion
        if (typeof amountWei !== 'bigint') {
          throw new Error('Failed to convert amount to BigInt')
        }
        
        console.log('🚰 Faucet: Amount details:', {
          original: amount,
          parsed: amountNum,
          capped: cappedAmount,
          wei: amountWei.toString(),
          weiType: typeof amountWei,
          contractAddress: CONTRACTS.MOCK_USDC,
          abiLength: MOCK_USDC_ABI.length
        })

        console.log('🚰 Faucet: About to call writeContract with args:', [amountWei.toString()])
        
        const result = writeContract({
          address: CONTRACTS.MOCK_USDC,
          abi: MOCK_USDC_ABI,
          functionName: 'faucet',
          args: [amountWei],
        })
        
        console.log('🚰 Faucet: writeContract called successfully', result)
        
      } catch (faucetError) {
        console.error('🚰 Faucet: Error in getTokens:', faucetError)
        console.error('🚰 Faucet: Error details:', {
          message: faucetError?.message,
          name: faucetError?.name,
          cause: faucetError?.cause,
          errorType: typeof faucetError
        })
        toast.error(`Failed to get tokens: ${faucetError instanceof Error ? faucetError.message : 'Invalid amount format'}`)
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
