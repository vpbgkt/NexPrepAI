const express           = require('express');
const router            = express.Router();
const { verifyToken, requireRoles } = require('../middleware/verifyToken');
const {
  getShifts,
  getShiftsByPaper,
  createShift
} = require('../controllers/examShiftController');

// List *all* shifts
router.get('/', verifyToken, getShifts);

// List shifts for a paper
router.get('/by-paper', verifyToken, getShiftsByPaper);

// Create (admin and super admin allowed)
router.post('/', verifyToken, requireRoles(['admin', 'super admin', 'superadmin']), createShift);

module.exports = router;