const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const {
  getShiftsByPaper,
  createShift
} = require('../controllers/examShiftController');

// List shifts for a paper (any logged-in user)
router.get('/', verifyToken, getShiftsByPaper);

// Create a new shift (admin only)
router.post('/', verifyToken, requireRole('admin'), createShift);

module.exports = router;