const mongoose = require('mongoose');
const config = require('./config');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Prevent multiple connections
      if (this.isConnected) {
        console.log('📊 Database already connected');
        return this.connection;
      }

      const dbUri = config.nodeEnv === 'test' ? config.database.testUri : config.database.uri;
      
      console.log(`🔌 Connecting to database: ${dbUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`);
      
      this.connection = await mongoose.connect(dbUri, config.database.options);
      this.isConnected = true;

      console.log('✅ Database connected successfully');
      
      // Handle connection events
      this.setupEventHandlers();
      
      return this.connection;
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
      throw error; // Let caller handle the error
    }
  }

  setupEventHandlers() {
    const db = mongoose.connection;

    db.on('connected', () => {
      console.log('📊 Mongoose connected to database');
    });

    db.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
    });

    db.on('disconnected', () => {
      console.log('📊 Mongoose disconnected from database');
      this.isConnected = false;
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    if (this.isConnected) {
      try {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log('📊 Database disconnected successfully');
      } catch (error) {
        console.error('❌ Error disconnecting from database:', error.message);
      }
    }
  }

  async clearDatabase() {
    if (config.nodeEnv !== 'test') {
      throw new Error('Database clearing is only allowed in test environment');
    }
    
    try {
      const collections = await mongoose.connection.db.collections();
      
      for (const collection of collections) {
        await collection.deleteMany({});
      }
      
      console.log('🧹 Test database cleared');
    } catch (error) {
      console.error('❌ Error clearing test database:', error.message);
      throw error;
    }
  }

  getConnection() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.connection;
  }

  // Health check method
  async healthCheck() {
    try {
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        connected: this.isConnected,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  // Get database statistics
  async getStats() {
    try {
      const stats = await mongoose.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error.message);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new Database();
