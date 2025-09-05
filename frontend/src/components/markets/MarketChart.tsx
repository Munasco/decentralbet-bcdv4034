'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts'
import { formatUSDC } from '@/lib/decimals'

export interface ChartDataPoint {
  timestamp: number
  yesPrice: number
  noPrice: number
  volume: bigint
  date: string
  time: string
}

interface MarketChartProps {
  data: ChartDataPoint[]
  currentYesPrice?: number
  currentNoPrice?: number
  totalVolume?: bigint
}

export function MarketChart({ 
  data = [], 
  currentYesPrice = 0.5, 
  currentNoPrice = 0.5,
  totalVolume = BigInt(0)
}: MarketChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('ALL')
  const [showVolume, setShowVolume] = useState(false)
  
  const periods = useMemo(() => [
    { label: '1H', value: '1H', hours: 1 },
    { label: '6H', value: '6H', hours: 6 },
    { label: '1D', value: '1D', hours: 24 },
    { label: '1W', value: '1W', hours: 168 },
    { label: '1M', value: '1M', hours: 720 },
    { label: 'ALL', value: 'ALL', hours: 0 }
  ], [])
  
  // Filter data based on selected period
  const filteredData = useMemo(() => {
    if (selectedPeriod === 'ALL' || data.length === 0) {
      return data
    }
    
    const period = periods.find(p => p.value === selectedPeriod)
    if (!period || period.hours === 0) return data
    
    const cutoffTime = Date.now() - (period.hours * 60 * 60 * 1000)
    return data.filter(point => point.timestamp >= cutoffTime)
  }, [data, selectedPeriod, periods])
  
  // Generate mock data if no real data available
  const chartData = useMemo(() => {
    if (filteredData.length > 0) {
      return filteredData
    }
    
    // Generate mock historical data
    const mockData: ChartDataPoint[] = []
    const now = Date.now()
    const points = selectedPeriod === 'ALL' ? 50 : 20
    
    let currentYes = currentYesPrice
    let currentNo = currentNoPrice
    
    for (let i = points; i >= 0; i--) {
      const timestamp = now - (i * 60 * 60 * 1000) // 1 hour intervals
      
      // Add some realistic price movement
      const volatility = 0.02 // 2% volatility
      currentYes = Math.max(0.01, Math.min(0.99, 
        currentYes + (Math.random() - 0.5) * volatility
      ))
      currentNo = 1 - currentYes // Ensure they sum to ~1
      
      const date = new Date(timestamp)
      mockData.push({
        timestamp,
        yesPrice: currentYes,
        noPrice: currentNo,
        volume: BigInt(Math.floor(Math.random() * 100000 * 1e18)),
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
    }
    
    return mockData
  }, [filteredData, selectedPeriod, currentYesPrice, currentNoPrice])
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{payload: ChartDataPoint; dataKey: string; value: number}>; label?: string | number }) => {
    if (!active || !payload || !payload.length) return null
    
    const data = payload[0].payload
    const yesPrice = payload.find(p => p.dataKey === 'yesPrice')?.value || 0
    const noPrice = payload.find(p => p.dataKey === 'noPrice')?.value || 0
    
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-gray-200 mb-2">
          {data.date} {data.time}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-300">Yes</span>
            <span className="text-sm font-medium text-gray-50">
              {Math.round(yesPrice * 100)}¢
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-300">No</span>
            <span className="text-sm font-medium text-gray-50">
              {Math.round(noPrice * 100)}¢
            </span>
          </div>
          {showVolume && (
            <div className="flex items-center justify-between pt-1 border-t border-gray-700">
              <span className="text-xs text-gray-200">Volume</span>
              <span className="text-xs text-gray-100">
                ${formatUSDC(data.volume)}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-white">Price Chart</h3>
          <div className="flex items-center space-x-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-0.5 bg-green-500 mr-2"></div>
              <span className="text-green-300">
                Yes {Math.round(currentYesPrice * 100)}¢
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-0.5 bg-red-500 mr-2"></div>
              <span className="text-red-300">
                No {Math.round(currentNoPrice * 100)}¢
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-3 py-1 text-xs rounded ${
              showVolume 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            Volume
          </button>
        </div>
      </div>
      
      {/* Chart */}
      <div className="p-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              {/* Grid lines */}
              <XAxis 
                dataKey="timestamp"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(timestamp) => {
                  const date = new Date(timestamp)
                  return selectedPeriod === '1H' || selectedPeriod === '6H'
                    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                }}
              />
              <YAxis 
                domain={[0, 1]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(value) => `${Math.round(value * 100)}¢`}
              />
              
              {/* Reference lines for 50¢ */}
              <ReferenceLine 
                y={0.5} 
                stroke="#374151" 
                strokeDasharray="2 2" 
                strokeOpacity={0.5}
              />
              
              {/* Price lines */}
              <Line 
                type="monotone" 
                dataKey="yesPrice" 
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="noPrice" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              
              {/* Custom tooltip */}
              <Tooltip content={<CustomTooltip />} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Period selector */}
        <div className="flex justify-center space-x-1 mt-4">
          {periods.map(period => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                selectedPeriod === period.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Footer stats */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          Volume: <span className="text-white">${formatUSDC(totalVolume)}</span>
        </div>
        <div className="text-xs text-gray-400">
          24h Change: <span className="text-green-400">+2.4%</span>
        </div>
      </div>
    </div>
  )
}
