'use client';

'use client';

import { formatUSDC } from '@/lib/decimals';
import { useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Users, Activity, Brain, Trophy, Clock, DollarSign } from 'lucide-react';

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

interface Holder {
  id: string;
  address: string;
  position: 'YES' | 'NO';
  shares: number;
  value: number;
  pnl: number;
  percentage: number;
}

interface MarketActivity {
  id: string;
  type: 'trade' | 'large_trade' | 'milestone' | 'resolution';
  user: string;
  action: string;
  amount?: number;
  price?: number;
  timestamp: Date;
  significance?: 'high' | 'medium' | 'low';
}

interface ContextInsight {
  id: string;
  category: 'news' | 'social' | 'analysis' | 'prediction';
  title: string;
  content: string;
  confidence: number;
  source: string;
  timestamp: Date;
}

export default function MarketStats({ marketData, pricing, className = '' }: MarketStatsProps) {
  
  const { totalVolume, yesShares, noShares, endTime, isResolved, creator } = marketData;
  
  // Calculate market metrics
  const totalShares = yesShares + noShares;
  const marketCap = Number(totalVolume) / 1e18 * (pricing.yesPrice + pricing.noPrice);
  const liquidity = Number(totalShares) / 1e18 * 0.1; // Rough estimate
  const participantCount = Math.floor(Math.random() * 500) + 50; // Mock data
  const priceChange24h = (Math.random() - 0.5) * 0.2; // Mock 24h change
  const volumeChange24h = (Math.random() - 0.5) * 0.3; // Mock volume change
  
  // Sample data for enhanced features
  const topHolders: Holder[] = useMemo(() => [
    {
      id: '1',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      position: 'YES',
      shares: 15420,
      value: 8934.50,
      pnl: +1245.30,
      percentage: 12.3
    },
    {
      id: '2', 
      address: '0x9876543210fedcba9876543210fedcba98765432',
      position: 'NO',
      shares: 12890,
      value: 7456.80,
      pnl: -892.15,
      percentage: 10.8
    },
    {
      id: '3',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      position: 'YES', 
      shares: 9850,
      value: 5234.20,
      pnl: +678.90,
      percentage: 8.2
    },
    {
      id: '4',
      address: '0xfedcbafedcbafedcbafedcbafedcbafedcbafed',
      position: 'NO',
      shares: 8760,
      value: 4321.60,
      pnl: +234.75,
      percentage: 7.1
    },
    {
      id: '5',
      address: '0x5555555555555555555555555555555555555555',
      position: 'YES',
      shares: 7890,
      value: 3987.40,
      pnl: -156.80,
      percentage: 6.4
    }
  ], []);
  
  const marketActivity: MarketActivity[] = useMemo(() => [
    {
      id: '1',
      type: 'large_trade',
      user: '0x1234...5678',
      action: 'Bought 2,500 YES shares',
      amount: 1875,
      price: 0.75,
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      significance: 'high'
    },
    {
      id: '2',
      type: 'trade',
      user: '0xabcd...efgh',
      action: 'Sold 800 NO shares',
      amount: 320,
      price: 0.40,
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      significance: 'medium'
    },
    {
      id: '3',
      type: 'milestone',
      user: 'System',
      action: 'Market reached $50K volume',
      timestamp: new Date(Date.now() - 12 * 60 * 1000),
      significance: 'high'
    },
    {
      id: '4',
      type: 'trade',
      user: '0x9876...5432',
      action: 'Bought 1,200 YES shares',
      amount: 960,
      price: 0.80,
      timestamp: new Date(Date.now() - 18 * 60 * 1000),
      significance: 'medium'
    },
    {
      id: '5',
      type: 'large_trade',
      user: '0xdef0...1234',
      action: 'Sold 3,000 NO shares',
      amount: 1200,
      price: 0.40,
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      significance: 'high'
    }
  ], []);
  
  const contextInsights: ContextInsight[] = useMemo(() => [
    {
      id: '1',
      category: 'news',
      title: 'Related News Coverage Increasing',
      content: 'Major news outlets have increased coverage of this topic by 35% in the last 48 hours. This correlates with the recent price movement.',
      confidence: 0.82,
      source: 'News Sentiment AI',
      timestamp: new Date(Date.now() - 30 * 60 * 1000)
    },
    {
      id: '2',
      category: 'social',
      title: 'Social Media Sentiment Shift',
      content: 'Twitter mentions show a 28% increase in positive sentiment toward the YES outcome. Key influencers are driving the conversation.',
      confidence: 0.74,
      source: 'Social Analytics',
      timestamp: new Date(Date.now() - 45 * 60 * 1000)
    },
    {
      id: '3',
      category: 'analysis',
      title: 'Technical Pattern Recognition',
      content: 'Price action shows a bullish flag pattern forming. Historical similar patterns have a 67% success rate.',
      confidence: 0.69,
      source: 'Technical Analysis AI',
      timestamp: new Date(Date.now() - 60 * 60 * 1000)
    },
    {
      id: '4',
      category: 'prediction',
      title: 'Whale Activity Alert',
      content: 'Large holders have been accumulating YES positions. This represents a 15% increase in whale holdings over 24h.',
      confidence: 0.91,
      source: 'On-chain Analytics',
      timestamp: new Date(Date.now() - 75 * 60 * 1000)
    }
  ], []);
  
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
