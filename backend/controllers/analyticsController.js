const Question = require('../models/Question');
const TestAttempt = require('../models/TestAttempt');
const mongoose = require('mongoose');
const { Parser } = require('json2csv'); // npm i json2csv

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
    const seriesOid = new mongoose.Types.ObjectId(seriesId);

    // existing match stage we already built
    const submittedMatch = {
      $match: { series: seriesOid, submittedAt: { $exists: true } }
    };

    // 1) Score distribution
    const scoreDistribution = await TestAttempt.aggregate([
      submittedMatch,
      { $group: { _id: '$score', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // 2) Total attempts (only submitted ones now)
    const totalAttempts = scoreDistribution.reduce((s, b) => s + b.count, 0);

    // 3) Average time
    const timeAgg = await TestAttempt.aggregate([
      submittedMatch,
      { $project: { durationUsed: { $subtract: ['$submittedAt', '$startedAt'] } } },
      { $group: { _id: null, averageTimeMs: { $avg: '$durationUsed' } } }
    ]);

    // 4) Average score and maxScore
    const agg = await TestAttempt.aggregate([
      submittedMatch,
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
      worstScore: worst,
      averageTimeMs: timeAgg[0]?.averageTimeMs || 0,
      scoreDistribution
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

exports.exportAttemptsCsv = async (req, res) => {
  try {
    const seriesId = req.params.id;
    const attempts = await TestAttempt.find({
      series: seriesId,
      submittedAt: { $exists: true }
    })
      .populate('student', 'username email')
      .lean();

    const rows = attempts.map(a => ({
      attemptId: a._id,
      studentId: a.student?._id,
      student: a.student?.username,
      email: a.student?.email,
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.percentage,
      attemptNo: a.attemptNo,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=series-${seriesId}-attempts.csv`);
    res.status(200).send(csv);
  } catch (err) {
    console.error('CSV export failed:', err);
    res.status(500).json({ message: 'CSV export failed', error: err.message });
  }
};