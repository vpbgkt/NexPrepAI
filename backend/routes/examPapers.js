const express = require('express');
const { verifyToken } = require('../middleware/verifyToken');
const {
  getPapers,
  getByStream,
  createPaper
} = require('../controllers/examPaperController');
const router = express.Router();

router.get('/', verifyToken, getPapers);
router.get('/', verifyToken, getByStream);
router.post('/', verifyToken, createPaper);

module.exports = router;