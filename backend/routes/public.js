/**
 * Route: /api/public
 * -------------------------------------
 * Public routes for user profiles and general public data access.
 * These routes don't require authentication and are SEO-friendly.
 *
 * Routes:
 * - GET /profile/:username     → Get public user profile by username
 * - GET /check-username/:username → Check if username exists
 *
 * Uses:
 * - publicProfileController.js
 */

const express = require('express');
const router = express.Router();
const { getPublicProfile, checkUsername } = require('../controllers/publicProfileController');

// Public profile routes - no authentication required
router.get('/profile/:username', getPublicProfile);
router.get('/check-username/:username', checkUsername);

module.exports = router;
