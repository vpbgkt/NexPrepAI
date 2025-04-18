const ExamType = require('../models/ExamType');

// GET /api/examTypes
exports.list = async (_, res) => {
  try {
    const list = await ExamType.find({ active: true }).select('code name');
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch exam types' });
  }
};

// POST /api/examTypes
exports.create = async (req, res) => {
  try {
    const { code, name } = req.body;
    const exists = await ExamType.findOne({ code });
    if (exists) return res.status(409).json({ message: 'Exam type already exists' });

    const et = await ExamType.create({ code, name });
    res.status(201).json(et);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create exam type' });
  }
};
