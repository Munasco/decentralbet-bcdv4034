/**
 * Formatting utilities for the frontend
 * Re-exports functions from other utility modules for convenient access
 */

// Re-export USDC formatting from decimals module
export { formatUSDC, parseUSDC, validateUSDCAmount, validateFaucetAmount } from '@/lib/decimals'

/**
 * Format a wallet address to a shortened version
 * @param address Full wallet address
 * @param prefixLength Number of characters to show at start (default: 6)
 * @param suffixLength Number of characters to show at end (default: 4)
 * @returns Shortened address like "0x1234...abcd"
 */
export function formatAddress(
  address: string, 
  prefixLength: number = 6, 
  suffixLength: number = 4
): string {
  if (!address || address.length <= prefixLength + suffixLength) {
    return address
  }
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`
}

/**
 * Format a large number with appropriate suffixes (K, M, B)
 * @param num Number to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted string like "1.2K" or "3.4M"
 */
export function formatCompactNumber(num: number, decimals: number = 1): string {
  if (num < 1000) {
    return num.toString()
  }

  const units = ['', 'K', 'M', 'B', 'T']
  const order = Math.floor(Math.log10(Math.abs(num)) / 3)
  const unitIndex = Math.min(order, units.length - 1)
  const scaled = num / Math.pow(1000, unitIndex)

  return `${scaled.toFixed(decimals)}${units[unitIndex]}`
}

/**
 * Format a percentage with proper styling
 * @param value Decimal value (0.5 = 50%)
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format a time duration in human readable format
 * @param seconds Duration in seconds
 * @returns Human readable duration like "2d 3h" or "45m"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

/**
 * Format a profit/loss amount with appropriate styling classes
 * @param amount Amount as string or number
 * @returns Object with formatted text and CSS classes
 */
export function formatProfitLoss(amount: string | number): { 
  text: string; 
  className: string; 
  isProfit: boolean 
} {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(value) || value === 0) {
    return { 
      text: '$0.00', 
      className: 'text-gray-600 dark:text-gray-400', 
      isProfit: false 
    }
  }

  if (value > 0) {
    return { 
      text: `+$${Math.abs(value).toFixed(2)}`, 
      className: 'text-green-600 dark:text-green-400', 
      isProfit: true 
    }
  } else {
    return { 
      text: `-$${Math.abs(value).toFixed(2)}`, 
      className: 'text-red-600 dark:text-red-400', 
      isProfit: false 
    }
  }
}

/**
 * Format a price for display (handles both number and bigint)
 * @param price Price value
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted price string
 */
export function formatPrice(price: number | bigint, decimals: number = 2): string {
  if (typeof price === 'bigint') {
    // Assume it's in wei format, use formatUSDC
    return formatUSDC(price, decimals)
  }
  return price.toFixed(decimals)
}
