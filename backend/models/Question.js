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

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
});

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [optionSchema],
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: false },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: false },
  subtopic: { type: mongoose.Schema.Types.ObjectId, ref: 'Subtopic', required: false },
  examType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamType',
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true,
  },
  explanation: { type: String },
  askedIn: [{
    examName: { type: String, required: true },
    year:     { type: Number }
  }],
});

module.exports = mongoose.model('Question', questionSchema);
