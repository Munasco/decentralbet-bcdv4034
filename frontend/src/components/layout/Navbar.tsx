'use client'

import * as React from 'react'
import { WalletConnect } from '@/components/WalletConnect'
import { formatUSDC } from '@/lib/decimals'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTokenFaucet } from '@/hooks/usePredictionMarket'

interface NavbarProps {
  searchQuery?: string
  onSearchChange?: (value: string) => void
  selectedCategory?: string
  onSelectCategory?: (cat: string) => void
  onSelectSort?: (sort: 'trending' | 'newest') => void
  sortBy?: 'volume' | 'trending' | 'ending_soon' | 'newest'
  cashUSDC?: bigint
  portfolioUSDC?: bigint
}

const DEFAULT_CATEGORIES = [
  'Trending',
  'New',
  'Politics',
  'Sports',
  'Crypto',
  'Technology', // Match blockchain category name
  'Economics', // Match blockchain category name
]

function mapCategory(cat: string): { type: 'category' | 'sort'; value: string } {
  switch (cat) {
    case 'Trending':
      return { type: 'sort', value: 'trending' }
    case 'New':
      return { type: 'sort', value: 'newest' }
    case 'Technology': // Use actual blockchain category name
      return { type: 'category', value: 'Technology' }
    case 'Economics': // Use actual blockchain category name
      return { type: 'category', value: 'Economics' }
    default:
      return { type: 'category', value: cat }
  }
}

export function Navbar({ searchQuery = '', onSearchChange, selectedCategory, onSelectCategory, onSelectSort, sortBy, cashUSDC, portfolioUSDC }: NavbarProps) {
  const cashText = typeof cashUSDC === 'bigint' ? formatUSDC(cashUSDC) : '0.00'
  const portfolioText = typeof portfolioUSDC === 'bigint' ? formatUSDC(portfolioUSDC) : '0.00'

  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState('100')
  const { getTokens, isLoading: faucetLoading } = useTokenFaucet(() => setOpen(false))

  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row: brand, search, wallet */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand */}
          <button
            onClick={() => (window.location.href = '/')}
            className="flex items-center hover:opacity-90 transition-opacity"
            aria-label="Go to home"
          >
            <div className="w-8 h-8 mr-2 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              Δ
            </div>
            <span className="text-xl font-semibold text-gray-100">DecentralBet</span>
          </button>

          {/* Search */}
          <div className="flex-1 max-w-3xl hidden md:block">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search polymarket"
                className="w-full bg-gray-800 text-gray-100 placeholder-gray-400 rounded-lg pl-10 pr-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right side: balances + wallet + top up */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="text-right">
                <div className="text-gray-400">Portfolio</div>
                <div className="text-green-400 font-medium">${portfolioText}</div>
              </div>
              <div className="text-right">
                <div className="text-gray-400">Cash</div>
                <div className="text-green-400 font-medium">${cashText}</div>
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                  Top up
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-gray-900 text-white border border-gray-800">
                <DialogHeader>
                  <DialogTitle>Get test USDC</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    Request tokens from the faucet to fund your trades. Limits apply to keep things fair.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Amount (USDC)</label>
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="100"
                    />
                    <p className="text-xs text-gray-400 mt-1">Min 1, Max 1000 per request. Use only on local/test networks.</p>
                  </div>
                </div>
                <DialogFooter className="sm:justify-between">
                  <div className="text-xs text-gray-400">Funds appear after the transaction confirms.</div>
                  <Button
                    type="button"
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    disabled={faucetLoading}
                    onClick={() => getTokens(amount)}
                  >
                    {faucetLoading ? 'Requesting…' : 'Request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="h-6 w-px bg-gray-700 hidden md:block" />
            <WalletConnect />
          </div>
        </div>
      </div>

      {/* Categories row */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex items-center gap-6 h-12 text-sm">
            {DEFAULT_CATEGORIES.map((cat) => {
              const mapped = mapCategory(cat)
              const isSort = mapped.type === 'sort'
              const isActive = isSort
                ? (sortBy === mapped.value)
                : (selectedCategory === mapped.value)
              return (
                <button
                  key={cat}
                  onClick={() => {
                    if (mapped.type === 'sort') {
                      onSelectSort?.(mapped.value as 'trending' | 'newest')
                      onSelectCategory?.('All') // Reset category filter when sorting
                    } else {
                      onSelectCategory?.(mapped.value)
                    }
                  }}
                  className={
                    isActive
                      ? 'text-gray-100 font-medium'
                      : 'text-gray-300 hover:text-gray-100'
                  }
                  aria-current={isActive ? 'page' : undefined}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
