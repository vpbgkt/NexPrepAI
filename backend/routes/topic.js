const express = require('express');
const router = express.Router();

const { addTopic, getAllTopics } = require('../controllers/topicController');

// Add a new topic
router.post('/add', addTopic);

// Get all topics
router.get('/all', getAllTopics);

module.exports = router;
