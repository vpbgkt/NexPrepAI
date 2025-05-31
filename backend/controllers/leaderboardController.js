/**
 * @fileoverview Admin Leaderboard Controller
 * 
 * This module handles leaderboard analytics for administrators, providing comprehensive
 * statistics on admin activity and contributions to the platform. It tracks question
 * additions and exam paper creations by administrators with detailed time-based analytics.
 * 
 * @module controllers/leaderboardController
 * 
 * @requires ../models/Question - Question model for tracking question contributions
 * @requires ../models/ExamPaper - ExamPaper model for tracking exam paper contributions
 * @requires ../models/User - User model for admin information
 * @requires mongoose - MongoDB object modeling
 * 
 * @description Features include:
 * - Question adding leaderboard analytics
 * - Exam paper creation leaderboard analytics
 * - Time-based filtering (today, 7 days, 30 days, all time)
 * - Admin performance tracking and ranking
 * - Comprehensive statistics for administrative insights
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const Question = require('../models/Question');
const ExamPaper = require('../models/ExamPaper');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Helper function to get date range based on period
 * 
 * @param {string} period - Time period ('today', '7days', '30days', 'all')
 * @returns {Date|null} Start date for filtering, null for all time
 */
const getDateRange = (period) => {
  const now = new Date();
  
  switch (period) {
    case 'today':
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return today;
    
    case '7days':
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return sevenDaysAgo;
    
    case '30days':
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return thirtyDaysAgo;
    
    case 'all':
    default:
      return null;
  }
};

/**
 * Get Question Adding Leaderboard Endpoint
 * 
 * Retrieves leaderboard data showing which administrators have added the most questions
 * within specified time periods. Provides ranking and detailed statistics for admin performance tracking.
 * 
 * @route GET /api/leaderboard/questions
 * @access Private (Admin/Superadmin only)
 * @param {string} req.query.period - Time period filter ('today', '7days', '30days', 'all')
 * @returns {Object} Leaderboard data with admin rankings and question counts
 * @returns {Array} returns.leaderboard - Array of admin stats with rankings
 * @returns {string} returns.period - Applied time period filter
 * @returns {number} returns.totalQuestions - Total questions in the period
 * @throws {500} Server error during leaderboard calculation
 */
exports.getQuestionLeaderboard = async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const startDate = getDateRange(period);
    
    // Build match criteria
    const matchCriteria = {
      createdBy: { $exists: true, $ne: null }
    };
    
    if (startDate) {
      matchCriteria.createdAt = { $gte: startDate };
    }
    
    // Aggregate questions by creator
    const leaderboardData = await Question.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$createdBy',
          questionCount: { $sum: 1 },
          latestQuestion: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'admin'
        }
      },
      { $unwind: '$admin' },
      {
        $match: {
          'admin.role': { $in: ['admin', 'superadmin'] }
        }
      },
      {
        $project: {
          adminId: '$_id',
          adminName: '$admin.name',
          adminUsername: '$admin.username',
          adminRole: '$admin.role',
          questionCount: 1,
          latestQuestion: 1
        }
      },
      { $sort: { questionCount: -1, latestQuestion: -1 } }
    ]);
    
    // Add ranking
    const leaderboard = leaderboardData.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));
    
    // Calculate total questions in period
    const totalQuestions = await Question.countDocuments(matchCriteria);
    
    res.json({
      success: true,
      data: {
        leaderboard,
        period,
        totalQuestions,
        dateRange: startDate ? {
          from: startDate,
          to: new Date()
        } : null
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting question leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching question leaderboard',
      error: error.message
    });
  }
};

/**
 * Get Exam Paper Creation Leaderboard Endpoint
 * 
 * Retrieves leaderboard data showing which administrators have created the most exam papers
 * within specified time periods. Provides ranking and detailed statistics for admin performance tracking.
 * 
 * @route GET /api/leaderboard/exam-papers
 * @access Private (Admin/Superadmin only)
 * @param {string} req.query.period - Time period filter ('today', '7days', '30days', 'all')
 * @returns {Object} Leaderboard data with admin rankings and exam paper counts
 * @returns {Array} returns.leaderboard - Array of admin stats with rankings
 * @returns {string} returns.period - Applied time period filter
 * @returns {number} returns.totalExamPapers - Total exam papers in the period
 * @throws {500} Server error during leaderboard calculation
 */
exports.getExamPaperLeaderboard = async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const startDate = getDateRange(period);
    
    // Build match criteria
    const matchCriteria = {
      createdBy: { $exists: true, $ne: null }
    };
    
    if (startDate) {
      matchCriteria.createdAt = { $gte: startDate };
    }
    
    // Aggregate exam papers by creator
    const leaderboardData = await ExamPaper.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$createdBy',
          examPaperCount: { $sum: 1 },
          latestExamPaper: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'admin'
        }
      },
      { $unwind: '$admin' },
      {
        $match: {
          'admin.role': { $in: ['admin', 'superadmin'] }
        }
      },
      {
        $project: {
          adminId: '$_id',
          adminName: '$admin.name',
          adminUsername: '$admin.username',
          adminRole: '$admin.role',
          examPaperCount: 1,
          latestExamPaper: 1
        }
      },
      { $sort: { examPaperCount: -1, latestExamPaper: -1 } }
    ]);
    
    // Add ranking
    const leaderboard = leaderboardData.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));
    
    // Calculate total exam papers in period
    const totalExamPapers = await ExamPaper.countDocuments(matchCriteria);
    
    res.json({
      success: true,
      data: {
        leaderboard,
        period,
        totalExamPapers,
        dateRange: startDate ? {
          from: startDate,
          to: new Date()
        } : null
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting exam paper leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exam paper leaderboard',
      error: error.message
    });
  }
};

/**
 * Get Combined Admin Leaderboard Endpoint
 * 
 * Retrieves comprehensive leaderboard data combining both question additions and exam paper
 * creations by administrators. Provides unified ranking based on total contributions.
 * 
 * @route GET /api/leaderboard/combined
 * @access Private (Admin/Superadmin only)
 * @param {string} req.query.period - Time period filter ('today', '7days', '30days', 'all')
 * @returns {Object} Combined leaderboard data with unified admin rankings
 * @returns {Array} returns.leaderboard - Array of admin stats with combined metrics
 * @returns {string} returns.period - Applied time period filter
 * @returns {Object} returns.totals - Combined totals for questions and exam papers
 * @throws {500} Server error during leaderboard calculation
 */
exports.getCombinedLeaderboard = async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const startDate = getDateRange(period);
    
    // Build match criteria
    const matchCriteria = {
      createdBy: { $exists: true, $ne: null }
    };
    
    if (startDate) {
      matchCriteria.createdAt = { $gte: startDate };
    }
    
    // Get question stats
    const questionStats = await Question.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$createdBy',
          questionCount: { $sum: 1 }
        }
      }
    ]);
    
    // Get exam paper stats
    const examPaperStats = await ExamPaper.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$createdBy',
          examPaperCount: { $sum: 1 }
        }
      }
    ]);
    
    // Combine stats and get admin info
    const adminStatsMap = new Map();
    
    // Process question stats
    questionStats.forEach(stat => {
      adminStatsMap.set(stat._id.toString(), {
        adminId: stat._id,
        questionCount: stat.questionCount,
        examPaperCount: 0
      });
    });
    
    // Process exam paper stats
    examPaperStats.forEach(stat => {
      const adminId = stat._id.toString();
      if (adminStatsMap.has(adminId)) {
        adminStatsMap.get(adminId).examPaperCount = stat.examPaperCount;
      } else {
        adminStatsMap.set(adminId, {
          adminId: stat._id,
          questionCount: 0,
          examPaperCount: stat.examPaperCount
        });
      }
    });
    
    // Get admin details for all admins in the stats
    const adminIds = Array.from(adminStatsMap.keys()).map(id => new mongoose.Types.ObjectId(id));
    const admins = await User.find({
      _id: { $in: adminIds },
      role: { $in: ['admin', 'superadmin'] }
    }).select('name username role');
    
    // Build final leaderboard
    const leaderboard = admins.map(admin => {
      const stats = adminStatsMap.get(admin._id.toString());
      const totalContributions = stats.questionCount + stats.examPaperCount;
      
      return {
        adminId: admin._id,
        adminName: admin.name,
        adminUsername: admin.username,
        adminRole: admin.role,
        questionCount: stats.questionCount,
        examPaperCount: stats.examPaperCount,
        totalContributions
      };
    }).sort((a, b) => b.totalContributions - a.totalContributions)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry
      }));
    
    // Calculate totals
    const totalQuestions = await Question.countDocuments(matchCriteria);
    const totalExamPapers = await ExamPaper.countDocuments(matchCriteria);
    
    res.json({
      success: true,
      data: {
        leaderboard,
        period,
        totals: {
          questions: totalQuestions,
          examPapers: totalExamPapers,
          combined: totalQuestions + totalExamPapers
        },
        dateRange: startDate ? {
          from: startDate,
          to: new Date()
        } : null
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting combined leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching combined leaderboard',
      error: error.message
    });
  }
};

/**
 * Get Admin Statistics Summary Endpoint
 * 
 * Retrieves summary statistics for admin leaderboard overview including total contributions,
 * active admins, and growth metrics across different time periods.
 * 
 * @route GET /api/leaderboard/summary
 * @access Private (Admin/Superadmin only)
 * @returns {Object} Summary statistics for admin contributions
 * @returns {Object} returns.totals - Total counts for questions and exam papers
 * @returns {Object} returns.periods - Counts broken down by time periods
 * @returns {Array} returns.topContributors - Top 5 contributors across all time
 * @throws {500} Server error during summary calculation
 */
exports.getAdminStatsSummary = async (req, res) => {
  try {
    const periods = ['today', '7days', '30days', 'all'];
    const summary = {
      totals: {},
      periods: {},
      topContributors: []
    };
    
    // Calculate stats for each period
    for (const period of periods) {
      const startDate = getDateRange(period);
      const matchCriteria = {
        createdBy: { $exists: true, $ne: null }
      };
      
      if (startDate) {
        matchCriteria.createdAt = { $gte: startDate };
      }
      
      const questionCount = await Question.countDocuments(matchCriteria);
      const examPaperCount = await ExamPaper.countDocuments(matchCriteria);
      
      summary.periods[period] = {
        questions: questionCount,
        examPapers: examPaperCount,
        total: questionCount + examPaperCount
      };
    }
    
    // Set overall totals
    summary.totals = summary.periods.all;
    
    // Get top 5 contributors (all time)
    const topContributors = await Question.aggregate([
      { $match: { createdBy: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$createdBy',
          questionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'exampapers',
          let: { adminId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$createdBy', '$$adminId'] } } },
            { $count: 'count' }
          ],
          as: 'examPaperStats'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'admin'
        }
      },
      { $unwind: '$admin' },
      {
        $match: {
          'admin.role': { $in: ['admin', 'superadmin'] }
        }
      },
      {
        $project: {
          adminName: '$admin.name',
          adminRole: '$admin.role',
          questionCount: 1,
          examPaperCount: { $ifNull: [{ $arrayElemAt: ['$examPaperStats.count', 0] }, 0] },
          totalContributions: { $add: ['$questionCount', { $ifNull: [{ $arrayElemAt: ['$examPaperStats.count', 0] }, 0] }] }
        }
      },
      { $sort: { totalContributions: -1 } },
      { $limit: 5 }
    ]);
    
    summary.topContributors = topContributors.map((contributor, index) => ({
      rank: index + 1,
      ...contributor
    }));
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error getting admin stats summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin statistics summary',
      error: error.message
    });
  }
};
