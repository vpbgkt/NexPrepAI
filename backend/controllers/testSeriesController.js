const mongoose   = require('mongoose');
const TestSeries = require('../models/TestSeries');   // ← make sure this points to /backend/models/tests.js
const Question   = require('../models/Question');

// 1) Create a new TestSeries by sampling questions
async function createTestSeries(req, res) {
  try {
    const {
      name, branchId, subjectId, topicId, subtopicId,
      questionCount, durationMinutes, totalMarks, negativeMarks
    } = req.body;

    // Build filter with real ObjectIds
    const filter = {};
    if (branchId)   filter.branch   = new mongoose.Types.ObjectId(branchId);
    if (subjectId)  filter.subject  = new mongoose.Types.ObjectId(subjectId);
    if (topicId)    filter.topic    = new mongoose.Types.ObjectId(topicId);
    if (subtopicId) filter.subtopic = new mongoose.Types.ObjectId(subtopicId);

    // Sample random questions
    const sampled = await Question.aggregate([
      { $match: filter },
      { $sample: { size: parseInt(questionCount, 10) } }
    ]);
    console.log('Sampled questions count:', sampled.length);

    // Save series
    const series = new TestSeries({
      name,
      branch:    filter.branch,
      subject:   filter.subject,
      topic:     filter.topic,
      subtopic:  filter.subtopic,
      questions: sampled.map(q => q._id),
      questionCount,
      durationMinutes,
      totalMarks,
      negativeMarks
    });
    const saved = await series.save();

    console.log(`Saved TestSeries ${saved._id} with ${saved.questions.length} questions`);
    return res.status(201).json(saved);

  } catch (err) {
    console.error('Error in createTestSeries:', err);
    // Include the full stack in the response while debugging:
    return res.status(500).json({ message: 'Server error', error: err.stack });
  }
}

// 2) Clone an existing TestSeries
async function cloneTestSeries(req, res) {
  try {
    const original = await TestSeries.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Not found' });

    const copy = new TestSeries({
      name:            original.name + ' (Clone)',
      branch:          original.branch,
      subject:         original.subject,
      topic:           original.topic,
      subtopic:        original.subtopic,
      questions:       original.questions,
      questionCount:   original.questionCount,
      durationMinutes: original.durationMinutes,
      totalMarks:      original.totalMarks,
      negativeMarks:   original.negativeMarks
    });

    const saved = await copy.save();
    return res.status(201).json(saved);

  } catch (err) {
    console.error('Error in cloneTestSeries:', err);
    return res.status(500).json({ message: 'Server error', error: err.stack });
  }
}

// 3) Get all TestSeries
async function getAllTestSeries(req, res) {
  try {
    // populate names so Angular can show them
    const all = await TestSeries.find()
      .populate('branch', 'name')
      .populate('subject', 'name')
      .populate('topic', 'name')
      .populate('subtopic', 'name')
      .sort({ createdAt: -1 });           // newest first
    return res.json(all);
  } catch (err) {
    console.error('Error in getAllTestSeries:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Export handlers as properties
module.exports = {
  createTestSeries,
  cloneTestSeries,
  getAllTestSeries
};
