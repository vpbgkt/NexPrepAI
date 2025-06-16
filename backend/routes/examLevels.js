const express = require('express');
const router = express.Router();
const { verifyToken, requireRoles } = require('../middleware/verifyToken');
const {
  getLevels,
  getLevelsByFamily,
  createLevel
} = require('../controllers/examLevelController');

// Modified GET route to handle both all levels and levels filtered by family
router.get('/', verifyToken, (req, res, next) => {
  if (req.query.family) {
    // If 'family' query parameter exists, delegate to getLevelsByFamily controller
    getLevelsByFamily(req, res, next);
  } else {
    // Otherwise, delegate to getLevels controller
    getLevels(req, res, next);
  }
});

// Alternative route for family filtering (explicit)
router.get('/by-family', verifyToken, getLevelsByFamily);

// POST new level (Admin and Super Admin allowed)
router.post('/', verifyToken, requireRoles(['admin', 'super admin', 'superadmin']), createLevel);

module.exports = router;
