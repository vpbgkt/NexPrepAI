/**
 * @fileoverview Leaderboard API Routes
 * @description Express routes for admin leaderboard functionality including
 * question addition tracking, exam paper creation tracking, and combined metrics
 * 
 * @routes
 * - GET /api/leaderboard/questions - Question addition leaderboard
 * - GET /api/leaderboard/exam-papers - Exam paper creation leaderboard  
 * - GET /api/leaderboard/combined - Combined leaderboard with both metrics
 * - GET /api/leaderboard/stats - Admin statistics summary
 * 
 * @author NexPrepAI Development Team
 * @since 1.0.0
 */

const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { verifyToken } = require('../middleware/verifyToken');

/**
 * @route GET /api/leaderboard/questions
 * @description Get question addition leaderboard with time-based filtering
 * @access Admin/SuperAdmin only
 * @param {string} [period] - Time period filter (today, 7days, 30days, alltime)
 * @returns {Object} Leaderboard data with admin rankings
 */
router.get('/questions', verifyToken, leaderboardController.getQuestionLeaderboard);

/**
 * @route GET /api/leaderboard/exam-papers
 * @description Get exam paper creation leaderboard with time-based filtering
 * @access Admin/SuperAdmin only
 * @param {string} [period] - Time period filter (today, 7days, 30days, alltime)
 * @returns {Object} Leaderboard data with admin rankings
 */
router.get('/exam-papers', verifyToken, leaderboardController.getExamPaperLeaderboard);

/**
 * @route GET /api/leaderboard/combined
 * @description Get combined leaderboard with both question and exam paper metrics
 * @access Admin/SuperAdmin only
 * @param {string} [period] - Time period filter (today, 7days, 30days, alltime)
 * @returns {Object} Combined leaderboard data with comprehensive rankings
 */
router.get('/combined', verifyToken, leaderboardController.getCombinedLeaderboard);

/**
 * @route GET /api/leaderboard/stats
 * @description Get admin statistics summary with all time periods
 * @access Admin/SuperAdmin only
 * @returns {Object} Comprehensive statistics for all admins across all periods
 */
router.get('/stats', verifyToken, leaderboardController.getAdminStatsSummary);

module.exports = router;
