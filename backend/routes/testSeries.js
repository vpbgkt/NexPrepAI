/**
 * Route: /api/testSeries
 * -------------------------------------
 * Admin-facing routes for managing mock tests (TestSeries).
 *
 * Routes:
 * - POST   /create             → Create a test series with questions or sections
 * - POST   /clone/:id          → Clone an existing test series
 * - POST   /random             → Generate a test series from random questions
 * - GET    /                   → Fetch all test series with optional filters
 *
 * Uses:
 * - testSeriesController.js
 * - verifyToken middleware
 */

const express = require('express');
const router  = express.Router();
const { createTestSeries, cloneTestSeries, getAllTestSeries, createRandomTestSeries } = require('../controllers/testSeriesController');
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const TestAttempt = require('../models/TestAttempt');
const TestSeries = require('../models/TestSeries');

// Only admins & superadmins can create/update/delete series
router.post(
  '/create',
  verifyToken,
  requireRole('admin'),
  createTestSeries
);

router.post(
  '/clone/:id',
  verifyToken,
  requireRole('admin'),
  cloneTestSeries
);

// NEW: list everything
router.get('/', verifyToken, getAllTestSeries);

router.post(
  '/random',
  verifyToken,
  requireRole('admin'),
  createRandomTestSeries
);

// Check the status of a TestSeries for a student
router.get('/:id/status', verifyToken, async (req, res) => {
  try {
    const seriesId = req.params.id;
    const studentId = req.user._id;

    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ message: 'Test not found' });

    const count = await TestAttempt.countDocuments({
      series: seriesId,
      student: studentId,
    });

    const attemptsLeft = Math.max(series.maxAttempts - count, 0);
    const canAttempt = attemptsLeft > 0;

    res.json({
      canAttempt,
      attemptsLeft,
      maxAttempts: series.maxAttempts
    });
  } catch (err) {
    console.error('❌ status check error:', err);
    res.status(500).json({ message: 'Error checking status' });
  }
});

module.exports = router;
