'use client';

import { useState, useMemo } from 'react';
import { formatUSDC } from '@/lib/decimals';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
  outcome: 'YES' | 'NO';
}

interface Trade {
  id: string;
  price: number;
  size: number;
  outcome: 'YES' | 'NO';
  timestamp: Date;
  type: 'BUY' | 'SELL';
}

interface OrderBookProps {
  yesPrice: number;
  noPrice: number;
  className?: string;
}

// Mock data generator for demonstration
const generateMockOrders = (basePrice: number, outcome: 'YES' | 'NO'): OrderBookEntry[] => {
  const orders: OrderBookEntry[] = [];
  let total = 0;
  
  for (let i = 0; i < 8; i++) {
    const priceOffset = (Math.random() - 0.5) * 0.1;
    const price = Math.max(0.01, Math.min(0.99, basePrice + priceOffset));
    const size = Math.floor(Math.random() * 1000) + 100;
    total += size;
    
    orders.push({
      price,
      size,
      total,
      outcome
    });
  }
  
  return outcome === 'YES' 
    ? orders.sort((a, b) => b.price - a.price) // YES orders descending by price
    : orders.sort((a, b) => a.price - b.price); // NO orders ascending by price
};

const generateMockTrades = (): Trade[] => {
  const trades: Trade[] = [];
  
  for (let i = 0; i < 15; i++) {
    const outcome = Math.random() > 0.5 ? 'YES' : 'NO';
    trades.push({
      id: `trade-${i}`,
      price: Math.random() * 0.8 + 0.1,
      size: Math.floor(Math.random() * 500) + 50,
      outcome,
      type: Math.random() > 0.5 ? 'BUY' : 'SELL',
      timestamp: new Date(Date.now() - Math.random() * 3600000) // Random time within last hour
    });
  }
  
  return trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export default function OrderBook({ yesPrice, noPrice, className = '' }: OrderBookProps) {
  const [activeTab, setActiveTab] = useState<'book' | 'trades'>('book');
  
  const yesOrders = useMemo(() => generateMockOrders(yesPrice, 'YES'), [yesPrice]);
  const noOrders = useMemo(() => generateMockOrders(noPrice, 'NO'), [noPrice]);
  const recentTrades = useMemo(() => generateMockTrades(), []);
  
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const OrderBookTable = ({ orders, outcome }: { orders: OrderBookEntry[], outcome: 'YES' | 'NO' }) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs font-medium text-gray-200 px-3 py-1">
        <span>Price</span>
        <span>Size</span>
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
              width: `${(order.total / Math.max(...orders.map(o => o.total))) * 100}%` 
            }}
          />
          
          <span className={`font-mono flex items-center gap-1 ${
            outcome === 'YES' ? 'text-green-300' : 'text-red-300'
          }`}>
            <span className="text-xs" role="img" aria-label={outcome === 'YES' ? 'bullish' : 'bearish'}>
              {outcome === 'YES' ? '↗️' : '↘️'}
            </span>
            {order.price.toFixed(3)}¢
          </span>
          <span className="text-gray-200 font-mono">
            {formatUSDC(BigInt(order.size * 1e18))}
          </span>
          <span className="text-gray-300 font-mono">
            {formatUSDC(BigInt(order.total * 1e18))}
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
