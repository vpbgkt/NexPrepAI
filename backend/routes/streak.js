const express = require('express');
const router = express.Router();
const streakController = require('../controllers/streakController');
const { verifyToken } = require('../middleware/verifyToken');

// All streak routes require authentication
router.use(verifyToken);

// Get user's streak statistics
router.get('/stats', streakController.getStreakStats);

// Manually trigger daily login reward (for testing)
router.post('/daily-login', streakController.triggerDailyLogin);

// Manually trigger study activity (for testing)
router.post('/study-activity', streakController.triggerStudyActivity);

// Get streak leaderboard
router.get('/leaderboard', streakController.getStreakLeaderboard);

// Get streak milestones
router.get('/milestones', streakController.getStreakMilestones);

// Admin routes
router.post('/reset/:userId', streakController.resetUserStreak);

module.exports = router;
