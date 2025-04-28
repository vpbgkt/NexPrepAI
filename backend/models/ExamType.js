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
const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const examTypeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    }, // Removed unique: true

    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    }, // Removed unique: true
    createdBy: { type: ObjectId, ref: 'User' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Unique index on code (case-insensitive) ────────────
examTypeSchema.index(
  { code: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = model('ExamType', examTypeSchema);