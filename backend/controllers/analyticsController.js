const Question = require('../models/Question');

exports.getQuestionAnalytics = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const hardest = await Question.find()
      .sort({ 'meta.accuracy.correct': 1 }) // less correct = harder
      .limit(parseInt(limit));

    const slowest = await Question.find()
      .sort({ 'meta.avgTime': -1 })
      .limit(parseInt(limit));

    res.json({
      hardest,
      slowest
    });
  } catch (err) {
    console.error('❌ Error in question analytics:', err);
    res.status(500).json({ message: 'Failed to load question analytics' });
  }
};