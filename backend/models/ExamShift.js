const mongoose = require('mongoose');
const { Schema } = mongoose;

const examShiftSchema = new Schema({
  paper: {
    type: Schema.Types.ObjectId,
    ref: 'ExamPaper',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,   // e.g. 'shift-1', 'shift-2', or 'Q-3'
    trim: true
  },
  name: {
    type: String,
    required: true,   // human-readable e.g. 'Shift 1', 'Q-3'
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// unique per paper
examShiftSchema.index({ paper: 1, code: 1 }, { unique: true });

module.exports =
  mongoose.models.ExamShift ||
  mongoose.model('ExamShift', examShiftSchema);