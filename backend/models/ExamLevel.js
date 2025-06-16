const mongoose = require('mongoose');
const { Schema } = mongoose;

const examLevelSchema = new Schema({
  family: {
    type: Schema.Types.ObjectId,
    ref: 'ExamFamily',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    enum: ['UG', 'PG', 'DOC', 'DIP', '10+2', 'GRAD', 'SCH']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    enum: [
      'UG', 
      'PG', 
      'Doctorate', 
      'Diploma', 
      '10+2 Level', 
      'Graduate Level', 
      'School Level'
    ]
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Prevent duplicate code per family
examLevelSchema.index({ family: 1, code: 1 }, { unique: true });

module.exports =
  mongoose.models.ExamLevel ||
  mongoose.model('ExamLevel', examLevelSchema);
