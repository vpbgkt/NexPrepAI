const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/*
  Branch (aka Stream) – now lowercase + unique (case-insensitive)
  Added createdBy for audit.
*/

const branchSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true // Removed unique: true
    },
    description: String,
    createdBy: { type: ObjectId, ref: 'User' }, // already added earlier
    // Add applicable exam levels - branches can be relevant to multiple levels
    applicableExamLevels: [{
      type: ObjectId,
      ref: 'ExamLevel'
    }],
    // Add applicable exam families for broader filtering
    applicableExamFamilies: [{
      type: ObjectId,
      ref: 'ExamFamily'
    }]
  },
  { timestamps: true }
);

// Case-insensitive unique index (strength:2 ignores case, diacritics)
branchSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } } // NEW
);

module.exports = model('Branch', branchSchema);
