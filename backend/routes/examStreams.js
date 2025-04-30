const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const { getByFamily } = require('../controllers/examStreamController');

// GET /api/examStreams?family=<familyId>
router.get('/', verifyToken, getByFamily);

module.exports = router;