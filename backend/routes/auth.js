/**
 * Route: /api/auth
 * -------------------------------------
 * Public and private routes for user authentication.
 *
 * Routes:
 * - POST /register         → Register a new user
 * - POST /login            → Authenticate and return JWT token
 * - GET  /me               → Get current logged-in user profile
 *
 * Uses:
 * - authController.js
 * - verifyToken middleware
 */

const express = require('express');
const router = express.Router();
const { register, login, firebaseSignIn } = require('../controllers/authController'); // Added firebaseSignIn
const authenticateUser = require('../middleware/auth'); // ✅ NEW

router.post('/register', register);
router.post('/login', login);
router.post('/firebase-signin', firebaseSignIn); // New route for Firebase Sign-In

// ✅ NEW protected route
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    res.json({
      message: "This is a protected profile route",
      user: req.user
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
