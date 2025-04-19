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

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
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
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
