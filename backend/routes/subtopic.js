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
const { verifyToken } = require('../middleware/verifyToken');
const { addSubTopic, getAllSubTopics } = require('../controllers/subtopicController');

// Add a new subtopic
router.post('/add', verifyToken, addSubTopic);

// Get all subtopics
router.get('/all', verifyToken, getAllSubTopics);

module.exports = router;
