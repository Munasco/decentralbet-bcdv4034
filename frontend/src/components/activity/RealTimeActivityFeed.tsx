'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Activity, TrendingUp, DollarSign, Clock, Users, ExternalLink } from 'lucide-react'
import { wsClient } from '@/lib/websocket/client'
import { BetActivity, BackendMarket, SocketStatus } from '@/lib/api/types'
import { formatUSDC } from '@/lib/utils/format'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'bet_placed' | 'market_created' | 'market_resolved' | 'volume_update'
  timestamp: string
  data: any
}

interface RealTimeActivityFeedProps {
  maxItems?: number
  showOnlyMarket?: number
  className?: string
}

export default function RealTimeActivityFeed({ 
  maxItems = 50, 
  showOnlyMarket, 
  className = '' 
}: RealTimeActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [connectionStatus, setConnectionStatus] = useState<SocketStatus>({ 
    connected: false, 
    reconnectAttempts: 0 
  })
  const [isVisible, setIsVisible] = useState(true)
  const feedRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    // Connection status listener
    const unsubscribeStatus = wsClient.on('connection:status', (status) => {
      setConnectionStatus(status as SocketStatus)
    })

    // Market events
    const unsubscribeMarketCreated = wsClient.on('market:created', (market: BackendMarket) => {
      const activity: ActivityItem = {
        id: `market_created_${market._id}_${Date.now()}`,
        type: 'market_created',
        timestamp: new Date().toISOString(),
        data: market
      }
      addActivity(activity)
    })

    const unsubscribeMarketResolved = wsClient.on('market:resolved', (data) => {
      const activity: ActivityItem = {
        id: `market_resolved_${data.marketId}_${Date.now()}`,
        type: 'market_resolved',
        timestamp: new Date().toISOString(),
        data
      }
      addActivity(activity)
    })

    // Betting events
    const unsubscribeBetPlaced = wsClient.on('bet:placed', (betActivity: BetActivity) => {
      // Filter by market if specified
      if (showOnlyMarket && betActivity.market._id !== showOnlyMarket.toString()) {
        return
      }

      const activity: ActivityItem = {
        id: `bet_placed_${betActivity._id}_${Date.now()}`,
        type: 'bet_placed',
        timestamp: betActivity.betTime,
        data: betActivity
      }
      addActivity(activity)
    })

    const unsubscribeVolumeUpdate = wsClient.on('market:volume_updated', (data) => {
      // Filter by market if specified
      if (showOnlyMarket && data.marketId !== showOnlyMarket) {
        return
      }

      const activity: ActivityItem = {
        id: `volume_update_${data.marketId}_${Date.now()}`,
        type: 'volume_update',
        timestamp: new Date().toISOString(),
        data
      }
      addActivity(activity)
    })

    // Join market room if specified
    if (showOnlyMarket) {
      wsClient.joinMarket(showOnlyMarket)
    }

    return () => {
      unsubscribeStatus()
      unsubscribeMarketCreated()
      unsubscribeMarketResolved()
      unsubscribeBetPlaced()
      unsubscribeVolumeUpdate()

      if (showOnlyMarket) {
        wsClient.leaveMarket(showOnlyMarket)
      }
    }
  }, [showOnlyMarket])

  const addActivity = (newActivity: ActivityItem) => {
    setActivities(prev => {
      const filtered = prev.filter(item => item.id !== newActivity.id)
      const updated = [newActivity, ...filtered].slice(0, maxItems)
      return updated
    })

    // Auto scroll to top if enabled
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleScroll = () => {
    if (feedRef.current) {
      const { scrollTop } = feedRef.current
      setAutoScroll(scrollTop < 50) // Disable auto-scroll if user scrolled down
    }
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'bet_placed':
        return <DollarSign className="w-4 h-4 text-green-500" />
      case 'market_created':
        return <TrendingUp className="w-4 h-4 text-blue-500" />
      case 'market_resolved':
        return <Activity className="w-4 h-4 text-purple-500" />
      case 'volume_update':
        return <Users className="w-4 h-4 text-orange-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const formatActivityDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'bet_placed':
        const bet = activity.data as BetActivity
        return (
          <div>
            <span className="font-medium">
              {bet.user.username || `${bet.user.walletAddress.slice(0, 6)}...${bet.user.walletAddress.slice(-4)}`}
            </span>
            <span className="text-gray-600 dark:text-gray-400"> bet </span>
            <span className="font-medium text-green-600">${formatUSDC(bet.amount)}</span>
            <span className="text-gray-600 dark:text-gray-400"> on </span>
            <span className="font-medium">{bet.outcomeDescription}</span>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Market: {bet.market.question.length > 50 ? 
                `${bet.market.question.slice(0, 50)}...` : 
                bet.market.question}
            </div>
          </div>
        )

      case 'market_created':
        const market = activity.data as BackendMarket
        return (
          <div>
            <span className="font-medium">New market created:</span>
            <div className="font-medium text-blue-600 dark:text-blue-400 mt-1">
              {market.question}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Category: {market.category} • {market.outcomes.length} outcomes
            </div>
          </div>
        )

      case 'market_resolved':
        const resolution = activity.data
        return (
          <div>
            <span className="font-medium">Market resolved:</span>
            <div className="font-medium text-purple-600 dark:text-purple-400 mt-1">
              Market #{resolution.marketId}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Winning outcome: #{resolution.winningOutcome}
            </div>
          </div>
        )

      case 'volume_update':
        const volumeData = activity.data
        return (
          <div>
            <span className="font-medium">Volume updated</span>
            <div className="font-medium text-orange-600 dark:text-orange-400 mt-1">
              Market #{volumeData.marketId}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              New volume: ${formatUSDC(volumeData.newVolume)}
            </div>
          </div>
        )

      default:
        return <span>Unknown activity</span>
    }
  }

  const getActivityLink = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'bet_placed':
        return `/market/${activity.data.market._id}`
      case 'market_created':
        return `/market/${activity.data._id}`
      case 'market_resolved':
        return `/market/${activity.data.marketId}`
      case 'volume_update':
        return `/market/${activity.data.marketId}`
      default:
        return null
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Activity className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {showOnlyMarket ? 'Market Activity' : 'Live Activity Feed'}
          </h3>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {connectionStatus.connected ? 'Live' : 'Disconnected'}
          </span>
          {connectionStatus.pingLatency && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {connectionStatus.pingLatency}ms
            </span>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div 
        ref={feedRef}
        className="h-96 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {!connectionStatus.connected && (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-600 text-4xl mb-4">📡</div>
            <p className="text-gray-500 dark:text-gray-400">
              Connecting to live feed...
            </p>
            {connectionStatus.reconnectAttempts > 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Reconnect attempts: {connectionStatus.reconnectAttempts}
              </p>
            )}
          </div>
        )}

        {connectionStatus.connected && activities.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-600 text-4xl mb-4">⌚</div>
            <p className="text-gray-500 dark:text-gray-400">
              Waiting for activity...
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Real-time updates will appear here
            </p>
          </div>
        )}

        {activities.map((activity) => {
          const link = getActivityLink(activity)
          const ActivityContent = (
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                {formatActivityDescription(activity)}
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </div>
                  
                  {link && (
                    <ExternalLink className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                  )}
                </div>
              </div>
            </div>
          )

          if (link) {
            return (
              <a
                key={activity.id}
                href={link}
                className="block cursor-pointer"
                onClick={(e) => {
                  // Handle navigation here if using Next.js router
                  e.preventDefault()
                  // router.push(link)
                }}
              >
                {ActivityContent}
              </a>
            )
          }

          return (
            <div key={activity.id}>
              {ActivityContent}
            </div>
          )
        })}

        {/* Auto-scroll indicator */}
        {!autoScroll && activities.length > 0 && (
          <div className="sticky bottom-0 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
            <button
              onClick={() => {
                setAutoScroll(true)
                feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium text-sm"
            >
              ↑ Resume auto-scroll
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              Showing {activities.length} recent activities
            </span>
            <button
              onClick={() => setActivities([])}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
