/**
 * @fileoverview Public User Profile Controller
 * 
 * This module handles public user profile operations for the NexPrep platform,
 * providing endpoints for viewing public user profiles by username. This creates
 * a social aspect to the platform while maintaining privacy controls.
 * 
 * @module controllers/publicProfileController
 * 
 * @requires ../models/User - User data model
 * @requires ../models/TestAttempt - Test attempt data for statistics
 * 
 * @description Features include:
 * - Public profile retrieval by username
 * - Basic performance statistics (if user opts to show)
 * - Streak information display
 * - SEO-friendly profile pages
 * - Privacy-focused data exposure
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');

/**
 * Get public user profile by username
 * 
 * @route GET /api/public/profile/:username
 * @access Public
 * 
 * @description Retrieves the public profile information for a user by their username.
 * Only shows non-sensitive information that's appropriate for public viewing.
 * Used for SEO-friendly profile pages accessible via /user/:username URLs.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.username - Username of the profile to retrieve
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with public profile data
 * @returns {string} returns.username - User's username
 * @returns {string} returns.name - User's display name
 * @returns {string} returns.displayName - User's chosen display name
 * @returns {string} returns.photoURL - User's profile photo URL
 * @returns {Date} returns.joinedAt - When the user joined
 * @returns {Object} returns.stats - Basic statistics
 * @returns {Object} returns.streaks - Current streak information
 * 
 * @throws {404} User not found
 * @throws {500} Server error during profile retrieval
 * 
 * @example
 * // GET /api/public/profile/john_doe
 * // Response
 * {
 *   "username": "john_doe",
 *   "name": "John Doe",
 *   "displayName": "Johnny",
 *   "photoURL": "https://example.com/photo.jpg",
 *   "joinedAt": "2024-01-01T00:00:00.000Z",
 *   "stats": {
 *     "testsCompleted": 25,
 *     "averageScore": 78.5
 *   },
 *   "streaks": {
 *     "currentStreak": 5,
 *     "longestStreak": 12,
 *     "studyStreak": 3,
 *     "longestStudyStreak": 8
 *   }
 * }
 */
exports.getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;

    // Find user by username, excluding sensitive information
    const user = await User.findOne({ username: username })
      .select('username name displayName photoURL createdAt currentStreak longestStreak studyStreak longestStudyStreak')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Get basic test statistics
    const testStats = await TestAttempt.aggregate([
      {
        $match: {
          student: user._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          testsCompleted: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          totalScore: { $sum: '$score' },
          maxScore: { $max: '$percentage' }
        }
      }
    ]);

    const stats = testStats.length > 0 ? {
      testsCompleted: testStats[0].testsCompleted || 0,
      averageScore: Math.round((testStats[0].averageScore || 0) * 100) / 100,
      maxScore: Math.round((testStats[0].maxScore || 0) * 100) / 100
    } : {
      testsCompleted: 0,
      averageScore: 0,
      maxScore: 0
    };

    // Prepare public profile response
    const publicProfile = {
      username: user.username,
      name: user.name,
      displayName: user.displayName || user.name,
      photoURL: user.photoURL || null,
      joinedAt: user.createdAt,
      stats: stats,
      streaks: {
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        studyStreak: user.studyStreak || 0,
        longestStudyStreak: user.longestStudyStreak || 0
      }
    };

    res.json({
      success: true,
      data: publicProfile
    });

  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching profile' 
    });
  }
};

/**
 * Check if username exists (for SEO and validation)
 * 
 * @route GET /api/public/check-username/:username
 * @access Public
 * 
 * @description Checks if a username exists in the system.
 * Useful for SEO purposes and frontend validation.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.username - Username to check
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with availability status
 * @returns {boolean} returns.exists - Whether username exists
 * @returns {string} returns.username - The checked username
 */
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username }).select('username').lean();

    res.json({
      success: true,
      exists: !!user,
      username: username
    });

  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while checking username' 
    });
  }
};
