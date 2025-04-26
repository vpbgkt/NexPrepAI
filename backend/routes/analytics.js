const express = require('express');
const router = express.Router();
const { getQuestionAnalytics, getSeriesAnalytics, getQuestionStats, exportAttemptsCsv } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');
const { verifyToken, requireRole } = require('../middleware/verifyToken');

// Admin-only analytics route
router.get('/questions', authenticate, getQuestionAnalytics);

// Series analytics
router.get('/series/:seriesId', verifyToken, getSeriesAnalytics);

// Question stats
router.get('/question/:questionId', verifyToken, getQuestionStats);

// NEW: stream CSV of all submitted attempts for one series
router.get('/series/:id/attempts.csv', verifyToken, requireRole('admin'), exportAttemptsCsv);

module.exports = router;