const express = require('express');
const router = express.Router();
const {
  createTest,
  getTestById,
  submitTest,
  getAllSubmissions
} = require('../controllers/testController');

// ✅ CREATE TEST
router.post('/create', createTest);

// ✅ GET TEST
router.get('/:id', getTestById);

// ✅ SUBMIT TEST
router.post('/submit', submitTest);

// ✅ GET ALL SUBMISSIONS
router.get('/submissions', getAllSubmissions);

module.exports = router;
