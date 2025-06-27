/**
 * @fileoverview Student Enrollment Model
 * 
 * This model manages student enrollments in different exam categories, levels, and branches.
 * It provides a flexible enrollment system that allows students to:
 * - Enroll in multiple exam families (JEE, NEET, GATE, etc.)
 * - Select specific exam levels within families (JEE Main, JEE Advanced, etc.)
 * - Choose relevant branches/streams (PCM, PCB, etc.)
 * - Handle compulsory enrollments (like reasoning for all students)
 * 
 * @module models/Enrollment
 * @requires mongoose
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Enrollment Schema
 * 
 * Represents a student's enrollment in a specific exam category with associated
 * levels and branches. This enables personalized test filtering and recommendations.
 */
const enrollmentSchema = new Schema({
  // Student reference
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Exam hierarchy references
  examFamily: {
    type: Schema.Types.ObjectId,
    ref: 'ExamFamily',
    required: true,
    index: true
  },

  examLevels: [{
    type: Schema.Types.ObjectId,
    ref: 'ExamLevel',
    required: true
  }],

  branches: [{
    type: Schema.Types.ObjectId,
    ref: 'ExamBranch', // Changed from 'Branch' to 'ExamBranch'
    required: true
  }],

  // Enrollment metadata
  enrollmentType: {
    type: String,
    enum: ['self', 'admin', 'compulsory'],
    default: 'self',
    required: true
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    required: true
  },

  // Access control (account-level expiration is handled globally)
  accessLevel: {
    type: String,
    enum: ['basic', 'premium', 'full'],
    default: 'basic',
    required: true
  },

  // Enrollment tracking
  enrolledAt: {
    type: Date,
    default: Date.now,
    required: true
  },

  enrolledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Compulsory enrollment flags
  isCompulsory: {
    type: Boolean,
    default: false
  },

  compulsoryReason: {
    type: String,
    default: null
  },

  // Performance tracking
  totalTestsAttempted: {
    type: Number,
    default: 0
  },

  averageScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  lastActivityAt: {
    type: Date,
    default: null
  },

  // Preferences
  preferences: {
    receiveNotifications: {
      type: Boolean,
      default: true
    },
    difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'mixed'],
      default: 'mixed'
    },
    preferredLanguage: {
      type: String,
      enum: ['english', 'hindi', 'mixed'],
      default: 'english'
    }
  },

  // Additional metadata
  notes: {
    type: String,
    default: ''
  },

  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
enrollmentSchema.index({ student: 1, examFamily: 1 }); // Removed unique constraint
enrollmentSchema.index({ student: 1, status: 1 });
enrollmentSchema.index({ examFamily: 1, status: 1 });
enrollmentSchema.index({ enrollmentType: 1, status: 1 });
enrollmentSchema.index({ isCompulsory: 1, status: 1 });

// Static method to get active enrollments for a student
enrollmentSchema.statics.getActiveEnrollments = function(studentId) {
  return this.find({
    student: studentId,
    status: 'active'
  }).populate('examFamily examLevels branches');
};

// Static method to check if student has access to exam family
enrollmentSchema.statics.hasAccessToExamFamily = function(studentId, examFamilyId) {
  return this.findOne({
    student: studentId,
    examFamily: examFamilyId,
    status: 'active'
  });
};

// Pre-save middleware to update lastActivityAt
enrollmentSchema.pre('save', function(next) {
  if (this.isModified('totalTestsAttempted') || this.isModified('averageScore')) {
    this.lastActivityAt = new Date();
  }
  next();
});

// Static method to get compulsory enrollments for all students
enrollmentSchema.statics.getCompulsoryEnrollments = function() {
  return this.find({
    isCompulsory: true,
    status: 'active'
  }).populate('examFamily examLevels branches');
};

// Instance method to upgrade to premium
enrollmentSchema.methods.upgradeToPremium = function() {
  this.accessLevel = 'premium';
  return this.save();
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);
