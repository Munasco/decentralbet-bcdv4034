'use client';

import { formatUSDC } from '@/lib/decimals';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Users, Activity, Brain, Trophy, Clock, DollarSign } from 'lucide-react';
import { useMarketSocialData } from '@/hooks/useMarketData';

interface MarketStatsProps {
  marketId: number | string;
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

export default function MarketStats({ marketId, marketData, pricing, className = '' }: MarketStatsProps) {
  
  const { totalVolume, yesShares, noShares, endTime, isResolved, creator } = marketData;
  
  // Use TanStack Query for stable, cached data
  const { metrics, holders, activity, insights, isLoading } = useMarketSocialData(marketId, totalVolume);
  
  // Calculate market metrics
  const totalShares = yesShares + noShares;
  const marketCap = Number(totalVolume) / 1e18 * (pricing.yesPrice + pricing.noPrice);
  
  // Use stable metrics from the hook instead of oscillating Math.random
  const participantCount = metrics.data?.participantCount ?? 150;
  const priceChange24h = metrics.data?.priceChange24h ?? 0.0;
  const volumeChange24h = metrics.data?.volumeChange24h ?? 0.0;
  const liquidity = Number(totalShares) / 1e18 * (metrics.data?.liquidityMultiplier ?? 0.1);
  
  // Use data from hooks
  const topHolders = holders.data ?? [];
  const marketActivity = activity.data ?? [];
  const contextInsights = insights.data ?? [];
  
  if (isLoading) {
    return (
      <Card className={`bg-gray-900 border-gray-700 ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-700 rounded mb-4 w-1/3 mx-auto"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }
  
  // Remove the hardcoded contextInsights array - will use insights.data instead
  
  const timeRemaining = Number(endTime) * 1000 - Date.now();
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / (24 * 60 * 60 * 1000)));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)));
  
  const stats: StatItem[] = [
    {
      label: 'Total Volume',
      value: `$${formatUSDC(totalVolume)}`,
      subtext: `${volumeChange24h > 0 ? '+' : ''}${(volumeChange24h * 100).toFixed(1)}% 24h`,
      trend: volumeChange24h > 0 ? 'up' : 'down',
      icon: <DollarSign className="w-4 h-4" />
    },
    {
      label: 'Market Cap',
      value: `$${marketCap.toFixed(0)}`,
      subtext: 'Current valuation',
      trend: 'neutral',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      label: 'Liquidity',
      value: `$${liquidity.toFixed(0)}`,
      subtext: 'Available for trading',
      trend: 'neutral',
      icon: <Activity className="w-4 h-4" />
    },
    {
      label: 'Participants',
      value: participantCount.toString(),
      subtext: 'Unique traders',
      trend: 'neutral',
      icon: <Users className="w-4 h-4" />
    },
    {
      label: 'YES Price',
      value: `${Math.round(pricing.yesPrice * 100)}¢`,
      subtext: `${priceChange24h > 0 ? '+' : ''}${(priceChange24h * 100).toFixed(1)}% 24h`,
      trend: priceChange24h > 0 ? 'up' : 'down',
      icon: priceChange24h > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
    },
    {
      label: 'NO Price',
      value: `${Math.round(pricing.noPrice * 100)}¢`,
      subtext: `${-priceChange24h > 0 ? '+' : ''}${(-priceChange24h * 100).toFixed(1)}% 24h`,
      trend: -priceChange24h > 0 ? 'up' : 'down',
      icon: -priceChange24h > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
    },
    {
      label: 'Time Remaining',
      value: isResolved ? 'Resolved' : `${daysRemaining}d ${hoursRemaining}h`,
      subtext: isResolved ? 'Market closed' : 'Until resolution',
      trend: 'neutral',
      icon: <Clock className="w-4 h-4" />
    },
    {
      label: 'Creator',
      value: `${creator.slice(0, 6)}...${creator.slice(-4)}`,
      subtext: 'Market creator',
      trend: 'neutral'
    }
  ];
  
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  };

  const StatCard = ({ stat }: { stat: StatItem }) => (
    <Card className="bg-gray-800/30 border-gray-700/50">
      <CardContent className="p-4">
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
                {stat.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {stat.trend === 'down' && <TrendingDown className="w-3 h-3" />}
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
      </CardContent>
    </Card>
  );

  const TopHoldersTab = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium text-gray-200">Top Holders</span>
      </div>
      <ScrollArea className="h-96">
        <div className="space-y-3 pr-4">
          {topHolders.map((holder, index) => (
            <div key={holder.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-300">#{index + 1}</span>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gray-700 text-gray-300 text-xs">
                      {holder.address.slice(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-200">
                    {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={holder.position === 'YES' ? 'default' : 'secondary'}
                      className={`text-xs ${
                        holder.position === 'YES' 
                          ? 'bg-green-600/20 text-green-300 border-green-600/30' 
                          : 'bg-red-600/20 text-red-300 border-red-600/30'
                      }`}
                    >
                      {holder.position}
                    </Badge>
                    <span className="text-xs text-gray-400">{holder.percentage}%</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-200">${holder.value.toFixed(2)}</div>
                <div className={`text-xs ${
                  holder.pnl > 0 ? 'text-green-300' : 'text-red-300'
                }`}>
                  {holder.pnl > 0 ? '+' : ''}${holder.pnl.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const ActivityTab = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-gray-200">Live Activity</span>
      </div>
      <ScrollArea className="h-96">
        <div className="space-y-3 pr-4">
          {marketActivity.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                activity.significance === 'high' ? 'bg-red-500' : 
                activity.significance === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
              }`}></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-200">
                    <span className="text-gray-300">{activity.user}</span> {activity.action}
                  </div>
                  <div className="text-xs text-gray-400">{formatTimeAgo(activity.timestamp)}</div>
                </div>
                {activity.amount && (
                  <div className="text-xs text-gray-400 mt-1">
                    ${activity.amount} {activity.price && `@ ${Math.round(activity.price * 100)}¢`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const ContextTab = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium text-gray-200">AI Market Context</span>
        <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
          Beta
        </Badge>
      </div>
      <ScrollArea className="h-96">
        <div className="space-y-4 pr-4">
          {contextInsights.map((insight) => (
            <Card key={insight.id} className="bg-gray-800/30 border-gray-700/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-200">
                    {insight.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        insight.category === 'news' ? 'border-blue-600/50 text-blue-300' :
                        insight.category === 'social' ? 'border-green-600/50 text-green-300' :
                        insight.category === 'analysis' ? 'border-yellow-600/50 text-yellow-300' :
                        'border-purple-600/50 text-purple-300'
                      }`}
                    >
                      {insight.category}
                    </Badge>
                    <div className="text-xs text-gray-400">
                      {Math.round(insight.confidence * 100)}%
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-300 mb-2">
                  {insight.content}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{insight.source}</span>
                  <span>{formatTimeAgo(insight.timestamp)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`}>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border-b border-gray-700">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-50 text-gray-300"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="holders"
            className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-50 text-gray-300"
          >
            Top Holders
          </TabsTrigger>
          <TabsTrigger 
            value="activity"
            className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-50 text-gray-300"
          >
            Activity
          </TabsTrigger>
          <TabsTrigger 
            value="context"
            className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-50 text-gray-300"
          >
            Context
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <StatCard key={index} stat={stat} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="holders" className="p-4">
          <TopHoldersTab />
        </TabsContent>
        
        <TabsContent value="activity" className="p-4">
          <ActivityTab />
        </TabsContent>
        
        <TabsContent value="context" className="p-4">
          <ContextTab />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
