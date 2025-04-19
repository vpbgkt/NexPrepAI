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
const verifyToken = require('../middleware/verifyToken');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

const {
  startTest,
  submitAttempt,
  getMyTestAttempts,
  reviewAttempt,
  getStudentStats,
  getLeaderboardForSeries
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
router.post('/start', verifyToken, startTest);

// ✅ SUBMIT TEST
router.post('/:attemptId/submit', verifyToken, submitAttempt);

// ✅ USER ATTEMPT ROUTES
router.get('/my-attempts', verifyToken, getMyTestAttempts);
router.get('/review/:id', verifyToken, reviewAttempt);
router.get('/stats/me', verifyToken, getStudentStats);
router.get('/leaderboard/:seriesId', verifyToken, getLeaderboardForSeries);

module.exports = router;
