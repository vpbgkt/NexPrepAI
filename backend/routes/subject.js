const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { addSubject, getAllSubjects } = require('../controllers/subjectController');

// Add a new subject
router.post('/add', verifyToken, addSubject);

// Get all subjects
router.get('/all', verifyToken, getAllSubjects);

module.exports = router;
