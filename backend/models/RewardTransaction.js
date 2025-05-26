const mongoose = require('mongoose');

const rewardTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'REFERRAL_BONUS',       // Points earned for successful referral
      'SIGNUP_BONUS',         // Points earned for being referred
      'MILESTONE_BONUS',      // Points earned for reaching referral milestones
      'DAILY_LOGIN',          // Points earned for daily login
      'TEST_COMPLETION',      // Points earned for completing tests
      'REWARD_REDEMPTION',    // Points spent on rewards
      'ADMIN_ADJUSTMENT',     // Manual adjustment by admin
      'PENALTY',              // Points deducted for violations
      'BONUS',                // Special bonus points
      'REFUND'                // Points refunded
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balance: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  metadata: {
    // Flexible field to store additional information
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralCode: String,
    testSeriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSeries' },
    rewardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward' },
    milestoneType: String,
    milestoneValue: Number,
    adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'COMPLETED'
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // Some rewards might have expiration
  }
}, { 
  timestamps: true,
  index: { user: 1, createdAt: -1 } // Compound index for efficient user transaction history
});

// Virtual for checking if transaction is expired
rewardTransactionSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Static method to calculate user's current balance
rewardTransactionSchema.statics.calculateUserBalance = async function(userId) {
  const result = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), status: 'COMPLETED' } },
    { $group: { _id: null, totalBalance: { $sum: '$amount' } } }
  ]);
  return result.length > 0 ? result[0].totalBalance : 0;
};

module.exports = mongoose.model('RewardTransaction', rewardTransactionSchema);
