const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  name: { // Added name field
    type: String,
    required: true,
  },  email: {
    type: String,
    required: false, // Changed from true to false since phone users might not have email
    unique: true,
    sparse: true // Allows multiple null values for phone-only users
  },
  password: {
    type: String,
    // Not strictly required if using Firebase Auth primarily, but good for existing accounts
    // required: true, 
  },
  firebaseUid: { // Firebase Unique ID
    type: String,
    unique: true,
    sparse: true // Allows multiple null values if not all users have Firebase UID
  },
  displayName: { // For user-chosen public display
    type: String,
    trim: true,
  },
  photoURL: { // URL to profile picture
    type: String,
    trim: true,
  },  phoneNumber: { // User's phone number
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allows multiple null values since not all users have phone numbers
  },
  role: {
    type: String,
    enum: ['superadmin','admin','student'],
    default: 'student',
  },
  // Referral system fields
  referralCode: {
    type: String,
    unique: true,
    sparse: true, // Allows nulls for uniqueness
    index: true, // Index for efficient lookup
    uppercase: true // Store codes in uppercase for consistency
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referralLinkClicks: {
    type: Number,
    default: 0
  },  successfulReferrals: {
    type: Number,
    default: 0
  },
  // Reward system fields
  rewardPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPointsSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  accountExpiresAt: {
    type: Date,
    default: null
  },
  freeTrialEndsAt: {
    type: Date,
    default: null
  },
  // Streak tracking fields
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date,
    default: null
  },
  lastLoginDate: {
    type: Date,
    default: null
  },
  totalLoginDays: {
    type: Number,
    default: 0
  },
  weeklyStreak: {
    type: Number,
    default: 0
  },
  lastWeeklyStreakDate: {
    type: Date,
    default: null
  },
  // Study-specific streak tracking
  studyStreak: {
    type: Number,
    default: 0
  },
  longestStudyStreak: {
    type: Number,
    default: 0
  },
  lastStudyDate: {
    type: Date,
    default: null
  },
  totalStudyDays: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
