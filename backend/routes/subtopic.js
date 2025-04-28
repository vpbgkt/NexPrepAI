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

const express = require('express');                // ✅ use Express
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken'); // ✔︎ add requireRole
const { addSubTopic, getAllSubTopics } = require('../controllers/subtopicController');
const auditFields = require('../middleware/auditFields'); // NEW
const subtopicController = require('../controllers/subtopicController');   // ✔︎ add this line

// Add a new subtopic
router.post('/add',
  verifyToken,
  requireRole('admin'),
  auditFields, // NEW
  addSubTopic
);

// Get all subtopics
router.get('/all', verifyToken, getAllSubTopics);

router.put('/:id',
  verifyToken,
  requireRole('admin'),
  auditFields, // NEW
  subtopicController.updateSubTopic
);

module.exports = router;
