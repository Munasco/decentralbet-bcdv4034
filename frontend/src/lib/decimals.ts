/**
 * Utility functions for safe USDC decimal handling
 * MockUSDC now uses 18 decimals to match PredictionMarket expectations
 */

export const USDC_DECIMALS = 18;
export const USDC_SCALE = BigInt(10 ** USDC_DECIMALS);

/**
 * Convert USDC wei (with 18 decimals) to human readable string
 * @param weiAmount BigInt amount with 18 decimals
 * @param maxDecimals Maximum decimal places to show (default: 2)
 * @returns Formatted string like "123.45"
 */
export function formatUSDC(weiAmount: bigint | undefined, maxDecimals: number = 2): string {
  if (!weiAmount) return '0.00';
  
  const wholePart = weiAmount / USDC_SCALE;
  const fractionalPart = weiAmount % USDC_SCALE;
  
  if (maxDecimals === 0) {
    return wholePart.toString();
  }
  
  // Convert fractional part to decimal string
  const fractionalStr = fractionalPart.toString().padStart(USDC_DECIMALS, '0');
  const truncated = fractionalStr.slice(0, maxDecimals);
  
  // Remove trailing zeros
  const cleaned = truncated.replace(/0+$/, '');
  
  if (cleaned.length === 0) {
    return wholePart.toString() + '.00';
  }
  
  return wholePart.toString() + '.' + cleaned.padEnd(2, '0');
}

/**
 * Convert human readable USDC amount to wei (with 18 decimals)
 * @param amount String like "123.45" or number
 * @returns BigInt wei amount
 */
export function parseUSDC(amount: string | number): bigint {
  const amountStr = typeof amount === 'number' ? amount.toString() : amount;
  
  if (!amountStr || isNaN(Number(amountStr))) {
    throw new Error('Invalid amount');
  }
  
  const num = parseFloat(amountStr);
  if (num < 0) {
    throw new Error('Amount must be positive');
  }
  
  // Use Math.round to handle floating point precision
  const weiAmount = Math.round(num * (10 ** USDC_DECIMALS));
  return BigInt(weiAmount);
}

/**
 * Check if an amount is valid for USDC operations (generic validation)
 * @param amount String amount to validate
 * @param maxAmount Optional maximum amount (default: no limit)
 * @returns Object with isValid boolean and error message
 */
function validateUSDCAmountBase(amount: string, maxAmount?: number): { isValid: boolean; error?: string } {
  if (!amount || amount.trim() === '') {
    return { isValid: false, error: 'Amount is required' };
  }
  
  const num = parseFloat(amount);
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Invalid amount format' };
  }
  
  if (num <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  // Contract requires minimum 0.01 ether (10^16 wei)
  // With 18-decimal MockUSDC, this equals 0.01 USDC
  const minRequired = 0.01; // 0.01 USDC minimum bet (matches contract's MIN_BET_AMOUNT)
  if (num < minRequired) {
    return { 
      isValid: false, 
      error: `Minimum bet amount is ${minRequired} USDC` 
    };
  }
  
  if (maxAmount && num > maxAmount) {
    return { isValid: false, error: `Amount cannot exceed ${maxAmount.toLocaleString()}` };
  }
  
  // Check decimal places (max 18 for MockUSDC)
  const decimalParts = amount.split('.');
  if (decimalParts.length > 1 && decimalParts[1].length > USDC_DECIMALS) {
    return { isValid: false, error: `Maximum ${USDC_DECIMALS} decimal places allowed` };
  }
  
  return { isValid: true };
}

/**
 * Validate USDC amount for general use (betting, transfers, etc.)
 * @param amount String amount to validate
 * @returns Object with isValid boolean and error message
 */
export function validateUSDCAmount(amount: string): { isValid: boolean; error?: string } {
  return validateUSDCAmountBase(amount); // No maximum limit for general use
}

/**
 * Validate USDC amount specifically for faucet operations (limited to 1000)
 * @param amount String amount to validate
 * @returns Object with isValid boolean and error message
 */
export function validateFaucetAmount(amount: string): { isValid: boolean; error?: string } {
  return validateUSDCAmountBase(amount, 1000); // 1000 USDC limit for faucet (contract limit)
}
