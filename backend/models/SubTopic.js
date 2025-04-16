const mongoose = require('mongoose');

const subTopicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
});

// Prevent OverwriteModelError by reusing an existing model if present
module.exports = mongoose.models.Subtopic ||
  mongoose.model('Subtopic', subTopicSchema);
