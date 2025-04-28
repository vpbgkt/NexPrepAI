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

// ---- Question schema --------------------------------------------------
const questionSchema = new Schema(
  {
    // Hierarchy anchors
    branch:   { type: Schema.Types.ObjectId, ref: 'Branch',   required: true },
    subject:  { type: Schema.Types.ObjectId, ref: 'Subject'  },
    topic:    { type: Schema.Types.ObjectId, ref: 'Topic'    },
    subTopic: { type: Schema.Types.ObjectId, ref: 'SubTopic' },

    examType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamType',
      required: true
    },

    // Core content
    questionText: { type: String, required: true },
    images:       [{ type: String }],                                 // NEW – image URLs

    options: {
      type: [
        {
          text: { type: String, required: true },
          img: { type: String, default: '' },
          isCorrect: { type: Boolean, default: false }
        }
      ],
      validate: v => Array.isArray(v) && v.length >= 2,
      required: true
    },
    correctOptions: {
      type:  [Number],
      validate: v => Array.isArray(v) && v.length >= 1,
      required: true
    },

    // Scoring & meta
    marks:         { type: Number, default: 1 },
    negativeMarks: { type: Number, default: 0 },                      // NEW
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

    // Lifecycle & audit
    status:   { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' },
    version:  { type: Number, default: 1 },                           // NEW
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User' },           // NEW
    updatedBy:{ type: Schema.Types.ObjectId, ref: 'User' }            // NEW
  },
  { timestamps: true }
);

// ----- Hooks -----------------------------------------------------------

// Auto-increment version & set updatedBy on any findOneAndUpdate
questionSchema.pre('findOneAndUpdate', function (next) {             // NEW
  this.updateOne({}, { $inc: { version: 1 } });
  next();
});

// Export model
module.exports = mongoose.model('Question', questionSchema);
