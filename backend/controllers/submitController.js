const Question = require('../models/Question');
const Submission = require('../models/Submission'); // Import Submission model

const submitTest = async (req, res) => {
  try {
    const { answers } = req.body; // Array of { questionId, selectedOption }

    let score = 0;
    let results = [];

    for (let answer of answers) {
      const question = await Question.findById(answer.questionId);
      if (!question) continue;

      const isCorrect = question.correctAnswer === answer.selectedOption;
      if (isCorrect) score++;

      results.push({
        questionId: question._id,
        selectedOption: answer.selectedOption,
        correctAnswer: question.correctAnswer,
        isCorrect,
      });
    }

    // Save the submission
    await Submission.create({
      userId: req.user.id,
      answers: results,
      score,
      totalQuestions: answers.length
    });

    res.status(200).json({
      message: 'Test submitted successfully',
      totalQuestions: answers.length,
      correctAnswers: score,
      results,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting test', error: err.message });
  }
};

module.exports = { submitTest };
