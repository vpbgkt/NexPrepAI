const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const authenticateUser = require('../middleware/auth'); // ✅ NEW

router.post('/register', register);
router.post('/login', login);

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
