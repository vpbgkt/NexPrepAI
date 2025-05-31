const express = require('express');
const router = express.Router();
const { getMyProfile, updateMyProfile, updateUserAccountSettingsBySuperadmin, getAllUsers, processExpiryNotifications } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth'); // Or your specific auth middleware

// @route   GET /api/users/profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/profile/me', authMiddleware, getMyProfile);

// @route   PUT /api/users/profile/me
// @desc    Update current user's profile
// @access  Private
router.put('/profile/me', authMiddleware, updateMyProfile);

// @route   PUT /api/users/:userId/account-settings
// @desc    Update user account settings (expiration, free trial) by Superadmin
// @access  Private (Superadmin only)
router.put(
  '/:userId/account-settings',
  authMiddleware, // Ensures user is logged in
  (req, res, next) => { // Inline middleware for superadmin check
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Superadmin access required.' });
    }
    next();
  },
  updateUserAccountSettingsBySuperadmin
);

// @route   GET /api/users
// @desc    Get all users (for Superadmin)
// @access  Private (Superadmin only)
router.get(
  '/',
  authMiddleware, // Ensures user is logged in
  (req, res, next) => { // Inline middleware for admin/superadmin check
    console.log(`[DEBUG] Accessing GET /api/users. User role: ${req.user?.role}, User ID: ${req.user?.userId}`); // Added for debugging
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      console.log(`[DEBUG] Access DENIED for role: ${req.user?.role} to GET /api/users`); // Added for debugging
      return res.status(403).json({ message: 'Forbidden: Admin or Superadmin access required.' });
    }
    console.log(`[DEBUG] Access GRANTED for role: ${req.user?.role} to GET /api/users`); // Added for debugging
    next();
  },
  getAllUsers
);

// @route   POST /api/users/process-expiry-notifications
// @desc    Manually trigger the processing of expiry notifications (Superadmin only)
// @access  Private (Superadmin only)
router.post(
  '/process-expiry-notifications',
  authMiddleware, // Ensures user is logged in
  (req, res, next) => { // Inline middleware for superadmin check
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Superadmin access required.' });
    }
    next();
  },
  processExpiryNotifications
);

module.exports = router;
