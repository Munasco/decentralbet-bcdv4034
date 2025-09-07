const logger = require('../utils/logger');

class MarketSocketEvents {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.marketRooms = new Map();
    this.intervals = [];
  }

  init() {
    logger.info(`Client connected: ${this.socket.id}`);
    
    this.socket.on('join-market', this.handleJoinMarket.bind(this));
    this.socket.on('leave-market', this.handleLeaveMarket.bind(this));
    this.socket.on('join-trending', this.handleJoinTrending.bind(this));
    this.socket.on('leave-trending', this.handleLeaveTrending.bind(this));
  }

  async handleJoinMarket(data) {
    try {
      const { marketId } = data;
      
      if (!marketId) {
        this.socket.emit('error', { message: 'Market ID required' });
        return;
      }

      const roomName = `market-${marketId}`;
      this.socket.join(roomName);
      
      logger.info(`Client ${this.socket.id} joined market ${marketId}`);
      this.socket.emit('joined-market', { marketId, room: roomName });
      
      // Send mock market data
      const mockData = {
        marketId,
        question: 'Sample Prediction Market',
        category: 'sports',
        totalVolume: Math.floor(Math.random() * 100000),
        participants: Math.floor(Math.random() * 1000),
        lastUpdate: new Date()
      };
      
      this.socket.emit('market-data', mockData);
      
    } catch (error) {
      logger.error('Join market error:', error);
      this.socket.emit('error', { message: 'Failed to join market' });
    }
  }

  handleLeaveMarket(data) {
    try {
      const { marketId } = data;
      const roomName = `market-${marketId}`;
      
      this.socket.leave(roomName);
      this.socket.emit('left-market', { marketId });
      
      logger.info(`Client ${this.socket.id} left market ${marketId}`);
      
    } catch (error) {
      logger.error('Leave market error:', error);
    }
  }

  handleJoinTrending() {
    try {
      this.socket.join('trending-markets');
      this.socket.emit('joined-trending');
      
      logger.info(`Client ${this.socket.id} joined trending markets`);
      
      // Send mock trending data
      const mockTrending = {
        markets: [
          {
            id: '1',
            question: 'Will it rain tomorrow?',
            category: 'weather',
            volume: 50000
          },
          {
            id: '2', 
            question: 'Who will win the game?',
            category: 'sports',
            volume: 75000
          }
        ],
        lastUpdate: new Date()
      };
      
      this.socket.emit('trending-update', mockTrending);
      
    } catch (error) {
      logger.error('Join trending error:', error);
    }
  }

  handleLeaveTrending() {
    try {
      this.socket.leave('trending-markets');
      this.socket.emit('left-trending');
      
      logger.info(`Client ${this.socket.id} left trending markets`);
      
    } catch (error) {
      logger.error('Leave trending error:', error);
    }
  }

  cleanup() {
    // Clean up any intervals or resources
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }
}

module.exports = MarketSocketEvents;
