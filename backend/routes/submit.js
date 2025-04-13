const express = require('express');
const router = express.Router();
const { submitTest } = require('../controllers/submitController');
const verifyToken = require('../middleware/verifyToken');
const Submission = require('../models/Submission'); // Import Submission model

router.post('/', verifyToken, submitTest);

router.get('/my-submissions', verifyToken, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user.id }).sort({ submittedAt: -1 });
    res.status(200).json({ submissions });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching submissions', error: err.message });
  }
});

module.exports = router;
