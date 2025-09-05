/**
 * Automated Market Maker (AMM) Pricing Engine
 * Implements Logarithmic Market Scoring Rule (LMSR) used by Polymarket
 */

export interface MarketPricing {
  yesPrice: number
  noPrice: number
  yesShares: bigint
  noShares: bigint
  expectedShares: bigint
  maxPayout: number
  priceImpact: number
}

export class PolymarketAMM {
  
  /**
   * Core LMSR pricing function
   * Price = exp(q_i/b) / sum(exp(q_j/b)) for all outcomes j
   */
  static calculatePrice(
    outcome: number, 
    totalShares: bigint[], 
    liquidity: bigint
  ): number {
    // Liquidity parameter (b) - controls price sensitivity
    const b = Number(liquidity) / 1e18
    
    if (b === 0) return 0.5 // Default if no liquidity
    
    // Calculate exponential terms for all outcomes
    const expTerms = totalShares.map(shares => {
      const sharesNormalized = Number(shares) / 1e18
      return Math.exp(sharesNormalized / b)
    })
    
    const sumExp = expTerms.reduce((sum, exp) => sum + exp, 0)
    
    if (sumExp === 0) return 0.5
    
    // Price is the probability according to LMSR
    return expTerms[outcome] / sumExp
  }
  
  /**
   * Calculate shares received for a given bet amount
   * Uses binary search to find the optimal share amount
   */
  static calculateSharesReceived(
    betAmount: bigint,
    outcome: number, 
    currentShares: bigint[],
    liquidity: bigint
  ): { shares: bigint; newPrice: number; priceImpact: number } {
    
    if (betAmount === BigInt(0)) {
      return { 
        shares: BigInt(0), 
        newPrice: this.calculatePrice(outcome, currentShares, liquidity),
        priceImpact: 0
      }
    }
    
    const currentPrice = this.calculatePrice(outcome, currentShares, liquidity)
    
    // Binary search to find shares that match bet amount
    let low = BigInt(0)
    let high = betAmount * BigInt(10) // Upper bound estimate
    let bestShares = BigInt(0)
    
    // Binary search with tolerance
    while (high - low > BigInt(1)) {
      const midShares = (low + high) / BigInt(2)
      const newShares = [...currentShares]
      newShares[outcome] += midShares
      
      const cost = this.calculateCost(currentShares, newShares, liquidity)
      
      if (cost <= betAmount) {
        bestShares = midShares
        low = midShares
      } else {
        high = midShares
      }
    }
    
    // Calculate new price after purchase
    const finalShares = [...currentShares]
    finalShares[outcome] += bestShares
    const newPrice = this.calculatePrice(outcome, finalShares, liquidity)
    
    // Calculate price impact
    const priceImpact = Math.abs(newPrice - currentPrice) / currentPrice
    
    return { shares: bestShares, newPrice, priceImpact }
  }
  
  /**
   * Calculate cost difference between two market states using LMSR
   */
  private static calculateCost(
    oldShares: bigint[], 
    newShares: bigint[], 
    liquidity: bigint
  ): bigint {
    const b = Number(liquidity) / 1e18
    
    if (b === 0) return BigInt(0)
    
    // LMSR cost function: C(q) = b * ln(sum(exp(q_i/b)))
    const oldCost = b * Math.log(
      oldShares.reduce((sum, shares) => {
        return sum + Math.exp(Number(shares) / 1e18 / b)
      }, 0)
    )
    
    const newCost = b * Math.log(
      newShares.reduce((sum, shares) => {
        return sum + Math.exp(Number(shares) / 1e18 / b)
      }, 0)
    )
    
    const costDiff = newCost - oldCost
    return BigInt(Math.max(0, Math.round(costDiff * 1e18)))
  }
  
  /**
   * Calculate expected payout for winning shares
   */
  static calculateExpectedPayout(
    shares: bigint,
    outcome: number,
    marketShares: bigint[]
  ): number {
    if (shares === BigInt(0)) return 0
    
    const totalShares = marketShares[outcome]
    if (totalShares === BigInt(0)) return 0
    
    // Each share pays out $1 if the outcome wins
    return Number(shares) / 1e18
  }
  
  /**
   * Get comprehensive market pricing information
   */
  static getMarketPricing(
    yesShares: bigint,
    noShares: bigint,
    betAmount: string = '0',
    selectedOutcome: 'yes' | 'no' = 'yes',
    liquidity: bigint = BigInt(1000000 * 1e18) // 1M USDC default
  ): MarketPricing {
    
    const totalShares = [yesShares, noShares]
    const outcomeIndex = selectedOutcome === 'yes' ? 0 : 1
    const betAmountWei = betAmount ? BigInt(parseFloat(betAmount) * 1e18) : BigInt(0)
    
    // Calculate current prices
    const yesPrice = this.calculatePrice(0, totalShares, liquidity)
    const noPrice = this.calculatePrice(1, totalShares, liquidity)
    
    // Calculate expected shares for bet amount
    const { shares: expectedShares, priceImpact } = betAmountWei > BigInt(0) 
      ? this.calculateSharesReceived(betAmountWei, outcomeIndex, totalShares, liquidity)
      : { shares: BigInt(0), priceImpact: 0 }
    
    // Calculate max payout (if outcome wins, each share = $1)
    const maxPayout = expectedShares > BigInt(0) ? Number(expectedShares) / 1e18 : 0
    
    return {
      yesPrice,
      noPrice,
      yesShares,
      noShares,
      expectedShares,
      maxPayout,
      priceImpact
    }
  }
}
