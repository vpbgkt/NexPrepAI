// All import statements
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const Question = require('../models/Question');
const Branch = require('../models/Branch');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const SubTopic = require('../models/SubTopic');

const {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  filterQuestions,
  addQuestion,
} = require('../controllers/questionController');

// ✅ Route to filter questions by branch, subject, topic, subtopic
router.get('/filter', verifyToken, filterQuestions);

// ✅ Add a new question
router.post('/add', verifyToken, addQuestion);

// ✅ Get all questions
router.get('/all', verifyToken, getAllQuestions);

// ✅ Create question (used by admin maybe)
router.post('/create', verifyToken, createQuestion);

// ✅ Import CSV questions by _id_
router.post('/import-csv', verifyToken, async (req, res) => {
  try {
    const questions = Array.isArray(req.body) ? req.body : [];
    if (!questions.length) {
      return res.status(400).json({ message: 'No questions found in request body.' });
    }

    const inserted = [];

    for (const q of questions) {
      const {
        questionText,
        options,
        explanation,
        difficulty,
        branch,   // here branch is expected to be the ID string
        subject,  // likewise subject ID
        topic,    // topic ID
        subtopic  // subtopic ID
      } = q;

      // look up by ID instead of name:
      const branchDoc   = await Branch.findById(branch);
      const subjectDoc  = subject  ? await Subject.findById(subject) : null;
      const topicDoc    = topic    ? await Topic.findById(topic) : null;
      const subtopicDoc = subtopic ? await SubTopic.findById(subtopic) : null;

      if (!branchDoc) {
        console.warn(`Branch ${branch} not found, skipping question.`);
        continue;
      }

      const newQ = new Question({
        questionText,
        options,
        explanation,
        difficulty,
        branch:   branchDoc._id,
        subject:  subjectDoc?._id,
        topic:    topicDoc?._id,
        subtopic: subtopicDoc?._id
      });

      await newQ.save();
      inserted.push(newQ);
    }

    res.status(200).json({ message: `Imported ${inserted.length} questions.` });
  } catch (err) {
    console.error('❌ CSV Import Error:', err);
    res.status(500).json({ message: 'Server error during CSV import' });
  }
});

// ✅ Get a specific question by ID — THIS MUST BE AT BOTTOM!
router.get('/:id', verifyToken, getQuestionById);

// ✅ Update question
router.put('/:id', verifyToken, updateQuestion);

// ✅ Delete question
router.delete('/:id', verifyToken, deleteQuestion);

module.exports = router;
