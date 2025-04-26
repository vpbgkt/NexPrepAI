const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');

const {
  createBranch,
  getBranches,
  createSubject,
  getSubjects,
  createTopic,
  getTopics,
  createSubTopic,
  getSubTopics
} = require('../controllers/hierarchyController');

// BRANCH ROUTES
router.post('/branch', verifyToken, createBranch);        // Add a branch
router.get('/branch', verifyToken, getBranches);          // Get all branches

// SUBJECT ROUTES
router.post('/subject', verifyToken, createSubject);      // Add a subject to a branch
router.get('/subject', verifyToken, getSubjects);         // Get subjects of a branch by query param: branchId

// TOPIC ROUTES
router.post('/topic', verifyToken, createTopic);          // Add a topic to a subject
router.get('/topic', verifyToken, getTopics);             // Get topics of a subject by query param: subjectId

// SUBTOPIC ROUTES
router.post('/subtopic', verifyToken, createSubTopic);    // Add a subtopic to a topic
router.get('/subtopic', verifyToken, getSubTopics);       // Get subtopics of a topic by query param: topicId

module.exports = router;
