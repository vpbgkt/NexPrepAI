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
  order: { type: Number, required: true },
  questions: [
    {
      question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
      marks: { type: Number, default: 1 }
    }
  ]
}, { _id: false });

const variantSchema = new Schema({
  code: {
    type: String,
    required: true       // e.g. 'A', 'B', 'C'
  },
  sections: [ sectionSchema ],
  negativeMarking: {
    type: Number,        // now accepts decimals like 0.25
    default: 0
  }
});

const testSeriesSchema = new Schema({
  title:        { type: String, required: true },
  examType:     { type: Schema.Types.ObjectId, ref: 'ExamType', required: true },
  year:         { type: Number },

  duration:     { type: Number, required: true },
  totalMarks:   { type: Number, required: true },

  sections:     [ sectionSchema ],

  variants:     [ variantSchema ],       // ← new multi‑form support

  maxAttempts: { type: Number, default: 1 },
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
