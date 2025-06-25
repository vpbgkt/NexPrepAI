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
  questionInstanceKey: { type: String }, // Composite key for matching with randomized questions
  selected: mongoose.Schema.Types.Mixed,
  numericalAnswer: { type: Number }, // Add numerical answer field for NAT questions
  earned: { type: Number }, // Made optional, will be populated by submitAttempt
  status: { type: String }, // Made optional, will be populated by submitAttempt
  
  // Enhanced Review Page fields
  timeSpent: { type: Number, default: 0 }, // Time spent on this question in seconds
  attempts: { type: Number, default: 1 }, // Number of times answer was changed
  flagged: { type: Boolean, default: false }, // Whether question was flagged for review
  confidence: { type: Number, min: 1, max: 5 }, // Confidence level (1-5 scale)
  visitedAt: { type: Date }, // When the question was first visited
  lastModifiedAt: { type: Date }, // When the answer was last changed
  review: { type: Boolean, default: false } // Add review field
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
  // Add numerical answer support for NAT questions
  numericalAnswer: {
    minValue: { type: Number },
    maxValue: { type: Number },
    exactValue: { type: Number },
    tolerance: { type: Number }, // For percentage-based tolerance
    unit: { type: String, trim: true } // Optional unit like "m", "kg", etc.
  },
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
  negativeMarks: { type: Number, default: 0 }, // Add negative marks field
  translations: [attemptTranslationSchema], // Stores the translated content of the question
  questionHistory: [questionHistoryItemSchema], // Stores the history of when the question was asked
  // Fallback fields (intended for scenarios where full translation data might be missing, though ideally translations are comprehensive)
  questionText: { type: String, default: '' }, // Fallback question text if not available in translations for some reason
  options:      [{ // Fallback options structure if not available in translations
    text: String,
    // isCorrect: Boolean, // Correctness is part of the source Question model.
    _id: false
  }],
  type:         { type: String }, // e.g., 'MCQ', 'MSQ', 'NAT', 'numerical', 'integer'
  difficulty:   { type: String }, // e.g., 'Easy', 'Medium', 'Hard'
  // Add numerical answer support for NAT questions
  numericalAnswer: {
    minValue: { type: Number },
    maxValue: { type: Number },
    exactValue: { type: Number },
    tolerance: { type: Number }, // For percentage-based tolerance
    unit: { type: String, trim: true } // Optional unit like "m", "kg", etc.
  }
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
  },  expiresAt: { type: Date }, // Calculated once when test starts if there is a fixed duration
  lastSavedAt: { type: Date },
  remainingDurationSeconds: { type: Number }, // Stores the countdown value from frontend
  timeTakenSeconds: { type: Number }, // <--- ADDED THIS FIELD
  
  // Enhanced Review Page fields
  timePerSection: [{
    sectionTitle: String,
    timeSpent: Number // Time spent on each section in seconds
  }],
  questionSequence: [{ type: String }], // Order in which questions were visited  totalTimeSpent: { type: Number, default: 0 }, // Total time spent on the test in seconds
  averageTimePerQuestion: { type: Number }, // Calculated field for analytics
  flaggedQuestions: [{ type: String }], // Array of question IDs that were flagged
  
  // Anti-cheating fields (only for strict mode exams)
  cheatingEvents: [{
    type: {
      type: String,
      enum: [
        'tab_switch', 'fullscreen_exit', 'copy_attempt', 'paste_attempt', 
        'right_click', 'keyboard_shortcut', 'mouse_leave', 'window_blur',
        'developer_tools', 'screen_sharing', 'suspicious_activity', 'multiple_violations'
      ],
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    questionIndex: { type: Number },
    description: { type: String },
    metadata: {
      timeRemaining: { type: Number },
      currentSection: { type: String },
      userAgent: { type: String },
      screenResolution: { type: String }
    }
  }],
  
  cheatingScore: {
    type: Number,
    default: 0
  },
  
  totalCheatingAttempts: {
    type: Number,
    default: 0
  },
  
  examTerminatedForCheating: {
    type: Boolean,
    default: false
  },
  
  integrityStatus: {
    type: String,
    enum: ['clean', 'flagged', 'terminated'],
    default: 'clean'
  },
  
  strictModeEnabled: {
    type: Boolean,
    default: false
  }
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
