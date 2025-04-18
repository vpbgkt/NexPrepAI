// models/Question.js
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
