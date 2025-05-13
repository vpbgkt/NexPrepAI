// models/Question.js
// -------------------------------------------------------
// Mongoose schema for questions used in NexPrep.
// Matches the "Question Data Standard v1.0" (Swagger schema).
// -------------------------------------------------------
const mongoose = require('mongoose');
const { Schema } = mongoose;

// ---- Sub-schemas ------------------------------------------------------

// History entry: when & where the question was asked
const historySchema = new Schema(
  {
    testSeries: { type: Schema.Types.ObjectId, ref: 'TestSeries' }, // NEW
    title:      { type: String },                                   // NEW
    askedAt:    { type: Date,   default: Date.now }                 // NEW
  },
  { _id: false }
);

// Explanation entry (text / video / pdf / image)
const explanationSchema = new Schema(
  {
    type:    { type: String, enum: ['text', 'video', 'pdf', 'image'] }, // NEW
    label:   { type: String },                                          // NEW
    content: { type: String }                                           // NEW
  },
  { _id: false }
);

// Statistics sub-doc (updated on each submission)
const statsSchema = new Schema(
  {
    shown:     { type: Number, default: 0 },  // NEW
    correct:   { type: Number, default: 0 },  // NEW
    totalTime: { type: Number, default: 0 }   // NEW – ms spent (sum)
  },
  { _id: false }
);

// ---- New: per-language bundle -----------------------------------
const optionSchema = new Schema({
  text      : { type: String, required: true, trim: true },
  img       : { type: String, default: '' },
  isCorrect : { type: Boolean, default: false }
});

const translationSchema = new Schema({
  lang          : { type: String, required: true, enum: ['en', 'hi'] },
  questionText  : { type: String, required: true, trim: true },
  images        : [String],
  options       : {
    type : [optionSchema],
    validate : v => Array.isArray(v) && v.length >= 2
  },
  explanations  : { type: [explanationSchema], default: [] }
});

// ---- Question schema --------------------------------------------------
const questionSchema = new Schema(
  {
    // Hierarchy anchors
    branch:   { type: Schema.Types.ObjectId, ref: 'Branch',   required: true },
    subject:  { type: Schema.Types.ObjectId, ref: 'Subject'  },
    topic:    { type: Schema.Types.ObjectId, ref: 'Topic'    },
    subTopic: { type: Schema.Types.ObjectId, ref: 'SubTopic' },

    // Core content
    translations: {
      type: [translationSchema],
      validate: v => Array.isArray(v) && v.length >= 1,
      required: true
    },

    // Removed marks and negativeMarks fields
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Not-mentioned'],
      default: 'Medium'
    },
    type:          { type: String, enum: ['single', 'multiple', 'integer', 'matrix'], default: 'single' }, // NEW

    explanations:  [explanationSchema],                               // NEW
    questionHistory: [{
      title: String,
      askedAt: Date
    }],

    // Runtime stats
    stats: statsSchema,                                               // NEW

    // NEW: Additional optional fields
    tags: { type: [String], default: [] },                            // NEW
    recommendedTimeAllotment: { type: Number },                       // NEW (in seconds or minutes, define unit in usage)
    internalNotes: { type: String, trim: true },                      // NEW

    // Lifecycle & audit
    status:   { type: String, enum: ['active', 'inactive', 'draft', 'Published', 'Pending Review'], default: 'draft' }, // UPDATED enum and default
    version:  { type: Number, default: 1 },                           // NEW
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User' },           // NEW
    updatedBy:{ type: Schema.Types.ObjectId, ref: 'User' }            // NEW
  },
  { timestamps: true }
);

/** 🆕  Array-level validator – at least ONE translation pack complete */
questionSchema.path('translations').validate({
  validator(arr) {
    return arr.some(p => p.questionText && p.options?.length >= 2);
  },
  message: 'At least one translation must contain text and two options.'
});

// ----- Hooks -----------------------------------------------------------

// Auto-increment version & set updatedBy on any findOneAndUpdate
questionSchema.pre('findOneAndUpdate', function (next) {             // NEW
  this.updateOne({}, { $inc: { version: 1 } });
  next();
});

// Removed any references to marks and negativeMarks

// Export model
module.exports = mongoose.model('Question', questionSchema);
