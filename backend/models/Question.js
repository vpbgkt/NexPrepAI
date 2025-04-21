// models/Question.js
/**
 * Model: Question.js
 * -------------------------------------
 * Represents a single MCQ question.
 *
 * Fields:
 * - questionText: The question statement
 * - options: Array of option texts (A, B, C, D, etc.)
 * - correctOptions: Array of correct option indices (supports multi-answer)
 * - difficulty: Optional difficulty level
 * - marks: Number of marks (default = 1)
 * - examType: Optional tag like 'medical', 'engineering', etc.
 * - askedIn: Array of past exams it appeared in (e.g., [{examName, year}])
 * - branch / subject / topic / subtopic: Hierarchical tags
 *
 * Used for:
 * - Test creation
 * - Random sampling
 * - Leaderboard and analytics
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const optionSchema = new Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, required: true }
});

const explanationSchema = new Schema({
  type: { type: String, enum: ['text', 'video', 'pdf', 'image'], required: true },
  label: { type: String }, // e.g., "Video Lecture", "Text Notes"
  content: { type: String, required: true } // URL or raw text
});

const askedInSchema = new Schema({
  examName: { type: String },
  year: { type: Number }
});

const questionSchema = new Schema({
  questionText: { type: String, required: true },
  options: [optionSchema],
  correctOptions: [{ type: String }], // Flat array of correct option texts

  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
  topic: { type: Schema.Types.ObjectId, ref: 'Topic' },
  subtopic: { type: Schema.Types.ObjectId, ref: 'SubTopic' },
  examType: { type: Schema.Types.ObjectId, ref: 'ExamType' },

  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  explanation: { type: String }, // Legacy single explanation (optional)
  explanations: [explanationSchema], // ✅ NEW: Multiple explanations

  marks: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' },
  askedIn: [askedInSchema],

  meta: {
    accuracy: {
      correct: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    avgTime: { type: Number, default: 0 }
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  version: { type: Number, default: 1 }

}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
