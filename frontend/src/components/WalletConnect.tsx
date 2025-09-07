'use client'

import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi'
import { useState } from 'react'
import { hardhat, sepolia } from 'wagmi/chains'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="hidden sm:inline">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span className="sm:hidden">Connected</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
            <div className="p-4 border-b">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Connected</span>
              </div>
              <div className="text-sm text-gray-600 mb-1">
                {address.slice(0, 20)}...{address.slice(-8)}
              </div>
              <div className="text-xs text-gray-500">
                Network: {chainId === hardhat.id ? 'Hardhat Local' : chainId === sepolia.id ? 'Sepolia' : 'Unknown'}
              </div>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  disconnect()
                  setIsDropdownOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error-muted/20 rounded-lg transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
      >
        Connect Wallet
      </button>
      
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-2">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  connect({ connector })
                  setIsDropdownOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
              >
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {connector.name === 'Injected' ? '🦊' : connector.name.slice(0, 1)}
                </div>
                <span>{connector.name === 'Injected' ? 'MetaMask' : connector.name}</span>
              </button>
            ))}
          </div>
          {connectors.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No wallet connectors available
            </div>
          )}
        </div>
      )}
    </div>
  )
}
