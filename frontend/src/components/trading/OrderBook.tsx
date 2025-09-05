'use client';

import { useState } from 'react';
import { formatUSDC } from '@/lib/decimals';
import { useOrderBook } from '@/hooks/useMarketData';


interface Trade {
  id: string;
  price: number;
  size: number;
  outcome: 'YES' | 'NO';
  timestamp: Date;
  type: 'BUY' | 'SELL';
}

interface OrderBookProps {
  marketId: number | string;
  yesPrice: number;
  noPrice: number;
  className?: string;
}

export default function OrderBook({ marketId, yesPrice, noPrice, className = '' }: OrderBookProps) {
  const [activeTab, setActiveTab] = useState<'book' | 'trades'>('book');
  
  // Use stable order book data from TanStack Query
  const { data: orderBookData, isLoading } = useOrderBook(marketId, yesPrice / 100, noPrice / 100);
  
  const yesOrders = orderBookData?.yes ?? [];
  const noOrders = orderBookData?.no ?? [];
  
  // Mock trades data for now - in a real app this would also use TanStack Query
  const recentTrades: Trade[] = [
    {
      id: 'trade-1',
      price: yesPrice / 100 + 0.02,
      size: 250,
      outcome: 'YES',
      type: 'BUY',
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
    },
    {
      id: 'trade-2', 
      price: noPrice / 100 - 0.01,
      size: 180,
      outcome: 'NO',
      type: 'SELL',
      timestamp: new Date(Date.now() - 8 * 60 * 1000)
    },
    {
      id: 'trade-3',
      price: yesPrice / 100 - 0.03,
      size: 420,
      outcome: 'YES',
      type: 'SELL',
      timestamp: new Date(Date.now() - 12 * 60 * 1000)
    },
    {
      id: 'trade-4',
      price: noPrice / 100 + 0.02,
      size: 310,
      outcome: 'NO',
      type: 'BUY',
      timestamp: new Date(Date.now() - 18 * 60 * 1000)
    },
    {
      id: 'trade-5',
      price: yesPrice / 100,
      size: 150,
      outcome: 'YES',
      type: 'BUY',
      timestamp: new Date(Date.now() - 25 * 60 * 1000)
    }
  ];
  
  if (isLoading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-700 rounded mb-4 w-1/2 mx-auto"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const OrderBookTable = ({ orders, outcome }: { orders: Array<{ price: number; amount: number; total: number }>, outcome: 'YES' | 'NO' }) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs font-medium text-gray-200 px-3 py-1">
        <span>Price</span>
        <span>Amount</span>
        <span>Total</span>
      </div>
      
      {orders.map((order, index) => (
        <div 
          key={index}
          className="relative flex justify-between items-center text-xs px-3 py-1 hover:bg-gray-800/50 transition-colors"
        >
          {/* Background bar showing depth */}
          <div 
            className={`absolute left-0 top-0 h-full opacity-10 ${
              outcome === 'YES' ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ 
              width: `${orders.length > 0 ? (order.total / Math.max(...orders.map(o => o.total))) * 100 : 0}%` 
            }}
          />
          
          <span className={`font-mono flex items-center gap-1 ${
            outcome === 'YES' ? 'text-green-300' : 'text-red-300'
          }`}>
            <span className="text-xs" role="img" aria-label={outcome === 'YES' ? 'bullish' : 'bearish'}>
              {outcome === 'YES' ? '↗️' : '↘️'}
            </span>
            {(order.price * 100).toFixed(1)}¢
          </span>
          <span className="text-gray-200 font-mono">
            {order.amount.toLocaleString()}
          </span>
          <span className="text-gray-300 font-mono">
            {order.total.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Tab Headers */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('book')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            activeTab === 'book'
              ? 'text-gray-50 bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-200 hover:text-gray-100'
          }`}
          aria-pressed={activeTab === 'book'}
        >
          Order Book
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            activeTab === 'trades'
              ? 'text-gray-50 bg-gray-800 border-b-2 border-blue-500'
              : 'text-gray-200 hover:text-gray-100'
          }`}
          aria-pressed={activeTab === 'trades'}
        >
          Recent Trades
        </button>
      </div>

      <div className="p-0">
        {activeTab === 'book' ? (
          <div className="space-y-4">
            {/* YES Orders */}
            <div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-400">YES</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {yesPrice.toFixed(1)}¢
                </span>
              </div>
              <OrderBookTable orders={yesOrders} outcome="YES" />
            </div>

            {/* Price Separator */}
            <div className="border-t border-gray-700 my-2"></div>

            {/* NO Orders */}
            <div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-red-400">NO</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {noPrice.toFixed(1)}¢
                </span>
              </div>
              <OrderBookTable orders={noOrders} outcome="NO" />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-medium text-gray-400 px-3 py-2">
              <span>Time</span>
              <span>Outcome</span>
              <span>Price</span>
              <span>Size</span>
            </div>
            
            {recentTrades.map((trade) => (
              <div 
                key={trade.id}
                className="flex justify-between items-center text-xs px-3 py-1.5 hover:bg-gray-800/50 transition-colors"
              >
                <span className="text-gray-400 font-mono">
                  {formatTime(trade.timestamp)}
                </span>
                <span className={`font-medium ${
                  trade.outcome === 'YES' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {trade.outcome}
                </span>
                <span className="text-gray-300 font-mono">
                  {trade.price.toFixed(3)}¢
                </span>
                <span className="text-gray-300 font-mono">
                  {formatUSDC(BigInt(trade.size * 1e18))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
