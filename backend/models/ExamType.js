/**
 * Model: ExamType.js
 * -------------------------------------
 * Defines allowed exam types (e.g., 'medical', 'engineering').
 *
 * Fields:
 * - code: Short lowercase identifier (e.g., 'neet', 'aiims')
 * - name: Full display name (e.g., 'NEET 2025')
 *
 * Used in:
 * - TestSeries tagging
 * - Student dashboard filtering
 * - CSV import classification
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const examTypeSchema = new Schema({
  code:   { type: String, lowercase: true, trim: true, unique: true },
  name:   { type: String, required: true },
  active: { type: Boolean, default: true },
});

module.exports =
  mongoose.models.ExamType || mongoose.model('ExamType', examTypeSchema);