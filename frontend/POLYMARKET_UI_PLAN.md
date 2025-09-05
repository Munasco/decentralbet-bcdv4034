# 🎯 POLYMARKET-STYLE UI & TRADING IMPLEMENTATION PLAN

Based on the Polymarket screenshots, here's a comprehensive plan to implement their sophisticated UI and trading algorithms.

## 📸 **UI Analysis from Screenshots**

### Screenshot 1: Market Grid/Dashboard
- **Dark theme** with cards showing market questions
- **Real-time percentages** (82%, 15%, etc.) 
- **Volume indicators** ($59m Vol, $885k Vol, etc.)
- **Category tabs** (All, Trump Presidency, Cowboys vs Eagles, etc.)
- **Live indicators** with red dots
- **Clean card layout** with betting options

### Screenshot 2: Individual Market Detail Page
- **Chart visualization** with price history over time
- **Market outcomes** with current prices (Buffalo 13%, Baltimore 13%, etc.)
- **Buy/Sell buttons** with exact pricing (Buy Yes 14¢, Buy No 88¢)
- **Volume data** per outcome ($284,078 Vol)
- **Market info** (creation date, total volume $38,321,441)

### Screenshot 3: Trading Interface & User Menu
- **Portfolio & Cash** display ($0.00 each)
- **User menu** with Profile, Settings, Watchlist, etc.
- **Trading panel** with amount selection (+$1, +$20, +$100, Max)
- **Market depth** showing related markets (NFC Champion 20%, AFC Champion 23%)

---

## 🏗️ **IMPLEMENTATION ARCHITECTURE**

### Phase 1: UI Foundation (Week 1)
#### 1.1 Dark Theme System
```tsx
// tailwind.config.js - Polymarket-style dark theme
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        polymarket: {
          bg: '#0a0e1a',
          card: '#1a1f2e', 
          accent: '#2563eb',
          green: '#22c55e',
          red: '#ef4444',
          text: '#f8fafc',
          muted: '#64748b'
        }
      }
    }
  }
}
```

#### 1.2 Layout Structure
```
/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx           # Top nav with categories
│   │   ├── Sidebar.tsx          # User menu (Profile, Settings, etc)
│   │   └── UserBalance.tsx      # Portfolio & Cash display
│   ├── markets/
│   │   ├── MarketGrid.tsx       # Dashboard grid view
│   │   ├── MarketCard.tsx       # Individual market card
│   │   ├── MarketDetail.tsx     # Full market page
│   │   └── MarketChart.tsx      # Price history chart
│   ├── trading/
│   │   ├── TradingPanel.tsx     # Buy/Sell interface
│   │   ├── OrderBook.tsx        # Market depth
│   │   └── PositionManager.tsx  # User positions
│   └── ui/
│       ├── PriceDisplay.tsx     # 14¢ style pricing
│       └── VolumeIndicator.tsx  # Volume formatting
└── app/
    ├── page.tsx                 # Market grid dashboard
    ├── market/
    │   └── [id]/
    │       └── page.tsx         # Individual market detail
    └── portfolio/
        └── page.tsx             # User portfolio
```

---

## 💹 **POLYMARKET TRADING ALGORITHMS**

### 2.1 Automated Market Maker (AMM) Mechanics

Polymarket uses a **Constant Product Market Maker (CPMM)** combined with **Logarithmic Market Scoring Rule (LMSR)**:

#### 2.1.1 Price Calculation Algorithm
```tsx
// src/lib/trading/ammPricing.ts
export class PolyrmarketAMM {
  
  // Core LMSR pricing function
  static calculatePrice(outcome: number, totalShares: bigint[], liquidity: bigint): number {
    // Logarithmic Market Scoring Rule implementation
    const b = Number(liquidity) / 1e18 // Liquidity parameter
    
    // Calculate exponential terms for all outcomes
    const expTerms = totalShares.map(shares => Math.exp(Number(shares) / 1e18 / b))
    const sumExp = expTerms.reduce((sum, exp) => sum + exp, 0)
    
    // Price = exp(q_i/b) / sum(exp(q_j/b)) for all j
    return expTerms[outcome] / sumExp
  }
  
  // Calculate shares received for a given bet amount
  static calculateSharesReceived(
    betAmount: bigint,
    outcome: number, 
    currentShares: bigint[],
    liquidity: bigint
  ): { shares: bigint; newPrice: number } {
    
    const b = Number(liquidity) / 1e18
    const currentPrice = this.calculatePrice(outcome, currentShares, liquidity)
    
    // Binary search to find shares that match bet amount
    let low = 0n
    let high = betAmount * 10n // Upper bound
    let bestShares = 0n
    
    while (low <= high) {
      const midShares = (low + high) / 2n
      const newShares = [...currentShares]
      newShares[outcome] += midShares
      
      const cost = this.calculateCost(currentShares, newShares, liquidity)
      
      if (cost <= betAmount) {
        bestShares = midShares
        low = midShares + 1n
      } else {
        high = midShares - 1n
      }
    }
    
    const finalShares = [...currentShares]
    finalShares[outcome] += bestShares
    const newPrice = this.calculatePrice(outcome, finalShares.map(s => BigInt(s)), liquidity)
    
    return { shares: bestShares, newPrice }
  }
  
  // Calculate cost difference between two states
  private static calculateCost(
    oldShares: bigint[], 
    newShares: bigint[], 
    liquidity: bigint
  ): bigint {
    const b = Number(liquidity) / 1e18
    
    const oldCost = b * Math.log(
      oldShares.reduce((sum, shares) => sum + Math.exp(Number(shares) / 1e18 / b), 0)
    )
    
    const newCost = b * Math.log(
      newShares.reduce((sum, shares) => sum + Math.exp(Number(shares) / 1e18 / b), 0)
    )
    
    return BigInt(Math.round((newCost - oldCost) * 1e18))
  }
}
```

#### 2.1.2 Dynamic Pricing System
```tsx
// src/hooks/trading/useMarketPricing.ts
export function useMarketPricing(marketId: number) {
  return useQuery({
    queryKey: ['marketPricing', marketId],
    queryFn: async () => {
      // Get current market state
      const market = await readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getMarket',
        args: [BigInt(marketId)]
      })
      
      // Get outcome data
      const outcomes = await Promise.all([
        readContract({
          address: CONTRACTS.PREDICTION_MARKET,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'getOutcome',
          args: [BigInt(marketId), BigInt(1)]
        }),
        readContract({
          address: CONTRACTS.PREDICTION_MARKET,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'getOutcome',
          args: [BigInt(marketId), BigInt(2)]
        })
      ])
      
      // Calculate real-time prices using AMM
      const totalShares = outcomes.map(outcome => outcome[2]) // totalShares
      const liquidity = BigInt(1000000 * 1e18) // 1M USDC liquidity pool
      
      const yesPrice = PolyrmarketAMM.calculatePrice(0, totalShares, liquidity)
      const noPrice = PolyrmarketAMM.calculatePrice(1, totalShares, liquidity)
      
      return {
        yesPrice,
        noPrice,
        yesShares: totalShares[0],
        noShares: totalShares[1],
        totalVolume: market[9], // totalVolume
        outcomes: outcomes.map((outcome, index) => ({
          id: index + 1,
          description: outcome[1],
          shares: outcome[2],
          volume: outcome[3],
          price: index === 0 ? yesPrice : noPrice
        }))
      }
    },
    refetchInterval: 5000 // Update every 5 seconds
  })
}
```

### 2.2 Order Book & Market Depth
```tsx
// src/lib/trading/orderBook.ts
export interface OrderBookLevel {
  price: number    // Price in cents (14¢, 88¢)
  size: bigint     // USDC volume at this price
  orders: number   // Number of orders
}

export class OrderBook {
  static generateMarketDepth(
    currentPrice: number,
    totalVolume: bigint,
    spread: number = 0.02 // 2% spread
  ): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
    
    const bids: OrderBookLevel[] = []
    const asks: OrderBookLevel[] = []
    
    // Generate bid levels (buy orders below current price)
    for (let i = 1; i <= 10; i++) {
      const price = currentPrice - (spread * i / 10)
      const size = totalVolume / BigInt(20 + i * 2) // Decreasing size
      
      bids.push({
        price: Math.max(0.01, price),
        size,
        orders: Math.floor(Number(size) / 100000) + 1
      })
    }
    
    // Generate ask levels (sell orders above current price)  
    for (let i = 1; i <= 10; i++) {
      const price = currentPrice + (spread * i / 10)
      const size = totalVolume / BigInt(20 + i * 2)
      
      asks.push({
        price: Math.min(0.99, price),
        size,
        orders: Math.floor(Number(size) / 100000) + 1
      })
    }
    
    return { bids: bids.reverse(), asks }
  }
}
```

---

## 🎨 **UI COMPONENTS IMPLEMENTATION**

### Phase 2: Market Grid Dashboard (Week 1-2)

#### 2.1 Main Dashboard
```tsx
// src/app/page.tsx - Polymarket-style dashboard
export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const { data: markets, isLoading } = useMarkets()
  
  const categories = [
    'All', 'Trump Presidency', 'Cowboys vs Eagles', 'Fed', 
    'US Open', 'NYC Mayor', 'Jobs Report', 'Trade War'
  ]
  
  return (
    <div className="min-h-screen bg-polymarket-bg text-polymarket-text">
      {/* Top Navigation */}
      <nav className="border-b border-gray-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">DecentralBet</h1>
            <div className="flex space-x-6">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          <UserBalance />
        </div>
      </nav>
      
      {/* Market Grid */}
      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {markets?.map(market => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </main>
    </div>
  )
}
```

#### 2.2 Market Card Component
```tsx
// src/components/markets/MarketCard.tsx
interface MarketCardProps {
  market: {
    id: number
    question: string
    category: string
    yesPrice: number
    noPrice: number
    volume: bigint
    isLive: boolean
    endTime: number
  }
}

export function MarketCard({ market }: MarketCardProps) {
  const router = useRouter()
  
  return (
    <div 
      onClick={() => router.push(`/market/${market.id}`)}
      className="bg-polymarket-card rounded-lg p-4 border border-gray-800 hover:border-gray-700 cursor-pointer transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <CategoryIcon category={market.category} />
          <span className="text-xs text-gray-400 ml-2">
            {market.category}
          </span>
          {market.isLive && (
            <div className="flex items-center ml-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-500 ml-1">LIVE</span>
            </div>
          )}
        </div>
        
        <VolumeIndicator volume={market.volume} />
      </div>
      
      {/* Question */}
      <h3 className="text-sm font-medium text-white mb-4 line-clamp-2">
        {market.question}
      </h3>
      
      {/* Betting Options */}
      <div className="grid grid-cols-2 gap-2">
        <BettingButton
          type="yes"
          price={market.yesPrice}
          onClick={(e) => {
            e.stopPropagation()
            // Handle quick bet
          }}
        />
        <BettingButton
          type="no" 
          price={market.noPrice}
          onClick={(e) => {
            e.stopPropagation()
            // Handle quick bet
          }}
        />
      </div>
      
      {/* Footer */}
      <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
        <span>Ends {formatDate(market.endTime)}</span>
        <span>🔥 Trending</span>
      </div>
    </div>
  )
}

function BettingButton({ type, price, onClick }: {
  type: 'yes' | 'no'
  price: number
  onClick: (e: React.MouseEvent) => void
}) {
  const isYes = type === 'yes'
  
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg font-medium transition-all ${
        isYes 
          ? 'bg-green-900/20 border border-green-800 text-green-400 hover:bg-green-900/30'
          : 'bg-red-900/20 border border-red-800 text-red-400 hover:bg-red-900/30'
      }`}
    >
      <div className="text-xs opacity-75">{isYes ? 'YES' : 'NO'}</div>
      <div className="text-lg font-bold">{Math.round(price * 100)}¢</div>
    </button>
  )
}
```

### Phase 3: Individual Market Detail Page (Week 2-3)

#### 3.1 Market Detail Layout
```tsx
// src/app/market/[id]/page.tsx
export default function MarketDetail({ params }: { params: { id: string } }) {
  const marketId = parseInt(params.id)
  const { data: market } = useMarketDetail(marketId)
  const { data: pricing } = useMarketPricing(marketId)
  const { data: chartData } = useMarketChart(marketId)
  
  if (!market) return <MarketSkeleton />
  
  return (
    <div className="min-h-screen bg-polymarket-bg text-polymarket-text">
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <MarketHeader market={market} />
            <MarketChart data={chartData} />
            <OutcomesList outcomes={pricing?.outcomes || []} />
          </div>
          
          {/* Trading Panel */}
          <div className="space-y-6">
            <TradingPanel market={market} pricing={pricing} />
            <RelatedMarkets marketId={marketId} />
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### 3.2 Trading Panel Component
```tsx
// src/components/trading/TradingPanel.tsx  
export function TradingPanel({ market, pricing }: TradingPanelProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes')
  const [betAmount, setBetAmount] = useState('')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  
  const { mutate: placeBet, isLoading } = usePlaceBetMutation()
  
  const currentPrice = selectedOutcome === 'yes' ? pricing?.yesPrice : pricing?.noPrice
  const expectedShares = useMemo(() => {
    if (!betAmount || !pricing) return 0n
    
    const amount = parseUSDC(betAmount)
    const outcomeIndex = selectedOutcome === 'yes' ? 0 : 1
    const totalShares = [pricing.yesShares, pricing.noShares]
    const liquidity = BigInt(1000000 * 1e18)
    
    return PolyrmarketAMM.calculateSharesReceived(
      amount, outcomeIndex, totalShares, liquidity
    ).shares
  }, [betAmount, selectedOutcome, pricing])
  
  return (
    <div className="bg-polymarket-card rounded-lg p-4 border border-gray-800">
      <div className="space-y-4">
        
        {/* Outcome Selection */}
        <div className="flex rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => setSelectedOutcome('yes')}
            className={`flex-1 py-3 text-sm font-medium ${
              selectedOutcome === 'yes'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Yes {Math.round((pricing?.yesPrice || 0) * 100)}¢
          </button>
          <button
            onClick={() => setSelectedOutcome('no')}
            className={`flex-1 py-3 text-sm font-medium ${
              selectedOutcome === 'no'
                ? 'bg-red-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            No {Math.round((pricing?.noPrice || 0) * 100)}¢
          </button>
        </div>
        
        {/* Amount Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-8 pr-4 text-white focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="flex gap-2 mt-2">
            {['1', '20', '100', 'Max'].map(amount => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className="px-3 py-1 text-xs bg-gray-800 rounded border border-gray-700 hover:border-gray-600"
              >
                +${amount}
              </button>
            ))}
          </div>
        </div>
        
        {/* Expected Return */}
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Shares</span>
            <span className="text-white">{formatUSDC(expectedShares)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Avg Price</span>
            <span className="text-white">{Math.round((currentPrice || 0) * 100)}¢</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Max Payout</span>
            <span className="text-green-400">
              ${(parseFloat(betAmount || '0') / (currentPrice || 0.5)).toFixed(2)}
            </span>
          </div>
        </div>
        
        {/* Place Order Button */}
        <button
          onClick={handlePlaceBet}
          disabled={!betAmount || isLoading}
          className={`w-full py-3 rounded-lg font-medium ${
            selectedOutcome === 'yes'
              ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-800'
              : 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
          } disabled:opacity-50`}
        >
          {isLoading ? 'Placing...' : `Buy ${selectedOutcome === 'yes' ? 'Yes' : 'No'} ${Math.round((currentPrice || 0) * 100)}¢`}
        </button>
      </div>
    </div>
  )
}
```

### Phase 4: Price Charts & Market Data (Week 3-4)

#### 4.1 Market Chart Component  
```tsx
// src/components/markets/MarketChart.tsx
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

export function MarketChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <div className="bg-polymarket-card rounded-lg p-4 border border-gray-800">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis 
              dataKey="timestamp" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
            />
            <YAxis 
              domain={[0, 1]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value) => `${Math.round(value * 100)}¢`}
            />
            <Line 
              type="monotone" 
              dataKey="yesPrice" 
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="noPrice" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Chart Controls */}
      <div className="flex justify-center space-x-2 mt-4">
        {['1H', '6H', '1D', '1W', '1M', 'ALL'].map(period => (
          <button
            key={period}
            className="px-3 py-1 text-xs bg-gray-800 rounded hover:bg-gray-700"
          >
            {period}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## 📅 **IMPLEMENTATION TIMELINE**

### Week 1: Foundation
- ✅ Dark theme setup
- ✅ Layout components (Navbar, Sidebar) 
- ✅ Market grid dashboard
- ✅ Market card components
- ✅ Basic routing structure

### Week 2: Market Details  
- ✅ Individual market pages
- ✅ AMM pricing algorithms
- ✅ Trading panel UI
- ✅ Real-time price updates

### Week 3: Trading Engine
- ✅ Order placement system
- ✅ Market chart components  
- ✅ Order book generation
- ✅ Position management

### Week 4: Polish & Features
- ✅ User portfolio page
- ✅ Market search & filtering
- ✅ Responsive design
- ✅ Performance optimization

Want me to start implementing Phase 1 - the dark theme foundation and market grid dashboard? This will give us the Polymarket look and feel as the base for everything else.
