const express           = require('express');
const router            = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const {
  getShifts,
  getShiftsByPaper,
  createShift
} = require('../controllers/examShiftController');

// List *all* shifts
router.get('/', verifyToken, getShifts);

// List shifts for a paper
router.get('/by-paper', verifyToken, getShiftsByPaper);

// Create (admin only)
router.post('/', verifyToken, requireRole('admin'), createShift);

module.exports = router;