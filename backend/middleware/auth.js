const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access Denied: No token provided" });
  }

  try {
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

/**
 * Special middleware for token refresh that accepts expired tokens
 * This allows the refresh endpoint to work even with expired tokens
 */
const authenticateForRefresh = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access Denied: No token provided" });
  }

  try {
    // Try to verify token normally first
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    // If token is expired, try to decode it without verification to get user info
    if (err.name === 'TokenExpiredError') {
      try {
        const decoded = jwt.decode(token.split(" ")[1]);
        if (decoded && decoded.userId) {
          req.user = decoded;
          next();
        } else {
          res.status(400).json({ message: "Invalid token format" });
        }
      } catch (decodeErr) {
        res.status(400).json({ message: "Invalid token format" });
      }
    } else {
      res.status(400).json({ message: "Invalid Token" });
    }
  }
};

module.exports = { authenticateUser, authenticateForRefresh };
