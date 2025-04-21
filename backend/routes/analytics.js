const express = require('express');
const router = express.Router();
const { getQuestionAnalytics } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');

// Admin-only analytics route
router.get('/questions', authenticate, getQuestionAnalytics);

module.exports = router;