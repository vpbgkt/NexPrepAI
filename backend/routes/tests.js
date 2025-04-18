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

const verifyToken = require('../middleware/verifyToken');
const { startTest } = require('../controllers/testAttemptController');
const TestAttempt = require('../models/TestAttempt'); // ✅ Add this line
const Question = require('../models/Question'); // ✅ Add this

// ✅ GET ALL SUBMISSIONS
router.get('/submissions', getAllSubmissions);

// ✅ CREATE TEST
router.post('/create', authenticate, authorizeRole('admin'), createTest);

// ✅ SUBMIT TEST
router.post('/:attemptId/submit', verifyToken, async (req, res) => {
  try {
    console.log('🚨 Inline submit route executing');

    const attemptId = req.params.attemptId;
    const { responses } = req.body;

    const attempt = await TestAttempt.findById(attemptId).populate('series');
    if (!attempt) {
      console.log('❌ Attempt not found in DB');
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const { questions, sections, negativeMarking } = attempt.series;
    const marksMap = new Map();

    if (sections?.length) {
      for (const sec of sections) {
        for (const q of sec.questions) {
          marksMap.set(q.question.toString(), q.marks);
        }
      }
    } else {
      for (const q of questions) {
        marksMap.set(q.question.toString(), q.marks);
      }
    }

    let total = 0;
    let max = 0;
    const checked = [];

    for (const { question, selected } of responses) {
      const qDoc = await Question.findById(question);
      if (!qDoc) continue;

      const correct = qDoc.correctOptions?.sort().join(',') || '';
      const given = (selected || []).sort().join(',');

      const marks = marksMap.get(question) || 1;
      max += marks;

      const isCorrect = correct === given;
      const earned = isCorrect ? marks : negativeMarking ? -0.25 * marks : 0;

      total += earned;
      checked.push({ question, selected, correctOptions: qDoc.correctOptions, earned });
    }

    attempt.responses = checked;
    attempt.score = total;
    attempt.maxScore = max;
    attempt.percentage = Math.round((total / max) * 100);
    attempt.submittedAt = new Date();

    await attempt.save();

    return res.status(200).json({
      score: total,
      maxScore: max,
      percentage: attempt.percentage,
      breakdown: checked
    });

  } catch (err) {
    console.error('🔥 Inline submit failed:', err);
    res.status(500).json({ message: 'Submit failed', error: err.message });
  }
});

// ✅ GET USER'S SUBMISSIONS
router.get('/my-submissions', authenticate, getSubmissionsByUser);

// ✅ GET TEST
router.get('/:id', getTestById);

// ✅ GET LEADERBOARD FOR TEST
router.get('/leaderboard/:testId', authenticate, getLeaderboardForTest);

// ✅ START TEST
router.post('/start', verifyToken, startTest);

module.exports = router;
