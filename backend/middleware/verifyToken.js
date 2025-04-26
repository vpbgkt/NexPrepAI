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

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('Incoming Auth Header:', authHeader); // Log the Authorization header

  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  console.log('Extracted Token:', token); // Log the actual token

  if (!token) {
    console.log('Access Denied: No Token Provided!');
    return res.status(401).json({ message: 'Access Denied: No Token Provided!' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token is valid. Decoded payload:', decoded); // Log decoded payload
    req.user = decoded;
    next();
  } catch (error) {
    console.log('Invalid Token:', error.message); // Log the exact error
    res.status(403).json({ message: 'Invalid Token' });
  }
};

exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.log('Access Denied: Insufficient Role');
      return res.status(403).json({ message: 'Forbidden: Insufficient Role' });
    }
    next();
  };
};

module.exports = verifyToken;
