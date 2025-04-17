const mongoose = require('mongoose');
const { Schema } = mongoose;

const TestSeriesSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
  },
  topic: {
    type: Schema.Types.ObjectId,
    ref: 'Topic',
  },
  subtopic: {
    type: Schema.Types.ObjectId,
    ref: 'Subtopic',
  },
  questions: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Question',
    }
  ],
  questionCount: {
    type: Number,
    required: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
  },
  totalMarks: {
    type: Number,
    required: true,
  },
  negativeMarks: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('TestSeries', TestSeriesSchema);
