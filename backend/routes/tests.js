/**
 * Route: /api/tests
 * -------------------------------------
 * Contains routes for students to interact with tests.
 *
 * Routes:
 * - POST   /start               → Start a new test attempt
 * - POST   /:attemptId/submit  → Submit answers and calculate score
 * - GET    /my-attempts        → List all attempts by the logged-in student
 * - GET    /review/:id         → Review a specific attempt (answers + scores)
 * - GET    /stats/me           → View average and best performance
 * - GET    /leaderboard/:id    → Get leaderboard for a test series
 *
 * Uses:
 * - testAttemptController.js
 * - verifyToken middleware
 */

/**
 * @swagger
 * tags:
 *   name: Tests
 *   description: Test-related routes for students
 */

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

const {
  startTest,
  submitAttempt,
  getMyTestAttempts,
  reviewAttempt,
  getStudentStats,
  getLeaderboardForSeries,
  saveProgress,
  getProgress,
  // Enhanced Review Page endpoints
  getEnhancedReview,
  getPerformanceAnalytics,
  getStudyRecommendations
} = require('../controllers/testAttemptController');



/**
 * @swagger
 * /tests/start:
 *   post:
 *     summary: Start a new test attempt
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test started successfully
 */

// ✅ START TEST
router.post('/start', verifyToken, requireRole('student'), startTest);

// ✅ SUBMIT TEST
router.post('/:attemptId/submit', verifyToken, requireRole('student'), submitAttempt);

// ✅ SAVE PROGRESS
router.post('/:attemptId/save', verifyToken, requireRole('student'), saveProgress);

// ✅ GET PROGRESS
router.get('/:seriesId/progress', verifyToken, requireRole('student'), getProgress);

// ✅ USER ATTEMPT ROUTES
router.get('/my-attempts', verifyToken, getMyTestAttempts);
// REVIEW (fixed to use the same param name the controller expects)
router.get('/:attemptId/review', verifyToken, requireRole('student'), reviewAttempt);

// ✅ ENHANCED REVIEW PAGE ROUTES - Phase 1.2
router.get('/:attemptId/enhanced-review', verifyToken, requireRole('student'), getEnhancedReview);
router.get('/:attemptId/analytics', verifyToken, requireRole('student'), getPerformanceAnalytics);
router.get('/:attemptId/recommendations', verifyToken, requireRole('student'), getStudyRecommendations);

router.get('/stats/me', verifyToken, getStudentStats);
// Public leaderboard endpoint (removed verifyToken to make it public)
router.get('/leaderboard/:seriesId', getLeaderboardForSeries);

module.exports = router;
