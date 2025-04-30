const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const { getPapersByStream, createPaper } = require('../controllers/examPaperController');

// List papers for a stream (any logged-in user)
router.get('/', verifyToken, getPapersByStream);

// Create new paper (admin only)
router.post('/', verifyToken, requireRole('admin'), createPaper);

module.exports = router;