const express = require('express');
const router = express.Router();
const {
  createTest,
  getTestById,
  submitTest,
  getAllSubmissions,
  getSubmissionsByUser,
  getLeaderboardForTest
} = require('../controllers/testController');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

// ✅ GET ALL SUBMISSIONS
router.get('/submissions', getAllSubmissions);

// ✅ CREATE TEST
router.post('/create', authenticate, authorizeRole('admin'), createTest);

// ✅ SUBMIT TEST
router.post('/submit', submitTest);

// ✅ GET USER'S SUBMISSIONS
router.get('/my-submissions', authenticate, getSubmissionsByUser);

// ✅ GET TEST
router.get('/:id', getTestById);

// ✅ GET LEADERBOARD FOR TEST
router.get('/leaderboard/:testId', authenticate, getLeaderboardForTest);

module.exports = router;
