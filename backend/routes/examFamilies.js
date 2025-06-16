const express = require('express');
const router  = express.Router();
const { verifyToken, requireRoles } = require('../middleware/verifyToken');
const { getAllFamilies, createFamily } = require('../controllers/examFamilyController');

// Public (any logged-in user) can list families
router.get('/', verifyToken, getAllFamilies);

// Only admins and super admins can add new families
router.post('/', verifyToken, requireRoles(['admin', 'super admin', 'superadmin']), createFamily);

module.exports = router;