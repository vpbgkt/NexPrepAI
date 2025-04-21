const express = require('express');
const router = express.Router();
const { getStudentDashboard, getStudentTopicAnalytics } = require('../controllers/dashboardController');
const verifyToken = require('../middleware/verifyToken');

router.get('/me', verifyToken, getStudentDashboard);
router.get('/me/topics', verifyToken, getStudentTopicAnalytics);

module.exports = router;