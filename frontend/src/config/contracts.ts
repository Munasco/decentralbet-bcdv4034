import { Address } from 'viem'
import PredictionMarketContract from '../contracts/PredictionMarket.sol/PredictionMarket.json'
import MockUSDCContract from '../contracts/MockUSDC.sol/MockUSDC.json'
import { Abi } from 'viem'

// Single source of truth for contract addresses
export const CONTRACTS = {
  // Deployed to Sepolia Testnet
  PREDICTION_MARKET: '0x0825840aA80d49100218E8B655F126D26bD24e1D' as Address,
  PREDICTION_MARKET_FACTORY: '0x70ff7fedDb900f9e254aEfA8b9b8f81f5d770460' as Address,
  MOCK_USDC: '0xC8bAD4974f4A6Cf62B39141d79De5c875a66ee3d' as Address,
} as const

// Use real contract ABIs from compiled contracts with proper viem typing
export const MOCK_USDC_ABI = MockUSDCContract.abi as Abi
export const PREDICTION_MARKET_ABI = PredictionMarketContract.abi as Abi
