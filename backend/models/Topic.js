const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const topicSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    }, // Removed unique: true
    subject: { type: ObjectId, ref: 'Subject', required: true },
    createdBy: { type: ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

topicSchema.index(
  { name: 1, subject: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = model('Topic', topicSchema);
