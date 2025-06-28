/**
 * Admin routes for managing test attempts and counters
 * 
 * These routes are for administrative purposes only and require admin privileges.
 * They help manage the new attempt system and provide utilities for maintenance.
 */

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const attemptUtils = require('../utils/attemptUtils');

/**
 * Reset attempt count for a specific student and test series
 * POST /admin/attempts/reset
 */
router.post('/reset', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { studentId, seriesId } = req.body;
    
    if (!studentId || !seriesId) {
      return res.status(400).json({ 
        message: 'Both studentId and seriesId are required' 
      });
    }

    const result = await attemptUtils.resetStudentAttemptCount(studentId, seriesId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in reset attempt count route:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Get attempt information for a specific student and test series
 * GET /admin/attempts/info/:studentId/:seriesId
 */
router.get('/info/:studentId/:seriesId', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { studentId, seriesId } = req.params;
    const result = await attemptUtils.getStudentAttemptInfo(studentId, seriesId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in get attempt info route:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Get all attempt counts for a specific test series
 * GET /admin/attempts/series/:seriesId
 */
router.get('/series/:seriesId', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { seriesId } = req.params;
    const result = await attemptUtils.getSeriesAttemptCounts(seriesId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in get series attempt counts route:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Clean up orphaned attempt counters
 * POST /admin/attempts/cleanup
 */
router.post('/cleanup', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await attemptUtils.cleanupOrphanedCounters();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in cleanup route:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
