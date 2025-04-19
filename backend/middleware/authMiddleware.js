/**
 * Middleware: authMiddleware.js
 * -------------------------------------
 * Provides role-based access control and user verification.
 *
 * Functions:
 * - authenticate(): Validates JWT and adds `req.user`
 * - authorizeRole(...roles): Restricts route access to specific roles (e.g., admin only)
 *
 * Used in:
 * - Admin-only routes like TestSeries creation or Question upload
 * - Routes requiring differentiated behavior by role
 *
 * Depends on:
 * - jsonwebtoken
 */

const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Access Denied" });
    }
    next();
  };
};

module.exports = { authenticate, authorizeRole };
