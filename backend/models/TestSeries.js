const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionWithMarksSchema = new Schema({
  question: { type: Schema.Types.ObjectId, ref: 'Question' },
  marks: { type: Number, default: 1 }
});

const sectionSchema = new Schema({
  title: { type: String, required: true },
  order: { type: Number },
  questions: [questionWithMarksSchema]
});

const testSeriesSchema = new Schema({
  title:        { type: String, required: true },
  examType:     { type: Schema.Types.ObjectId, ref: 'ExamType', required: true },
  year:         { type: Number },

  duration:     { type: Number, required: true },
  totalMarks:   { type: Number, required: true },
  negativeMarking: { type: Boolean, default: false },

  questions: [questionWithMarksSchema], // For non-section papers
  sections:  [sectionSchema]            // Optional section-wise layout
}, { timestamps: true });

module.exports =
  mongoose.models.TestSeries || mongoose.model('TestSeries', testSeriesSchema);
