const ExamPaper = require('../models/ExamPaper');

/**
 * GET /api/examPapers
 * Returns all papers.
 */
exports.getPapers = async (req, res) => {
  try {
    const papers = await ExamPaper.find();
    res.json(papers);
  } catch (err) {
    console.error('Error fetching papers:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/examPapers?stream=<streamId>
 * Returns papers filtered by stream.
 */
exports.getByStream = async (req, res) => {
  try {
    const streamId = req.query.stream;
    if (!streamId) {
      return res.status(400).json({ message: 'stream query param required' });
    }
    const papers = await ExamPaper.find({ stream: streamId }).sort('name');
    res.json(papers);
  } catch (err) {
    console.error('Error fetching papers by stream:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/examPapers?family=<familyId>
 * Returns papers filtered by family.
 */
exports.getByFamily = async (req, res) => {
  try {
    const familyId = req.query.family;
    if (!familyId) {
      return res.status(400).json({ message: 'family query param required' });
    }
    
    // Find all streams for this family first
    const ExamStream = require('../models/ExamStream');
    const streams = await ExamStream.find({ family: familyId }).select('_id');
    const streamIds = streams.map(stream => stream._id);
    
    // Then find all papers for those streams
    const papers = await ExamPaper.find({ stream: { $in: streamIds } }).sort('name');
    res.json(papers);
  } catch (err) {
    console.error('Error fetching papers by family:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/examPapers
 * Create a new paper.
 */
exports.createPaper = async (req, res) => {
  try {
    const { family, stream, code, name, description } = req.body;

    // Pull creator ID from the verified token
    const createdBy = req.user.userId;

    const paper = new ExamPaper({
      family,
      stream,
      code,
      name,
      description,
      createdBy
    });

    await paper.save();
    res.status(201).json(paper);

  } catch (err) {
    console.error('Error creating exam paper:', err);
    res.status(400).json({ message: err.message });
  }
};