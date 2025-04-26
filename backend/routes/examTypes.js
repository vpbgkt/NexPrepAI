const router = require('express').Router();
const { list, create } = require('../controllers/examTypeController');
const { verifyToken } = require('../middleware/verifyToken');

// Public: get list
router.get('/', list);

// Protected: create new exam type (only admins should use)
router.post('/', verifyToken, create);

module.exports = router;
