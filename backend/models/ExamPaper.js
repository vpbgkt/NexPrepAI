//This represents a specific full paper (e.g. “GATE CS 2021”, “NEET 2023”) tied to one stream.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const examPaperSchema = new Schema({
  stream: {
    type: Schema.Types.ObjectId,
    ref: 'ExamStream',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    default: null
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Prevent duplicate code per stream
examPaperSchema.index({ stream: 1, code: 1 }, { unique: true });

module.exports =
  mongoose.models.ExamPaper ||
  mongoose.model('ExamPaper', examPaperSchema);