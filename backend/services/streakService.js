const User = require('../models/User');
const RewardService = require('./rewardService');

class StreakService {
  /**
   * Get current date/time in Indian Standard Time (IST)
   * @returns {Date} - Current date adjusted to IST
   */
  static getCurrentIndianTime() {
    // Create a date object for current time in IST
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    return new Date(utc + istOffset);
  }

  /**
   * Convert any date to IST
   * @param {Date} date - Date to convert (assumed to be stored as UTC in database)
   * @returns {Date} - Date converted to IST
   */
  static toIndianTime(date) {
    if (!date) return null;
    
    const inputDate = new Date(date);
    const utc = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    return new Date(utc + istOffset);
  }

  /**
   * Get the start of day in IST for a given date
   * @param {Date} date - Date to get start of day for
   * @returns {Date} - Start of day in IST (00:00:00)
   */
  static getStartOfDayIST(date) {
    const istDate = this.toIndianTime(date);
    istDate.setHours(0, 0, 0, 0);
    return istDate;
  }

  /**
   * Check if two dates are consecutive days in IST
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} - True if dates are consecutive days in IST
   */
  static areConsecutiveDaysIST(date1, date2) {
    if (!date1 || !date2) return false;
    
    const day1IST = this.getStartOfDayIST(date1);
    const day2IST = this.getStartOfDayIST(date2);
    
    const diffTime = Math.abs(day2IST - day1IST);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 1;
  }

  /**
   * Check if two dates are the same day in IST
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} - True if dates are the same day in IST
   */
  static isSameDayIST(date1, date2) {
    if (!date1 || !date2) return false;
    
    const day1IST = this.getStartOfDayIST(date1);
    const day2IST = this.getStartOfDayIST(date2);
    
    return day1IST.getTime() === day2IST.getTime();
  }

  /**
   * Legacy methods for backward compatibility (now using IST)
   */
  static areConsecutiveDays(date1, date2) {
    return this.areConsecutiveDaysIST(date1, date2);
  }

  static isSameDay(date1, date2) {
    return this.isSameDayIST(date1, date2);
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

      const todayIST = this.getCurrentIndianTime();
      const lastLoginDate = user.lastLoginDate;
      
      console.log(`🕒 Login streak check for user ${userId}:`, {
        currentTimeIST: todayIST.toISOString(),
        lastLoginDate: lastLoginDate ? lastLoginDate.toISOString() : 'Never',
        isSameDayIST: lastLoginDate ? this.isSameDayIST(lastLoginDate, todayIST) : false
      });
      
      // Check if user already logged in today (IST)
      if (lastLoginDate && this.isSameDayIST(lastLoginDate, todayIST)) {
        console.log(`✅ User ${userId} already logged in today (IST)`);
        return {
          user,
          alreadyLoggedToday: true,
          pointsEarned: 0,
          currentStreak: user.currentStreak || 0,
          longestStreak: user.longestStreak || 0,
          message: 'Already logged in today (IST)'
        };
      }

      let pointsEarned = 0;
      let streakBonus = 0;
      
      // Update login date to current IST time and increment total login days
      user.lastLoginDate = todayIST;
      user.totalLoginDays = (user.totalLoginDays || 0) + 1;

      // Calculate streak based on IST consecutive days
      if (!lastLoginDate) {
        // First login ever
        user.currentStreak = 1;
        console.log(`🎉 First login ever for user ${userId}`);
      } else if (this.areConsecutiveDaysIST(lastLoginDate, todayIST)) {
        // Consecutive day login (IST)
        user.currentStreak = (user.currentStreak || 0) + 1;
        console.log(`🔥 Consecutive login streak for user ${userId}: ${user.currentStreak} days`);
      } else {
        // Streak broken, start fresh
        const daysBetween = Math.floor((todayIST - this.getStartOfDayIST(lastLoginDate)) / (1000 * 60 * 60 * 24));
        console.log(`💥 Login streak broken for user ${userId}. Days between: ${daysBetween}. Starting fresh.`);
        user.currentStreak = 1;
      }

      // Update longest streak
      if (user.currentStreak > (user.longestStreak || 0)) {
        user.longestStreak = user.currentStreak;
        console.log(`🏆 New longest login streak record for user ${userId}: ${user.longestStreak} days`);
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

      console.log(`💰 Awarding login points to user ${userId}: ${totalPoints} total (${pointsEarned} base + ${streakBonus} streak bonus)`);

      // Award points through reward service
      if (totalPoints > 0) {
        const rewardResult = await RewardService.awardPoints(
          userId,
          'DAILY_LOGIN',
          totalPoints,
          `Daily login reward (${pointsEarned} base + ${streakBonus} streak bonus) - Day ${user.currentStreak} [IST]`,
          {
            loginStreak: user.currentStreak,
            basePoints: pointsEarned,
            streakBonus: streakBonus,
            loginDate: todayIST.toISOString(),
            timezone: 'IST'
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
          message: `Daily login reward: ${totalPoints} points! Current streak: ${updatedUser.currentStreak} days [IST]`
        };
      }

      return {
        user,
        alreadyLoggedToday: false,
        pointsEarned: 0,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        message: 'Login recorded (IST) but no points awarded'
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

      const todayIST = this.getCurrentIndianTime();
      const lastStudyDate = user.lastStudyDate;
      
      console.log(`📚 Study streak check for user ${userId}:`, {
        currentTimeIST: todayIST.toISOString(),
        lastStudyDate: lastStudyDate ? lastStudyDate.toISOString() : 'Never',
        isSameDayIST: lastStudyDate ? this.isSameDayIST(lastStudyDate, todayIST) : false
      });
      
      // Check if user already had study activity today (IST)
      if (lastStudyDate && this.isSameDayIST(lastStudyDate, todayIST)) {
        console.log(`✅ User ${userId} already studied today (IST)`);
        return {
          user,
          alreadyStudiedToday: true,
          pointsEarned: 0,
          studyStreak: user.studyStreak || 0,
          longestStudyStreak: user.longestStudyStreak || 0,
          totalStudyDays: user.totalStudyDays || 0,
          message: 'Study activity already recorded for today (IST)'
        };
      }

      let pointsEarned = 0;
      let streakBonus = 0;

      // Update study date to current IST time and increment total study days
      user.lastStudyDate = todayIST;
      user.totalStudyDays = (user.totalStudyDays || 0) + 1;

      // Calculate study streak (separate from login streak) based on IST consecutive days
      if (!lastStudyDate) {
        // First study activity ever
        user.studyStreak = 1;
        console.log(`🎉 First study activity ever for user ${userId}`);
      } else if (this.areConsecutiveDaysIST(lastStudyDate, todayIST)) {
        // Consecutive day of study activity (IST)
        user.studyStreak = (user.studyStreak || 0) + 1;
        console.log(`🔥 Consecutive study streak for user ${userId}: ${user.studyStreak} days`);
      } else {
        // Study streak broken, start fresh
        const daysBetween = Math.floor((todayIST - this.getStartOfDayIST(lastStudyDate)) / (1000 * 60 * 60 * 24));
        console.log(`💥 Study streak broken for user ${userId}. Days between: ${daysBetween}. Starting fresh.`);
        user.studyStreak = 1;
      }

      // Update longest study streak if current is higher
      if (user.studyStreak > (user.longestStudyStreak || 0)) {
        user.longestStudyStreak = user.studyStreak;
        console.log(`🏆 New longest study streak record for user ${userId}: ${user.longestStudyStreak} days`);
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
      user.lastActivityDate = todayIST; // Keep this for backward compatibility
      const weeklyStreakUpdated = await this.updateWeeklyStreak(user, todayIST);

      // Save user first
      await user.save();

      console.log(`💰 Awarding study points to user ${userId}: ${totalPoints} total (${pointsEarned} base + ${streakBonus} streak bonus)`);

      // Award points through reward service
      if (totalPoints > 0) {
        const rewardResult = await RewardService.awardPoints(
          userId,
          'STUDY_ACTIVITY',
          totalPoints,
          `Study activity reward (${pointsEarned} base + ${streakBonus} streak bonus) - Day ${user.studyStreak} [IST]`,
          {
            studyStreak: user.studyStreak,
            basePoints: pointsEarned,
            streakBonus: streakBonus,
            activityDate: todayIST.toISOString(),
            weeklyStreakUpdated,
            totalStudyDays: user.totalStudyDays,
            timezone: 'IST'
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
          message: `Study activity reward: ${totalPoints} points! Study streak: ${updatedUser.studyStreak} days [IST]`,
          weeklyStreakUpdated
        };
      }

      return {
        user,
        alreadyStudiedToday: false,
        pointsEarned: 0,
        studyStreak: user.studyStreak,
        longestStudyStreak: user.longestStudyStreak,
        totalStudyDays: user.totalStudyDays,
        message: 'Study activity recorded (IST) but no points awarded',
        weeklyStreakUpdated: false
      };

    } catch (error) {
      console.error('❌ Error handling study activity:', error);
      throw error;
    }
  }

  /**
   * Update weekly streak using IST
   * @param {Object} user - User object
   * @param {Date} activityDate - Date of activity in IST
   * @returns {boolean} - True if weekly streak was updated
   */
  static async updateWeeklyStreak(user, activityDate) {
    // Convert to IST if needed
    const todayIST = this.toIndianTime(activityDate);
    const lastWeeklyStreakDate = user.lastWeeklyStreakDate;
    
    // Get start of current week (Sunday) in IST
    const startOfWeekIST = new Date(todayIST);
    startOfWeekIST.setDate(todayIST.getDate() - todayIST.getDay());
    startOfWeekIST.setHours(0, 0, 0, 0);

    console.log(`📅 Weekly streak check (IST) for user ${user._id}:`, {
      activityDateIST: todayIST.toISOString(),
      startOfWeekIST: startOfWeekIST.toISOString(),
      lastWeeklyStreakDate: lastWeeklyStreakDate ? lastWeeklyStreakDate.toISOString() : 'Never'
    });

    if (!lastWeeklyStreakDate) {
      // First weekly activity
      user.weeklyStreak = 1;
      user.lastWeeklyStreakDate = startOfWeekIST;
      console.log(`🎉 First weekly activity for user ${user._id}`);
      return true;
    }

    const lastWeekStart = this.toIndianTime(lastWeeklyStreakDate);
    const weeksDifference = Math.floor((startOfWeekIST - lastWeekStart) / (7 * 24 * 60 * 60 * 1000));

    console.log(`📈 Weekly streak calculation: ${weeksDifference} weeks difference`);

    if (weeksDifference === 1) {
      // Consecutive week
      user.weeklyStreak = (user.weeklyStreak || 0) + 1;
      user.lastWeeklyStreakDate = startOfWeekIST;
      
      console.log(`🔥 Consecutive weekly streak for user ${user._id}: ${user.weeklyStreak} weeks`);
      
      // Award weekly streak bonus
      if (user.weeklyStreak >= 4) { // Monthly streak (4 weeks)
        try {
          await RewardService.awardPoints(
            user._id,
            'BONUS',
            25,
            `Weekly streak bonus - ${user.weeklyStreak} weeks [IST]`,
            {
              weeklyStreak: user.weeklyStreak,
              streakType: 'WEEKLY_STUDY',
              timezone: 'IST'
            }
          );
          console.log(`💰 Weekly streak bonus awarded to user ${user._id}: 25 points`);
        } catch (error) {
          console.error('❌ Error awarding weekly streak bonus:', error);
        }
      }
      
      return true;
    } else if (weeksDifference > 1) {
      // Streak broken, start fresh
      console.log(`💥 Weekly streak broken for user ${user._id}. Starting fresh.`);
      user.weeklyStreak = 1;
      user.lastWeeklyStreakDate = startOfWeekIST;
      return true;
    }

    // Same week, no update needed
    console.log(`✅ Same week for user ${user._id}, no weekly streak update needed`);
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

      const todayIST = this.getCurrentIndianTime();
      const lastLoginDate = user.lastLoginDate;
      const lastStudyDate = user.lastStudyDate;

      // Check if login streak is still active (using IST)
      const loginStreakActive = lastLoginDate && 
        (this.isSameDayIST(lastLoginDate, todayIST) || this.areConsecutiveDaysIST(lastLoginDate, todayIST));

      // Check if study streak is still active (using IST)
      const studyStreakActive = lastStudyDate && 
        (this.isSameDayIST(lastStudyDate, todayIST) || this.areConsecutiveDaysIST(lastStudyDate, todayIST));

      return {
        // Login streaks
        currentLoginStreak: loginStreakActive ? user.currentStreak : 0,
        longestLoginStreak: user.longestStreak || 0,
        totalLoginDays: user.totalLoginDays || 0,
        lastLoginDate: user.lastLoginDate,
        loginStreakActive,
        canEarnLoginBonus: !lastLoginDate || !this.isSameDayIST(lastLoginDate, todayIST),
        
        // Study streaks
        currentStudyStreak: studyStreakActive ? user.studyStreak : 0,
        longestStudyStreak: user.longestStudyStreak || 0,
        totalStudyDays: user.totalStudyDays || 0,
        lastStudyDate: user.lastStudyDate,
        studyStreakActive,
        canEarnStudyBonus: !lastStudyDate || !this.isSameDayIST(lastStudyDate, todayIST),
        
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
