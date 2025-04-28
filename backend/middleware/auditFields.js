// Adds createdBy / updatedBy to req.body based on HTTP method
module.exports = function auditFields(req, res, next) {
  if (!req.user) return next(); // verifyToken must run earlier

  // Use req.user.id if available, otherwise try req.user._id
  const userId = req.user?.id || req.user?._id;
  
  if (req.method === 'POST') {
    req.body.createdBy = userId;
  } else if (['PUT', 'PATCH'].includes(req.method)) {
    req.body.updatedBy = userId;
  }
  next();
};