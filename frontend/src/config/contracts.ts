import { Address } from 'viem'

// Single source of truth for contract addresses
export const CONTRACTS = {
  // Fresh deployment to Hardhat local network - Updated with 18-decimal MockUSDC
  PREDICTION_MARKET: '0x67d269191c92Caf3cD7723F116c85e6E9bf55933' as Address,
  MOCK_USDC: '0xc5a5C42992dECbae36851359345FE25997F5C42d' as Address,
} as const

// Complete MockUSDC ABI (with all functions that exist in the contract)
export const MOCK_USDC_ABI = [
  // Standard ERC20 functions
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Token metadata
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // MockUSDC-specific functions
  {
    inputs: [{ name: '_amount', type: 'uint256' }],
    name: 'faucet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'spender', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
] as const

// Complete PredictionMarket ABI
export const PREDICTION_MARKET_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'marketCounter',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_marketId', type: 'uint256' }],
    name: 'getMarket',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'question', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'endTime', type: 'uint256' },
      { name: 'resolutionTime', type: 'uint256' },
      { name: 'creator', type: 'address' },
      { name: 'isResolved', type: 'bool' },
      { name: 'winningOutcome', type: 'uint256' },
      { name: 'totalVolume', type: 'uint256' },
      { name: 'outcomeCount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '_marketId', type: 'uint256' },
      { name: '_outcomeId', type: 'uint256' }
    ],
    name: 'getOutcome',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'description', type: 'string' },
      { name: 'totalShares', type: 'uint256' },
      { name: 'totalBacked', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: '_question', type: 'string' },
      { name: '_category', type: 'string' },
      { name: '_description', type: 'string' },
      { name: '_endTime', type: 'uint256' },
      { name: '_outcomeDescriptions', type: 'string[]' },
      { name: '_feePercentage', type: 'uint8' },
    ],
    name: 'createMarket',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: '_marketId', type: 'uint256' },
      { name: '_outcomeId', type: 'uint256' },
      { name: '_amount', type: 'uint256' },
    ],
    name: 'placeBet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'marketId', type: 'uint256' },
      { indexed: false, name: 'question', type: 'string' },
      { indexed: false, name: 'endTime', type: 'uint256' },
      { indexed: false, name: 'creator', type: 'address' },
    ],
    name: 'MarketCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'marketId', type: 'uint256' },
      { indexed: true, name: 'outcomeId', type: 'uint256' },
      { indexed: true, name: 'bettor', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'shares', type: 'uint256' },
    ],
    name: 'BetPlaced',
    type: 'event',
  },
] as const
