/**
 * Model: TestAttempt.js
 * -------------------------------------
 * Represents one student's attempt at a TestSeries.
 *
 * Fields:
 * - series: Reference to the TestSeries taken
 * - student: User ID of the student
 * - responses: Array of { question, selected, earned }
 * - score: Final score after evaluation
 * - maxScore: Total possible marks
 * - percentage: Score as a percentage
 * - submittedAt: Timestamp of submission
 *
 * Used in:
 * - Scoring
 * - Review view
 * - Cooldown & attempt limit enforcement
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const responseSchema = new Schema({
  question:  { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  selected:  [{ type: String }],            // ← an array of strings
  correctOptions: [{ type: String }],       // optional, if you store it
  earned:    Number,
  review:    { type: Boolean, default: false }
});

// Updated to store detailed question information for resume functionality
const detailedQuestionSchema = new Schema({
  question:     { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  marks:        { type: Number, default: 1 },
  questionText: { type: String, default: '' },
  options:      [{ 
    text: String, 
    isCorrect: Boolean 
  }],
  type:         { type: String }, // e.g., 'MCQ', 'MSQ', 'NAT'
  difficulty:   { type: String }  // e.g., 'Easy', 'Medium', 'Hard'
});

const sectionSchema = new Schema({
  title: { type: String, required: true },
  order: Number,
  questions: [detailedQuestionSchema] // Use the new detailedQuestionSchema
});

const testAttemptSchema = new Schema({
  series:   { type: Schema.Types.ObjectId, ref: 'TestSeries', required: true },
  student:  { type: Schema.Types.ObjectId, ref: 'User', required: true },

  responses: [responseSchema],

  score:     { type: Number },
  maxScore:  { type: Number },
  percentage:{ type: Number },

  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  // Fields for resuming and tracking progress
  status: { 
    type: String, 
    enum: ['in-progress', 'completed', 'aborted'], 
    default: 'in-progress' 
  },
  expiresAt: { type: Date }, // Calculated once when test starts if there is a fixed duration
  lastSavedAt: { type: Date },
  remainingDurationSeconds: { type: Number } // Stores the countdown value from frontend
});

// Added attemptNo field to the schema
testAttemptSchema.add({
  attemptNo: {
    type: Number,
    required: true
  },
  // ← NEW: which form the student got
  variantCode: { type: String },

  // ← NEW: the exact sections/questions for that form
  sections: [sectionSchema]
});

module.exports =
  mongoose.models.TestAttempt || mongoose.model('TestAttempt', testAttemptSchema);
