const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const subjectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    branch: { type: ObjectId, ref: 'Branch', required: true },
    createdBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ─── Case-insensitive unique index on name per branch ───────────
subjectSchema.index(
  { name: 1, branch: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = model('Subject', subjectSchema);
