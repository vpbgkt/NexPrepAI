const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const subTopicSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    }, // Removed unique: true
    topic: { type: ObjectId, ref: 'Topic', required: true },
    createdBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ─── Unique per topic, case-insensitive ────────────────
subTopicSchema.index(
  { name: 1, topic: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = model('SubTopic', subTopicSchema);
