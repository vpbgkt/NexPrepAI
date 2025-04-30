const ExamStream = require('../models/ExamStream');

// GET /api/examStreams?family=:familyId
exports.getByFamily = async (req, res) => {
  try {
    const { family } = req.query;
    if (!family) return res.status(400).json({ message: 'family query required' });
    const list = await ExamStream.find({ family }).sort('name');
    res.json(list);
  } catch (err) {
    console.error('Error loading streams:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/examStreams  (admin only)
exports.createStream = async (req, res) => {
  try {
    const { family, code, name } = req.body;
    const stream = new ExamStream({ family, code, name });
    await stream.save();
    res.status(201).json(stream);
  } catch (err) {
    console.error('Error creating exam stream:', err);
    res.status(400).json({ message: err.message });
  }
};