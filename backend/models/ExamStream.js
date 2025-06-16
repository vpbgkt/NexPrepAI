const mongoose = require('mongoose');
const { Schema } = mongoose;

const examStreamSchema = new Schema({
  family: { 
    type: Schema.Types.ObjectId, 
    ref: 'ExamFamily', 
    required: true,
    index: true
  },
  level: { 
    type: Schema.Types.ObjectId, 
    ref: 'ExamLevel', 
    required: true,
    index: true
  },
  code: { 
    type: String, 
    required: true, 
    trim: true,
    uppercase: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  conductingAuthority: {
    type: String,
    required: true,
    trim: true
    // Examples: NTA, UPSC, RPSC, IIT, IBPS, CBSE, ICSE, etc.
  },
  region: {
    type: String,
    required: true,
    trim: true,
    default: 'All-India'
    // Examples: All-India, Rajasthan, MP, UP, International, etc.
  },
  language: {
    type: String,
    required: true,
    trim: true,
    default: 'English'
    // Examples: English, Hindi, Multilingual, Regional, etc.
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Archived'],
    default: 'Active'
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

// Prevent duplicate code per level
examStreamSchema.index({ level: 1, code: 1 }, { unique: true });

module.exports =
  mongoose.models.ExamStream ||
  mongoose.model('ExamStream', examStreamSchema);