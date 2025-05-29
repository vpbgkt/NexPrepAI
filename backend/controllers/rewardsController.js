/**
 * Rewards Controller
 * 
 * Handles all rewards system operations including:
 * - User reward dashboard and summary
 * - Reward catalog browsing and availability checking
 * - Reward redemption processing and validation
 * - Transaction and redemption history tracking
 * - Leaderboard generation for referral program
 * - Admin reward management (CRUD operations)
 * - Admin redemption processing and status updates
 * - Points adjustment and analytics
 * 
 * @author NexPrep Team
 * @version 2.0
 */

const RewardService = require('../services/rewardService');
const Reward = require('../models/Reward');
const RewardTransaction = require('../models/RewardTransaction');
const RewardRedemption = require('../models/RewardRedemption');
const User = require('../models/User');

class RewardsController {  /**
   * Get User Reward Dashboard Endpoint
   * 
   * Retrieves comprehensive reward summary for the authenticated user.
   * Includes current points, total earned/spent, recent transactions, and redemptions.
   * 
   * @route GET /api/rewards/dashboard
   * @access Private (Students only)
   * @param {Object} req.user - Authenticated user object
   * @param {string} req.user.userId - User ID to get reward summary for
   * @returns {Object} Reward summary with points, transactions, and milestone progress
   * @throws {500} Server error during reward summary calculation
   */
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
  /**
   * Get Available Rewards Endpoint
   * 
   * Retrieves rewards that the user can redeem based on their points and level.
   * Filters rewards by user eligibility, active status, and availability dates.
   * 
   * @route GET /api/rewards/available
   * @access Private (Students only)
   * @param {Object} req.user - Authenticated user object
   * @param {string} req.user.userId - User ID to check reward eligibility
   * @returns {Object} Available rewards list with user's current point balance
   * @throws {404} User not found
   * @throws {500} Server error during reward filtering
   */
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
  /**
   * Get All Rewards Endpoint
   * 
   * Retrieves paginated list of rewards for catalog display or admin management.
   * Supports filtering by category and active status with pagination.
   * 
   * @route GET /api/rewards/catalog
   * @route GET /api/rewards/admin/rewards (admin access)
   * @access Private (Students for catalog, Admin for management)
   * @param {string} req.query.category - Optional category filter
   * @param {boolean} req.query.isActive - Optional active status filter
   * @param {number} req.query.page - Page number for pagination (default: 1)
   * @param {number} req.query.limit - Items per page (default: 20)
   * @returns {Object} Paginated rewards list with creator information (admin view)
   * @throws {500} Server error during rewards retrieval
   */
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
  /**
   * Redeem Reward Endpoint
   * 
   * Processes reward redemption for authenticated user with full validation.
   * Handles point deduction, eligibility checking, and redemption record creation.
   * Supports different reward types (instant, voucher codes, manual processing).
   * 
   * @route POST /api/rewards/redeem
   * @access Private (Students only)
   * @param {Object} req.body - Request body containing reward information
   * @param {string} req.body.rewardId - MongoDB ObjectId of the reward to redeem
   * @param {Object} req.user - Authenticated user object
   * @param {string} req.user.userId - User ID performing the redemption
   * @returns {Object} Redemption details with status and delivery information
   * @throws {400} Missing rewardId or validation errors
   * @throws {404} Reward not found
   * @throws {400} Insufficient points, not eligible, or out of stock
   * @throws {500} Server error during redemption processing
   */
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
  /**
   * Get Redemption History Endpoint
   * 
   * Retrieves paginated history of user's reward redemptions.
   * Shows redemption status, delivery details, and associated reward information.
   * 
   * @route GET /api/rewards/redemptions
   * @access Private (Students only - own redemptions)
   * @param {Object} req.user - Authenticated user object
   * @param {string} req.user.userId - User ID to get redemption history for
   * @param {number} req.query.page - Page number for pagination (default: 1)
   * @param {number} req.query.limit - Items per page (default: 10)
   * @returns {Object} Paginated redemption history with reward details and pagination metadata
   * @throws {500} Server error during redemption history retrieval
   */
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
  /**
   * Get Transaction History Endpoint
   * 
   * Retrieves paginated history of user's reward point transactions.
   * Includes earning transactions (referrals, milestones) and spending transactions (redemptions).
   * 
   * @route GET /api/rewards/transactions
   * @access Private (Students only - own transactions)
   * @param {Object} req.user - Authenticated user object
   * @param {string} req.user.userId - User ID to get transaction history for
   * @param {number} req.query.page - Page number for pagination (default: 1)
   * @param {number} req.query.limit - Items per page (default: 20)
   * @param {string} req.query.type - Optional transaction type filter
   * @returns {Object} Paginated transaction history with referral details and pagination metadata
   * @throws {500} Server error during transaction history retrieval
   */
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
  /**
   * Get Referral Leaderboard Endpoint
   * 
   * Retrieves ranked leaderboard of users based on successful referrals.
   * Shows top referrers with their referral counts and earned points.
   * 
   * @route GET /api/rewards/leaderboard
   * @access Private (Students can view)
   * @param {number} req.query.limit - Maximum number of entries to return (default: 50)
   * @returns {Object} Ranked leaderboard with user stats and referral achievements
   * @throws {500} Server error during leaderboard generation
   */
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
  /**
   * Create New Reward Endpoint (Admin)
   * 
   * Creates a new reward in the system with specified properties and constraints.
   * Handles quantity management for limited rewards and sets creator tracking.
   * 
   * @route POST /api/rewards/admin/rewards
   * @access Private (Admin only)
   * @param {Object} req.body - Reward data object
   * @param {string} req.body.title - Reward title
   * @param {string} req.body.description - Reward description
   * @param {number} req.body.pointsCost - Points required to redeem
   * @param {string} req.body.category - Reward category
   * @param {string} req.body.type - Reward type (INSTANT, VOUCHER_CODE, etc.)
   * @param {Object} req.user - Authenticated admin user
   * @param {string} req.user.userId - Admin user ID for creator tracking
   * @returns {Object} Created reward object with auto-assigned properties
   * @throws {500} Server error during reward creation or validation error
   */
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
  /**
   * Update Reward Endpoint (Admin)
   * 
   * Updates an existing reward with new properties and tracks modification history.
   * Allows modification of all reward fields while preserving creator information.
   * 
   * @route PUT /api/rewards/admin/rewards/:rewardId
   * @access Private (Admin only)
   * @param {string} req.params.rewardId - MongoDB ObjectId of reward to update
   * @param {Object} req.body - Updated reward data (partial update supported)
   * @param {Object} req.user - Authenticated admin user
   * @param {string} req.user.userId - Admin user ID for modification tracking
   * @returns {Object} Updated reward object
   * @throws {404} Reward not found
   * @throws {500} Server error during reward update
   */
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
  /**
   * Delete Reward Endpoint (Admin)
   * 
   * Safely deletes a reward with redemption history consideration.
   * Performs soft delete (marks inactive) if redemptions exist, hard delete otherwise.
   * 
   * @route DELETE /api/rewards/admin/rewards/:rewardId
   * @access Private (Admin only)
   * @param {string} req.params.rewardId - MongoDB ObjectId of reward to delete
   * @returns {Object} Deletion result with action taken (soft/hard delete)
   * @throws {404} Reward not found
   * @throws {500} Server error during deletion process
   */
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
  /**
   * Get Admin Analytics Endpoint
   * 
   * Retrieves comprehensive analytics data for rewards system administration.
   * Includes statistics on redemptions, popular rewards, user engagement, and revenue metrics.
   * 
   * @route GET /api/rewards/admin/analytics
   * @access Private (Admin only)
   * @returns {Object} Analytics data including redemption stats, popular rewards, user metrics
   * @throws {500} Server error during analytics calculation
   */
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
  /**
   * Adjust User Points Endpoint (Admin)
   * 
   * Manually adjusts user points balance for administrative purposes.
   * Supports both positive (award) and negative (deduct) adjustments with audit trail.
   * 
   * @route POST /api/rewards/admin/adjust-points
   * @access Private (Admin only)
   * @param {string} req.body.userId - Target user ID for point adjustment
   * @param {number} req.body.amount - Point amount (positive for award, negative for deduction)
   * @param {string} req.body.description - Reason for adjustment (required for audit)
   * @param {string} req.body.type - Adjustment type (defaults to 'ADMIN_ADJUSTMENT')
   * @param {Object} req.user - Authenticated admin user
   * @param {string} req.user.userId - Admin user ID for audit trail
   * @returns {Object} Adjustment result with updated point balance
   * @throws {400} Missing required fields (userId, amount, description)
   * @throws {500} Server error during point adjustment
   */
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
  /**
   * Get All Redemptions Endpoint (Admin)
   * 
   * Retrieves paginated list of all reward redemptions across all users.
   * Supports filtering by status and includes user and reward details for admin management.
   * 
   * @route GET /api/rewards/admin/redemptions
   * @access Private (Admin only)
   * @param {string} req.query.status - Optional filter by redemption status
   * @param {number} req.query.page - Page number for pagination (default: 1)
   * @param {number} req.query.limit - Items per page (default: 20)
   * @returns {Object} Paginated redemptions with user and reward details
   * @throws {500} Server error during redemption retrieval
   */
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
  /**
   * Update Redemption Status Endpoint (Admin)
   * 
   * Updates the status of a reward redemption with admin notes and delivery tracking.
   * Handles status transitions (PENDING -> PROCESSING -> COMPLETED/CANCELLED) with audit trail.
   * 
   * @route PUT /api/rewards/admin/redemptions/:redemptionId/status
   * @access Private (Admin only)
   * @param {string} req.params.redemptionId - MongoDB ObjectId of redemption to update
   * @param {string} req.body.status - New redemption status (PENDING/PROCESSING/COMPLETED/CANCELLED)
   * @param {string} req.body.adminNotes - Optional admin notes for status change
   * @param {Object} req.body.deliveryDetails - Optional delivery tracking information
   * @param {Object} req.user - Authenticated admin user
   * @param {string} req.user.userId - Admin user ID for processing audit
   * @returns {Object} Updated redemption with new status and timestamps
   * @throws {404} Redemption not found
   * @throws {500} Server error during status update
   */
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

/**
 * Export RewardsController class
 * 
 * Main controller module for rewards and gamification system.
 * Provides both user-facing and admin endpoints for complete rewards management.
 */
module.exports = RewardsController;
