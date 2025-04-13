const express = require('express');
const router = express.Router();
const { addBranch } = require('../controllers/branchController');

// POST /api/branches/add
router.post('/add', addBranch);

module.exports = router;
