import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Production config for Sepolia testnet
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(), // MetaMask, etc.
    metaMask(),
  ],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/M_mrbBEw-ctKxBuux_g0g'),
  },
})

// Default chain for testnet
export const DEFAULT_CHAIN = sepolia
