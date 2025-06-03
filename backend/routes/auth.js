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
const { register, login, firebaseSignIn, generateReferralCodes, getReferralInfo, applyReferralCode, getUserProfile, refreshToken } = require('../controllers/authController'); // Added getUserProfile and refreshToken
const { authenticateUser, authenticateForRefresh } = require('../middleware/auth'); // ✅ Updated to use both middleware functions

router.post('/register', register);
router.post('/login', login);
router.post('/firebase-signin', firebaseSignIn); // New route for Firebase Sign-In

// ✅ NEW protected route
router.get('/profile', authenticateUser, getUserProfile);

// ✅ NEW token refresh route - uses special middleware for expired tokens
router.post('/refresh-token', authenticateForRefresh, refreshToken);


// Referral system routes
router.get('/referral-info', authenticateUser, getReferralInfo);
router.post('/apply-referral-code', authenticateUser, applyReferralCode);
router.post('/generate-referral-codes', authenticateUser, generateReferralCodes); // Admin only in production

module.exports = router;
