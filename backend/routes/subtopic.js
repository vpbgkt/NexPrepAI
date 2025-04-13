const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { addSubTopic, getAllSubTopics } = require('../controllers/subtopicController');

// Add a new subtopic
router.post('/add', verifyToken, addSubTopic);

// Get all subtopics
router.get('/all', verifyToken, getAllSubTopics);

module.exports = router;
