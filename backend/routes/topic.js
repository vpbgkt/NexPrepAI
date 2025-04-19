/**
 * Route: /api/[subject|topic|subtopic]
 * -------------------------------------
 * Admin-side routes for managing hierarchical classification of questions.
 *
 * Routes:
 * - POST /     → Add a new [Subject | Topic | Subtopic]
 * - GET  /     → Get list of all [Subjects | Topics | Subtopics]
 *
 * Notes:
 * - Each entity links to its parent (e.g., Topic belongs to Subject)
 * - Used in both question creation and CSV import
 *
 * Uses:
 * - controllers for [subject|topic|subtopic] (optional)
 * - respective Mongoose model
 */

const express = require('express');
const router = express.Router();

const { addTopic, getAllTopics } = require('../controllers/topicController');

// Add a new topic
router.post('/add', addTopic);

// Get all topics
router.get('/all', getAllTopics);

module.exports = router;
