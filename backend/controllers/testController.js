const mongoose = require('mongoose');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Submission = require("../models/Submission");
const User = require('../models/User');

// Create a new test
const createTest = async (req, res) => {
  try {
    const { title, questionIds, startTime, endTime } = req.body;

    const test = new Test({
      title,
      questionIds,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
    });

    await test.save();
    res.status(201).json({ message: "Test created successfully", test });
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get a test by ID with questions populated
const getTestById = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Restrict access based on test time
    if (test.startTime && new Date() < test.startTime) {
      return res.status(403).json({ message: "Test not started yet" });
    }
    if (test.endTime && new Date() > test.endTime) {
      return res.status(403).json({ message: "Test has ended" });
    }

    res.json(test);
  } catch (error) {
    console.error('❌ Error fetching test:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit test answers and calculate score
const submitTest = async (req, res) => {
  try {
    const { testId, answers } = req.body;

    const test = await Test.findById(testId).populate('questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // Restrict access based on test time
    if (test.startTime && new Date() < test.startTime) {
      return res.status(403).json({ message: "Test not started yet" });
    }
    if (test.endTime && new Date() > test.endTime) {
      return res.status(403).json({ message: "Test has ended" });
    }

    let score = 0;
    let correctAnswers = [];
    let wrongAnswers = [];

    for (const answer of answers) {
      const question = await Question.findById(answer.questionId);
      if (!question) continue;

      if (answer.selectedOption === question.correctAnswer) {
        score++;
        correctAnswers.push({
          questionId: question._id,
          correctAnswer: question.correctAnswer
        });
      } else {
        wrongAnswers.push({
          questionId: question._id,
          correctAnswer: question.correctAnswer,
          yourAnswer: answer.selectedOption
        });
      }
    }

    const submission = new Submission({
      testId,
      userId: req.userId || 'anonymous', // or extract from token later
      answers,
      score
    });

    await submission.save();

    res.status(200).json({
      message: 'Test submitted successfully',
      score,
      totalQuestions: test.questions.length,
      correctAnswers,
      wrongAnswers
    });

  } catch (err) {
    console.error('❌ Error submitting test:', err);
    res.status(500).json({ message: 'Error submitting test', error: err.message });
  }
};

// Get all submissions
const getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate("testId", "title") // Optional: show test title
      .populate("answers.questionId", "question") // Optional: show question text
      .sort({ submittedAt: -1 }); // Most recent first

    res.json(submissions);
  } catch (error) {
    console.error("❌ Error fetching submissions:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all submissions by user
const getSubmissionsByUser = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT middleware

    const submissions = await Submission.find({ userId })
      .populate('testId', 'title')
      .populate('answers.questionId', 'question options correctAnswer');

    res.status(200).json(submissions);
  } catch (error) {
    console.error('❌ Error fetching submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get leaderboard for a test with pagination and filtering
const getLeaderboardForTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { page = 1, limit = 10, username, minScore, maxScore } = req.query;

    const query = { testId };

    if (minScore) query.score = { ...query.score, $gte: Number(minScore) };
    if (maxScore) query.score = { ...query.score, $lte: Number(maxScore) };

    // Populate user name for filtering
    let submissions = await Submission.find(query)
      .populate({ path: "userId", select: "name" })
      .sort({ score: -1, createdAt: 1 }) // sort by score descending
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Optional: filter by username (after population)
    if (username) {
      submissions = submissions.filter((sub) =>
        sub.userId.name.toLowerCase().includes(username.toLowerCase())
      );
    }

    const total = await Submission.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      leaderboard: submissions.map((s) => ({
        user: s.userId.name,
        score: s.score,
        submittedAt: s.createdAt,
      })),
      page: Number(page),
      totalPages,
      totalEntries: total,
    });
  } catch (error) {
    console.error("Error generating leaderboard:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createTest,
  getTestById,
  submitTest,
  getAllSubmissions,
  getSubmissionsByUser,
  getLeaderboardForTest,
};
