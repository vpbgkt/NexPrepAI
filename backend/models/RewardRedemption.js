const mongoose = require('mongoose');

const rewardRedemptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reward',
    required: true
  },
  pointsSpent: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: [
      'PENDING',          // Redemption initiated
      'PROCESSING',       // Being processed
      'COMPLETED',        // Successfully delivered
      'FAILED',           // Failed to deliver
      'CANCELLED',        // Cancelled by user or admin
      'EXPIRED'           // Expired before delivery
    ],
    default: 'PENDING'
  },
  deliveryMethod: {
    type: String,
    enum: [
      'INSTANT',          // Instant digital delivery
      'EMAIL',            // Sent via email
      'IN_APP',           // Available in app
      'MANUAL',           // Manual processing required
      'EXTERNAL_API'      // Delivered via external API
    ]
  },
  deliveryDetails: {
    // Flexible field for delivery information
    email: String,
    voucherCode: String,
    downloadUrl: String,
    instructions: String,
    trackingNumber: String,
    externalReferenceId: String,
    deliveryAddress: String,
    deliveryNotes: String
  },
  redemptionCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default to 30 days from now
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  usageCount: {
    type: Number,
    default: 0
  },
  maxUsageCount: {
    type: Number,
    default: 1
  },
  usageHistory: [{
    usedAt: { type: Date, default: Date.now },
    context: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  adminNotes: {
    type: String,
    trim: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true,
  index: { user: 1, createdAt: -1 } // Compound index for user redemption history
});

// Virtual to check if redemption is expired
rewardRedemptionSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual to check if redemption is still usable
rewardRedemptionSchema.virtual('isUsable').get(function() {
  return this.status === 'COMPLETED' && 
         !this.isExpired && 
         this.usageCount < this.maxUsageCount;
});

// Method to mark as used
rewardRedemptionSchema.methods.markAsUsed = function(context = '', metadata = {}) {
  if (this.usageCount >= this.maxUsageCount) {
    throw new Error('Redemption usage limit exceeded');
  }
  
  this.usageCount += 1;
  this.usageHistory.push({
    usedAt: new Date(),
    context,
    metadata
  });
  
  return this.save();
};

// Generate unique redemption code
rewardRedemptionSchema.methods.generateRedemptionCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.redemptionCode = code;
  return code;
};

// Pre-save hook to generate redemption code if needed
rewardRedemptionSchema.pre('save', function(next) {
  if (this.isNew && !this.redemptionCode) {
    this.generateRedemptionCode();
  }
  next();
});

module.exports = mongoose.model('RewardRedemption', rewardRedemptionSchema);
