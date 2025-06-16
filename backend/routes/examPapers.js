const express = require('express');
const { verifyToken, requireRoles } = require('../middleware/verifyToken');
const {
  getPapers,
  getByStream,
  getByFamily,
  createPaper
} = require('../controllers/examPaperController');
const router = express.Router();

// Modified GET route to handle papers with different filters
router.get('/', verifyToken, (req, res, next) => {
  if (req.query.stream) {
    // If 'stream' query parameter exists, delegate to getByStream controller
    getByStream(req, res, next);
  } else if (req.query.family) {
    // If 'family' query parameter exists, delegate to getByFamily controller
    getByFamily(req, res, next);
  } else {
    // Otherwise, delegate to getPapers controller
    getPapers(req, res, next);
  }
});

router.post('/', verifyToken, requireRoles(['admin', 'super admin', 'superadmin']), createPaper);

module.exports = router;