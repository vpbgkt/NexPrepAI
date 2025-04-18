const mongoose = require('mongoose');
const { Schema } = mongoose;

const examTypeSchema = new Schema({
  code:   { type: String, lowercase: true, trim: true, unique: true },
  name:   { type: String, required: true },
  active: { type: Boolean, default: true },
});

module.exports =
  mongoose.models.ExamType || mongoose.model('ExamType', examTypeSchema);