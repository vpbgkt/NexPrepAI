const ExamPaper = require('../models/ExamPaper');

// GET /api/examPapers?stream=:streamId
exports.getPapersByStream = async (req, res) => {
  try {
    const { stream } = req.query;
    if (!stream) {
      return res.status(400).json({ message: 'stream query param is required' });
    }
    const papers = await ExamPaper.find({ stream }).sort('year name');
    res.json(papers);
  } catch (err) {
    console.error('Error fetching exam papers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/examPapers  (admin only)
exports.createPaper = async (req, res) => {
  try {
    const { stream, code, name, year } = req.body;
    const paper = new ExamPaper({ stream, code, name, year });
    await paper.save();
    res.status(201).json(paper);
  } catch (err) {
    console.error('Error creating exam paper:', err);
    res.status(400).json({ message: err.message });
  }
};