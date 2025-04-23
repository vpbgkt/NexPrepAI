const Question = require('../models/Question');
const TestAttempt = require('../models/TestAttempt');
const mongoose = require('mongoose');

// GET /api/analytics/questions
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

// GET /api/analytics/series/:seriesId
exports.getSeriesAnalytics = async (req, res) => {
  try {
    const { seriesId } = req.params;

    // 1) Total attempts for this series
    const totalAttempts = await TestAttempt.countDocuments({
      series: seriesId,
      submittedAt: { $exists: true }
    });

    // 2) Average score and maxScore
    const agg = await TestAttempt.aggregate([
      {
        $match: {
          series: new mongoose.Types.ObjectId(seriesId),
          submittedAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$score' },
          avgMax:   { $avg: '$maxScore' },
          best:     { $max: '$score' },
          worst:    { $min: '$score' }
        }
      }
    ]);

    const { avgScore=0, avgMax=0, best=0, worst=0 } = agg[0] || {};

    return res.json({
      totalAttempts,
      averagePercentage: avgMax > 0 ? Math.round((avgScore/avgMax)*100) : 0,
      bestScore: best,
      worstScore: worst
    });
  } catch (err) {
    console.error('❌ getSeriesAnalytics error:', err);
    res.status(500).json({ message: 'Failed to fetch series analytics' });
  }
};

// GET /api/analytics/question/:questionId
exports.getQuestionStats = async (req, res) => {
  try {
    const { questionId } = req.params;
    const q = await Question.findById(questionId).lean();
    if (!q) return res.status(404).json({ message: 'Question not found' });

    const { correct, total } = q.meta.accuracy;
    return res.json({
      questionId,
      accuracy: total > 0 ? Math.round((correct/total)*100) : 0,
      avgTime: q.meta.avgTime || 0
    });
  } catch (err) {
    console.error('❌ getQuestionStats error:', err);
    res.status(500).json({ message: 'Failed to fetch question stats' });
  }
};