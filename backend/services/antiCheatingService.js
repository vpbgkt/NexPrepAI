/**
 * Anti-Cheating Service
 * Handles cheating detection, scoring, and event logging for strict mode exams
 */

const TestAttempt = require('../models/TestAttempt');

class AntiCheatingService {
  
  /**
   * Calculate severity score for a cheating event
   */
  static getSeverityScore(severity) {
    const scoreMap = {
      'low': 1,
      'medium': 3,
      'high': 5
    };
    return scoreMap[severity] || 3;
  }

  /**
   * Classify violation severity based on type
   */
  static classifyViolation(type) {
    const severityMap = {
      // Low severity (1 point each)
      'mouse_leave': 'low',
      'right_click': 'low',
      'tab_switch': 'low',
      
      // Medium severity (3 points each)
      'fullscreen_exit': 'medium',
      'copy_attempt': 'medium',
      'paste_attempt': 'medium',
      'keyboard_shortcut': 'medium',
      'window_blur': 'medium',
      
      // High severity (5 points each)
      'developer_tools': 'high',
      'screen_sharing': 'high',
      'suspicious_activity': 'high',
      'multiple_violations': 'high'
    };
    
    return severityMap[type] || 'medium';
  }

  /**
   * Log a cheating event for a test attempt
   */
  static async logCheatingEvent(attemptId, eventData) {
    try {
      const attempt = await TestAttempt.findById(attemptId);
      
      if (!attempt) {
        throw new Error('Test attempt not found');
      }

      // Only log if strict mode is enabled
      if (!attempt.strictModeEnabled) {
        return { success: false, message: 'Anti-cheating not enabled for this attempt' };
      }

      const severity = eventData.severity || this.classifyViolation(eventData.type);
      const severityScore = this.getSeverityScore(severity);

      // Create cheating event
      const cheatingEvent = {
        type: eventData.type,
        severity: severity,
        timestamp: new Date(),
        questionIndex: eventData.questionIndex || 0,
        description: eventData.description || `${eventData.type} detected`,
        metadata: {
          timeRemaining: eventData.timeRemaining || 0,
          currentSection: eventData.currentSection || '',
          userAgent: eventData.userAgent || '',
          screenResolution: eventData.screenResolution || ''
        }
      };

      // Add event to attempt
      attempt.cheatingEvents.push(cheatingEvent);
      attempt.totalCheatingAttempts++;
      attempt.cheatingScore += severityScore;

      // Update integrity status
      if (attempt.cheatingScore >= 10) {
        attempt.integrityStatus = 'terminated';
        attempt.examTerminatedForCheating = true;
        attempt.status = 'aborted';
      } else if (attempt.cheatingScore >= 5) {
        attempt.integrityStatus = 'flagged';
      }

      await attempt.save();

      return {
        success: true,
        cheatingScore: attempt.cheatingScore,
        totalAttempts: attempt.totalCheatingAttempts,
        integrityStatus: attempt.integrityStatus,
        shouldTerminate: attempt.examTerminatedForCheating
      };

    } catch (error) {
      console.error('Error logging cheating event:', error);
      throw error;
    }
  }

  /**
   * Get cheating statistics for an attempt
   */
  static async getCheatingStats(attemptId) {
    try {
      const attempt = await TestAttempt.findById(attemptId).select(
        'cheatingEvents cheatingScore totalCheatingAttempts integrityStatus examTerminatedForCheating'
      );

      if (!attempt) {
        throw new Error('Test attempt not found');
      }

      return {
        cheatingScore: attempt.cheatingScore || 0,
        totalAttempts: attempt.totalCheatingAttempts || 0,
        integrityStatus: attempt.integrityStatus || 'clean',
        events: attempt.cheatingEvents || [],
        isTerminated: attempt.examTerminatedForCheating || false
      };

    } catch (error) {
      console.error('Error getting cheating stats:', error);
      throw error;
    }
  }

  /**
   * Get overall cheating analytics for admin dashboard
   */
  static async getOverallStats() {
    try {
      const pipeline = [
        {
          $match: {
            strictModeEnabled: true
          }
        },
        {
          $group: {
            _id: '$integrityStatus',
            count: { $sum: 1 },
            avgCheatingScore: { $avg: '$cheatingScore' },
            totalAttempts: { $sum: '$totalCheatingAttempts' }
          }
        }
      ];

      const stats = await TestAttempt.aggregate(pipeline);

      // Get violation type breakdown
      const violationPipeline = [
        {
          $match: {
            strictModeEnabled: true,
            'cheatingEvents.0': { $exists: true }
          }
        },
        {
          $unwind: '$cheatingEvents'
        },
        {
          $group: {
            _id: '$cheatingEvents.type',
            count: { $sum: 1 },
            avgSeverity: { $avg: { $cond: [
              { $eq: ['$cheatingEvents.severity', 'low'] }, 1,
              { $cond: [
                { $eq: ['$cheatingEvents.severity', 'medium'] }, 2, 3
              ]}
            ]}}
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const violationStats = await TestAttempt.aggregate(violationPipeline);

      return {
        integrityStats: stats,
        violationBreakdown: violationStats
      };

    } catch (error) {
      console.error('Error getting overall cheating stats:', error);
      throw error;
    }
  }

  /**
   * Check if exam should be in strict mode
   */
  static isStrictModeExam(testSeries) {
    return testSeries && testSeries.mode === 'strict';
  }

  /**
   * Initialize strict mode for a test attempt
   */
  static async initializeStrictMode(attemptId) {
    try {
      const attempt = await TestAttempt.findById(attemptId);
      
      if (!attempt) {
        throw new Error('Test attempt not found');
      }

      attempt.strictModeEnabled = true;
      await attempt.save();

      return { success: true, message: 'Strict mode initialized' };

    } catch (error) {
      console.error('Error initializing strict mode:', error);
      throw error;
    }
  }
}

module.exports = AntiCheatingService;
