// All import statements
const express = require('express');
const router = express.Router();
const {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  filterQuestions,
  addQuestion,
} = require('../controllers/questionController');
const verifyToken = require('../middleware/verifyToken');

// ✅ Route to filter questions by branch, subject, topic, subtopic
router.get('/filter', verifyToken, filterQuestions);

// ✅ Add a new question
router.post('/add', verifyToken, addQuestion);

// ✅ Get all questions
router.get('/all', verifyToken, getAllQuestions);

// ✅ Create question (used by admin maybe)
router.post('/create', verifyToken, createQuestion);

// ✅ Get a specific question by ID — THIS MUST BE AT BOTTOM!
router.get('/:id', verifyToken, getQuestionById);

// ✅ Update question
router.put('/:id', verifyToken, updateQuestion);

// ✅ Delete question
router.delete('/:id', verifyToken, deleteQuestion);

module.exports = router;
