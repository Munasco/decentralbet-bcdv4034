'use client'

import React, { useState, useEffect } from 'react'
import { User, TrendingUp, TrendingDown, Target, Award, Calendar, Wallet, Settings, ExternalLink } from 'lucide-react'
import { useAccount } from 'wagmi'
import { apiClient } from '@/lib/api/client'
import { UserProfile as UserProfileType, BetActivity } from '@/lib/api/types'
import { formatUSDC } from '@/lib/utils/format'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'

interface UserProfileProps {
  walletAddress?: string
  showSettings?: boolean
  className?: string
}

export default function UserProfile({ 
  walletAddress, 
  showSettings = true, 
  className = '' 
}: UserProfileProps) {
  const { address: connectedAddress } = useAccount()
  const [profile, setProfile] = useState<UserProfileType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'settings'>('overview')

  const targetAddress = walletAddress || connectedAddress
  const isOwnProfile = !walletAddress || walletAddress === connectedAddress

  useEffect(() => {
    if (targetAddress) {
      fetchUserProfile()
    }
  }, [targetAddress])

  const fetchUserProfile = async () => {
    if (!targetAddress) return

    setLoading(true)
    setError(null)

    try {
      const userProfile = await apiClient.getUserProfile(targetAddress)
      setProfile(userProfile)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const calculateWinRate = (stats: any) => {
    if (!stats.totalBets || stats.totalBets === 0) return 0
    return (stats.winRate * 100).toFixed(1)
  }

  const formatProfitLoss = (amount: string) => {
    const value = parseFloat(amount)
    if (value > 0) {
      return { text: `+$${formatUSDC(amount)}`, className: 'text-green-600' }
    } else if (value < 0) {
      return { text: `-$${formatUSDC(Math.abs(value).toString())}`, className: 'text-red-600' }
    }
    return { text: '$0.00', className: 'text-gray-600' }
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center ${className}`}>
        <div className="text-gray-400 dark:text-gray-600 text-4xl mb-4">👤</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {error || 'Profile not found'}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error ? 'Unable to load user profile' : 'This user has not created a profile yet'}
        </p>
        <button
          onClick={fetchUserProfile}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const profitLoss = formatProfitLoss(profile.user.tradingStats.profitLoss)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${className}`}>
      {/* Profile Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {profile.user.username 
                ? profile.user.username.slice(0, 2).toUpperCase()
                : profile.user.walletAddress.slice(2, 4).toUpperCase()
              }
            </div>
            
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.user.username || formatWalletAddress(profile.user.walletAddress)}
                </h2>
                {profile.user.isVerified && (
                  <Award className="w-5 h-5 text-blue-500" />
                )}
              </div>
              
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Wallet className="w-4 h-4 mr-1" />
                  {formatWalletAddress(profile.user.walletAddress)}
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {formatDistanceToNow(new Date(profile.user.joinDate), { addSuffix: true })}
                </div>
              </div>
              
              {profile.user.bio && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {profile.user.bio}
                </p>
              )}
            </div>
          </div>
          
          {isOwnProfile && showSettings && (
            <button
              onClick={() => setActiveTab('settings')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {(['overview', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Settings
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Trading Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Portfolio Value
                    </p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      ${formatUSDC(profile.portfolioValue)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Win Rate
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {calculateWinRate(profile.user.tradingStats)}%
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className={`p-4 rounded-lg ${
                parseFloat(profile.user.tradingStats.profitLoss) >= 0 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      parseFloat(profile.user.tradingStats.profitLoss) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      P&L
                    </p>
                    <p className={`text-2xl font-bold ${profitLoss.className}`}>
                      {profitLoss.text}
                    </p>
                  </div>
                  {parseFloat(profile.user.tradingStats.profitLoss) >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  )}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      Open Positions
                    </p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {profile.openPositions}
                    </p>
                  </div>
                  <User className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Trading Summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Bets</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {profile.user.tradingStats.totalBets}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Volume</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${formatUSDC(profile.user.tradingStats.totalVolume)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Markets Created</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {profile.user.tradingStats.marketsCreated}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Current Streak</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {profile.user.tradingStats.currentStreak}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Best Streak</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {profile.user.tradingStats.bestStreak}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Favorite Categories
                </h4>
                <div className="space-y-2">
                  {profile.favoriteCategories.length > 0 ? (
                    profile.favoriteCategories.map((category, index) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">
                          {category}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          #{index + 1}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No favorite categories yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h4>
            
            {profile.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {profile.recentActivity.map((activity) => (
                  <div
                    key={activity._id}
                    className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Bet placed on {activity.outcomeDescription}
                        </p>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(activity.betTime), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Market: {activity.market.question}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium text-green-600">
                          Amount: ${formatUSDC(activity.amount)}
                        </span>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${activity.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          View on Etherscan
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 dark:text-gray-600 text-4xl mb-4">📊</div>
                <p className="text-gray-500 dark:text-gray-400">
                  No recent activity
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && isOwnProfile && (
          <div className="space-y-6">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Profile Settings
            </h4>
            
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-600 text-4xl mb-4">⚙️</div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Profile settings coming soon
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                You'll be able to update your username, bio, and notification preferences here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
