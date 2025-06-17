const express = require('express');
const router = express.Router();
const { verifyToken, requireRoles } = require('../middleware/verifyToken');
const {
  getBranches,
  getBranchesByLevel,
  createBranch
} = require('../controllers/examBranchController');

// Modified GET route to handle both all branches and branches filtered by level
router.get('/', verifyToken, (req, res, next) => {
  if (req.query.level) {
    // If 'level' query parameter exists, delegate to getBranchesByLevel controller
    getBranchesByLevel(req, res, next);
  } else {
    // Otherwise, delegate to getBranches controller
    getBranches(req, res, next);
  }
});

// Alternative route for level filtering (explicit)
router.get('/by-level', verifyToken, getBranchesByLevel);

// POST new branch (Admin and Super Admin allowed)
router.post('/', verifyToken, requireRoles(['admin', 'super admin', 'superadmin']), createBranch);

module.exports = router;
