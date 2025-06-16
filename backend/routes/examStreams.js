// backend/routes/examStreams.js
const express     = require('express');
const router      = express.Router();
const { verifyToken, requireRoles } = require('../middleware/verifyToken');
const {
  getStreams,
  getByFamily,
  getByLevel,
  createStream
} = require('../controllers/examStreamController');

// Modified GET route to handle streams with different filters
router.get('/', verifyToken, (req, res, next) => {
  if (req.query.level) {
    // If 'level' query parameter exists, delegate to getByLevel controller
    getByLevel(req, res, next);
  } else if (req.query.family) {
    // If 'family' query parameter exists, delegate to getByFamily controller
    getByFamily(req, res, next);
  } else {
    // Otherwise, delegate to getStreams controller
    getStreams(req, res, next);
  }
});

// Alternative routes for explicit filtering
router.get('/by-level', verifyToken, getByLevel);
router.get('/by-family', verifyToken, getByFamily);

// POST new stream (Admin and Super Admin allowed)
router.post('/', verifyToken, requireRoles(['admin', 'super admin', 'superadmin']), createStream);

module.exports = router;
