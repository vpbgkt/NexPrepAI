const User = require('../models/User');

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
