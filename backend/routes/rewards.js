const express = require('express');
const router = express.Router();
const RewardsController = require('../controllers/rewardsController');
const { authenticate } = require('../middleware/authMiddleware');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

// User routes (require authentication)
router.use(authenticate);

// GET /api/rewards/dashboard - Get user's reward dashboard
router.get('/dashboard', RewardsController.getUserRewardDashboard);

// GET /api/rewards/available - Get available rewards for user
router.get('/available', RewardsController.getAvailableRewards);

// GET /api/rewards/catalog - Get all rewards (public catalog view)
router.get('/catalog', RewardsController.getAllRewards);

// POST /api/rewards/redeem - Redeem a reward
router.post('/redeem', RewardsController.redeemReward);

// GET /api/rewards/redemptions - Get user's redemption history
router.get('/redemptions', RewardsController.getRedemptionHistory);

// GET /api/rewards/transactions - Get user's transaction history
router.get('/transactions', RewardsController.getTransactionHistory);

// GET /api/rewards/leaderboard - Get referral leaderboard
router.get('/leaderboard', RewardsController.getLeaderboard);

// Admin routes (require admin privileges)
router.use(isAdmin);

// GET /api/rewards/admin/analytics - Get admin analytics
router.get('/admin/analytics', RewardsController.getAdminAnalytics);

// GET /api/rewards/admin/rewards - Get all rewards (admin view)
router.get('/admin/rewards', RewardsController.getAllRewards);

// POST /api/rewards/admin/rewards - Create a new reward
router.post('/admin/rewards', RewardsController.createReward);

// PUT /api/rewards/admin/rewards/:rewardId - Update a reward
router.put('/admin/rewards/:rewardId', RewardsController.updateReward);

// DELETE /api/rewards/admin/rewards/:rewardId - Delete a reward
router.delete('/admin/rewards/:rewardId', RewardsController.deleteReward);

// GET /api/rewards/admin/redemptions - Get all redemptions (admin view)
router.get('/admin/redemptions', RewardsController.getAllRedemptions);

// PUT /api/rewards/admin/redemptions/:redemptionId - Update redemption status
router.put('/admin/redemptions/:redemptionId', RewardsController.updateRedemptionStatus);

// POST /api/rewards/admin/adjust-points - Manually adjust user points
router.post('/admin/adjust-points', RewardsController.adjustUserPoints);

module.exports = router;
