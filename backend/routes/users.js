const express = require('express');
const router = express.Router();
const { getMyProfile, updateMyProfile } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth'); // Or your specific auth middleware

// @route   GET /api/users/profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/profile/me', authMiddleware, getMyProfile);

// @route   PUT /api/users/profile/me
// @desc    Update current user's profile
// @access  Private
router.put('/profile/me', authMiddleware, updateMyProfile);

module.exports = router;
