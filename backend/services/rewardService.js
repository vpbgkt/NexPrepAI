const User = require('../models/User');
const RewardTransaction = require('../models/RewardTransaction');
const RewardRedemption = require('../models/RewardRedemption');
const Reward = require('../models/Reward');

class RewardService {
  // Default reward amounts configuration
  static REWARD_AMOUNTS = {
    REFERRAL_BONUS: 100,        // Points for referring someone
    SIGNUP_BONUS: 50,           // Points for being referred
    MILESTONE_5: 200,           // Bonus for 5 successful referrals
    MILESTONE_10: 500,          // Bonus for 10 successful referrals
    MILESTONE_25: 1000,         // Bonus for 25 successful referrals
    MILESTONE_50: 2500,         // Bonus for 50 successful referrals
    MILESTONE_100: 5000,        // Bonus for 100 successful referrals
    DAILY_LOGIN: 5,             // Points for daily login
    TEST_COMPLETION: 10,        // Points for completing a test
  };

  // Milestone thresholds
  static MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];

  /**
   * Award points to a user and create a transaction record
   */
  static async awardPoints(userId, type, amount, description, metadata = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user's point balance
      user.rewardPoints = (user.rewardPoints || 0) + amount;
      user.totalPointsEarned = (user.totalPointsEarned || 0) + amount;
      await user.save();

      // Create transaction record
      const transaction = new RewardTransaction({
        user: userId,
        type,
        amount,
        balance: user.rewardPoints,
        description,
        metadata,
        status: 'COMPLETED'
      });
      await transaction.save();

      console.log(`✅ Awarded ${amount} points to user ${userId} for ${type}`);
      return { user, transaction };
    } catch (error) {
      console.error('❌ Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Deduct points from a user and create a transaction record
   */
  static async deductPoints(userId, type, amount, description, metadata = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if ((user.rewardPoints || 0) < amount) {
        throw new Error('Insufficient points');
      }

      // Update user's point balance
      user.rewardPoints = (user.rewardPoints || 0) - amount;
      user.totalPointsSpent = (user.totalPointsSpent || 0) + amount;
      await user.save();

      // Create transaction record
      const transaction = new RewardTransaction({
        user: userId,
        type,
        amount: -amount, // Negative amount for deduction
        balance: user.rewardPoints,
        description,
        metadata,
        status: 'COMPLETED'
      });
      await transaction.save();

      console.log(`✅ Deducted ${amount} points from user ${userId} for ${type}`);
      return { user, transaction };
    } catch (error) {
      console.error('❌ Error deducting points:', error);
      throw error;
    }
  }

  /**
   * Process referral bonus for both referrer and referee
   */
  static async processReferralBonus(referrerId, refereeId, referralCode) {
    try {
      const results = {};

      // Award points to referrer
      const referrerResult = await this.awardPoints(
        referrerId,
        'REFERRAL_BONUS',
        this.REWARD_AMOUNTS.REFERRAL_BONUS,
        'Bonus for successful referral',
        { 
          referralId: refereeId, 
          referralCode,
          bonusType: 'referrer'
        }
      );
      results.referrer = referrerResult;

      // Award points to referee (person who was referred)
      const refereeResult = await this.awardPoints(
        refereeId,
        'SIGNUP_BONUS',
        this.REWARD_AMOUNTS.SIGNUP_BONUS,
        'Welcome bonus for joining via referral',
        { 
          referralId: referrerId, 
          referralCode,
          bonusType: 'referee'
        }
      );
      results.referee = refereeResult;

      // Check for milestone bonuses for referrer
      const milestoneResult = await this.checkAndAwardMilestone(referrerId);
      if (milestoneResult) {
        results.milestone = milestoneResult;
      }

      return results;
    } catch (error) {
      console.error('❌ Error processing referral bonus:', error);
      throw error;
    }
  }

  /**
   * Check and award milestone bonuses
   */
  static async checkAndAwardMilestone(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      const referralCount = user.successfulReferrals || 0;
      
      // Find the highest milestone the user has reached
      const achievedMilestones = this.MILESTONES.filter(milestone => referralCount >= milestone);
      if (achievedMilestones.length === 0) return null;

      const highestMilestone = Math.max(...achievedMilestones);

      // Check if we've already awarded this milestone
      const existingMilestone = await RewardTransaction.findOne({
        user: userId,
        type: 'MILESTONE_BONUS',
        'metadata.milestoneValue': highestMilestone
      });

      if (existingMilestone) return null;

      // Determine bonus amount based on milestone
      let bonusAmount;
      switch (highestMilestone) {
        case 5: bonusAmount = this.REWARD_AMOUNTS.MILESTONE_5; break;
        case 10: bonusAmount = this.REWARD_AMOUNTS.MILESTONE_10; break;
        case 25: bonusAmount = this.REWARD_AMOUNTS.MILESTONE_25; break;
        case 50: bonusAmount = this.REWARD_AMOUNTS.MILESTONE_50; break;
        case 100: bonusAmount = this.REWARD_AMOUNTS.MILESTONE_100; break;
        case 250: bonusAmount = 10000; break;
        case 500: bonusAmount = 25000; break;
        case 1000: bonusAmount = 50000; break;
        default: bonusAmount = 1000;
      }

      // Award milestone bonus
      const result = await this.awardPoints(
        userId,
        'MILESTONE_BONUS',
        bonusAmount,
        `Milestone bonus for ${highestMilestone} successful referrals`,
        { 
          milestoneType: 'referral_count',
          milestoneValue: highestMilestone
        }
      );

      return result;
    } catch (error) {
      console.error('❌ Error checking milestone:', error);
      throw error;
    }
  }

  /**
   * Get user's reward summary
   */
  static async getUserRewardSummary(userId) {
    try {
      const user = await User.findById(userId).select('rewardPoints totalPointsEarned totalPointsSpent successfulReferrals');
      if (!user) {
        throw new Error('User not found');
      }

      // Get recent transactions
      const recentTransactions = await RewardTransaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('metadata.referralId', 'name email');

      // Get redemption history
      const redemptions = await RewardRedemption.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('reward', 'title pointsCost');

      // Calculate next milestone
      const currentReferrals = user.successfulReferrals || 0;
      const nextMilestone = this.MILESTONES.find(milestone => milestone > currentReferrals);

      return {
        currentPoints: user.rewardPoints || 0,
        totalEarned: user.totalPointsEarned || 0,
        totalSpent: user.totalPointsSpent || 0,
        successfulReferrals: user.successfulReferrals || 0,
        nextMilestone,
        recentTransactions,
        redemptions
      };
    } catch (error) {
      console.error('❌ Error getting reward summary:', error);
      throw error;
    }
  }

  /**
   * Redeem a reward for a user
   */
  static async redeemReward(userId, rewardId) {
    try {
      const user = await User.findById(userId);
      const reward = await Reward.findById(rewardId);

      if (!user) throw new Error('User not found');
      if (!reward) throw new Error('Reward not found');
      if (!reward.isAvailable) throw new Error('Reward is not available');
      if (!reward.isEligibleUser(user)) throw new Error('User not eligible for this reward');

      // Check if reward has limited quantity
      if (reward.isLimited && reward.remainingQuantity <= 0) {
        throw new Error('Reward is out of stock');
      }

      // Deduct points from user
      await this.deductPoints(
        userId,
        'REWARD_REDEMPTION',
        reward.pointsCost,
        `Redeemed: ${reward.title}`,
        { rewardId: reward._id }
      );

      // Create redemption record
      const redemption = new RewardRedemption({
        user: userId,
        reward: rewardId,
        pointsSpent: reward.pointsCost,
        deliveryMethod: reward.type === 'INSTANT' ? 'INSTANT' : 'MANUAL',
        status: reward.type === 'INSTANT' ? 'COMPLETED' : 'PENDING'
      });

      // Handle different reward types
      if (reward.type === 'VOUCHER_CODE') {
        redemption.deliveryDetails.voucherCode = this.generateVoucherCode();
        redemption.status = 'COMPLETED';
      }

      await redemption.save();

      // Update reward quantity if limited
      if (reward.isLimited) {
        reward.remainingQuantity -= 1;
        await reward.save();
      }

      return redemption;
    } catch (error) {
      console.error('❌ Error redeeming reward:', error);
      throw error;
    }
  }

  /**
   * Generate a unique voucher code
   */
  static generateVoucherCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'NEX-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Get leaderboard data
   */
  static async getLeaderboard(limit = 50) {
    try {
      const topReferrers = await User.find({ successfulReferrals: { $gt: 0 } })
        .select('name email successfulReferrals rewardPoints totalPointsEarned')
        .sort({ successfulReferrals: -1, totalPointsEarned: -1 })
        .limit(limit);

      return topReferrers.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        email: user.email,
        successfulReferrals: user.successfulReferrals,
        rewardPoints: user.rewardPoints,
        totalPointsEarned: user.totalPointsEarned
      }));
    } catch (error) {
      console.error('❌ Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get admin analytics
   */
  static async getAdminAnalytics() {
    try {
      // Basic referral stats
      const totalUsers = await User.countDocuments();
      const usersWithReferrals = await User.countDocuments({ successfulReferrals: { $gt: 0 } });
      const totalReferrals = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$successfulReferrals' } } }
      ]);

      // Points stats
      const pointsStats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalPointsEarned: { $sum: '$totalPointsEarned' },
            totalPointsSpent: { $sum: '$totalPointsSpent' },
            totalPointsInCirculation: { $sum: '$rewardPoints' }
          }
        }
      ]);

      // Recent transactions
      const recentTransactions = await RewardTransaction.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(20);

      // Top rewards
      const topRewards = await RewardRedemption.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: '$reward', count: { $sum: 1 }, totalPoints: { $sum: '$pointsSpent' } } },
        { $lookup: { from: 'rewards', localField: '_id', foreignField: '_id', as: 'reward' } },
        { $unwind: '$reward' },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        userStats: {
          totalUsers,
          usersWithReferrals,
          totalReferrals: totalReferrals[0]?.total || 0
        },
        pointsStats: pointsStats[0] || {
          totalPointsEarned: 0,
          totalPointsSpent: 0,
          totalPointsInCirculation: 0
        },
        recentTransactions,
        topRewards
      };
    } catch (error) {
      console.error('❌ Error getting admin analytics:', error);
      throw error;
    }
  }
}

module.exports = RewardService;
