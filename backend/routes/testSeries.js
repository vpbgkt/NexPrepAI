const express = require('express');
const router  = express.Router();
const { createTestSeries, cloneTestSeries, getAllTestSeries, createRandomTestSeries } = require('../controllers/testSeriesController');
const verifyToken = require('../middleware/verifyToken');

// Create a new TestSeries
router.post('/create', verifyToken, createTestSeries);

// Clone an existing TestSeries
router.post('/clone/:id', verifyToken, cloneTestSeries);

// NEW: list everything
router.get('/', verifyToken, getAllTestSeries);

// Create a random TestSeries
router.post('/random', verifyToken, createRandomTestSeries);

module.exports = router;
