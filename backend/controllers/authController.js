/**
 * @fileoverview Authentication Controller
 * 
 * This module handles user authentication, authorization, and referral system functionality 
 * for the NexPrep backend. It provides comprehensive authentication services including 
 * traditional email/password registration and login, Firebase-based social authentication,
 * and a complete referral system with reward processing.
 * 
 * @module controllers/authController
 * 
 * @requires ../models/User - User data model
 * @requires bcryptjs - Password hashing and comparison
 * @requires jsonwebtoken - JWT token generation and verification
 * @requires ../config/firebaseAdmin - Firebase Admin SDK configuration
 * @requires ../utils/referralUtils - Referral code generation utilities
 * @requires ../services/rewardService - Reward processing service
 * 
 * @description Features include:
 * - User registration with optional referral codes
 * - Traditional email/password authentication
 * - Firebase social authentication (Google, Facebook, etc.)
 * - Referral code generation and management
 * - Referral bonus processing and reward distribution
 * - JWT token generation for session management
 * - User profile management and linking
 * 
 * @author NexPrep Development Team
 * @version 2.0.0
 */

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebaseAdmin'); // Import Firebase Admin SDK
const { generateUniqueReferralCode } = require('../utils/referralUtils');
const RewardService = require('../services/rewardService'); // Import reward service

/**
 * @constant {number} DEFAULT_FREE_TRIAL_DAYS
 * @description Default number of days for the free trial period for new users.
 * This value can be adjusted by a superadmin through a dedicated interface or configuration setting in the future.
 */
const DEFAULT_FREE_TRIAL_DAYS = 30;

/**
 * Register a new user with optional referral code processing
 * 
 * @route POST /api/auth/register
 * @access Public
 * 
 * @description Creates a new user account with email/password authentication.
 * Supports referral code input during registration which automatically processes
 * referral bonuses for both the new user and the referrer. Generates a unique
 * referral code for the new user and handles all reward processing.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing user registration data
 * @param {string} req.body.username - Unique username for the user
 * @param {string} req.body.name - Full name of the user (required)
 * @param {string} req.body.email - Email address (must be unique)
 * @param {string} req.body.password - Plain text password (will be hashed)
 * @param {string} [req.body.role='student'] - User role (student/admin)
 * @param {string} [req.body.referralCodeInput] - Optional referral code from existing user
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with registration status
 * @returns {string} returns.message - Success/error message
 * @returns {string} returns.referralCode - Generated referral code for new user
 * @returns {boolean} returns.referredBy - Whether user was referred by someone
 * 
 * @throws {400} User already exists with provided email
 * @throws {400} Name is required
 * @throws {500} Server error during registration process
 * 
 * @example
 * // Request body for new user registration
 * {
 *   "username": "john_doe",
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "securePassword123",
 *   "role": "student",
 *   "referralCodeInput": "ABC123XYZ"
 * }
 */
/**
 * Validate email format and domain
 * @param {string} email - Email to validate
 * @returns {Object} - Validation result with isValid boolean and message
 */
function validateEmail(email) {
  if (!email) {
    return { isValid: false, message: "Email is required" };
  }

  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Invalid email format" };
  }

  // Check for invalid domains/patterns
  const invalidPatterns = [
    /^.+@example\.(com|org|net)$/i,
    /^.+@test\.(com|org|net)$/i,
    /^.+@sample\.(com|org|net)$/i,
    /^.+@dummy\.(com|org|net)$/i,
    /^[a-z]@[a-z]\.(com|org|net)$/i, // Single character before and after @
    /^.+@.+\.(fake|invalid|test)$/i
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(email)) {
      return { isValid: false, message: "Please use a valid email address. Test emails like abc@example.com are not allowed" };
    }
  }

  return { isValid: true, message: "" };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with isValid boolean and message
 */
function validatePassword(password) {
  if (!password) {
    return { isValid: false, message: "Password is required" };
  }

  if (password.length < 6) {
    return { isValid: false, message: "Password must be at least 6 characters long" };
  }

  // Must contain at least one letter or number
  if (!/[a-zA-Z0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one letter or number" };
  }

  return { isValid: true, message: "" };
}

const registerUser = async (req, res) => {
  try {
    const { username, name, email, password, role, referralCodeInput } = req.body; // Added referralCodeInput

    if (!name) { // Add validation for name
      return res.status(400).json({ message: "Name is required" });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ message: emailValidation.message });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ message: passwordValidation.message });
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
    });

    // Set free trial and account expiration ONLY for students
    if (newUser.role === 'student') {
      const now = new Date();
      // Create a new date object for freeTrialEndsAt to avoid modifying the same date instance
      newUser.freeTrialEndsAt = new Date(new Date().setDate(now.getDate() + DEFAULT_FREE_TRIAL_DAYS));
      // Create another new date object for accountExpiresAt
      newUser.accountExpiresAt = new Date(new Date().setDate(now.getDate() + DEFAULT_FREE_TRIAL_DAYS)); // Initially, account expires when trial ends
    } else {
      // For non-students, explicitly set to null or leave as default (if schema default is null)
      newUser.freeTrialEndsAt = null;
      newUser.accountExpiresAt = null;
    }

    // Handle referral code input if provided
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

/**
 * User registration function export
 * 
 * @description Exports the registerUser function as the register endpoint handler.
 * This function handles new user account creation with comprehensive referral
 * system integration and reward processing.
 */
exports.register = registerUser;

/**
 * Authenticate user with email and password
 * 
 * @route POST /api/auth/login
 * @access Public
 * 
 * @description Authenticates a user using email and password credentials.
 * Validates user existence, password correctness, and generates a JWT token
 * for authenticated sessions. Handles both regular password users and 
 * Firebase-created users appropriately.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing login credentials
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with authentication result
 * @returns {string} returns.token - JWT authentication token
 * @returns {string} returns.role - User role (student/admin)
 * @returns {string} returns.name - User's full name
 * @returns {string} returns.userId - User's unique identifier
 * @returns {string} returns.referralCode - User's referral code
 * @returns {number} returns.successfulReferrals - Count of successful referrals
 * 
 * @throws {400} Invalid credentials (user not found)
 * @throws {400} User created via social login attempting password login
 * @throws {400} Invalid credentials (password mismatch)
 * @throws {500} Server error during authentication
 * 
 * @example
 * // Request body for user login
 * {
 *   "email": "john@example.com",
 *   "password": "securePassword123"
 * }
 */
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
      // accountExpiresAt and freeTrialEndsAt are not typically returned on login for security/privacy.
      // They should be fetched via a dedicated profile endpoint.
    });
  } catch (error) {
    console.error("❌ Error in login:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Authenticate user with Firebase token (Social Login)
 * 
 * @route POST /api/auth/firebase-signin
 * @access Public
 * 
 * @description Authenticates users via Firebase social authentication (Google, Facebook, etc.).
 * Verifies Firebase ID tokens, creates new users if needed, links existing accounts,
 * and processes referral codes during social sign-up. Supports both email and phone
 * number based authentication through Firebase.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing Firebase authentication data
 * @param {string} req.body.firebaseToken - Firebase ID token from client
 * @param {string} [req.body.referralCodeInput] - Optional referral code for new users
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with authentication result
 * @returns {string} returns.token - JWT application token
 * @returns {string} returns.userId - User's unique identifier
 * @returns {string} returns.name - User's full name
 * @returns {string} returns.displayName - User's display name
 * @returns {string} returns.email - User's email address
 * @returns {string} returns.role - User role
 * @returns {string} returns.photoURL - User's profile photo URL
 * @returns {string} returns.firebaseUid - Firebase user identifier
 * @returns {string} returns.referralCode - User's referral code
 * @returns {boolean} returns.referredBy - Whether user was referred
 * @returns {number} returns.successfulReferrals - Count of successful referrals
 * 
 * @throws {400} Firebase token is required
 * @throws {401} Firebase token expired/invalid/malformed
 * @throws {500} Server error during Firebase authentication
 * 
 * @example
 * // Request body for Firebase authentication
 * {
 *   "firebaseToken": "eyJhbGciOiJSUzI1NiIs...",
 *   "referralCodeInput": "ABC123XYZ"
 * }
 */
exports.firebaseSignIn = async (req, res) => {
  const { firebaseToken, referralCodeInput } = req.body; // Added referralCodeInput

  if (!firebaseToken) {
    return res.status(400).json({ message: 'Firebase token is required.' });
  }

  try {
    console.log('Received Firebase token for verification:', firebaseToken.substring(0, 20) + '...');
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    console.log('Token decoded successfully. Auth type:', decodedToken.firebase?.sign_in_provider);
    const { uid, email, name, picture, phone_number } = decodedToken;
    let user = await User.findOne({ firebaseUid: uid });

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
      await user.save();    } else {
      // New user via Firebase
      console.log(`New user signing in with Firebase UID: ${uid}. Creating account.`);
      
      // Validate email if provided
      if (email) {
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
          return res.status(400).json({ message: emailValidation.message });
        }
      }
      
      const referralCode = await generateUniqueReferralCode(User); // Generate referral code for new Firebase user
      
      // Determine user's name, trying displayName, then name, then a default
      let newUserName = decodedToken.name || decodedToken.email?.split('@')[0] || 'User';
      if (decodedToken.phone_number && !decodedToken.name && !decodedToken.email) {
        newUserName = `User_${decodedToken.phone_number.slice(-4)}`; // e.g., User_1234
      }// Generate a unique username for Firebase users
      let baseUsername;
      if (email) {
        // Extract username from email (part before @) and clean it
        baseUsername = email.split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ''); // Remove dots, hyphens, and other special characters
        
        // Ensure minimum length
        if (baseUsername.length < 3) {
          baseUsername = baseUsername + 'user';
        }
      } else {
        // Fallback for users without email (phone-only users)
        baseUsername = newUserName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (baseUsername.length < 3) {
          baseUsername = 'user';
        }
      }
      
      let username = baseUsername;
      let counter = 1;
      
      // Ensure username is unique
      while (await User.findOne({ username: username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = new User({
        firebaseUid: uid,
        username: username, // Add the generated unique username
        email: email, // Firebase email is usually verified
        name: newUserName, // Use determined name
        displayName: name || newUserName, // Set displayName
        photoURL: picture,
        phoneNumber: phone_number, // Add phone number if available
        role: 'student', // Default role for new Firebase users
        referralCode: referralCode, // Assign generated referral code
      });

      // Set free trial expiration date for new Firebase users
      const now = new Date();
      user.freeTrialEndsAt = new Date(now.setDate(now.getDate() + DEFAULT_FREE_TRIAL_DAYS));
      user.accountExpiresAt = user.freeTrialEndsAt; // Initially, account expires when trial ends

      // Handle referral code input if provided for new Firebase user
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
      // accountExpiresAt and freeTrialEndsAt are not typically returned on login for security/privacy.
      // They should be fetched via a dedicated profile endpoint.
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

/**
 * Generate referral codes for existing users
 * 
 * @route POST /api/auth/generate-referral-codes
 * @access Admin
 * 
 * @description Administrative function to generate unique referral codes for 
 * existing users who don't have them. This is useful for migrating existing
 * users to the referral system or for batch processing of user accounts.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with generation results
 * @returns {string} returns.message - Summary of operation
 * @returns {number} returns.totalUsersWithoutCodes - Total users found without codes
 * @returns {number} returns.updatedCount - Number of users successfully updated
 * 
 * @throws {500} Server error during referral code generation
 * 
 * @example
 * // Response for successful generation
 * {
 *   "message": "Generated referral codes for 150 users",
 *   "totalUsersWithoutCodes": 150,
 *   "updatedCount": 150
 * }
 */
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

/**
 * Get user's referral information and statistics
 * 
 * @route GET /api/auth/referral-info
 * @access Private (Student/Admin)
 * 
 * @description Retrieves comprehensive referral information for the authenticated user
 * including their personal referral code, successful referrals count, who referred them,
 * and a shareable referral link. Automatically generates a referral code if the user
 * doesn't have one.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information from middleware
 * @param {string} req.user.userId - User's unique identifier
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with referral information
 * @returns {string} returns.referralCode - User's unique referral code
 * @returns {number} returns.successfulReferrals - Count of successful referrals made
 * @returns {Object|null} returns.referredBy - Information about who referred this user
 * @returns {string} returns.referralLink - Complete shareable referral URL
 * 
 * @throws {404} User not found
 * @throws {500} Server error during information retrieval
 * 
 * @example
 * // Response for user referral information
 * {
 *   "referralCode": "ABC123XYZ",
 *   "successfulReferrals": 5,
 *   "referredBy": {
 *     "name": "Jane Smith",
 *     "email": "jane@example.com"
 *   },
 *   "referralLink": "http://localhost:4200/register?ref=ABC123XYZ"
 * }
 */
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

/**
 * Apply referral code to existing user account
 * 
 * @route POST /api/auth/apply-referral-code
 * @access Private (Student/Admin)
 * 
 * @description Allows existing users to apply a referral code after registration.
 * This is useful for users who didn't use a referral code during initial signup
 * but want to establish a referral relationship later. Processes referral bonuses
 * for both users upon successful application.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information from middleware
 * @param {string} req.user.userId - User's unique identifier
 * @param {Object} req.body - Request body containing referral code
 * @param {string} req.body.referralCode - Referral code to apply
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with application result
 * @returns {string} returns.message - Success message
 * @returns {Object} returns.referredBy - Information about the referrer
 * @returns {string} returns.referredBy.name - Referrer's name
 * @returns {string} returns.referredBy.email - Referrer's email
 * 
 * @throws {400} Referral code is required
 * @throws {400} User already has a referral relationship
 * @throws {400} Invalid referral code
 * @throws {400} Self-referral attempt
 * @throws {404} User not found
 * @throws {500} Server error during referral application
 * 
 * @example
 * // Request body for applying referral code
 * {
 *   "referralCode": "ABC123XYZ"
 * }
 * 
 * // Response for successful application
 * {
 *   "message": "Referral code applied successfully!",
 *   "referredBy": {
 *     "name": "Jane Smith",
 *     "email": "jane@example.com"
 *   }
 * }
 */
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

/**
 * Get current logged-in user's profile
 * 
 * @route GET /api/auth/profile
 * @access Private
 * 
 * @description Fetches the complete profile for the authenticated user,
 * including account status information like accountExpiresAt and freeTrialEndsAt.
 * 
 * @param {Object} req - Express request object, req.user populated by auth middleware
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user profile data
 * @throws {404} User not found
 * @throws {500} Server error
 */
exports.getUserProfile = async (req, res) => {
  try {
    // req.user.userId is populated by the authenticateUser middleware
    const user = await User.findById(req.user.userId).select('-password'); // Exclude password

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user); // Send the full user object

  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Refresh JWT token
 * 
 * @route POST /api/auth/refresh-token
 * @access Private
 * 
 * @description Refreshes an expired or soon-to-expire JWT token for authenticated users.
 * This endpoint helps prevent connection loops in socket connections when tokens expire.
 * It validates the existing token (even if expired) and issues a new one if the user is valid.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User information from token (may be from expired token)
 * @param {string} req.user.userId - User's unique identifier
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with new token
 * @returns {string} returns.token - New JWT authentication token
 * @returns {string} returns.message - Success message
 * @returns {string} returns.userId - User's unique identifier
 * @returns {string} returns.role - User role
 * @returns {string} returns.name - User's name
 * 
 * @throws {404} User not found or account deleted
 * @throws {500} Server error during token refresh
 * 
 * @example
 * // Response for successful token refresh
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "message": "Token refreshed successfully",
 *   "userId": "60d5ecb54b24a1234567890a",
 *   "role": "student",
 *   "name": "John Doe"
 * }
 */
exports.refreshToken = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Verify user still exists and account is active
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found or account has been deleted' 
      });
    }

    // Generate new token with fresh expiration
    const newToken = jwt.sign(
      { userId: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log(`✅ Token refreshed for user: ${user.email || user.phoneNumber} (${user._id})`);

    res.json({
      token: newToken,
      message: 'Token refreshed successfully',
      userId: user._id,
      role: user.role,
      name: user.name
    });

  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    res.status(500).json({ 
      message: 'Server error during token refresh',
      error: error.message 
    });
  }
};
