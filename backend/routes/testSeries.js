const express = require('express');
const router = express.Router();
const { createTestSeries } = require('../controllers/testSeriesController');
const verifyToken = require('../middleware/verifyToken');

router.post('/create', verifyToken, createTestSeries);

module.exports = router;
