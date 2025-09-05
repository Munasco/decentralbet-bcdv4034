'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  type: 'trade' | 'market_created' | 'market_resolved' | 'large_trade' | 'milestone';
  timestamp: Date;
  user?: string;
  marketId?: number;
  marketTitle?: string;
  data: {
    outcome?: 'YES' | 'NO';
    amount?: number;
    price?: number;
    tradeType?: 'BUY' | 'SELL';
    category?: string;
    resolution?: 'YES' | 'NO';
    milestone?: string;
  };
}

interface ActivityFeedProps {
  className?: string;
  maxItems?: number;
}

// Mock activity data generator
const generateMockActivity = (): ActivityItem[] => {
  const activities: ActivityItem[] = [];
  const marketTitles = [
    "Will Bitcoin reach $100,000 by end of 2024?",
    "Will Tesla stock hit $300 before Q2 2024?",
    "Will AI reach AGI by 2025?",
    "Will inflation drop below 2% in 2024?",
    "Will SpaceX land on Mars by 2026?",
    "Will the next iPhone feature foldable display?",
    "Will Ethereum 2.0 launch successfully?",
    "Will remote work remain prevalent post-2024?"
  ];

  const users = [
    "0x1234...5678", "0xabcd...efgh", "0x9876...5432", 
    "0xdef0...1234", "0x5555...aaaa", "0x7777...bbbb"
  ];

  const categories = ["Crypto", "Stocks", "Technology", "Economy", "Science", "Business"];

  // Generate recent activities
  for (let i = 0; i < 25; i++) {
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000); // Last 24 hours
    const activityType = Math.random() < 0.7 ? 'trade' : 
                        Math.random() < 0.15 ? 'market_created' :
                        Math.random() < 0.1 ? 'market_resolved' :
                        Math.random() < 0.04 ? 'large_trade' : 'milestone';

    const baseActivity = {
      id: `activity-${i}`,
      type: activityType as ActivityItem['type'],
      timestamp,
      user: users[Math.floor(Math.random() * users.length)],
      marketId: Math.floor(Math.random() * 8) + 1,
      marketTitle: marketTitles[Math.floor(Math.random() * marketTitles.length)]
    };

    switch (activityType) {
      case 'trade':
        activities.push({
          ...baseActivity,
          data: {
            outcome: Math.random() > 0.5 ? 'YES' : 'NO',
            amount: Math.floor(Math.random() * 500) + 10,
            price: Math.random() * 0.8 + 0.1,
            tradeType: Math.random() > 0.6 ? 'SELL' : 'BUY',
            category: categories[Math.floor(Math.random() * categories.length)]
          }
        });
        break;

      case 'large_trade':
        activities.push({
          ...baseActivity,
          data: {
            outcome: Math.random() > 0.5 ? 'YES' : 'NO',
            amount: Math.floor(Math.random() * 5000) + 1000, // Large trades
            price: Math.random() * 0.8 + 0.1,
            tradeType: Math.random() > 0.5 ? 'SELL' : 'BUY',
            category: categories[Math.floor(Math.random() * categories.length)]
          }
        });
        break;

      case 'market_created':
        activities.push({
          ...baseActivity,
          data: {
            category: categories[Math.floor(Math.random() * categories.length)]
          }
        });
        break;

      case 'market_resolved':
        activities.push({
          ...baseActivity,
          data: {
            resolution: Math.random() > 0.5 ? 'YES' : 'NO',
            category: categories[Math.floor(Math.random() * categories.length)]
          }
        });
        break;

      case 'milestone':
        const milestones = [
          "$10,000 volume milestone reached",
          "100 unique traders milestone",
          "Market trending #1",
          "High volatility detected"
        ];
        activities.push({
          ...baseActivity,
          data: {
            milestone: milestones[Math.floor(Math.random() * milestones.length)],
            category: categories[Math.floor(Math.random() * categories.length)]
          }
        });
        break;
    }
  }

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export default function ActivityFeed({ className = '', maxItems = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLive, setIsLive] = useState(true);
  
  useEffect(() => {
    // Initial load
    setActivities(generateMockActivity());
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      if (isLive) {
        setActivities(prev => {
          // Add a new random activity
          const newActivity = generateMockActivity().slice(0, 1)[0];
          if (newActivity) {
            newActivity.timestamp = new Date(); // Make it current
            return [newActivity, ...prev.slice(0, maxItems - 1)];
          }
          return prev;
        });
      }
    }, 8000); // New activity every 8 seconds

    return () => clearInterval(interval);
  }, [isLive, maxItems]);

  const formatTimeAgo = (timestamp: Date) => {
    const now = Date.now();
    const diffMs = now - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'trade':
        return '💰';
      case 'large_trade':
        return '🐋';
      case 'market_created':
        return '🆕';
      case 'market_resolved':
        return '✅';
      case 'milestone':
        return '🎯';
      default:
        return '📈';
    }
  };

  const getActivityDescription = (activity: ActivityItem) => {
    const { type, user, data, marketTitle } = activity;
    const shortTitle = marketTitle ? (marketTitle.length > 50 ? marketTitle.slice(0, 50) + '...' : marketTitle) : '';

    switch (type) {
      case 'trade':
        return (
          <span>
            <span className="text-gray-200">{user}</span> {data.tradeType?.toLowerCase()}s{' '}
            <span className={`font-medium ${data.outcome === 'YES' ? 'text-green-300' : 'text-red-300'}`}>
              {data.outcome}
            </span> for{' '}
            <span className="font-medium text-gray-50">${data.amount}</span> on{' '}
            <span className="text-blue-300">{shortTitle}</span>
          </span>
        );

      case 'large_trade':
        return (
          <span>
            <span className="text-yellow-300 font-medium">Large trade:</span>{' '}
            <span className="text-gray-200">{user}</span> {data.tradeType?.toLowerCase()}s{' '}
            <span className={`font-medium ${data.outcome === 'YES' ? 'text-green-300' : 'text-red-300'}`}>
              {data.outcome}
            </span> for{' '}
            <span className="font-semibold text-yellow-300">${data.amount?.toLocaleString()}</span>
          </span>
        );

      case 'market_created':
        return (
          <span>
            New market created:{' '}
            <span className="text-blue-300">{shortTitle}</span> in{' '}
            <span className="text-purple-300">{data.category}</span>
          </span>
        );

      case 'market_resolved':
        return (
          <span>
            Market resolved:{' '}
            <span className="text-blue-300">{shortTitle}</span>{' '}
            outcome is{' '}
            <span className={`font-semibold ${data.resolution === 'YES' ? 'text-green-300' : 'text-red-300'}`}>
              {data.resolution}
            </span>
          </span>
        );

      case 'milestone':
        return (
          <span>
            <span className="text-purple-300 font-medium">{data.milestone}</span> for{' '}
            <span className="text-blue-300">{shortTitle}</span>
          </span>
        );

      default:
        return <span className="text-gray-200">Unknown activity</span>;
    }
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Live Activity</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-200">{isLive ? 'Live' : 'Paused'}</span>
          </div>
        </div>
        
        <button
          onClick={() => setIsLive(!isLive)}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            isLive 
              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
              : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
          }`}
        >
          {isLive ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        <div className="space-y-1">
          {activities.slice(0, maxItems).map((activity, index) => (
            <div 
              key={activity.id}
              className={`p-3 hover:bg-gray-800/50 transition-colors border-l-2 ${
                index === 0 && isLive ? 'border-l-blue-500 bg-blue-900/10' : 'border-l-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-sm mt-0.5">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 leading-relaxed">
                    {activity.marketId ? (
                      <Link href={`/market/${activity.marketId}`} className="hover:underline">
                        {getActivityDescription(activity)}
                      </Link>
                    ) : (
                      getActivityDescription(activity)
                    )}
                  </div>
                  <div className="text-xs text-gray-300 mt-1 flex items-center gap-2">
                    <span>{formatTimeAgo(activity.timestamp)}</span>
                    {activity.data.category && (
                      <>
                        <span>•</span>
                        <span>{activity.data.category}</span>
                      </>
                    )}
                    {activity.data.price && (
                      <>
                        <span>•</span>
                        <span>{Math.round(activity.data.price * 100)}¢</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 text-center">
        <p className="text-xs text-gray-300">
          Showing {Math.min(activities.length, maxItems)} recent activities
        </p>
      </div>
    </div>
  );
}
