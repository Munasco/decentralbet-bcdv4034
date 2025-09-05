import { createConfig, http } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Simple development-focused config
export const config = createConfig({
  chains: [hardhat],
  connectors: [
    injected(), // MetaMask, etc.
  ],
  transports: {
    [hardhat.id]: http('http://localhost:8545'),
  },
})


// Default chain for development
export const DEFAULT_CHAIN = hardhat
