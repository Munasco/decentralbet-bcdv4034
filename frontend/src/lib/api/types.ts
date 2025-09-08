// API Types for DecentralBet Backend Integration
// Comprehensive type definitions for all backend endpoints

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
  total?: number;
  currentPage?: number;
  totalPages?: number;
}

// Market Types
export interface MarketCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface MarketOutcome {
  outcomeId: number;
  description: string;
  totalShares: string;
  totalBacked: string;
  isActive: boolean;
  impliedProbability: number;
  currentPrice?: number;
}

export interface BackendMarket {
  _id: string;
  contractAddress: string;
  marketId: number;
  question: string;
  description: string;
  category: string;
  subcategory?: string;
  outcomes: MarketOutcome[];
  endTime: string;
  creationTime: string;
  creator: string;
  imageUrl?: string;
  tags: string[];
  feePercentage: number;
  oracleSource?: string;
  region?: string;
  isVerified: boolean;
  isPaused: boolean;
  isActive: boolean;
  isResolved: boolean;
  winningOutcome?: number;
  resolutionTime?: string;
  resolutionSource?: string;
  totalVolume: string;
  totalLiquidity: string;
  totalParticipants: number;
  lastActivityTime: string;
  // Real-time blockchain data
  volumeChange24h?: number;
  participantChange24h?: number;
  trendScore?: number;
}

export interface CreateMarketRequest {
  question: string;
  description?: string;
  category: string;
  subcategory?: string;
  outcomes: string[];
  endTime: string;
  imageUrl?: string;
  tags?: string[];
  feePercentage?: number;
  oracleSource?: string;
  region?: string;
}

export interface MarketFilters {
  page?: number;
  limit?: number;
  category?: string;
  status?: 'active' | 'resolved' | 'ending-soon';
  sort?: 'recent' | 'volume' | 'ending-soon' | 'popular';
  search?: string;
  featured?: boolean;
}

export interface MarketStats {
  totalMarkets: number;
  activeMarkets: number;
  resolvedMarkets: number;
  totalVolume: number;
  categories: Array<{
    _id: string;
    count: number;
  }>;
}

// User Types
export interface User {
  _id: string;
  walletAddress: string;
  username?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
  role: 'user' | 'market_creator' | 'admin';
  joinDate: string;
  lastLoginDate: string;
  tradingStats: {
    marketsCreated: number;
    totalBets: number;
    totalVolume: string;
    winRate: number;
    profitLoss: string;
    currentStreak: number;
    bestStreak: number;
  };
  preferences: {
    notifications: boolean;
    marketUpdates: boolean;
    newsletter: boolean;
    categories: string[];
  };
}

export interface UserProfile {
  user: User;
  recentActivity: BetActivity[];
  portfolioValue: string;
  openPositions: number;
  favoriteCategories: string[];
}

// Betting Types
export interface Bet {
  _id: string;
  user: string;
  marketId: number;
  contractAddress: string;
  outcomeId: number;
  amount: string;
  sharePrice: string;
  sharesReceived: string;
  betTime: string;
  transactionHash: string;
  blockNumber: number;
  isResolved: boolean;
  payout?: string;
  payoutTime?: string;
}

export interface BetActivity {
  _id: string;
  user: {
    _id: string;
    walletAddress: string;
    username?: string;
    avatar?: string;
  };
  market: {
    _id: string;
    question: string;
    category: string;
  };
  outcomeId: number;
  outcomeDescription: string;
  amount: string;
  sharePrice: string;
  betTime: string;
  transactionHash: string;
}

export interface PlaceBetRequest {
  marketId: number;
  outcomeId: number;
  amount: string;
  maxSlippage?: number;
}

// Dashboard Types
export interface DashboardStats {
  totalUsers: number;
  totalMarkets: number;
  totalVolume: string;
  totalBets: number;
  dailyActiveUsers: number;
  marketsByCategory: Array<{
    category: string;
    count: number;
    volume: string;
  }>;
  recentActivity: BetActivity[];
  topMarkets: BackendMarket[];
  topTraders: Array<{
    user: User;
    totalVolume: string;
    winRate: number;
  }>;
}

// Real-time Socket Events
export interface SocketEvents {
  // Market events
  'market:created': BackendMarket;
  'market:updated': BackendMarket;
  'market:resolved': { marketId: number; winningOutcome: number };
  
  // Betting events
  'bet:placed': BetActivity;
  'market:volume_updated': { marketId: number; newVolume: string };
  
  // User events
  'user:online': { userId: string };
  'user:offline': { userId: string };
  
  // System events
  'system:maintenance': { message: string; scheduledTime: string };
}

// Authentication Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface RegisterRequest {
  walletAddress: string;
  username?: string;
  email?: string;
  signature: string;
  message: string;
}

// Analytics Types
export interface MarketAnalytics {
  marketId: number;
  volumeHistory: Array<{
    timestamp: string;
    volume: string;
    transactions: number;
  }>;
  priceHistory: Array<{
    timestamp: string;
    outcomeId: number;
    price: number;
  }>;
  participantMetrics: {
    uniqueParticipants: number;
    averageBetSize: string;
    largestBet: string;
    mostActiveHours: number[];
  };
}

export interface PlatformAnalytics {
  timeRange: '24h' | '7d' | '30d' | '90d';
  totalVolume: string;
  totalUsers: number;
  totalMarkets: number;
  averageMarketDuration: number;
  mostPopularCategories: Array<{
    category: string;
    volume: string;
    marketCount: number;
  }>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
  volumeByDay: Array<{
    date: string;
    volume: string;
    transactions: number;
  }>;
}

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  statusCode: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Health Check
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: boolean;
    blockchain: boolean;
  };
}

// WebSocket Connection Status
export interface SocketStatus {
  connected: boolean;
  reconnectAttempts: number;
  lastDisconnect?: string;
  pingLatency?: number;
}
