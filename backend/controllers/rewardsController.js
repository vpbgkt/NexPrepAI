const RewardService = require('../services/rewardService');
const Reward = require('../models/Reward');
const RewardTransaction = require('../models/RewardTransaction');
const RewardRedemption = require('../models/RewardRedemption');
const User = require('../models/User');

class RewardsController {
  // Get user's reward summary and dashboard
  static async getUserRewardDashboard(req, res) {
    try {
      const userId = req.user.userId;
      const summary = await RewardService.getUserRewardSummary(userId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('❌ Error getting user reward dashboard:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching reward dashboard' 
      });
    }
  }

  // Get available rewards for user
  static async getAvailableRewards(req, res) {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId).select('rewardPoints level');
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const rewards = await Reward.getAvailableForUser(user);
      
      res.json({
        success: true,
        data: {
          userPoints: user.rewardPoints || 0,
          rewards
        }
      });
    } catch (error) {
      console.error('❌ Error getting available rewards:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching available rewards' 
      });
    }
  }

  // Get all rewards (admin or for catalog display)
  static async getAllRewards(req, res) {
    try {
      const { category, isActive, page = 1, limit = 20 } = req.query;
      
      const filter = {};
      if (category) filter.category = category;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const rewards = await Reward.find(filter)
        .sort({ displayOrder: 1, pointsCost: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      const total = await Reward.countDocuments(filter);

      res.json({
        success: true,
        data: {
          rewards,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('❌ Error getting all rewards:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching rewards' 
      });
    }
  }

  // Redeem a reward
  static async redeemReward(req, res) {
    try {
      const userId = req.user.userId;
      const { rewardId } = req.body;

      if (!rewardId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Reward ID is required' 
        });
      }

      const redemption = await RewardService.redeemReward(userId, rewardId);
      
      res.json({
        success: true,
        message: 'Reward redeemed successfully!',
        data: redemption
      });
    } catch (error) {
      console.error('❌ Error redeeming reward:', error);
      
      let statusCode = 500;
      let message = 'Error redeeming reward';
      
      if (error.message.includes('not found')) statusCode = 404;
      else if (error.message.includes('not available') || 
               error.message.includes('not eligible') || 
               error.message.includes('Insufficient points') ||
               error.message.includes('out of stock')) {
        statusCode = 400;
        message = error.message;
      }

      res.status(statusCode).json({ 
        success: false, 
        message 
      });
    }
  }

  // Get user's redemption history
  static async getRedemptionHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 10 } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const redemptions = await RewardRedemption.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('reward', 'title description category pointsCost imageUrl');

      const total = await RewardRedemption.countDocuments({ user: userId });

      res.json({
        success: true,
        data: {
          redemptions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('❌ Error getting redemption history:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching redemption history' 
      });
    }
  }

  // Get user's transaction history
  static async getTransactionHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20, type } = req.query;
      
      const filter = { user: userId };
      if (type) filter.type = type;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const transactions = await RewardTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('metadata.referralId', 'name email');

      const total = await RewardTransaction.countDocuments(filter);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('❌ Error getting transaction history:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching transaction history' 
      });
    }
  }

  // Get referral leaderboard
  static async getLeaderboard(req, res) {
    try {
      const { limit = 50 } = req.query;
      const leaderboard = await RewardService.getLeaderboard(parseInt(limit));
      
      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      console.error('❌ Error getting leaderboard:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching leaderboard' 
      });
    }
  }

  // Admin: Create a new reward
  static async createReward(req, res) {
    try {
      const adminId = req.user.userId;
      const rewardData = {
        ...req.body,
        createdBy: adminId,
        updatedBy: adminId
      };

      // Set remaining quantity equal to total quantity for limited rewards
      if (rewardData.isLimited && rewardData.totalQuantity) {
        rewardData.remainingQuantity = rewardData.totalQuantity;
      }

      const reward = new Reward(rewardData);
      await reward.save();
      
      res.status(201).json({
        success: true,
        message: 'Reward created successfully',
        data: reward
      });
    } catch (error) {
      console.error('❌ Error creating reward:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creating reward',
        details: error.message 
      });
    }
  }

  // Admin: Update a reward
  static async updateReward(req, res) {
    try {
      const { rewardId } = req.params;
      const adminId = req.user.userId;
      
      const reward = await Reward.findById(rewardId);
      if (!reward) {
        return res.status(404).json({ 
          success: false, 
          message: 'Reward not found' 
        });
      }

      // Update fields
      Object.assign(reward, req.body);
      reward.updatedBy = adminId;
      
      await reward.save();
      
      res.json({
        success: true,
        message: 'Reward updated successfully',
        data: reward
      });
    } catch (error) {
      console.error('❌ Error updating reward:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating reward',
        details: error.message 
      });
    }
  }

  // Admin: Delete a reward
  static async deleteReward(req, res) {
    try {
      const { rewardId } = req.params;
      
      const reward = await Reward.findById(rewardId);
      if (!reward) {
        return res.status(404).json({ 
          success: false, 
          message: 'Reward not found' 
        });
      }

      // Check if reward has been redeemed
      const redemptions = await RewardRedemption.countDocuments({ reward: rewardId });
      if (redemptions > 0) {
        // Soft delete by marking as inactive
        reward.isActive = false;
        await reward.save();
        
        return res.json({
          success: true,
          message: 'Reward marked as inactive (has existing redemptions)'
        });
      } else {
        // Hard delete if no redemptions
        await Reward.findByIdAndDelete(rewardId);
        
        res.json({
          success: true,
          message: 'Reward deleted successfully'
        });
      }
    } catch (error) {
      console.error('❌ Error deleting reward:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting reward' 
      });
    }
  }

  // Admin: Get analytics
  static async getAdminAnalytics(req, res) {
    try {
      const analytics = await RewardService.getAdminAnalytics();
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('❌ Error getting admin analytics:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching analytics' 
      });
    }
  }

  // Admin: Manual point adjustment
  static async adjustUserPoints(req, res) {
    try {
      const { userId, amount, description, type = 'ADMIN_ADJUSTMENT' } = req.body;
      const adminId = req.user.userId;

      if (!userId || !amount || !description) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID, amount, and description are required' 
        });
      }

      let result;
      if (amount > 0) {
        result = await RewardService.awardPoints(
          userId,
          type,
          amount,
          description,
          { adminUserId: adminId }
        );
      } else {
        result = await RewardService.deductPoints(
          userId,
          type,
          Math.abs(amount),
          description,
          { adminUserId: adminId }
        );
      }

      res.json({
        success: true,
        message: 'Points adjusted successfully',
        data: result
      });
    } catch (error) {
      console.error('❌ Error adjusting user points:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error adjusting points' 
      });
    }
  }

  // Admin: Get all redemptions
  static async getAllRedemptions(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      const filter = {};
      if (status) filter.status = status;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const redemptions = await RewardRedemption.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name email')
        .populate('reward', 'title category pointsCost')
        .populate('processedBy', 'name email');

      const total = await RewardRedemption.countDocuments(filter);

      res.json({
        success: true,
        data: {
          redemptions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('❌ Error getting all redemptions:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching redemptions' 
      });
    }
  }

  // Admin: Update redemption status
  static async updateRedemptionStatus(req, res) {
    try {
      const { redemptionId } = req.params;
      const { status, adminNotes, deliveryDetails } = req.body;
      const adminId = req.user.userId;

      const redemption = await RewardRedemption.findById(redemptionId);
      if (!redemption) {
        return res.status(404).json({ 
          success: false, 
          message: 'Redemption not found' 
        });
      }

      redemption.status = status;
      if (adminNotes) redemption.adminNotes = adminNotes;
      if (deliveryDetails) Object.assign(redemption.deliveryDetails, deliveryDetails);
      
      redemption.processedBy = adminId;
      redemption.processedAt = new Date();
      
      if (status === 'COMPLETED') {
        redemption.completedAt = new Date();
      }

      await redemption.save();

      res.json({
        success: true,
        message: 'Redemption status updated successfully',
        data: redemption
      });
    } catch (error) {
      console.error('❌ Error updating redemption status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating redemption status' 
      });
    }
  }
}

module.exports = RewardsController;
