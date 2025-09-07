const mongoose = require('mongoose');

const ElectionSchema = new mongoose.Schema({
  // Basic Election Information
  title: {
    type: String,
    required: [true, 'Election title is required'],
    trim: true,
    maxlength: [200, 'Election title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Election description is required'],
    trim: true,
    maxlength: [1000, 'Election description cannot exceed 1000 characters']
  },
  
  // Timing
  startTime: {
    type: Date,
    required: [true, 'Election start time is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Election start time must be in the future'
    }
  },
  
  endTime: {
    type: Date,
    required: [true, 'Election end time is required'],
    validate: {
      validator: function(value) {
        return value > this.startTime;
      },
      message: 'Election end time must be after start time'
    }
  },
  
  // Status and Control
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'ended', 'cancelled'],
    default: 'draft'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isFinalized: {
    type: Boolean,
    default: false
  },
  
  // Blockchain Information
  contractAddress: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please provide a valid contract address']
  },
  
  blockchainElectionId: {
    type: Number,
    min: 1
  },
  
  deploymentTxHash: String,
  finalizationTxHash: String,
  
  // Candidates
  candidates: [{
    candidateId: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
      maxlength: [100, 'Candidate name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Candidate description cannot exceed 500 characters']
    },
    profileImage: String,
    platform: {
      type: String,
      maxlength: [1000, 'Candidate platform cannot exceed 1000 characters']
    },
    voteCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Registered Voters
  registeredVoters: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    walletAddress: {
      type: String,
      required: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Please provide a valid wallet address']
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    hasVoted: {
      type: Boolean,
      default: false
    },
    voteTransactionHash: String,
    votedAt: Date
  }],
  
  // Election Settings
  settings: {
    requiresRegistration: {
      type: Boolean,
      default: true
    },
    allowMultipleVotes: {
      type: Boolean,
      default: false
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    maxVoters: {
      type: Number,
      min: 1
    },
    votingMethod: {
      type: String,
      enum: ['single_choice', 'multiple_choice', 'ranked_choice'],
      default: 'single_choice'
    }
  },
  
  // Results and Statistics
  results: {
    totalVotes: {
      type: Number,
      default: 0,
      min: 0
    },
    winningCandidateId: Number,
    isTie: {
      type: Boolean,
      default: false
    },
    tiedCandidates: [Number],
    participationRate: {
      type: Number,
      min: 0,
      max: 100
    },
    lastUpdated: Date
  },
  
  // Administrative Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  administrators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['creator', 'admin', 'moderator'],
      default: 'admin'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Categories and Tags
  category: {
    type: String,
    enum: ['government', 'corporate', 'academic', 'community', 'organization', 'other'],
    default: 'other'
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  
  // Metadata
  metadata: {
    location: String,
    organization: String,
    externalId: String,
    additionalInfo: mongoose.Schema.Types.Mixed
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ElectionSchema.index({ status: 1 });
ElectionSchema.index({ startTime: 1 });
ElectionSchema.index({ endTime: 1 });
ElectionSchema.index({ isActive: 1 });
ElectionSchema.index({ createdBy: 1 });
ElectionSchema.index({ blockchainElectionId: 1 });
ElectionSchema.index({ contractAddress: 1 });
ElectionSchema.index({ category: 1 });
ElectionSchema.index({ tags: 1 });
ElectionSchema.index({ createdAt: -1 });

// Compound indexes
ElectionSchema.index({ status: 1, startTime: 1 });
ElectionSchema.index({ isActive: 1, status: 1 });

// Virtual for election duration
ElectionSchema.virtual('duration').get(function() {
  if (this.startTime && this.endTime) {
    return Math.abs(this.endTime - this.startTime) / (1000 * 60 * 60); // Duration in hours
  }
  return 0;
});

// Virtual for time remaining
ElectionSchema.virtual('timeRemaining').get(function() {
  if (this.status === 'active' && this.endTime > new Date()) {
    return Math.abs(this.endTime - new Date()) / (1000 * 60); // Time remaining in minutes
  }
  return 0;
});

// Virtual for current status based on timing
ElectionSchema.virtual('currentStatus').get(function() {
  const now = new Date();
  
  if (this.status === 'cancelled' || !this.isActive) {
    return 'cancelled';
  }
  
  if (this.isFinalized) {
    return 'finalized';
  }
  
  if (now < this.startTime) {
    return 'scheduled';
  } else if (now >= this.startTime && now <= this.endTime) {
    return 'active';
  } else {
    return 'ended';
  }
});

// Pre-save middleware to update results
ElectionSchema.pre('save', function(next) {
  if (this.isModified('candidates') || this.isModified('registeredVoters')) {
    this.updateResults();
  }
  next();
});

// Method to update election results
ElectionSchema.methods.updateResults = function() {
  const totalVotes = this.candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
  const totalRegistered = this.registeredVoters.length;
  
  this.results.totalVotes = totalVotes;
  this.results.participationRate = totalRegistered > 0 ? (totalVotes / totalRegistered) * 100 : 0;
  this.results.lastUpdated = new Date();
  
  // Find winning candidate
  if (totalVotes > 0) {
    const sortedCandidates = [...this.candidates].sort((a, b) => b.voteCount - a.voteCount);
    const topVotes = sortedCandidates[0].voteCount;
    const winnersCount = sortedCandidates.filter(c => c.voteCount === topVotes).length;
    
    if (winnersCount === 1) {
      this.results.winningCandidateId = sortedCandidates[0].candidateId;
      this.results.isTie = false;
      this.results.tiedCandidates = [];
    } else {
      this.results.isTie = true;
      this.results.tiedCandidates = sortedCandidates
        .filter(c => c.voteCount === topVotes)
        .map(c => c.candidateId);
    }
  }
};

// Method to add candidate
ElectionSchema.methods.addCandidate = function(candidateData) {
  const candidateId = this.candidates.length > 0 
    ? Math.max(...this.candidates.map(c => c.candidateId)) + 1 
    : 1;
  
  this.candidates.push({
    candidateId,
    ...candidateData
  });
  
  return candidateId;
};

// Method to register voter
ElectionSchema.methods.registerVoter = function(userId, walletAddress) {
  // Check if voter is already registered
  const existingVoter = this.registeredVoters.find(
    voter => voter.userId.toString() === userId.toString() || 
             voter.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  
  if (existingVoter) {
    throw new Error('Voter is already registered for this election');
  }
  
  this.registeredVoters.push({
    userId,
    walletAddress: walletAddress.toLowerCase(),
    registeredAt: new Date()
  });
  
  return this.save();
};

// Method to record vote
ElectionSchema.methods.recordVote = function(walletAddress, candidateId, transactionHash) {
  const voter = this.registeredVoters.find(
    v => v.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  
  if (!voter) {
    throw new Error('Voter not registered for this election');
  }
  
  if (voter.hasVoted) {
    throw new Error('Voter has already voted in this election');
  }
  
  // Find and update candidate vote count
  const candidate = this.candidates.find(c => c.candidateId === candidateId);
  if (!candidate) {
    throw new Error('Candidate not found');
  }
  
  candidate.voteCount += 1;
  
  // Update voter record
  voter.hasVoted = true;
  voter.voteTransactionHash = transactionHash;
  voter.votedAt = new Date();
  
  this.updateResults();
  
  return this.save();
};

// Static method to get elections by status
ElectionSchema.statics.findByStatus = function(status) {
  return this.find({ status, isActive: true })
    .populate('createdBy', 'username email')
    .sort({ createdAt: -1 });
};

// Static method to get active elections
ElectionSchema.statics.getActive = function() {
  const now = new Date();
  return this.find({
    startTime: { $lte: now },
    endTime: { $gte: now },
    isActive: true,
    status: { $in: ['published', 'active'] }
  })
  .populate('createdBy', 'username email')
  .sort({ endTime: 1 });
};

// Static method to get election statistics
ElectionSchema.statics.getStats = async function() {
  const totalElections = await this.countDocuments();
  const activeElections = await this.countDocuments({ status: 'active' });
  const completedElections = await this.countDocuments({ status: 'ended', isFinalized: true });
  const draftElections = await this.countDocuments({ status: 'draft' });
  
  return {
    totalElections,
    activeElections,
    completedElections,
    draftElections,
    scheduledElections: await this.countDocuments({ status: 'published' })
  };
};

// Static method to get elections for user
ElectionSchema.statics.getForUser = function(userId) {
  return this.find({
    $or: [
      { createdBy: userId },
      { 'administrators.userId': userId },
      { 'registeredVoters.userId': userId }
    ]
  })
  .populate('createdBy', 'username email')
  .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Election', ElectionSchema);
