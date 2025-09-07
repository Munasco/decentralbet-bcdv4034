const mongoose = require('mongoose');

const outcomeSchema = new mongoose.Schema({
  outcomeId: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  totalShares: {
    type: String, // Using string to handle BigInt from blockchain
    default: '0'
  },
  totalBacked: {
    type: String, // Using string to handle BigInt from blockchain
    default: '0'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  impliedProbability: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  }
}, { _id: false });

const marketSchema = new mongoose.Schema({
  // Blockchain identifiers
  contractAddress: {
    type: String,
    required: true,
    index: true
  },
  marketId: {
    type: Number,
    required: true,
    index: true
  },
  
  // Market details
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    enum: ['Politics', 'Sports', 'Crypto', 'Economics', 'Entertainment', 'Technology', 'Other'],
    index: true
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Market metadata
  imageUrl: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Outcomes
  outcomes: [outcomeSchema],
  
  // Timing
  creationTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  endTime: {
    type: Date,
    required: true,
    index: true
  },
  resolutionTime: {
    type: Date,
    index: true
  },
  
  // Market state
  isResolved: {
    type: Boolean,
    default: false,
    index: true
  },
  winningOutcome: {
    type: Number
  },
  
  // Financial data
  totalVolume: {
    type: String, // Using string to handle BigInt
    default: '0'
  },
  totalLiquidity: {
    type: String, // Using string to handle BigInt
    default: '0'
  },
  feePercentage: {
    type: Number,
    min: 0,
    max: 10,
    default: 2
  },
  
  // Participants
  creator: {
    type: String, // Ethereum address
    required: true,
    index: true
  },
  totalParticipants: {
    type: Number,
    default: 0
  },
  
  // Status and flags
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Oracle and resolution
  oracleSource: {
    type: String,
    trim: true
  },
  resolutionSource: {
    type: String,
    trim: true
  },
  resolver: {
    type: String // Ethereum address of resolver
  },
  
  // Additional metadata
  region: {
    type: String,
    trim: true
  },
  language: {
    type: String,
    default: 'en'
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Compound indexes for efficient querying
marketSchema.index({ contractAddress: 1, marketId: 1 }, { unique: true });
marketSchema.index({ category: 1, isActive: 1, endTime: -1 });
marketSchema.index({ isActive: 1, isResolved: 1, endTime: -1 });
marketSchema.index({ creator: 1, creationTime: -1 });
marketSchema.index({ tags: 1 });

// Virtual for market status
marketSchema.virtual('status').get(function() {
  if (this.isResolved) return 'resolved';
  if (this.isPaused) return 'paused';
  if (new Date() > this.endTime) return 'ended';
  if (!this.isActive) return 'inactive';
  return 'active';
});

// Virtual for time remaining
marketSchema.virtual('timeRemaining').get(function() {
  if (this.isResolved || new Date() > this.endTime) return 0;
  return Math.max(0, this.endTime.getTime() - Date.now());
});

// Virtual for days until resolution
marketSchema.virtual('daysUntilEnd').get(function() {
  if (this.isResolved || new Date() > this.endTime) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil(this.timeRemaining / msPerDay);
});

// Static method to find active markets
marketSchema.statics.findActive = function(filter = {}) {
  return this.find({
    ...filter,
    isActive: true,
    isResolved: false,
    endTime: { $gt: new Date() }
  }).sort({ creationTime: -1 });
};

// Static method to find markets by category
marketSchema.statics.findByCategory = function(category, limit = 20) {
  return this.findActive({ category })
    .limit(limit)
    .populate('creator', 'username');
};

// Static method to find trending markets (high volume)
marketSchema.statics.findTrending = function(limit = 10) {
  return this.findActive()
    .sort({ totalVolume: -1, totalParticipants: -1 })
    .limit(limit);
};

// Static method to find recently created markets
marketSchema.statics.findRecent = function(limit = 10) {
  return this.findActive()
    .sort({ creationTime: -1 })
    .limit(limit);
};

// Static method to find ending soon markets
marketSchema.statics.findEndingSoon = function(hours = 24) {
  const endTimeThreshold = new Date(Date.now() + (hours * 60 * 60 * 1000));
  return this.findActive({
    endTime: { $lte: endTimeThreshold }
  }).sort({ endTime: 1 });
};

// Instance method to update from blockchain data
marketSchema.methods.updateFromBlockchain = function(blockchainData) {
  this.totalVolume = blockchainData.totalVolume || this.totalVolume;
  this.totalLiquidity = blockchainData.totalLiquidity || this.totalLiquidity;
  this.isResolved = blockchainData.isResolved;
  this.winningOutcome = blockchainData.winningOutcome;
  this.resolutionTime = blockchainData.resolutionTime;
  
  // Update outcomes
  if (blockchainData.outcomes) {
    blockchainData.outcomes.forEach((outcome, index) => {
      if (this.outcomes[index]) {
        this.outcomes[index].totalShares = outcome.totalShares;
        this.outcomes[index].totalBacked = outcome.totalBacked;
        this.outcomes[index].isActive = outcome.isActive;
      }
    });
  }
  
  return this.save();
};

// Pre-save middleware to calculate implied probabilities
marketSchema.pre('save', function(next) {
  if (this.outcomes && this.outcomes.length > 0) {
    const totalBacked = this.outcomes.reduce((sum, outcome) => {
      return sum + parseFloat(outcome.totalBacked || 0);
    }, 0);
    
    if (totalBacked > 0) {
      this.outcomes.forEach(outcome => {
        const backedAmount = parseFloat(outcome.totalBacked || 0);
        outcome.impliedProbability = backedAmount / totalBacked;
      });
    }
  }
  next();
});

const Market = mongoose.model('Market', marketSchema);

module.exports = Market;
