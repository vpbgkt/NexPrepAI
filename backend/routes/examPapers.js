const express = require('express');
const { verifyToken } = require('../middleware/verifyToken');
const {
  getPapers,
  getByStream,
  createPaper
} = require('../controllers/examPaperController');
const router = express.Router();

// Modified GET route to handle both all papers and papers filtered by stream
router.get('/', verifyToken, (req, res, next) => {
  if (req.query.stream) {
    // If 'stream' query parameter exists, delegate to getByStream controller
    getByStream(req, res, next);
  } else {
    // Otherwise, delegate to getPapers controller
    getPapers(req, res, next);
  }
});

router.post('/', verifyToken, createPaper);

module.exports = router;