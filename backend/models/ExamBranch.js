const mongoose = require('mongoose');
const { Schema } = mongoose;

const examBranchSchema = new Schema({
  level: {
    type: Schema.Types.ObjectId,
    ref: 'ExamLevel',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: false,  // Make optional since we'll auto-generate
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },  description: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Archived'],
    default: 'Active'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Prevent duplicate code per level
examBranchSchema.index({ level: 1, code: 1 }, { unique: true });

// Prevent duplicate name per level
examBranchSchema.index({ level: 1, name: 1 }, { unique: true });

module.exports =
  mongoose.models.ExamBranch ||
  mongoose.model('ExamBranch', examBranchSchema);
