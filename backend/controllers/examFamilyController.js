const ExamFamily = require('../models/ExamFamily');

// GET /api/examFamilies
exports.getAllFamilies = async (req, res) => {
  try {
    const list = await ExamFamily.find().sort('name');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/examFamilies  (admin only)
exports.createFamily = async (req, res) => {
  try {
    const { code, name, description } = req.body;
    const family = new ExamFamily({ code, name, description });
    await family.save();
    res.status(201).json(family);
  } catch (err) {
    console.error('Error creating exam family:', err);
    res.status(400).json({ message: err.message });
  }
};