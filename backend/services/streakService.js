const User = require('../models/User');
const RewardService = require('./rewardService');

class StreakService {
  /**
   * Check if two dates are consecutive days
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} - True if dates are consecutive days
   */
  static areConsecutiveDays(date1, date2) {
    if (!date1 || !date2) return false;
    
    const day1 = new Date(date1);
    const day2 = new Date(date2);
    
    // Reset hours to compare only dates
    day1.setHours(0, 0, 0, 0);
    day2.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(day2 - day1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 1;
  }

  /**
   * Check if two dates are the same day
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} - True if dates are the same day
   */
  static isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    
    const day1 = new Date(date1);
    const day2 = new Date(date2);
    
    return day1.toDateString() === day2.toDateString();
  }

  /**
   * Handle daily login streak and reward
   * @param {string} userId - User ID
   * @returns {Object} - Updated user and reward info
   */
  static async handleDailyLogin(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date();
      const lastLoginDate = user.lastLoginDate;
      
      // Check if user already logged in today
      if (lastLoginDate && this.isSameDay(lastLoginDate, today)) {
        return {
          user,
          alreadyLoggedToday: true,
          pointsEarned: 0,
          message: 'Already logged in today'
        };
      }

      let pointsEarned = 0;
      let streakBonus = 0;
      
      // Update login date and total login days
      user.lastLoginDate = today;
      user.totalLoginDays = (user.totalLoginDays || 0) + 1;

      // Calculate streak
      if (!lastLoginDate) {
        // First login ever
        user.currentStreak = 1;
      } else if (this.areConsecutiveDays(lastLoginDate, today)) {
        // Consecutive day login
        user.currentStreak = (user.currentStreak || 0) + 1;
      } else {
        // Streak broken, start fresh
        user.currentStreak = 1;
      }

      // Update longest streak
      if (user.currentStreak > (user.longestStreak || 0)) {
        user.longestStreak = user.currentStreak;
      }

      // Award daily login points
      pointsEarned += RewardService.REWARD_AMOUNTS.DAILY_LOGIN;

      // Award streak bonuses
      if (user.currentStreak >= 7) {
        streakBonus += 10; // Weekly streak bonus
      }
      if (user.currentStreak >= 30) {
        streakBonus += 25; // Monthly streak bonus
      }
      if (user.currentStreak >= 100) {
        streakBonus += 50; // 100-day streak bonus
      }

      const totalPoints = pointsEarned + streakBonus;

      // Save user first
      await user.save();

      // Award points through reward service
      if (totalPoints > 0) {
        const rewardResult = await RewardService.awardPoints(
          userId,
          'DAILY_LOGIN',
          totalPoints,
          `Daily login reward (${pointsEarned} base + ${streakBonus} streak bonus) - Day ${user.currentStreak}`,
          {
            loginStreak: user.currentStreak,
            basePoints: pointsEarned,
            streakBonus: streakBonus,
            loginDate: today.toISOString()
          }
        );

        // Refresh user data after points are awarded
        const updatedUser = await User.findById(userId);
        
        return {
          user: updatedUser,
          alreadyLoggedToday: false,
          pointsEarned: totalPoints,
          basePoints: pointsEarned,
          streakBonus: streakBonus,
          currentStreak: updatedUser.currentStreak,
          longestStreak: updatedUser.longestStreak,
          message: `Daily login reward: ${totalPoints} points! Current streak: ${updatedUser.currentStreak} days`
        };
      }

      return {
        user,
        alreadyLoggedToday: false,
        pointsEarned: 0,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        message: 'Login recorded but no points awarded'
      };

    } catch (error) {
      console.error('❌ Error handling daily login:', error);
      throw error;
    }
  }

  /**
   * Handle study streak when user answers questions
   * This is triggered when a student answers at least 1 question from any exam
   * @param {string} userId - User ID
   * @returns {Object} - Updated user and streak info
   */
  static async handleStudyActivity(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date();
      const lastStudyDate = user.lastStudyDate;
      
      // Check if user already had study activity today
      if (lastStudyDate && this.isSameDay(lastStudyDate, today)) {
        return {
          user,
          alreadyStudiedToday: true,
          pointsEarned: 0,
          message: 'Study activity already recorded for today'
        };
      }

      let pointsEarned = 0;
      let streakBonus = 0;

      // Update study date and total study days
      user.lastStudyDate = today;
      user.totalStudyDays = (user.totalStudyDays || 0) + 1;

      // Calculate study streak (separate from login streak)
      if (!lastStudyDate) {
        // First study activity ever
        user.studyStreak = 1;
      } else if (this.areConsecutiveDays(lastStudyDate, today)) {
        // Consecutive day of study activity
        user.studyStreak = (user.studyStreak || 0) + 1;
      } else {
        // Study streak broken, start fresh
        user.studyStreak = 1;
      }

      // Update longest study streak if current is higher
      if (user.studyStreak > (user.longestStudyStreak || 0)) {
        user.longestStudyStreak = user.studyStreak;
      }

      // Award base study activity points
      pointsEarned += RewardService.REWARD_AMOUNTS.TEST_COMPLETION;

      // Award streak bonuses for study activities
      if (user.studyStreak >= 7) {
        streakBonus += 15; // Weekly study streak bonus
      }
      if (user.studyStreak >= 30) {
        streakBonus += 35; // Monthly study streak bonus
      }
      if (user.studyStreak >= 100) {
        streakBonus += 75; // 100-day study streak bonus
      }

      const totalPoints = pointsEarned + streakBonus;

      // Update weekly streak if it's a new week (for general activity tracking)
      user.lastActivityDate = today; // Keep this for backward compatibility
      const weeklyStreakUpdated = await this.updateWeeklyStreak(user, today);

      // Save user first
      await user.save();

      // Award points through reward service
      if (totalPoints > 0) {
        const rewardResult = await RewardService.awardPoints(
          userId,
          'STUDY_ACTIVITY',
          totalPoints,
          `Study activity reward (${pointsEarned} base + ${streakBonus} streak bonus) - Day ${user.studyStreak}`,
          {
            studyStreak: user.studyStreak,
            basePoints: pointsEarned,
            streakBonus: streakBonus,
            activityDate: today.toISOString(),
            weeklyStreakUpdated,
            totalStudyDays: user.totalStudyDays
          }
        );

        // Refresh user data after points are awarded
        const updatedUser = await User.findById(userId);

        return {
          user: updatedUser,
          alreadyStudiedToday: false,
          pointsEarned: totalPoints,
          basePoints: pointsEarned,
          streakBonus: streakBonus,
          studyStreak: updatedUser.studyStreak,
          longestStudyStreak: updatedUser.longestStudyStreak,
          totalStudyDays: updatedUser.totalStudyDays,
          weeklyStreakUpdated,
          message: `Study activity reward: ${totalPoints} points! Current study streak: ${updatedUser.studyStreak} days`
        };
      }

      return {
        user,
        alreadyStudiedToday: false,
        pointsEarned: 0,
        studyStreak: user.studyStreak,
        longestStudyStreak: user.longestStudyStreak,
        totalStudyDays: user.totalStudyDays,
        weeklyStreakUpdated,
        message: 'Study activity recorded but no points awarded'
      };

    } catch (error) {
      console.error('❌ Error handling study activity:', error);
      throw error;
    }
  }

  /**
   * Update weekly streak
   * @param {Object} user - User object
   * @param {Date} activityDate - Date of activity
   * @returns {boolean} - True if weekly streak was updated
   */
  static async updateWeeklyStreak(user, activityDate) {
    const today = new Date(activityDate);
    const lastWeeklyStreakDate = user.lastWeeklyStreakDate;
    
    // Get start of current week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    if (!lastWeeklyStreakDate) {
      // First weekly activity
      user.weeklyStreak = 1;
      user.lastWeeklyStreakDate = startOfWeek;
      return true;
    }

    const lastWeekStart = new Date(lastWeeklyStreakDate);
    const weeksDifference = Math.floor((startOfWeek - lastWeekStart) / (7 * 24 * 60 * 60 * 1000));

    if (weeksDifference === 1) {
      // Consecutive week
      user.weeklyStreak = (user.weeklyStreak || 0) + 1;
      user.lastWeeklyStreakDate = startOfWeek;
      
      // Award weekly streak bonus
      if (user.weeklyStreak >= 4) { // Monthly streak (4 weeks)
        try {
          await RewardService.awardPoints(
            user._id,
            'BONUS',
            25,
            `Weekly streak bonus - ${user.weeklyStreak} weeks`,
            {
              weeklyStreak: user.weeklyStreak,
              streakType: 'WEEKLY_STUDY'
            }
          );
        } catch (error) {
          console.error('❌ Error awarding weekly streak bonus:', error);
        }
      }
      
      return true;
    } else if (weeksDifference > 1) {
      // Streak broken, start fresh
      user.weeklyStreak = 1;
      user.lastWeeklyStreakDate = startOfWeek;
      return true;
    }

    // Same week, no update needed
    return false;
  }

  /**
   * Get user's streak statistics
   * @param {string} userId - User ID
   * @returns {Object} - Streak statistics
   */
  static async getStreakStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date();
      const lastLoginDate = user.lastLoginDate;
      const lastStudyDate = user.lastStudyDate;

      // Check if login streak is still active
      const loginStreakActive = lastLoginDate && 
        (this.isSameDay(lastLoginDate, today) || this.areConsecutiveDays(lastLoginDate, today));

      // Check if study streak is still active
      const studyStreakActive = lastStudyDate && 
        (this.isSameDay(lastStudyDate, today) || this.areConsecutiveDays(lastStudyDate, today));

      return {
        // Login streaks
        currentLoginStreak: loginStreakActive ? user.currentStreak : 0,
        longestLoginStreak: user.longestStreak || 0,
        totalLoginDays: user.totalLoginDays || 0,
        lastLoginDate: user.lastLoginDate,
        loginStreakActive,
        canEarnLoginBonus: !lastLoginDate || !this.isSameDay(lastLoginDate, today),
        
        // Study streaks
        currentStudyStreak: studyStreakActive ? user.studyStreak : 0,
        longestStudyStreak: user.longestStudyStreak || 0,
        totalStudyDays: user.totalStudyDays || 0,
        lastStudyDate: user.lastStudyDate,
        studyStreakActive,
        canEarnStudyBonus: !lastStudyDate || !this.isSameDay(lastStudyDate, today),
        
        // Weekly streaks
        weeklyStreak: user.weeklyStreak || 0,
        lastWeeklyStreakDate: user.lastWeeklyStreakDate,

        // Legacy fields for backward compatibility
        lastActivityDate: user.lastActivityDate
      };

    } catch (error) {
      console.error('❌ Error getting streak stats:', error);
      throw error;
    }
  }

  /**
   * Reset user's streak (admin function)
   * @param {string} userId - User ID
   * @param {string} streakType - Type of streak to reset ('login', 'study', 'all')
   * @returns {Object} - Updated user
   */
  static async resetStreak(userId, streakType = 'all') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (streakType === 'login' || streakType === 'all') {
        user.currentStreak = 0;
        user.lastLoginDate = null;
        user.totalLoginDays = 0;
      }

      if (streakType === 'study' || streakType === 'all') {
        user.studyStreak = 0;
        user.longestStudyStreak = 0;
        user.lastStudyDate = null;
        user.totalStudyDays = 0;
      }

      if (streakType === 'all') {
        user.weeklyStreak = 0;
        user.lastActivityDate = null;
        user.lastWeeklyStreakDate = null;
      }

      await user.save();

      return user;
    } catch (error) {
      console.error('❌ Error resetting streak:', error);
      throw error;
    }
  }
}

module.exports = StreakService;
