const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  // Blockchain identifiers
  marketContract: {
    type: String,
    required: true,
    index: true
  },
  marketId: {
    type: Number,
    required: true,
    index: true
  },
  outcomeId: {
    type: Number,
    required: true
  },
  
  // User information
  userAddress: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Bet details
  shares: {
    type: String, // Using string to handle BigInt
    required: true
  },
  amountBacked: {
    type: String, // Using string to handle BigInt
    required: true
  },
  avgPrice: {
    type: Number, // Price per share at time of bet
    required: true
  },
  
  // Transaction information
  transactionHash: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  blockNumber: {
    type: Number,
    index: true
  },
  gasUsed: {
    type: String
  },
  gasPrice: {
    type: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
    index: true
  },
  claimed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Potential winnings
  potentialWinnings: {
    type: String,
    default: '0'
  },
  actualWinnings: {
    type: String,
    default: '0'
  },
  claimTransactionHash: {
    type: String,
    sparse: true
  },
  
  // Market reference for convenience
  marketRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Market',
    index: true
  },
  
  // Additional metadata
  betTimestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  outcomeDescription: {
    type: String,
    required: true
  },
  marketQuestion: {
    type: String,
    required: true
  },
  
  // Platform metadata
  platform: {
    type: String,
    default: 'web'
  },
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      delete ret.ipAddress; // Don't expose IP in JSON
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Compound indexes
betSchema.index({ marketContract: 1, marketId: 1, outcomeId: 1 });
betSchema.index({ userAddress: 1, betTimestamp: -1 });
betSchema.index({ marketContract: 1, marketId: 1, userAddress: 1 });
betSchema.index({ status: 1, betTimestamp: -1 });
betSchema.index({ claimed: 1, status: 1 });

// Virtual for bet value in wei
betSchema.virtual('betValueWei').get(function() {
  return this.amountBacked;
});

// Virtual for shares count (formatted)
betSchema.virtual('sharesCount').get(function() {
  return parseFloat(this.shares);
});

// Virtual for bet status
betSchema.virtual('isWinning').get(function() {
  return parseFloat(this.actualWinnings) > 0;
});

// Virtual for ROI (Return on Investment)
betSchema.virtual('roi').get(function() {
  if (!this.actualWinnings || this.actualWinnings === '0') return 0;
  const winnings = parseFloat(this.actualWinnings);
  const backed = parseFloat(this.amountBacked);
  return backed > 0 ? ((winnings - backed) / backed) * 100 : 0;
});

// Virtual for profit/loss
betSchema.virtual('profitLoss').get(function() {
  if (!this.actualWinnings || this.actualWinnings === '0') {
    return parseFloat(this.amountBacked) * -1; // Loss
  }
  const winnings = parseFloat(this.actualWinnings);
  const backed = parseFloat(this.amountBacked);
  return winnings - backed;
});

// Static method to find user bets
betSchema.statics.findByUser = function(userAddress, limit = 50) {
  return this.find({ userAddress })
    .sort({ betTimestamp: -1 })
    .limit(limit)
    .populate('marketRef', 'question category endTime isResolved');
};

// Static method to find market bets
betSchema.statics.findByMarket = function(marketContract, marketId, limit = 100) {
  return this.find({ marketContract, marketId })
    .sort({ betTimestamp: -1 })
    .limit(limit)
    .populate('userId', 'username');
};

// Static method to find pending bets
betSchema.statics.findPending = function() {
  return this.find({ status: 'pending' })
    .sort({ betTimestamp: 1 });
};

// Static method to find unclaimed winnings
betSchema.statics.findUnclaimedWinnings = function(userAddress) {
  return this.find({
    userAddress,
    claimed: false,
    actualWinnings: { $gt: '0' }
  }).populate('marketRef', 'question category');
};

// Static method to calculate user stats
betSchema.statics.getUserStats = async function(userAddress) {
  const stats = await this.aggregate([
    { $match: { userAddress, status: 'confirmed' } },
    {
      $group: {
        _id: null,
        totalBets: { $sum: 1 },
        totalBacked: { $sum: { $toDouble: '$amountBacked' } },
        totalWinnings: { $sum: { $toDouble: '$actualWinnings' } },
        winningBets: {
          $sum: {
            $cond: [{ $gt: [{ $toDouble: '$actualWinnings' }, 0] }, 1, 0]
          }
        },
        unclaimedWinnings: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$claimed', false] }, { $gt: [{ $toDouble: '$actualWinnings' }, 0] }] },
              { $toDouble: '$actualWinnings' },
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalBets: 1,
        totalBacked: 1,
        totalWinnings: 1,
        winningBets: 1,
        losingBets: { $subtract: ['$totalBets', '$winningBets'] },
        winRate: { 
          $cond: [
            { $gt: ['$totalBets', 0] },
            { $divide: ['$winningBets', '$totalBets'] },
            0
          ]
        },
        netProfit: { $subtract: ['$totalWinnings', '$totalBacked'] },
        unclaimedWinnings: 1
      }
    }
  ]);
  
  return stats[0] || {
    totalBets: 0,
    totalBacked: 0,
    totalWinnings: 0,
    winningBets: 0,
    losingBets: 0,
    winRate: 0,
    netProfit: 0,
    unclaimedWinnings: 0
  };
};

// Static method to get market betting activity
betSchema.statics.getMarketActivity = function(marketContract, marketId, timeframe = 24) {
  const since = new Date(Date.now() - (timeframe * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        marketContract,
        marketId,
        betTimestamp: { $gte: since },
        status: 'confirmed'
      }
    },
    {
      $group: {
        _id: {
          outcome: '$outcomeId',
          hour: { $hour: '$betTimestamp' }
        },
        volume: { $sum: { $toDouble: '$amountBacked' } },
        betCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.hour': 1 } }
  ]);
};

// Instance method to calculate potential winnings
betSchema.methods.calculatePotentialWinnings = function(totalPoolSize, winningPoolSize) {
  if (!winningPoolSize || winningPoolSize === '0') return '0';
  
  const userShares = parseFloat(this.shares);
  const totalWinningShares = parseFloat(winningPoolSize);
  const totalPool = parseFloat(totalPoolSize);
  
  if (totalWinningShares === 0) return '0';
  
  const userProportion = userShares / totalWinningShares;
  const potentialWinnings = totalPool * userProportion;
  
  return potentialWinnings.toString();
};

// Instance method to mark as claimed
betSchema.methods.markAsClaimed = function(claimTxHash, actualWinnings) {
  this.claimed = true;
  this.claimTransactionHash = claimTxHash;
  this.actualWinnings = actualWinnings;
  return this.save();
};

// Pre-save middleware to calculate average price
betSchema.pre('save', function(next) {
  if (this.shares && this.amountBacked && !this.avgPrice) {
    const shares = parseFloat(this.shares);
    const amount = parseFloat(this.amountBacked);
    this.avgPrice = shares > 0 ? amount / shares : 0;
  }
  next();
});

const Bet = mongoose.model('Bet', betSchema);

module.exports = Bet;
