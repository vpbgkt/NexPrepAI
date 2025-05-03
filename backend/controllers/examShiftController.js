const ExamShift = require('../models/ExamShift');

/**
 * GET /api/examShifts
 * Returns all shifts.
 */
exports.getShifts = async (req, res) => {
  try {
    const shifts = await ExamShift.find().sort('code');
    res.json(shifts);
  } catch (err) {
    console.error('Error fetching exam shifts:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/examShifts/by-paper?paper=<paperId>
 * Returns shifts for a specific paper.
 */
exports.getShiftsByPaper = async (req, res) => {
  try {
    const { paper } = req.query;
    if (!paper) {
      return res.status(400).json({ message: 'paper query param is required' });
    }
    const shifts = await ExamShift.find({ paper }).sort('code');
    res.json(shifts);
  } catch (err) {
    console.error('Error fetching shifts by paper:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/examShifts
 * Create a new shift (admin only).
 */
exports.createShift = async (req, res) => {
  try {
    const { paper, code, name } = req.body;
    const createdBy = req.user.userId;      // ← include creator
    const shift = new ExamShift({ paper, code, name, createdBy });
    await shift.save();
    res.status(201).json(shift);
  } catch (err) {
    console.error('Error creating exam shift:', err);
    res.status(400).json({ message: err.message });
  }
};