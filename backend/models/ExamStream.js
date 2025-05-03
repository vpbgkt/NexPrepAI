const mongoose = require('mongoose');
const { Schema } = mongoose;

const examStreamSchema = new Schema({
  family:    { type: Schema.Types.ObjectId, ref: 'ExamFamily', required: true },
  code:      { type: String, required: true, trim: true },
  name:      { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Prevent duplicate code per family
examStreamSchema.index({ family: 1, code: 1 }, { unique: true });

module.exports =
  mongoose.models.ExamStream ||
  mongoose.model('ExamStream', examStreamSchema);