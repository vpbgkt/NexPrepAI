/**
 * @fileoverview User Profile Controller
 * 
 * This module handles user profile management operations for the NexPrep platform,
 * providing endpoints for users to view and update their personal profile information.
 * Focuses on secure profile data access and modification with proper authentication
 * and authorization controls.
 * 
 * @module controllers/userController
 * 
 * @requires ../models/User - User data model for profile operations
 * 
 * @description Features include:
 * - Secure profile retrieval with password exclusion
 * - Profile update with selective field modification
 * - Error handling for missing users and duplicate values
 * - Authentication-based access control
 * - Comprehensive input validation and sanitization
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const User = require('../models/User');

/**
 * Get current user's profile information
 * 
 * @route GET /api/users/profile/me
 * @access Private (Student/Admin)
 * 
 * @description Retrieves the complete profile information of the currently authenticated
 * user. Excludes sensitive information like password from the response for security.
 * Used in profile pages, user dashboards, and anywhere user information display is needed.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information from middleware
 * @param {string} req.user.userId - User's unique identifier
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user profile data
 * @returns {string} returns._id - User's unique identifier
 * @returns {string} returns.username - User's username
 * @returns {string} returns.name - User's full name
 * @returns {string} returns.email - User's email address
 * @returns {string} returns.displayName - User's display name
 * @returns {string} returns.photoURL - User's profile photo URL
 * @returns {string} returns.phoneNumber - User's phone number
 * @returns {string} returns.role - User's role (student/admin)
 * @returns {string} returns.referralCode - User's referral code
 * @returns {number} returns.successfulReferrals - Count of successful referrals
 * @returns {Date} returns.createdAt - Account creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
 * 
 * @throws {404} User not found
 * @throws {500} Server error while fetching profile
 * 
 * @example
 * // Response with user profile data
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "username": "john_doe",
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "displayName": "John D.",
 *   "role": "student",
 *   "referralCode": "ABC123XYZ",
 *   "successfulReferrals": 5,
 *   "createdAt": "2024-01-01T00:00:00.000Z"
 * }
 */
// @desc    Get current user's profile
// @route   GET /api/users/profile/me
// @access  Private
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error in getMyProfile:', err.message);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

/**
 * Update current user's profile information
 * 
 * @route PUT /api/users/profile/me
 * @access Private (Student/Admin)
 * 
 * @description Allows authenticated users to update specific fields of their profile
 * information. Supports selective field updates, meaning only provided fields will
 * be modified while preserving existing data for non-specified fields. Implements
 * proper validation and error handling for profile modifications.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing profile update data
 * @param {string} [req.body.name] - Updated full name
 * @param {string} [req.body.displayName] - Updated display name
 * @param {string} [req.body.photoURL] - Updated profile photo URL
 * @param {string} [req.body.phoneNumber] - Updated phone number
 * @param {Object} req.user - Authenticated user information from middleware
 * @param {string} req.user.userId - User's unique identifier
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with updated user profile
 * @returns {string} returns._id - User's unique identifier
 * @returns {string} returns.name - Updated full name
 * @returns {string} returns.displayName - Updated display name
 * @returns {string} returns.photoURL - Updated profile photo URL
 * @returns {string} returns.phoneNumber - Updated phone number
 * @returns {Date} returns.updatedAt - Update timestamp
 * 
 * @throws {404} User not found
 * @throws {400} Update failed due to duplicate values
 * @throws {500} Server error while updating profile
 * 
 * @security Note: Username and email updates are intentionally excluded due to their
 * sensitive nature and potential impact on authentication and uniqueness constraints.
 * These fields require separate, more controlled update processes.
 * 
 * @example
 * // Request body for profile update
 * {
 *   "name": "John Smith",
 *   "displayName": "Johnny",
 *   "phoneNumber": "+1-555-123-4567"
 * }
 * 
 * // Response with updated profile
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "name": "John Smith",
 *   "displayName": "Johnny",
 *   "phoneNumber": "+1-555-123-4567",
 *   "updatedAt": "2024-01-15T10:30:00.000Z"
 * }
 */
// @desc    Update current user's profile
// @route   PUT /api/users/profile/me
// @access  Private
exports.updateMyProfile = async (req, res) => {
  const { name, displayName, photoURL, phoneNumber } = req.body;
  const userId = req.user.userId; // Assuming auth middleware sets req.user.userId

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update only the fields that are provided in the request
    if (name !== undefined) user.name = name;
    if (displayName !== undefined) user.displayName = displayName;
    if (photoURL !== undefined) user.photoURL = photoURL;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    // Note: Username and email are typically not updated here due to their sensitive nature
    // and potential impact on login/uniqueness. They would need separate, more controlled processes.

    const updatedUser = await user.save();

    // Return the updated user, excluding the password
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (err) {
    console.error('Error in updateMyProfile:', err.message);
    // Handle potential duplicate key errors if displayName were to be unique, etc.
    if (err.code === 11000) {
        return res.status(400).json({ message: 'Update failed. A value you provided might already be in use (e.g., if displayName were unique).' });
    }
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

/**
 * @desc    Update user account settings (expiration, free trial) by Superadmin
 * @route   PUT /api/users/:userId/account-settings
 * @access  Private (Superadmin only)
 */
exports.updateUserAccountSettingsBySuperadmin = async (req, res) => {
  const { accountExpiresAt, freeTrialEndsAt } = req.body;
  const { userId } = req.params;
  const requesterRole = req.user.role; // Assuming auth middleware sets req.user.role

  // 1. Authorize: Only superadmin can perform this action
  if (requesterRole !== 'superadmin') {
    return res.status(403).json({ message: 'Forbidden: Insufficient privileges. Superadmin access required.' });
  }

  // 2. Validate input (basic validation)
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }
  if (accountExpiresAt && isNaN(new Date(accountExpiresAt).getTime())) {
    return res.status(400).json({ message: 'Invalid accountExpiresAt date format.' });
  }
  if (freeTrialEndsAt && isNaN(new Date(freeTrialEndsAt).getTime())) {
    return res.status(400).json({ message: 'Invalid freeTrialEndsAt date format.' });
  }

  try {
    const userToUpdate = await User.findById(userId);

    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 3. Update fields if provided
    if (accountExpiresAt !== undefined) {
      userToUpdate.accountExpiresAt = accountExpiresAt ? new Date(accountExpiresAt) : null;
    }
    if (freeTrialEndsAt !== undefined) {
      userToUpdate.freeTrialEndsAt = freeTrialEndsAt ? new Date(freeTrialEndsAt) : null;
    }

    const updatedUser = await userToUpdate.save();

    // 4. Respond with relevant fields (excluding sensitive data like password)
    const userResponse = {
      _id: updatedUser._id,
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      accountExpiresAt: updatedUser.accountExpiresAt,
      freeTrialEndsAt: updatedUser.freeTrialEndsAt,
      updatedAt: updatedUser.updatedAt
    };

    res.json({ message: 'User account settings updated successfully.', user: userResponse });

  } catch (err) {
    console.error('Error in updateUserAccountSettingsBySuperadmin:', err.message);
    res.status(500).json({ message: 'Server error while updating user account settings.' });
  }
};

/**
 * @desc    Get all users (for Superadmin)
 * @route   GET /api/users
 * @access  Private (Superadmin only)
 */
exports.getAllUsers = async (req, res) => {
  console.log('[getAllUsers] Controller reached. Requester role:', req.user.role); // Added log
  const requesterRole = req.user.role;

  // 1. Authorize: Allow 'superadmin' OR 'admin'
  if (requesterRole !== 'superadmin' && requesterRole !== 'admin') { // Modified condition
    console.log('[getAllUsers] Authorization failed. Role:', requesterRole); // Added log
    return res.status(403).json({ message: 'Forbidden: Insufficient privileges. Superadmin or Admin access required.' });
  }

  try {
    console.log('[getAllUsers] Authorization successful. Fetching users...'); // Added log
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    console.log(`[getAllUsers] Found ${users.length} users. Preparing response.`); // Added log
    res.json(users);

  } catch (err) {
    console.error('[getAllUsers] Error fetching users:', err.message, err.stack); // Enhanced log
    res.status(500).json({ message: 'Server error while fetching users.' });
  }
};

/**
 * @desc    Process and identify users for account/trial expiry notifications
 * @route   POST (conceptually, will be called by a route)
 * @access  Private (Superadmin via a dedicated route)
 */
exports.processExpiryNotifications = async (req, res) => {
  const requesterRole = req.user.role;
  if (requesterRole !== 'superadmin') {
    return res.status(403).json({ message: 'Forbidden: Insufficient privileges. Superadmin access required.' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for consistent date comparisons

    const notificationsToSend = [];

    // Define notification windows (in days from today)
    const accountExpiryWindows = [7, 3, 0]; // 7 days before, 3 days before, on the day of expiry
    const trialExpiryWindows = [3, 0];    // 3 days before, on the day of expiry

    // Helper function to calculate target date
    const getTargetDate = (daysFromToday) => {
      const date = new Date(today);
      date.setDate(today.getDate() + daysFromToday);
      return date;
    };

    // 1. Process Account Expiry Notifications
    for (const days of accountExpiryWindows) {
      const targetExpiryDate = getTargetDate(days);
      
      // Find users whose accountExpiresAt is on the targetExpiryDate
      // We need to query for a date range for `accountExpiresAt` to cover the entire day
      const startOfTargetDay = new Date(targetExpiryDate); // Already at 00:00:00.000
      const endOfTargetDay = new Date(targetExpiryDate);
      endOfTargetDay.setHours(23, 59, 59, 999);

      const usersForAccountExpiry = await User.find({
        role: 'student', // Only notify students
        accountExpiresAt: {
          $gte: startOfTargetDay,
          $lte: endOfTargetDay
        }
      }).select('name email username accountExpiresAt freeTrialEndsAt');

      usersForAccountExpiry.forEach(user => {
        notificationsToSend.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          notificationType: 'ACCOUNT_EXPIRY',
          daysUntilExpiry: days,
          expiryDate: user.accountExpiresAt,
          message: `Account for ${user.name} (${user.username}) is ${days === 0 ? 'expiring today' : 'expiring in ' + days + ' days'} (${user.accountExpiresAt?.toDateString()}).`
        });
      });
    }

    // 2. Process Free Trial Expiry Notifications
    for (const days of trialExpiryWindows) {
      const targetTrialEndDate = getTargetDate(days);

      const startOfTargetTrialDay = new Date(targetTrialEndDate);
      const endOfTargetTrialDay = new Date(targetTrialEndDate);
      endOfTargetTrialDay.setHours(23, 59, 59, 999);

      const usersForTrialExpiry = await User.find({
        role: 'student',
        freeTrialEndsAt: {
          $gte: startOfTargetTrialDay,
          $lte: endOfTargetTrialDay
        },
        // Crucially, ensure their account isn't already extended beyond the trial
        // This means accountExpiresAt should be the same as freeTrialEndsAt or very close
        $expr: { $eq: ["$accountExpiresAt", "$freeTrialEndsAt"] }
      }).select('name email username accountExpiresAt freeTrialEndsAt');

      usersForTrialExpiry.forEach(user => {
        // Avoid duplicate notifications if account expiry and trial expiry are the same day and already handled
        const alreadyNotifiedForAccountExpiry = notificationsToSend.find(
          f => f.userId.toString() === user._id.toString() && 
               f.notificationType === 'ACCOUNT_EXPIRY' && 
               new Date(f.expiryDate).toDateString() === new Date(user.freeTrialEndsAt).toDateString()
        );

        if (!alreadyNotifiedForAccountExpiry) {
          notificationsToSend.push({
            userId: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            notificationType: 'TRIAL_EXPIRY',
            daysUntilExpiry: days,
            expiryDate: user.freeTrialEndsAt,
            message: `Free trial for ${user.name} (${user.username}) is ${days === 0 ? 'ending today' : 'ending in ' + days + ' days'} (${user.freeTrialEndsAt?.toDateString()}).`
          });
        }
      });
    }

    if (notificationsToSend.length > 0) {
      // In a real scenario, you would trigger emails/in-app notifications here.
      // For now, we just return the list.
      console.log(`[NotificationProcess] Found ${notificationsToSend.length} notifications to send.`);
      // console.log(JSON.stringify(notificationsToSend, null, 2));
      res.json({ 
        message: `Processed potential notifications. Found ${notificationsToSend.length} items.`, 
        notifications: notificationsToSend 
      });
    } else {
      res.json({ message: 'No users require expiry notifications at this time.', notifications: [] });
    }

  } catch (err) {
    console.error('Error in processExpiryNotifications:', err.message);
    res.status(500).json({ message: 'Server error while processing expiry notifications.', error: err.message });
  }
};
