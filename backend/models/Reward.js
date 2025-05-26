const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  pointsCost: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: [
      'TEST_ACCESS',      // Premium test series access
      'DISCOUNT',         // Discount coupons
      'MERCHANDISE',      // Physical items
      'DIGITAL_CONTENT',  // E-books, videos, etc.
      'PREMIUM_FEATURES', // App premium features
      'GIFT_CARDS',       // External gift cards
      'CONSULTATION',     // 1-on-1 sessions
      'OTHER'
    ],
    required: true
  },
  type: {
    type: String,
    enum: [
      'INSTANT',          // Immediately available
      'VOUCHER_CODE',     // Generates a code
      'MANUAL_DELIVERY',  // Requires manual processing
      'FEATURE_UNLOCK',   // Unlocks app features
      'DISCOUNT_PERCENT', // Percentage discount
      'DISCOUNT_FIXED'    // Fixed amount discount
    ],
    required: true
  },
  value: {
    // Flexible field to store reward value
    discountPercent: Number,    // For percentage discounts
    discountAmount: Number,     // For fixed amount discounts
    validityDays: Number,       // How long the reward is valid
    maxUsageCount: Number,      // How many times it can be used
    featureCode: String,        // Feature identifier to unlock
    externalUrl: String,        // URL for external rewards
    instructionsText: String    // Instructions for manual rewards
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLimited: {
    type: Boolean,
    default: false
  },
  totalQuantity: {
    type: Number,
    default: null // null means unlimited
  },
  remainingQuantity: {
    type: Number,
    default: null
  },
  minimumLevel: {
    type: Number,
    default: 1,
    min: 1
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String,
    trim: true
  },
  termsAndConditions: {
    type: String,
    trim: true
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true 
});

// Virtual to check if reward is currently available
rewardSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  const validFrom = this.validFrom <= now;
  const validUntil = !this.validUntil || this.validUntil >= now;
  const hasQuantity = !this.isLimited || (this.remainingQuantity && this.remainingQuantity > 0);
  
  return this.isActive && validFrom && validUntil && hasQuantity;
});

// Method to check if user is eligible for this reward
rewardSchema.methods.isEligibleUser = function(user) {
  return user.rewardPoints >= this.pointsCost && 
         (user.level || 1) >= this.minimumLevel;
};

// Static method to get available rewards for a user
rewardSchema.statics.getAvailableForUser = function(user) {
  const now = new Date();
  return this.find({
    isActive: true,
    pointsCost: { $lte: user.rewardPoints },
    minimumLevel: { $lte: user.level || 1 },
    validFrom: { $lte: now },
    $or: [
      { validUntil: null },
      { validUntil: { $gte: now } }
    ],
    $or: [
      { isLimited: false },
      { remainingQuantity: { $gt: 0 } }
    ]
  }).sort({ displayOrder: 1, pointsCost: 1 });
};

module.exports = mongoose.model('Reward', rewardSchema);
