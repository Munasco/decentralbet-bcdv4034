'use client';

import { formatUSDC } from '@/lib/decimals';
import { useState } from 'react';

interface MarketStatsProps {
  marketData: {
    totalVolume: bigint;
    yesShares: bigint;
    noShares: bigint;
    endTime: bigint;
    isResolved: boolean;
    creator: string;
  };
  pricing: {
    yesPrice: number;
    noPrice: number;
  };
  className?: string;
}

interface StatItem {
  label: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

export default function MarketStats({ marketData, pricing, className = '' }: MarketStatsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');
  
  const { totalVolume, yesShares, noShares, endTime, isResolved, creator } = marketData;
  
  // Calculate market metrics
  const totalShares = yesShares + noShares;
  const marketCap = Number(totalVolume) / 1e18 * (pricing.yesPrice + pricing.noPrice);
  const liquidity = Number(totalShares) / 1e18 * 0.1; // Rough estimate
  const participantCount = Math.floor(Math.random() * 500) + 50; // Mock data
  const priceChange24h = (Math.random() - 0.5) * 0.2; // Mock 24h change
  const volumeChange24h = (Math.random() - 0.5) * 0.3; // Mock volume change
  
  const timeRemaining = Number(endTime) * 1000 - Date.now();
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / (24 * 60 * 60 * 1000)));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)));
  
  const stats: StatItem[] = [
    {
      label: 'Total Volume',
      value: `$${formatUSDC(totalVolume)}`,
      subtext: `${volumeChange24h > 0 ? '+' : ''}${(volumeChange24h * 100).toFixed(1)}% 24h`,
      trend: volumeChange24h > 0 ? 'up' : 'down',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      label: 'Market Cap',
      value: `$${marketCap.toFixed(0)}`,
      subtext: 'Current valuation',
      trend: 'neutral'
    },
    {
      label: 'Liquidity',
      value: `$${liquidity.toFixed(0)}`,
      subtext: 'Available for trading',
      trend: 'neutral'
    },
    {
      label: 'Participants',
      value: participantCount.toString(),
      subtext: 'Unique traders',
      trend: 'neutral'
    },
    {
      label: 'YES Price',
      value: `${Math.round(pricing.yesPrice * 100)}¢`,
      subtext: `${priceChange24h > 0 ? '+' : ''}${(priceChange24h * 100).toFixed(1)}% 24h`,
      trend: priceChange24h > 0 ? 'up' : 'down'
    },
    {
      label: 'NO Price',
      value: `${Math.round(pricing.noPrice * 100)}¢`,
      subtext: `${-priceChange24h > 0 ? '+' : ''}${(-priceChange24h * 100).toFixed(1)}% 24h`,
      trend: -priceChange24h > 0 ? 'up' : 'down'
    },
    {
      label: 'Time Remaining',
      value: isResolved ? 'Resolved' : `${daysRemaining}d ${hoursRemaining}h`,
      subtext: isResolved ? 'Market closed' : 'Until resolution',
      trend: 'neutral'
    },
    {
      label: 'Creator',
      value: `${creator.slice(0, 6)}...${creator.slice(-4)}`,
      subtext: 'Market creator',
      trend: 'neutral'
    }
  ];

  // Mock recent activity data
  const recentActivity = [
    { type: 'trade', user: '0x1234...5678', action: 'Bought YES', amount: '$125.50', time: '2m ago' },
    { type: 'trade', user: '0xabcd...efgh', action: 'Sold NO', amount: '$89.25', time: '5m ago' },
    { type: 'trade', user: '0x9876...5432', action: 'Bought NO', amount: '$200.00', time: '8m ago' },
    { type: 'comment', user: '0xdef0...1234', action: 'Added comment', amount: '', time: '12m ago' },
    { type: 'trade', user: '0x5555...aaaa', action: 'Bought YES', amount: '$75.00', time: '15m ago' },
  ];

  const StatCard = ({ stat }: { stat: StatItem }) => (
    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs text-gray-200 font-medium mb-1">{stat.label}</div>
          <div className="text-lg font-semibold text-gray-50 mb-1">{stat.value}</div>
          {stat.subtext && (
            <div className={`text-xs flex items-center gap-1 ${
              stat.trend === 'up' ? 'text-green-300' : 
              stat.trend === 'down' ? 'text-red-300' : 
              'text-gray-300'
            }`}>
              {stat.trend === 'up' && <span>↗</span>}
              {stat.trend === 'down' && <span>↘</span>}
              {stat.subtext}
            </div>
          )}
        </div>
        {stat.icon && (
          <div className="text-gray-300 ml-2">
            {stat.icon}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Tab Headers */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-gray-50 bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-200 hover:text-gray-100'
          }`}
        >
          Market Stats
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'activity'
              ? 'text-gray-50 bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-200 hover:text-gray-100'
          }`}
        >
          Recent Activity
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <StatCard key={index} stat={stat} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-200 mb-3">Recent Activity</div>
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'trade' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}></div>
                  <div>
                    <div className="text-sm text-gray-200">
                      <span className="text-gray-300">{activity.user}</span> {activity.action}
                    </div>
                    {activity.amount && (
                      <div className="text-xs text-gray-300">{activity.amount}</div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-300">{activity.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
