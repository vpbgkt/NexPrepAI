const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  startTime: { type: Date },   // optional
  endTime: { type: Date },     // optional
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
