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

const registerUser = async (req, res) => {
  try {
    const { username, name, email, password, role } = req.body; // Added 'name'

    if (!name) { // Add validation for name
      return res.status(400).json({ message: "Name is required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) 
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      name, // Added 'name'
      email,
      password: hashedPassword,
      role:    role || 'student',
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
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

    res.json({ token, role: user.role, name: user.name, userId: user._id });
  } catch (error) {
    console.error("❌ Error in login:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.firebaseSignIn = async (req, res) => {
  const { firebaseToken } = req.body;

  if (!firebaseToken) {
    return res.status(400).json({ message: 'Firebase token is required.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const { uid, email, name, picture } = decodedToken;

    let user = await User.findOne({ firebaseUid: uid });

    if (user) {
      // User exists with this Firebase UID, update details if necessary
      user.name = name || user.name;
      user.email = email || user.email; // Firebase email is usually verified
      user.photoURL = picture || user.photoURL;
      // If displayName is not set, consider using name from Firebase
      if (!user.displayName && name) {
        user.displayName = name;
      }
      await user.save();
    } else {
      // No user with this Firebase UID, try to find by email
      user = await User.findOne({ email: email });
      if (user) {
        // User exists with this email, link Firebase account
        user.firebaseUid = uid;
        user.name = name || user.name; // Update name if provided by Firebase
        user.photoURL = picture || user.photoURL;
        if (!user.displayName && name) {
          user.displayName = name;
        }
        // If user was created with a password, it remains.
        // If user had no username (e.g. if schema changes), this is an issue.
        // For now, assume username exists if user was found by email.
      } else {
        // No user with this email, create a new user
        let newUsername = email.split('@')[0]; // Basic username generation
        const existingUsername = await User.findOne({ username: newUsername });
        if (existingUsername) {
          newUsername = `${newUsername}_${uid.substring(0, 5)}`; // Make it more unique
        }

        user = new User({
          firebaseUid: uid,
          email: email,
          name: name || email.split('@')[0], // Default name if not provided
          username: newUsername,
          displayName: name || '',
          photoURL: picture || '',
          role: 'student', // Default role
          // Password not set for Firebase-created users
        });
      }
      await user.save();
    }

    // Generate your application's JWT
    const appToken = jwt.sign(
      { userId: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token: appToken,
      userId: user._id,
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      photoURL: user.photoURL,
      firebaseUid: user.firebaseUid
    });

  } catch (error) {
    console.error('Error during Firebase sign-in:', error);
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return res.status(401).json({ message: 'Invalid or expired Firebase token.' });
    }
    res.status(500).json({ message: 'Server error during Firebase sign-in.' });
  }
};
