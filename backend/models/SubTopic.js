const mongoose = require('mongoose');

const subTopicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
});

module.exports = mongoose.model('SubTopic', subTopicSchema);
