// DecentralBet API Client
// Robust HTTP client for backend communication with error handling and authentication

import { 
  ApiResponse, 
  BackendMarket, 
  MarketFilters, 
  MarketStats, 
  CreateMarketRequest,
  User,
  UserProfile,
  BetActivity,
  PlaceBetRequest,
  DashboardStats,
  MarketAnalytics,
  PlatformAnalytics,
  HealthCheck,
  ApiError as ApiErrorType,
  AuthTokens,
  LoginRequest,
  RegisterRequest
} from './types'

class DecentralBetAPI {
  private baseURL: string
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
    
    // Load tokens from localStorage on client side
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('db_access_token')
      this.refreshToken = localStorage.getItem('db_refresh_token')
    }
  }

  // Private helper methods
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` })
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      
      // Handle 401 - try to refresh token
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          // Retry original request with new token
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${this.accessToken}`
          }
          return this.makeRequest<T>(endpoint, options)
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ClientApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code,
          errorData.field,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ClientApiError) {
        throw error
      }
      
      // Network or other errors
      throw new ClientApiError(
        error instanceof Error ? error.message : 'Network error occurred',
        'NETWORK_ERROR',
        undefined,
        0
      )
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      })

      if (!response.ok) return false

      const data: ApiResponse<AuthTokens> = await response.json()
      if (data.success && data.data) {
        this.setTokens(data.data)
        return true
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
    }

    return false
  }

  private setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('db_access_token', tokens.accessToken)
      localStorage.setItem('db_refresh_token', tokens.refreshToken)
    }
  }

  private clearTokens() {
    this.accessToken = null
    this.refreshToken = null
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('db_access_token')
      localStorage.removeItem('db_refresh_token')
    }
  }

  // Public API methods

  // Health Check
  async getHealth(): Promise<HealthCheck> {
    const response = await this.makeRequest<HealthCheck>('/health')
    if (!response.success || !response.data) {
      throw new ClientApiError('Failed to get health status', 'HEALTH_ERROR')
    }
    return response.data
  }

  // Authentication
  async login(request: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await this.makeRequest<{ user: User; tokens: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request)
    })
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Login failed', 'LOGIN_ERROR')
    }

    this.setTokens(response.data.tokens)
    return response.data
  }

  async register(request: RegisterRequest): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await this.makeRequest<{ user: User; tokens: AuthTokens }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(request)
    })
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Registration failed', 'REGISTER_ERROR')
    }

    this.setTokens(response.data.tokens)
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', { method: 'POST' })
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error)
    } finally {
      this.clearTokens()
    }
  }

  // Markets API
  async getMarkets(filters: MarketFilters = {}): Promise<{
    markets: BackendMarket[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    const response = await this.makeRequest<BackendMarket[]>(`/markets?${searchParams.toString()}`)
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to fetch markets', 'FETCH_MARKETS_ERROR')
    }

    return {
      markets: response.data,
      total: response.total || 0,
      currentPage: response.currentPage || 1,
      totalPages: response.totalPages || 1
    }
  }

  async getMarket(marketId: string): Promise<BackendMarket> {
    const response = await this.makeRequest<BackendMarket>(`/markets/${marketId}`)
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Market not found', 'MARKET_NOT_FOUND')
    }

    return response.data
  }

  async createMarket(marketData: CreateMarketRequest): Promise<BackendMarket> {
    const response = await this.makeRequest<BackendMarket>('/markets', {
      method: 'POST',
      body: JSON.stringify(marketData)
    })
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to create market', 'CREATE_MARKET_ERROR')
    }

    return response.data
  }

  async getTrendingMarkets(limit = 10, timeframe = 24): Promise<BackendMarket[]> {
    const response = await this.makeRequest<BackendMarket[]>(
      `/markets/trending?limit=${limit}&timeframe=${timeframe}`
    )
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to fetch trending markets', 'FETCH_TRENDING_ERROR')
    }

    return response.data
  }

  async getMarketsByCategory(category: string, limit = 20): Promise<BackendMarket[]> {
    const response = await this.makeRequest<BackendMarket[]>(
      `/markets/category/${category}?limit=${limit}`
    )
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to fetch markets by category', 'FETCH_CATEGORY_ERROR')
    }

    return response.data
  }

  async getMarketStats(): Promise<MarketStats> {
    const response = await this.makeRequest<MarketStats>('/markets/stats')
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to fetch market stats', 'FETCH_STATS_ERROR')
    }

    return response.data
  }

  // User API
  async getUserProfile(walletAddress?: string): Promise<UserProfile> {
    const endpoint = walletAddress ? `/users/profile/${walletAddress}` : '/users/profile'
    const response = await this.makeRequest<UserProfile>(endpoint)
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to fetch user profile', 'FETCH_PROFILE_ERROR')
    }

    return response.data
  }

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    const response = await this.makeRequest<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to update profile', 'UPDATE_PROFILE_ERROR')
    }

    return response.data
  }

  // Betting API
  async getUserBets(page = 1, limit = 20): Promise<{
    bets: BetActivity[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const response = await this.makeRequest<BetActivity[]>(
      `/bets/my-bets?page=${page}&limit=${limit}`
    )
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to fetch user bets', 'FETCH_BETS_ERROR')
    }

    return {
      bets: response.data,
      total: response.total || 0,
      currentPage: response.currentPage || 1,
      totalPages: response.totalPages || 1
    }
  }

  async placeBet(betData: PlaceBetRequest): Promise<BetActivity> {
    const response = await this.makeRequest<BetActivity>('/bets', {
      method: 'POST',
      body: JSON.stringify(betData)
    })
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to place bet', 'PLACE_BET_ERROR')
    }

    return response.data
  }

  // Dashboard API
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.makeRequest<DashboardStats>('/dashboard/stats')
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to fetch dashboard stats', 'FETCH_DASHBOARD_ERROR')
    }

    return response.data
  }

  // Analytics API
  async getMarketAnalytics(marketId: number): Promise<MarketAnalytics> {
    const response = await this.makeRequest<MarketAnalytics>(`/analytics/market/${marketId}`)
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to fetch market analytics', 'FETCH_ANALYTICS_ERROR')
    }

    return response.data
  }

  async getPlatformAnalytics(timeRange: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<PlatformAnalytics> {
    const response = await this.makeRequest<PlatformAnalytics>(`/analytics/platform?timeRange=${timeRange}`)
    
    if (!response.success || !response.data) {
      throw new ClientApiError(response.error || 'Failed to fetch platform analytics', 'FETCH_PLATFORM_ANALYTICS_ERROR')
    }

    return response.data
  }

  // Utility methods
  isAuthenticated(): boolean {
    return this.accessToken !== null
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  // Static method to create singleton instance
  private static instance: DecentralBetAPI
  static getInstance(): DecentralBetAPI {
    if (!DecentralBetAPI.instance) {
      DecentralBetAPI.instance = new DecentralBetAPI()
    }
    return DecentralBetAPI.instance
  }
}

// Export singleton instance
export const apiClient = DecentralBetAPI.getInstance()

// Export class for testing
export { DecentralBetAPI }

// Custom error class (renamed to avoid conflicts)
export class ClientApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public field?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ClientApiError'
  }
}
