/**
 * Controller: authController.js
 * -------------------------------------
 * Handles user authentication and authorization logic.
 *
 * Functions:
 * - register(): Creates a new user account (student or admin)
 * - login(): Authenticates credentials and issues a JWT
 * - getUserProfile(): Returns profile info of logged-in user
 *
 * Works with:
 * - models/User.js
 * - middleware/authMiddleware.js
 */

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebaseAdmin'); // Import Firebase Admin SDK
const { generateUniqueReferralCode } = require('../utils/referralUtils');
const RewardService = require('../services/rewardService'); // Import reward service

const registerUser = async (req, res) => {
  try {
    const { username, name, email, password, role, referralCodeInput } = req.body; // Added referralCodeInput

    if (!name) { // Add validation for name
      return res.status(400).json({ message: "Name is required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) 
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate unique referral code for the new user
    const referralCode = await generateUniqueReferralCode(User);
    
    const newUser = new User({
      username,
      name, // Added 'name'
      email,
      password: hashedPassword,
      role: role || 'student',
      referralCode: referralCode, // Assign generated referral code
    });    // Handle referral code input if provided
    if (referralCodeInput) {
      const referralCodeNormalized = referralCodeInput.trim().toUpperCase();
      const referrer = await User.findOne({ referralCode: referralCodeNormalized });
      
      if (referrer && referrer._id.toString() !== newUser._id.toString()) {
        // Valid referrer found and not self-referral
        newUser.referredBy = referrer._id;
        
        // Increment referrer's successful referrals count
        referrer.successfulReferrals = (referrer.successfulReferrals || 0) + 1;
        await referrer.save();
        
        // Save the new user first to get their ID
        await newUser.save();
        
        // Process reward bonuses for both users
        try {
          const rewardResult = await RewardService.processReferralBonus(
            referrer._id,
            newUser._id,
            referralCodeNormalized
          );
          console.log(`✅ Referral rewards processed for ${newUser.email} referred by ${referrer.email}`);
        } catch (rewardError) {
          console.error('❌ Error processing referral rewards:', rewardError);
          // Continue with registration even if reward processing fails
        }
        
        console.log(`New user ${newUser.email} referred by ${referrer.email} using code ${referralCodeNormalized}`);
      } else if (referrer && referrer._id.toString() === newUser._id.toString()) {
        console.log(`Self-referral attempt prevented for user ${newUser.email}`);
      } else {
        console.log(`Invalid referral code provided: ${referralCodeInput}`);
      }
    } else {
      await newUser.save();
    }
    res.status(201).json({ 
      message: 'User registered successfully',
      referralCode: newUser.referralCode,
      referredBy: newUser.referredBy ? true : false
    });
  } catch (error) {
    console.error("❌ Error in registerUser:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.register = registerUser;

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials (user not found)' });

    // If user has no password (e.g., created via Firebase) and tries password login
    if (!user.password) {
        return res.status(400).json({ message: 'Please sign in with your social account or reset password if applicable.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials (password mismatch)' });

    const token = jwt.sign(
      { userId: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ 
      token, 
      role: user.role, 
      name: user.name, 
      userId: user._id,
      referralCode: user.referralCode,
      successfulReferrals: user.successfulReferrals || 0
    });
  } catch (error) {
    console.error("❌ Error in login:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.firebaseSignIn = async (req, res) => {
  const { firebaseToken, referralCodeInput } = req.body; // Added referralCodeInput

  if (!firebaseToken) {
    return res.status(400).json({ message: 'Firebase token is required.' });
  }

  try {
    console.log('Received Firebase token for verification:', firebaseToken.substring(0, 20) + '...');
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    console.log('Token decoded successfully. Auth type:', decodedToken.firebase?.sign_in_provider);
    const { uid, email, name, picture, phone_number } = decodedToken;    let user = await User.findOne({ firebaseUid: uid });

    if (user) {
      // User exists with this Firebase UID, update details if necessary
      console.log(`User found with Firebase UID: ${uid}`);
      user.name = name || user.name;
      user.email = email || user.email; // Firebase email is usually verified
      user.photoURL = picture || user.photoURL;
      // Update phone if available
      if (phone_number && !user.phoneNumber) {
        user.phoneNumber = phone_number;
      }
      // If displayName is not set, consider using name from Firebase
      if (!user.displayName && name) {
        user.displayName = name;
      }
      await user.save();
    } else {
      // No user with this Firebase UID, try to find by email or phone
      if (email) {
        user = await User.findOne({ email: email });
      } else if (phone_number) {
        user = await User.findOne({ phoneNumber: phone_number });
      }      if (user) {
        // User exists with this email or phone, link Firebase account
        console.log(`User found with ${email ? 'email' : 'phone'}. Linking Firebase UID.`);
        user.firebaseUid = uid;
        user.name = name || user.name; // Update name if provided by Firebase
        user.photoURL = picture || user.photoURL;
        // Update phone number if provided and not already set
        if (phone_number && !user.phoneNumber) {
          user.phoneNumber = phone_number;
        }
        if (!user.displayName && name) {
          user.displayName = name;
        }
        // If user was created with a password, it remains.
      } else {        // No user with this email or phone, create a new user
        console.log(`Creating new user with Firebase UID: ${uid}`);
        let username = '';
        if (email) {
          username = email.split('@')[0]; // Basic username generation from email
        } else if (phone_number) {
          // Create username from phone number (strip non-alphanumeric chars)
          username = `user_${phone_number.replace(/\D/g, '').substring(0, 8)}`;
        } else {
          username = `user_${uid.substring(0, 8)}`;
        }        const existingUsername = await User.findOne({ username: username });
        if (existingUsername) {
          username = `${username}_${uid.substring(0, 5)}`; // Make it more unique
        }

        // Generate unique referral code for the new user
        const referralCode = await generateUniqueReferralCode(User);

        user = new User({
          firebaseUid: uid,
          email: email || '', // Email might be null for phone auth
          phoneNumber: phone_number || '', // Add phone number if available
          name: name || (email ? email.split('@')[0] : phone_number || uid.substring(0, 8)), // Default name
          username: username,
          displayName: name || '',
          photoURL: picture || '',
          role: 'student', // Default role
          referralCode: referralCode, // Assign generated referral code
          // Password not set for Firebase-created users
        });        // Handle referral code input if provided
        if (referralCodeInput) {
          const referralCodeNormalized = referralCodeInput.trim().toUpperCase();
          const referrer = await User.findOne({ referralCode: referralCodeNormalized });
          
          if (referrer && referrer._id.toString() !== user._id.toString()) {
            // Valid referrer found and not self-referral
            user.referredBy = referrer._id;
            
            // Increment referrer's successful referrals count
            referrer.successfulReferrals = (referrer.successfulReferrals || 0) + 1;
            await referrer.save();
            
            // Save the new user first to get their ID
            await user.save();
            
            // Process reward bonuses for both users
            try {
              const rewardResult = await RewardService.processReferralBonus(
                referrer._id,
                user._id,
                referralCodeNormalized
              );
              console.log(`✅ Firebase referral rewards processed for ${user.email || user.phoneNumber} referred by ${referrer.email || referrer.phoneNumber}`);
            } catch (rewardError) {
              console.error('❌ Error processing Firebase referral rewards:', rewardError);
              // Continue with sign-in even if reward processing fails
            }
            
            console.log(`New Firebase user ${user.email || user.phoneNumber} referred by ${referrer.email || referrer.phoneNumber} using code ${referralCodeNormalized}`);
          } else if (referrer && referrer._id.toString() === user._id.toString()) {
            console.log(`Self-referral attempt prevented for Firebase user ${user.email || user.phoneNumber}`);
          } else {
            console.log(`Invalid referral code provided for Firebase user: ${referralCodeInput}`);
          }
        } else {
          await user.save();
        }
      }
      await user.save();
    }

    // Generate your application's JWT
    const appToken = jwt.sign(
      { userId: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );    res.json({
      token: appToken,
      userId: user._id,
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      photoURL: user.photoURL,
      firebaseUid: user.firebaseUid,
      referralCode: user.referralCode,
      referredBy: user.referredBy ? true : false,
      successfulReferrals: user.successfulReferrals || 0
    });
  } catch (error) {
    console.error('Error during Firebase sign-in:', error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Firebase token expired. Please sign in again.' });
    } else if (error.code === 'auth/argument-error') {
      return res.status(401).json({ message: 'Invalid Firebase token. Please sign in again.' });
    } else if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ message: 'Invalid Firebase token format. Please sign in again.' });
    }
    // Log detailed error for server-side debugging
    console.error('Firebase sign-in error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Server error during Firebase sign-in.', 
      details: error.message 
    });
  }
};

// Generate referral codes for existing users who don't have them
exports.generateReferralCodes = async (req, res) => {
  try {
    const usersWithoutCodes = await User.find({ referralCode: { $exists: false } });
    
    let updatedCount = 0;
    for (const user of usersWithoutCodes) {
      try {
        const referralCode = await generateUniqueReferralCode(User);
        user.referralCode = referralCode;
        await user.save();
        updatedCount++;
      } catch (error) {
        console.error(`Failed to generate referral code for user ${user._id}:`, error);
      }
    }

    res.json({
      message: `Generated referral codes for ${updatedCount} users`,
      totalUsersWithoutCodes: usersWithoutCodes.length,
      updatedCount
    });
  } catch (error) {
    console.error("❌ Error in generateReferralCodes:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get user's referral information
exports.getReferralInfo = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId)
      .select('referralCode successfulReferrals referredBy')
      .populate('referredBy', 'name email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user doesn't have a referral code, generate one
    if (!user.referralCode) {
      user.referralCode = await generateUniqueReferralCode(User);
      await user.save();
    }

    res.json({
      referralCode: user.referralCode,
      successfulReferrals: user.successfulReferrals || 0,
      referredBy: user.referredBy,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/register?ref=${user.referralCode}`
    });
  } catch (error) {
    console.error("❌ Error in getReferralInfo:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Apply referral code after registration (for users who didn't use one during signup)
exports.applyReferralCode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { referralCode } = req.body;

    if (!referralCode || !referralCode.trim()) {
      return res.status(400).json({ message: 'Referral code is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has a referral relationship
    if (user.referredBy) {
      return res.status(400).json({ message: 'You have already been referred by someone else' });
    }

    // Normalize the referral code
    const referralCodeNormalized = referralCode.trim().toUpperCase();

    // Find the referrer
    const referrer = await User.findOne({ referralCode: referralCodeNormalized });
    if (!referrer) {
      return res.status(400).json({ message: 'Invalid referral code' });
    }

    // Prevent self-referral
    if (referrer._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'You cannot refer yourself' });
    }    // Apply the referral
    user.referredBy = referrer._id;
    await user.save();

    // Increment referrer's successful referrals count
    referrer.successfulReferrals = (referrer.successfulReferrals || 0) + 1;
    await referrer.save();

    // Process reward bonuses for both users
    try {
      const rewardResult = await RewardService.processReferralBonus(
        referrer._id,
        user._id,
        referralCodeNormalized
      );
      console.log(`✅ Post-registration referral rewards processed for ${user.email} referred by ${referrer.email}`);
    } catch (rewardError) {
      console.error('❌ Error processing post-registration referral rewards:', rewardError);
      // Continue with response even if reward processing fails
    }

    console.log(`Post-registration referral applied: ${user.email} referred by ${referrer.email} using code ${referralCodeNormalized}`);

    res.json({
      message: 'Referral code applied successfully!',
      referredBy: {
        name: referrer.name,
        email: referrer.email
      }
    });
  } catch (error) {
    console.error("❌ Error in applyReferralCode:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
