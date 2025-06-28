/**
 * Model: TestAttemptCounter.js
 * -------------------------------------
 * Tracks the attempt count for each student-test combination
 * This allows us to maintain attempt counts while storing only the latest attempt
 *
 * Fields:
 * - student: Reference to the User (student)
 * - series: Reference to the TestSeries
 * - attemptCount: Current number of attempts made
 * - lastAttemptAt: Timestamp of the last attempt
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const testAttemptCounterSchema = new Schema({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  series: {
    type: Schema.Types.ObjectId,
    ref: 'TestSeries',
    required: true,
    index: true
  },
  attemptCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one counter per student-series combination
testAttemptCounterSchema.index({ student: 1, series: 1 }, { unique: true });

// Static method to increment attempt count
testAttemptCounterSchema.statics.incrementAttemptCount = async function(studentId, seriesId) {
  const result = await this.findOneAndUpdate(
    { student: studentId, series: seriesId },
    { 
      $inc: { attemptCount: 1 },
      $set: { lastAttemptAt: new Date() }
    },
    { 
      upsert: true, 
      new: true,
      runValidators: true
    }
  );
  return result.attemptCount;
};

// Static method to get attempt count
testAttemptCounterSchema.statics.getAttemptCount = async function(studentId, seriesId) {
  const counter = await this.findOne({ student: studentId, series: seriesId });
  return counter ? counter.attemptCount : 0;
};

// Static method to reset attempt count (useful for admin operations)
testAttemptCounterSchema.statics.resetAttemptCount = async function(studentId, seriesId) {
  await this.findOneAndUpdate(
    { student: studentId, series: seriesId },
    { 
      attemptCount: 0,
      lastAttemptAt: new Date()
    },
    { upsert: true }
  );
};

module.exports = mongoose.model('TestAttemptCounter', testAttemptCounterSchema);
