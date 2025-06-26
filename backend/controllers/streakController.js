const StreakService = require('../services/streakService');
const User = require('../models/User');

/**
 * Get user's streak statistics
 * @route GET /api/streak/stats
 * @access Private
 */
exports.getStreakStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await StreakService.getStreakStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching streak stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch streak statistics',
      error: error.message
    });
  }
};

/**
 * Manually trigger daily login reward (for testing)
 * @route POST /api/streak/daily-login
 * @access Private
 */
exports.triggerDailyLogin = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await StreakService.handleDailyLogin(userId);
    
    res.json({
      success: true,
      data: {
        pointsEarned: result.pointsEarned,
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
        message: result.message,
        alreadyLoggedToday: result.alreadyLoggedToday
      }
    });
  } catch (error) {
    console.error('❌ Error triggering daily login:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process daily login',
      error: error.message
    });
  }
};

/**
 * Manually trigger study activity (for testing)
 * @route POST /api/streak/study-activity
 * @access Private
 */
exports.triggerStudyActivity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await StreakService.handleStudyActivity(userId);
    
    res.json({
      success: true,
      data: {
        activityRecorded: !result.alreadyStudiedToday,
        pointsEarned: result.pointsEarned,
        basePoints: result.basePoints,
        streakBonus: result.streakBonus,
        studyStreak: result.studyStreak,
        longestStudyStreak: result.longestStudyStreak,
        totalStudyDays: result.totalStudyDays,
        message: result.message,
        weeklyStreakUpdated: result.weeklyStreakUpdated
      }
    });
  } catch (error) {
    console.error('❌ Error triggering study activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process study activity',
      error: error.message
    });
  }
};

/**
 * Reset user's streak (admin only)
 * @route POST /api/streak/reset/:userId
 * @access Admin
 */
exports.resetUserStreak = async (req, res) => {
  try {
    const { userId } = req.params;
    const { streakType = 'all' } = req.body; // 'login', 'study', or 'all'
    const adminRole = req.user.role;
    
    // Check if user is admin or superadmin
    if (adminRole !== 'admin' && adminRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const user = await StreakService.resetStreak(userId, streakType);
    
    res.json({
      success: true,
      message: `${streakType} streak reset successfully`,
      data: {
        userId: user._id,
        currentLoginStreak: user.currentStreak,
        studyStreak: user.studyStreak,
        weeklyStreak: user.weeklyStreak,
        longestLoginStreak: user.longestStreak,
        longestStudyStreak: user.longestStudyStreak
      }
    });
  } catch (error) {
    console.error('❌ Error resetting streak:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset streak',
      error: error.message
    });
  }
};

/**
 * Get leaderboard based on streak statistics
 * @route GET /api/streak/leaderboard
 * @access Private
 */
exports.getStreakLeaderboard = async (req, res) => {
  try {
    const { type = 'study', limit = 10 } = req.query;
    
    let sortField, sortOrder;
    switch (type) {
      case 'login':
        sortField = 'currentStreak';
        sortOrder = -1;
        break;
      case 'study':
        sortField = 'studyStreak';
        sortOrder = -1;
        break;
      case 'longest-login':
        sortField = 'longestStreak';
        sortOrder = -1;
        break;
      case 'longest-study':
        sortField = 'longestStudyStreak';
        sortOrder = -1;
        break;
      case 'weekly':
        sortField = 'weeklyStreak';
        sortOrder = -1;
        break;
      case 'total-logins':
        sortField = 'totalLoginDays';
        sortOrder = -1;
        break;
      case 'total-study':
        sortField = 'totalStudyDays';
        sortOrder = -1;
        break;
      default:
        sortField = 'studyStreak';
        sortOrder = -1;
    }
    
    const leaderboard = await User.find(
      { role: 'student' },
      {
        name: 1,
        email: 1,
        currentStreak: 1,
        longestStreak: 1,
        studyStreak: 1,
        longestStudyStreak: 1,
        weeklyStreak: 1,
        totalLoginDays: 1,
        totalStudyDays: 1,
        lastLoginDate: 1,
        lastStudyDate: 1,
        lastActivityDate: 1
      }
    )
    .sort({ [sortField]: sortOrder })
    .limit(parseInt(limit));
    
    // Add rank to each entry
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      email: user.email.substring(0, 3) + '***',
      currentLoginStreak: user.currentStreak || 0,
      longestLoginStreak: user.longestStreak || 0,
      currentStudyStreak: user.studyStreak || 0,
      longestStudyStreak: user.longestStudyStreak || 0,
      weeklyStreak: user.weeklyStreak || 0,
      totalLoginDays: user.totalLoginDays || 0,
      totalStudyDays: user.totalStudyDays || 0,
      lastLoginDate: user.lastLoginDate,
      lastStudyDate: user.lastStudyDate,
      lastActivityDate: user.lastActivityDate,
      isLoginActive: user.lastLoginDate && 
        (new Date() - new Date(user.lastLoginDate)) < (2 * 24 * 60 * 60 * 1000), // Active within 2 days
      isStudyActive: user.lastStudyDate && 
        (new Date() - new Date(user.lastStudyDate)) < (2 * 24 * 60 * 60 * 1000) // Active within 2 days
    }));
    
    res.json({
      success: true,
      data: {
        type,
        leaderboard: rankedLeaderboard
      }
    });
  } catch (error) {
    console.error('❌ Error fetching streak leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch streak leaderboard',
      error: error.message
    });
  }
};

/**
 * Get streak achievement milestones
 * @route GET /api/streak/milestones
 * @access Private
 */
exports.getStreakMilestones = async (req, res) => {
  try {
    const loginMilestones = [
      { days: 1, title: 'First Login', reward: 5, description: 'Welcome to your journey!' },
      { days: 3, title: 'Consistent Visitor', reward: 15, description: '3 days of logging in!' },
      { days: 7, title: 'Weekly Regular', reward: 25, description: 'A week of daily logins!' },
      { days: 14, title: 'Dedicated User', reward: 40, description: 'Two weeks of consistency!' },
      { days: 30, title: 'Monthly Champion', reward: 75, description: 'A month of dedication!' },
      { days: 100, title: 'Login Legend', reward: 200, description: '100 days of commitment!' },
      { days: 365, title: 'Year Round User', reward: 500, description: 'A full year of engagement!' }
    ];

    const studyMilestones = [
      { days: 1, title: 'First Study', reward: 10, description: 'Started your learning journey!' },
      { days: 3, title: 'Study Starter', reward: 20, description: '3 days of studying!' },
      { days: 7, title: 'Study Warrior', reward: 35, description: 'A week of daily learning!' },
      { days: 14, title: 'Knowledge Seeker', reward: 50, description: 'Two weeks of practice!' },
      { days: 30, title: 'Study Master', reward: 100, description: 'A month of learning!' },
      { days: 50, title: 'Practice Pro', reward: 150, description: '50 days of excellence!' },
      { days: 100, title: 'Century Scholar', reward: 300, description: '100 days of studying!' },
      { days: 200, title: 'Elite Learner', reward: 500, description: '200 days of dedication!' },
      { days: 365, title: 'Year Long Scholar', reward: 1000, description: 'A full year of learning!' }
    ];
    
    res.json({
      success: true,
      data: {
        loginMilestones,
        studyMilestones,
        streakRewards: {
          dailyLogin: 5,
          dailyStudy: 10,
          weeklyLoginBonus: 10,
          weeklyStudyBonus: 15,
          monthlyLoginBonus: 25,
          monthlyStudyBonus: 35
        },
        description: {
          login: 'Login streaks are maintained by logging in daily',
          study: 'Study streaks are maintained by answering at least 1 question daily',
          combined: 'Both streaks can run independently and provide separate rewards'
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching milestones:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch milestones',
      error: error.message
    });
  }
};
