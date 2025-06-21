/**
 * Model: TestSeries.js
 * -------------------------------------
 * Defines a full mock test (official-style or practice).
 *
 * Fields:
 * - title, totalMarks, duration, negativeMarking
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
  marks: { type: Number, required: true },
  negativeMarks: { type: Number, default: 0 } // null → use series default
});

const sectionSchema = new Schema({
  title: { type: String, required: true },
  order: { type: Number, required: true },
  questions: [
    {
      question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
      marks: { type: Number, required: true },
      negativeMarks: { type: Number, default: 0 } // null → use series default
    }
  ],
  questionPool: [{ // Pool of question IDs for this section
    type: Schema.Types.ObjectId,
    ref: 'Question'
  }],
  questionsToSelectFromPool: { type: Number, default: 0 }, // How many questions to randomly pick from questionPool
  randomizeQuestionOrderInSection: { type: Boolean, default: false } // Whether to randomize question order within this section
}, { _id: false });

const variantSchema = new Schema({
  code: {
    type: String,
    required: true       // e.g. 'A', 'B', 'C'
  },
  sections: [ sectionSchema ]
});

const testSeriesSchema = new Schema({
  title:        { type: String, required: true },
  year:         { type: Number },

  duration:     { type: Number, required: true },
  totalMarks:   { type: Number, default: 0 },   // NEW

  sections:     [ sectionSchema ],

  variants:     [ variantSchema ],       // ← new multi‑form support
  randomizeSectionOrder: { type: Boolean, default: false }, // Whether to randomize the order of sections
  enablePublicLeaderboard: { type: Boolean, default: true }, // Changed default to true

  maxAttempts: { type: Number, default: 1 },  mode: {
    type: String,
    enum: ['practice', 'live', 'strict'],
    default: 'practice'
  },
  
  // Strict mode configuration settings
  strictModeSettings: {
    enforceFullScreen: { type: Boolean, default: true },
    blockCopyPaste: { type: Boolean, default: true },
    blockKeyboardShortcuts: { type: Boolean, default: true },
    trackTabSwitches: { type: Boolean, default: true },
    trackBlurEvents: { type: Boolean, default: true },
    maxAllowedViolations: { type: Number, default: 5 },
    autoSubmitOnMaxViolations: { type: Boolean, default: false },
    warningThreshold: { type: Number, default: 3 }, // Show warnings after this many violations
    showViolationCounter: { type: Boolean, default: true }
  },

  startAt: {
    type: Date
  },
  endAt: {
    type: Date
  },
  type: { type: String, enum: ['Real_Exam', 'Practice_Exam', 'Live_Exam', 'Quiz_Exam'], required: true },
  family: {
    type: Schema.Types.ObjectId,
    ref: 'ExamFamily',
    required: true
  },
  stream: {
    type: Schema.Types.ObjectId,
    ref: 'ExamStream',
    required: true
  },
  paper: {
    type: Schema.Types.ObjectId,
    ref: 'ExamPaper',
    required: true
  },  shift: {
    type: Schema.Types.ObjectId,
    ref: 'ExamShift',
    required: false
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Pre-save hook to auto-calculate totalMarks
testSeriesSchema.pre('save', function (next) {
  let sum = 0;

  if (this.sections?.length) {
    this.sections.forEach(sec =>
      sec.questions.forEach(q => { sum += (q.marks || 1); })
    );
  } else if (this.questions?.length) {
    this.questions.forEach(q => { sum += (q.marks || 1); });
  }

  this.totalMarks = sum;
  next();
});

module.exports =
  mongoose.models.TestSeries || mongoose.model('TestSeries', testSeriesSchema);
