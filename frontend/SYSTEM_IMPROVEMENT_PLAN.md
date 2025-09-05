# 🎯 SYSTEM IMPROVEMENT PLAN: React Query Migration & Real-time Updates

## Current Problems (Big Picture)

### 1. **Data Management Issues**
- ❌ Manual `refetch()` calls with setTimeout delays
- ❌ Stale data after user actions (betting, approvals)
- ❌ No automatic cache invalidation
- ❌ Volume/market data doesn't refresh after bets
- ❌ Users don't see immediate feedback

### 2. **UX Problems**  
- ❌ Artificial delays (setTimeout) make users think system is slow
- ❌ No real-time market price updates
- ❌ Hardcoded 50/50 prices instead of real AMM calculations
- ❌ Users don't understand what shares they're getting

### 3. **Architecture Issues**
- ❌ Mixed data sources (blockchain + mock data)
- ❌ No centralized state management
- ❌ Inconsistent error handling
- ❌ No optimistic updates

---

## 🚀 SOLUTION: React Query Migration

### Phase 1: Foundation (Week 1)

#### 1.1 Install & Setup React Query
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

#### 1.2 Create Query Client Provider
```tsx
// src/providers/QueryProvider.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

#### 1.3 Wrap App with Providers
```tsx
// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </Web3Provider>
      </body>
    </html>
  )
}
```

### Phase 2: Query Keys Strategy (Week 1)

#### 2.1 Centralized Query Keys
```tsx
// src/lib/queryKeys.ts
export const queryKeys = {
  // User data
  tokenBalance: (address: string) => ['tokenBalance', address],
  tokenAllowance: (address: string) => ['tokenAllowance', address],
  
  // Market data
  marketCounter: () => ['marketCounter'],
  market: (id: number) => ['market', id],
  allMarkets: () => ['allMarkets'],
  marketOutcome: (marketId: number, outcomeId: number) => ['outcome', marketId, outcomeId],
  
  // User positions
  userPosition: (address: string, marketId: number, outcomeId: number) => 
    ['userPosition', address, marketId, outcomeId],
  userBets: (address: string) => ['userBets', address],
} as const
```

### Phase 3: Replace Wagmi Hooks with React Query (Week 2)

#### 3.1 Token Balance Query
```tsx
// src/hooks/queries/useTokenBalance.ts
import { useQuery } from '@tanstack/react-query'
import { useReadContract, useAccount } from 'wagmi'
import { queryKeys } from '../../lib/queryKeys'

export function useTokenBalance() {
  const { address } = useAccount()
  
  return useQuery({
    queryKey: queryKeys.tokenBalance(address ?? ''),
    queryFn: async () => {
      if (!address) throw new Error('No address')
      
      // Use wagmi's readContract or direct contract calls
      const balance = await readContract({
        address: CONTRACTS.MOCK_USDC,
        abi: MOCK_USDC_ABI,
        functionName: 'balanceOf',
        args: [address],
      })
      
      return balance
    },
    enabled: !!address,
  })
}
```

#### 3.2 Markets Query with Real AMM Prices
```tsx
// src/hooks/queries/useMarkets.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'

export function useMarkets() {
  return useQuery({
    queryKey: queryKeys.allMarkets(),
    queryFn: async () => {
      // Fetch market data AND calculate real prices
      const markets = await fetchAllMarkets()
      
      // Calculate real AMM prices for each market
      const marketsWithPrices = await Promise.all(
        markets.map(async (market) => {
          const prices = await calculateAMMPrices(market.id)
          return {
            ...market,
            yesPrice: prices.yesPrice,
            noPrice: prices.noPrice,
            volume: formatUSDC(market.totalVolume),
          }
        })
      )
      
      return marketsWithPrices
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  })
}

async function calculateAMMPrices(marketId: number) {
  // Get outcome data from contract
  const outcome1 = await readContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getOutcome',
    args: [BigInt(marketId), BigInt(1)],
  })
  
  const outcome2 = await readContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getOutcome', 
    args: [BigInt(marketId), BigInt(2)],
  })
  
  // Calculate prices based on total backed amounts
  const total1 = Number(outcome1[3]) // totalBacked
  const total2 = Number(outcome2[3])
  const totalVolume = total1 + total2
  
  if (totalVolume === 0) return { yesPrice: 0.5, noPrice: 0.5 }
  
  return {
    yesPrice: total1 / totalVolume,
    noPrice: total2 / totalVolume,
  }
}
```

### Phase 4: Mutations with Optimistic Updates (Week 2-3)

#### 4.1 Place Bet Mutation
```tsx
// src/hooks/mutations/usePlaceBetMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'

export function usePlaceBetMutation() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  
  return useMutation({
    mutationFn: async ({ marketId, outcomeId, amount }: {
      marketId: number
      outcomeId: number  
      amount: string
    }) => {
      // Execute the bet transaction
      return await placeBetTransaction(marketId, outcomeId, amount)
    },
    
    onMutate: async ({ marketId, outcomeId, amount }) => {
      // OPTIMISTIC UPDATE - show changes immediately
      if (!address) return
      
      const betAmountWei = parseUSDC(amount)
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tokenBalance(address) })
      await queryClient.cancelQueries({ queryKey: queryKeys.allMarkets() })
      
      // Snapshot previous values
      const previousBalance = queryClient.getQueryData(queryKeys.tokenBalance(address))
      const previousMarkets = queryClient.getQueryData(queryKeys.allMarkets())
      
      // Optimistically update balance
      if (previousBalance) {
        queryClient.setQueryData(
          queryKeys.tokenBalance(address), 
          (old: bigint) => old - betAmountWei
        )
      }
      
      // Optimistically update market volume
      if (previousMarkets) {
        queryClient.setQueryData(queryKeys.allMarkets(), (old: any[]) =>
          old.map(market => 
            market.id === marketId 
              ? { 
                  ...market, 
                  volume: `$${(parseFloat(market.volume.slice(1)) + parseFloat(amount)).toFixed(2)}`
                }
              : market
          )
        )
      }
      
      return { previousBalance, previousMarkets }
    },
    
    onError: (err, variables, context) => {
      // Revert optimistic updates on error
      if (context?.previousBalance && address) {
        queryClient.setQueryData(queryKeys.tokenBalance(address), context.previousBalance)
      }
      if (context?.previousMarkets) {
        queryClient.setQueryData(queryKeys.allMarkets(), context.previousMarkets)
      }
      
      toast.error('Bet failed: ' + err.message)
    },
    
    onSuccess: (data, { marketId }) => {
      // Invalidate and refetch related data
      queryClient.invalidateQueries({ queryKey: queryKeys.tokenBalance(address!) })
      queryClient.invalidateQueries({ queryKey: queryKeys.allMarkets() })
      queryClient.invalidateQueries({ queryKey: queryKeys.market(marketId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.userBets(address!) })
      
      toast.success('🎉 Bet placed successfully!')
    },
  })
}
```

#### 4.2 Token Approval Mutation
```tsx
// src/hooks/mutations/useTokenApprovalMutation.ts
export function useTokenApprovalMutation() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  
  return useMutation({
    mutationFn: async (amount: string) => {
      return await approveTokensTransaction(amount)
    },
    
    onSuccess: () => {
      // Immediately invalidate allowance query
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tokenAllowance(address!) 
      })
      
      toast.success('✅ USDC spending approved!')
    },
    
    onError: (err) => {
      toast.error('Approval failed: ' + err.message)
    },
  })
}
```

### Phase 5: Remove All setTimeout Delays (Week 3)

#### 5.1 Update Betting Modal
```tsx
// Replace this pattern:
const { placeBet, isLoading } = usePlaceBet(() => {
  setBetPlaced(true)
  refetchBalance()
  setTimeout(() => onClose(), 500)
})

// With this:
const placeBetMutation = usePlaceBetMutation()

const handlePlaceBet = async () => {
  try {
    await placeBetMutation.mutateAsync({
      marketId: market.id,
      outcomeId,
      amount: betAmount
    })
    
    setBetPlaced(true)
    // Data updates happen automatically via React Query
    // No setTimeout needed!
    
    // Close after showing success for 2 seconds
    setTimeout(() => onClose(), 2000)
  } catch (error) {
    // Error already handled in mutation
  }
}
```

### Phase 6: Real-time Market Updates (Week 4)

#### 6.1 Polling Strategy
```tsx
// Auto-refresh market data every 15 seconds
export function useMarkets() {
  return useQuery({
    queryKey: queryKeys.allMarkets(),
    queryFn: fetchMarketsWithRealPrices,
    refetchInterval: 15000, // 15 seconds
    refetchIntervalInBackground: true,
  })
}
```

#### 6.2 WebSocket Integration (Future)
```tsx
// Future enhancement: WebSocket for real-time updates
export function useRealtimeMarkets() {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8546') // Hardhat WebSocket
    
    ws.onmessage = (event) => {
      const { type, marketId, data } = JSON.parse(event.data)
      
      if (type === 'BetPlaced') {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.market(marketId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.allMarkets() })
      }
    }
    
    return () => ws.close()
  }, [queryClient])
}
```

---

## 🎯 **Expected Results**

### Immediate Benefits:
- ✅ **No more setTimeout delays** - users see changes instantly
- ✅ **Optimistic updates** - UI responds immediately to user actions  
- ✅ **Automatic data sync** - volume, prices, balances update automatically
- ✅ **Better error handling** - failed operations revert optimistic changes
- ✅ **Real AMM prices** - no more hardcoded 50/50 odds

### User Experience:
1. User places bet → **UI updates instantly** (optimistic)
2. Transaction confirms → **Data stays accurate** (validation)
3. Other users bet → **Market data refreshes automatically** (polling)
4. Error occurs → **UI reverts cleanly** (error handling)

### Developer Experience:
- ✅ **Centralized data management**
- ✅ **Automatic cache invalidation**  
- ✅ **Built-in loading/error states**
- ✅ **Devtools for debugging**
- ✅ **Type-safe query keys**

---

## 📅 **Timeline**

- **Week 1**: Setup React Query, define query keys, basic queries
- **Week 2**: Replace wagmi hooks, implement mutations
- **Week 3**: Remove setTimeout delays, add optimistic updates
- **Week 4**: Real AMM price calculations, auto-refresh

Want me to start with Phase 1 - setting up React Query foundation?
