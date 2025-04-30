const mongoose = require('mongoose');
const { Schema } = mongoose;

const examFamilySchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,       // e.g. "engineering", "medical", "ssc"
    trim: true,
  },
  name: {
    type: String,
    required: true,     // human-friendly, e.g. "Engineering"
    trim: true,
  },
  description: {
    type: String,
    default: ''
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = 
  mongoose.models.ExamFamily ||
  mongoose.model('ExamFamily', examFamilySchema);