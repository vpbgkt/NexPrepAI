const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const Test = require('../models/Test');
const verifyToken = require('../middleware/verifyToken');

router.post('/submit', verifyToken, async (req, res) => {
  try {
    const { testId, answers } = req.body;
    const test = await Test.findById(testId).populate('questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    let score = 0;
    const results = [];

    test.questions.forEach((question) => {
      const userAnswer = answers[question._id];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) score++;

      results.push({
        questionId: question._id,
        correctAnswer: question.correctAnswer,
        userAnswer,
        isCorrect
      });
    });

    const resultDoc = new Result({
      user: req.user.id,
      test: testId,
      score,
      totalQuestions: test.questions.length,
      answers: results
    });

    await resultDoc.save();

    res.status(200).json({
      message: 'Test submitted and result saved',
      score,
      totalQuestions: test.questions.length,
      results
    });
  } catch (err) {
    console.error('❌ Error submitting test:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
