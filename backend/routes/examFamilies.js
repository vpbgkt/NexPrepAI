const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const { getAllFamilies, createFamily } = require('../controllers/examFamilyController');

// Public (any logged-in user) can list families
router.get('/', verifyToken, getAllFamilies);

// Only admins can add new families
router.post('/', verifyToken, requireRole('admin'), createFamily);

module.exports = router;