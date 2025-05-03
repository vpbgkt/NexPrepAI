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

// GET /api/examStreams
exports.getStreams = async (req, res) => {
  try {
    const streams = await ExamStream.find();
    res.json(streams);
  } catch (err) {
    console.error('Error fetching streams:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/examStreams
exports.createStream = async (req, res) => {
  try {
    const { family, code, name } = req.body;
    const createdBy = req.user.userId;
    const stream = new ExamStream({ family, code, name, createdBy });
    await stream.save();
    res.status(201).json(stream);
  } catch (err) {
    console.error('Error creating stream:', err);
    res.status(400).json({ message: err.message });
  }
};