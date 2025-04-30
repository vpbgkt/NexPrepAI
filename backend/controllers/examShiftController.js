const ExamShift = require('../models/ExamShift');

// GET /api/examShifts?paper=:paperId
exports.getShiftsByPaper = async (req, res) => {
  try {
    const { paper } = req.query;
    if (!paper) {
      return res.status(400).json({ message: 'paper query param is required' });
    }
    const shifts = await ExamShift.find({ paper }).sort('code');
    res.json(shifts);
  } catch (err) {
    console.error('Error fetching exam shifts:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/examShifts  (admin only)
exports.createShift = async (req, res) => {
  try {
    const { paper, code, name } = req.body;
    const shift = new ExamShift({ paper, code, name });
    await shift.save();
    res.status(201).json(shift);
  } catch (err) {
    console.error('Error creating exam shift:', err);
    res.status(400).json({ message: err.message });
  }
};