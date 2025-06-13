/**
 * Analytics Controller
 * 
 * Provides comprehensive analytics and reporting functionality for the NexPrepAI platform.
 * Handles question performance analytics, test series statistics, and data export capabilities.
 * Generates insights for administrators to monitor question difficulty, time patterns, and user performance.
 * 
 * Features:
 * - Question difficulty and timing analytics
 * - Test series performance statistics (score distribution, average time)
 * - Individual question accuracy and performance metrics
 * - CSV export functionality for detailed attempt data
 * - Aggregated analytics for decision-making support
 * 
 * @requires ../models/Question
 * @requires ../models/TestAttempt
 * @requires mongoose
 * @requires json2csv - For CSV export functionality
 */

const Question = require('../models/Question');
const TestAttempt = require('../models/TestAttempt');
const mongoose = require('mongoose');
const { Parser } = require('json2csv'); // npm i json2csv

/**
 * Get Question Analytics Endpoint
 * 
 * Retrieves analytics for questions focusing on difficulty and timing patterns.
 * Identifies hardest questions (lowest accuracy) and slowest questions (highest average time).
 * Useful for content creators to identify problematic questions and optimize question bank.
 * 
 * @route GET /api/analytics/questions
 * @access Private (Admin/Analytics access)
 * @param {number} req.query.limit - Maximum number of questions to return per category (default: 10)
 * @returns {Object} Analytics object containing hardest and slowest questions
 * @returns {Array} returns.hardest - Questions with lowest accuracy rates
 * @returns {Array} returns.slowest - Questions with highest average completion times
 * @throws {500} Server error during analytics calculation
 */
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

/**
 * Get Series Analytics Endpoint
 * 
 * Provides comprehensive analytics for a specific test series including performance metrics.
 * Generates score distribution, timing analysis, and user engagement statistics.
 * Essential for administrators to evaluate test series effectiveness and user performance patterns.
 * 
 * @route GET /api/analytics/series/:seriesId
 * @access Private (Admin/Analytics access)
 * @param {string} req.params.seriesId - MongoDB ObjectId of the test series
 * @returns {Object} Comprehensive series analytics
 * @returns {Array} returns.scoreDistribution - Distribution of scores across all attempts
 * @returns {number} returns.totalAttempts - Total number of submitted attempts
 * @returns {number} returns.averageTime - Average completion time in minutes
 * @returns {number} returns.averageScore - Mean score across all attempts
 * @throws {500} Server error during analytics aggregation
 */
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

/**
 * Get Question Statistics Endpoint
 * 
 * Retrieves detailed performance statistics for a specific question.
 * Provides accuracy percentage and average completion time for individual question analysis.
 * Useful for question-level performance monitoring and content quality assessment.
 * 
 * @route GET /api/analytics/question/:questionId
 * @access Private (Admin/Analytics access)
 * @param {string} req.params.questionId - MongoDB ObjectId of the question
 * @returns {Object} Question performance statistics
 * @returns {string} returns.questionId - The question ID
 * @returns {number} returns.accuracy - Accuracy percentage (0-100)
 * @returns {number} returns.avgTime - Average completion time in seconds
 * @throws {404} Question not found
 * @throws {500} Server error during stats calculation
 */
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

/**
 * Export Attempts CSV Endpoint
 * 
 * Exports test attempt data for a specific series in CSV format.
 * Includes student information, scores, timing data, and other attempt metrics.
 * Enables detailed analysis and reporting for administrators and content creators.
 * 
 * @route GET /api/analytics/series/:id/export-csv
 * @access Private (Admin/Analytics access)  
 * @param {string} req.params.id - MongoDB ObjectId of the test series
 * @returns {File} CSV file download with attempt data
 * @returns {Object} CSV contains: student info, scores, timing, attempt details
 * @throws {500} Server error during CSV generation or database query
 */
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