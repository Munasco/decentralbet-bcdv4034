const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const UserSchema = new mongoose.Schema({
  // Basic Information
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  
  // Profile Information
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  // Blockchain Information
  walletAddress: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please provide a valid Ethereum address']
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['trader', 'admin', 'market_creator', 'resolver'],
    default: 'trader'
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Security
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date
  },
  
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Trading/Betting Statistics
  tradingStats: {
    totalBets: {
      type: Number,
      default: 0
    },
    totalVolume: {
      type: String, // Using string for BigInt
      default: '0'
    },
    totalWinnings: {
      type: String, // Using string for BigInt
      default: '0'
    },
    winRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    marketsCreated: {
      type: Number,
      default: 0
    },
    marketsResolved: {
      type: Number,
      default: 0
    }
  },
  
  // Betting History References (keeping old voting history for migration)
  bettingHistory: [{
    marketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Market'
    },
    betId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bet'
    },
    transactionHash: String,
    bettedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Legacy voting history (deprecated)
  votingHistory: [{
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election'
    },
    transactionHash: String,
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Profile Settings
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  
  // Metadata
  lastLogin: Date,
  ipAddress: String,
  userAgent: String,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ walletAddress: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
});

// Virtual for account lock status
UserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      username: this.username,
      email: this.email,
      role: this.role
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expire }
  );
};

// Method to increment login attempts
UserSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: {
        loginAttempts: 1
      },
      $unset: {
        lockUntil: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we've reached max attempts and it's not locked already, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
UserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Method to add betting history
UserSchema.methods.addBetHistory = function(marketId, betId, transactionHash) {
  this.bettingHistory.push({
    marketId,
    betId,
    transactionHash,
    bettedAt: new Date()
  });
  this.tradingStats.totalBets += 1;
  return this.save();
};

// Method to add voting history (legacy)
UserSchema.methods.addVoteHistory = function(electionId, transactionHash) {
  this.votingHistory.push({
    electionId,
    transactionHash,
    votedAt: new Date()
  });
  return this.save();
};

// Method to update trading stats
UserSchema.methods.updateTradingStats = function(statsUpdate) {
  if (statsUpdate.totalVolume) {
    const currentVolume = parseFloat(this.tradingStats.totalVolume || '0');
    const additionalVolume = parseFloat(statsUpdate.totalVolume);
    this.tradingStats.totalVolume = (currentVolume + additionalVolume).toString();
  }
  
  if (statsUpdate.totalWinnings) {
    const currentWinnings = parseFloat(this.tradingStats.totalWinnings || '0');
    const additionalWinnings = parseFloat(statsUpdate.totalWinnings);
    this.tradingStats.totalWinnings = (currentWinnings + additionalWinnings).toString();
  }
  
  if (statsUpdate.marketsCreated) {
    this.tradingStats.marketsCreated += statsUpdate.marketsCreated;
  }
  
  if (statsUpdate.marketsResolved) {
    this.tradingStats.marketsResolved += statsUpdate.marketsResolved;
  }
  
  // Recalculate win rate
  if (this.tradingStats.totalBets > 0) {
    // This would need to be calculated from actual bet data
    // For now, we'll leave it as is and calculate it in a service
  }
  
  return this.save();
};

// Static method to find by username or email
UserSchema.statics.findByLogin = function(login) {
  return this.findOne({
    $or: [
      { email: login.toLowerCase() },
      { username: login.toLowerCase() }
    ]
  }).select('+password');
};

// Static method to get user statistics
UserSchema.statics.getStats = async function() {
  const totalUsers = await this.countDocuments();
  const activeUsers = await this.countDocuments({ isActive: true });
  const verifiedUsers = await this.countDocuments({ isEmailVerified: true });
  const adminUsers = await this.countDocuments({ role: { $in: ['admin', 'election_admin'] } });
  
  return {
    totalUsers,
    activeUsers,
    verifiedUsers,
    adminUsers,
    inactiveUsers: totalUsers - activeUsers,
    unverifiedUsers: totalUsers - verifiedUsers
  };
};

// Static method for user lookup with security checks
UserSchema.statics.getForAuth = function(id) {
  return this.findById(id)
    .select('+password +loginAttempts +lockUntil')
    .populate('votingHistory.electionId', 'title status');
};

module.exports = mongoose.model('User', UserSchema);
