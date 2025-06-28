/**
 * Utility functions for managing test attempts and counters
 * 
 * These utilities help with migration, admin tasks, and maintenance
 * of the new attempt system where only latest attempts are stored.
 */

const TestAttempt = require('../models/TestAttempt');
const TestAttemptCounter = require('../models/TestAttemptCounter');

/**
 * Reset attempt count for a specific student and test series
 * Useful for admin functions or special cases
 */
const resetStudentAttemptCount = async (studentId, seriesId) => {
  try {
    await TestAttemptCounter.resetAttemptCount(studentId, seriesId);
    return { success: true, message: 'Attempt count reset successfully' };
  } catch (error) {
    console.error('Error resetting attempt count:', error);
    return { success: false, message: 'Failed to reset attempt count', error };
  }
};

/**
 * Get comprehensive attempt information for a student and test series
 * Returns both the latest attempt and the total attempt count
 */
const getStudentAttemptInfo = async (studentId, seriesId) => {
  try {
    const [latestAttempt, attemptCount] = await Promise.all([
      TestAttempt.findOne({ student: studentId, series: seriesId }),
      TestAttemptCounter.getAttemptCount(studentId, seriesId)
    ]);

    return {
      success: true,
      data: {
        latestAttempt,
        totalAttempts: attemptCount,
        hasAttempted: attemptCount > 0
      }
    };
  } catch (error) {
    console.error('Error getting attempt info:', error);
    return { success: false, message: 'Failed to get attempt info', error };
  }
};

/**
 * Get all attempt counters for a specific test series
 * Useful for admin analytics and monitoring
 */
const getSeriesAttemptCounts = async (seriesId) => {
  try {
    const counters = await TestAttemptCounter.find({ series: seriesId })
      .populate('student', 'username email displayName')
      .lean();

    return {
      success: true,
      data: counters.map(counter => ({
        studentId: counter.student._id,
        studentName: counter.student.displayName || counter.student.username || counter.student.email,
        attemptCount: counter.attemptCount,
        lastAttemptAt: counter.lastAttemptAt
      }))
    };
  } catch (error) {
    console.error('Error getting series attempt counts:', error);
    return { success: false, message: 'Failed to get series attempt counts', error };
  }
};

/**
 * Clean up orphaned attempt counters (where no corresponding TestAttempt exists)
 * This is mainly for maintenance purposes
 */
const cleanupOrphanedCounters = async () => {
  try {
    const allCounters = await TestAttemptCounter.find().lean();
    let cleanedCount = 0;

    for (const counter of allCounters) {
      const attemptExists = await TestAttempt.findOne({
        student: counter.student,
        series: counter.series
      });

      if (!attemptExists) {
        await TestAttemptCounter.findByIdAndDelete(counter._id);
        cleanedCount++;
      }
    }

    return {
      success: true,
      message: `Cleaned up ${cleanedCount} orphaned attempt counters`
    };
  } catch (error) {
    console.error('Error cleaning up orphaned counters:', error);
    return { success: false, message: 'Failed to clean up orphaned counters', error };
  }
};

module.exports = {
  resetStudentAttemptCount,
  getStudentAttemptInfo,
  getSeriesAttemptCounts,
  cleanupOrphanedCounters
};
