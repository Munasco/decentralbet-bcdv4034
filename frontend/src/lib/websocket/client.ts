// WebSocket Client for Real-time Updates
// Handles Socket.io connection with reconnection and error handling

import { io, Socket } from 'socket.io-client'
import { SocketEvents, SocketStatus } from '@/lib/api/types'

class WebSocketClient {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<string, Set<Function>> = new Map()
  private status: SocketStatus = {
    connected: false,
    reconnectAttempts: 0,
  }

  constructor() {
    // Disable auto-connection until backend is ready
    // this.initializeSocket()
  }

  private initializeSocket() {
  const url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      forceNew: false,
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected')
      this.status.connected = true
      this.reconnectAttempts = 0
      this.status.reconnectAttempts = 0
      this.emit('connection:status', this.status)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason)
      this.status.connected = false
      this.status.lastDisconnect = new Date().toISOString()
      this.emit('connection:status', this.status)
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔌 WebSocket reconnect attempt ${attemptNumber}`)
      this.status.reconnectAttempts = attemptNumber
      this.emit('connection:status', this.status)
    })

    this.socket.on('reconnect_failed', () => {
      console.error('🔌 WebSocket failed to reconnect after maximum attempts')
      this.status.connected = false
      this.emit('connection:status', this.status)
    })

    this.socket.on('error', (error) => {
      console.error('🔌 WebSocket error:', error)
      this.emit('connection:error', error)
    })

    // Ping/pong for latency measurement
    this.socket.on('pong', (latency) => {
      this.status.pingLatency = latency
      this.emit('connection:status', this.status)
    })

    // Market events
    this.socket.on('market:created', (market) => {
      this.emit('market:created', market)
    })

    this.socket.on('market:updated', (market) => {
      this.emit('market:updated', market)
    })

    this.socket.on('market:resolved', (data) => {
      this.emit('market:resolved', data)
    })

    // Betting events
    this.socket.on('bet:placed', (betActivity) => {
      this.emit('bet:placed', betActivity)
    })

    this.socket.on('market:volume_updated', (data) => {
      this.emit('market:volume_updated', data)
    })

    // User events
    this.socket.on('user:online', (data) => {
      this.emit('user:online', data)
    })

    this.socket.on('user:offline', (data) => {
      this.emit('user:offline', data)
    })

    // System events
    this.socket.on('system:maintenance', (data) => {
      this.emit('system:maintenance', data)
    })
  }

  // Public methods
  public on<K extends keyof SocketEvents>(
    event: K | 'connection:status' | 'connection:error',
    callback: (data: SocketEvents[K] | SocketStatus | Error) => void
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // Return cleanup function
    return () => {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        eventListeners.delete(callback)
      }
    }
  }

  public off<K extends keyof SocketEvents>(
    event: K | 'connection:status' | 'connection:error',
    callback?: (data: SocketEvents[K] | SocketStatus | Error) => void
  ) {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    if (callback) {
      eventListeners.delete(callback)
    } else {
      eventListeners.clear()
    }
  }

  public emit<K extends keyof SocketEvents>(event: string, data?: any) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in socket event handler for ${event}:`, error)
        }
      })
    }
  }

  // Join/leave market rooms for targeted updates
  public joinMarket(marketId: number) {
    if (this.socket?.connected) {
      this.socket.emit('join:market', { marketId })
    }
  }

  public leaveMarket(marketId: number) {
    if (this.socket?.connected) {
      this.socket.emit('leave:market', { marketId })
    }
  }

  // Join user room for personalized updates
  public joinUser(userId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join:user', { userId })
    }
  }

  public leaveUser(userId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave:user', { userId })
    }
  }

  // Send ping to measure latency
  public ping() {
    if (this.socket?.connected) {
      const startTime = Date.now()
      this.socket.emit('ping', startTime)
    }
  }

  // Connection management
  public connect() {
    if (!this.socket) {
      // Call the private connect method to initialize the socket
      this.initializeSocket()
    } else if (!this.socket.connected) {
      this.socket.connect()
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }

  public getStatus(): SocketStatus {
    return { ...this.status }
  }

  public isConnected(): boolean {
    return this.status.connected
  }

  // Cleanup
  public destroy() {
    this.listeners.clear()
    if (this.socket) {
      this.socket.disconnect()
      this.socket.removeAllListeners()
      this.socket = null
    }
  }

  // Static instance management
  private static instance: WebSocketClient

  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient()
    }
    return WebSocketClient.instance
  }
}

// Export singleton instance
export const wsClient = WebSocketClient.getInstance()

// Export class for testing
export { WebSocketClient }
