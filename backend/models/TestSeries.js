/**
 * Model: TestSeries.js
 * -------------------------------------
 * Defines a full mock test (official-style or practice).
 *
 * Fields:
 * - title, examType, totalMarks, duration, negativeMarking
 * - questions: Flat array of question-mark objects
 * - sections: Optional grouping of questions into sections (with titles)
 * - startAt / endAt: Optional scheduled open/close windows
 *
 * Used in:
 * - Admin panel for test creation
 * - Student test player and dashboard
 * - Leaderboard generation
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionWithMarksSchema = new Schema({
  question: { type: Schema.Types.ObjectId, ref: 'Question' },
  marks: { type: Number, default: 1 }
});

const sectionSchema = new Schema({
  title: { type: String, required: true },
  order: { type: Number },
  questions: [questionWithMarksSchema]
});

const testSeriesSchema = new Schema({
  title:        { type: String, required: true },
  examType:     { type: Schema.Types.ObjectId, ref: 'ExamType', required: true },
  year:         { type: Number },

  duration:     { type: Number, required: true },
  totalMarks:   { type: Number, required: true },
  negativeMarking: { type: Boolean, default: false },

  questions: [questionWithMarksSchema], // For non-section papers
  sections:  [sectionSchema],           // Optional section-wise layout
  maxAttempts: { type: Number, default: 1 }, // Added maxAttempts field to the schema
  mode: {
    type: String,
    enum: ['practice', 'live'],
    default: 'practice'
  },
  startAt: {
    type: Date
  },
  endAt: {
    type: Date
  }
}, { timestamps: true });

module.exports =
  mongoose.models.TestSeries || mongoose.model('TestSeries', testSeriesSchema);
