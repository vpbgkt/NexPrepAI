// backend/routes/examStreams.js
const express     = require('express');
const router      = express.Router();
// Destructure verifyToken from the middleware export
const { verifyToken } = require('../middleware/verifyToken');
const {
  getStreams,
  getByFamily,
  createStream
} = require('../controllers/examStreamController');

// Modified GET route to handle both all streams and streams filtered by family
router.get('/', verifyToken, (req, res, next) => {
  if (req.query.family) {
    // If 'family' query parameter exists, delegate to getByFamily controller
    getByFamily(req, res, next);
  } else {
    // Otherwise, delegate to getStreams controller
    getStreams(req, res, next);
  }
});

// POST new stream
// e.g. POST /api/examStreams
router.post('/', verifyToken, createStream);

module.exports = router;
