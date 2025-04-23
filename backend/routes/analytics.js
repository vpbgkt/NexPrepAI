const express = require('express');
const router = express.Router();
const { getQuestionAnalytics, getSeriesAnalytics, getQuestionStats } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');
const verify = require('../middleware/verifyToken');

// Admin-only analytics route
router.get('/questions', authenticate, getQuestionAnalytics);

// Series analytics
router.get('/series/:seriesId', verify, getSeriesAnalytics);

// Question stats
router.get('/question/:questionId', verify, getQuestionStats);

module.exports = router;