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

// Define a schema for options within a translation, consistent with Question model
const attemptOptionSchema = new Schema({
  text: { type: String, required: true },
  img: { type: String }, // Optional image URL for an option. Using 'img' from stashed changes.
  // isCorrect field is generally part of the master Question data, not repeated in attempt options.
  _id: false
});

// Define a schema for the individual response items within the TestAttempt.responses array
const attemptResponseItemSchema = new mongoose.Schema({
  question: { type: String, required: true }, // Storing question ID as string, as currently done
  selected: mongoose.Schema.Types.Mixed,
  earned: { type: Number }, // Made optional, will be populated by submitAttempt
  status: { type: String }, // Made optional, will be populated by submitAttempt
}, { _id: false });

const responseSchema = new Schema({
  question:  { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  selected:  [{ type: String }],            // Array of selected option identifiers
  correctOptions: [{ type: String }],       // Optional: if you store the correct option identifiers at the time of attempt
  earned:    Number,
  review:    { type: Boolean, default: false }
});

// Define a schema for individual translations, consistent with Question model
const attemptTranslationSchema = new Schema({
  lang: { type: String, enum: ['en', 'hi'], required: true },
  questionText: { type: String, required: true },
  images: [String], // Array of image URLs for the question translation
  options: [attemptOptionSchema], // Array of options for this translation, using the schema defined above
  // explanations: [anySchemaOrType], // Placeholder if explanations are needed later
  _id: false
});

// Schema for questionHistory items
const questionHistoryItemSchema = new Schema({
  title: { type: String, required: true },
  askedAt: { type: Date, required: true }, // Stores when the question was previously asked
  _id: false
});

// Updated to store detailed question information for resume functionality and review
const detailedQuestionSchema = new Schema({
  question:     { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  marks:        { type: Number, default: 1 },
  translations: [attemptTranslationSchema], // Stores the translated content of the question
  questionHistory: [questionHistoryItemSchema], // Stores the history of when the question was asked
  // Fallback fields (intended for scenarios where full translation data might be missing, though ideally translations are comprehensive)
  questionText: { type: String, default: '' }, // Fallback question text if not available in translations for some reason
  options:      [{ // Fallback options structure if not available in translations
    text: String,
    // isCorrect: Boolean, // Correctness is part of the source Question model.
    _id: false
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

  responses: [attemptResponseItemSchema], // Use the new explicit schema here

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
  remainingDurationSeconds: { type: Number }, // Stores the countdown value from frontend
  timeTakenSeconds: { type: Number } // <--- ADDED THIS FIELD
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
