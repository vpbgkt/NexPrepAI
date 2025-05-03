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

// GET all streams
// e.g. GET /api/examStreams
router.get('/', verifyToken, getStreams);

// GET by family
// e.g. GET /api/examStreams?family=1234abcd
router.get('/', verifyToken, getByFamily);

// POST new stream
// e.g. POST /api/examStreams
router.post('/', verifyToken, createStream);

module.exports = router;
