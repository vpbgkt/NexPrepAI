// middleware/verifyToken.js
/**
 * Middleware: verifyToken.js
 * -------------------------------------
 * Verifies JWT token sent via the `Authorization` header in the format:
 * "Bearer <token>"
 *
 * If token is valid, attaches `req.user` with decoded user info and proceeds.
 * If invalid or missing, responds with 401 Unauthorized.
 *
 * Used to protect student-facing and authenticated routes.
 *
 * Depends on:
 * - jsonwebtoken
 * - models/User.js (to check existence of user)
 */

const jwt = require('jsonwebtoken');

// 1. verifyToken attaches req.user
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token format' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Token invalid or expired' });
    req.user = {
      userId: decoded.userId, // Changed from decoded.id to decoded.userId to match what's in the token
      role:   decoded.role
    };
    next();
  });
}

// 2. requireRole factory checks req.user.role
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden: insufficient privileges' });
    }
    next();
  };
}

// 3. requireRoles factory checks req.user.role against multiple allowed roles
function requireRoles(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient privileges' });
    }
    next();
  };
}

// 4. Export both functions
module.exports = {
  verifyToken,
  requireRole,
  requireRoles
};
