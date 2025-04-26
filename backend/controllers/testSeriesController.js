/**
 * Controller: testSeriesController.js
 * -------------------------------------
 * Handles admin-side operations related to TestSeries creation and management.
 *
 * Functions:
 * - createTestSeries(): Create a new test series with a set of questions or sections
 * - createRandomTestSeries(): Sample random questions by criteria to create a test
 * - cloneTestSeries(): Make a copy of an existing test series for reuse/editing
 * - getAllTestSeries(): List all created test series with optional filters
 *
 * Works with:
 * - models/TestSeries.js
 * - models/Question.js
 */

const mongoose   = require('mongoose');
const TestSeries = require('../models/TestSeries');   // ← make sure this points to /backend/models/tests.js
const Question   = require('../models/Question');
const getExamTypeId = require('../utils/getExamTypeId');

// 1) Create a new TestSeries by sampling questions
async function createTestSeries(req, res) {
  try {
    const {
      title,
      duration,
      negativeMarking,
      year,
      examType,         // e.g., 'medical'
      questions,        // [{ question, marks }]
      sections,         // optional
      variants,         // added variants
      startAt,          // start time
      endAt             // end time
    } = req.body;

    if (!questions?.length && !sections?.length && !variants?.length) {
      return res.status(400).json({ message: 'Provide at least questions, sections, or variants' });
    }

    // Compute totalMarks
    const totalMarks = sections.reduce((secSum, sec) => {
      const secMarks = sec.questions.reduce((qSum, q) => qSum + (q.marks || 0), 0);
      return secSum + secMarks;
    }, 0);

    const newSeries = new TestSeries({
      title,
      duration,
      negativeMarking,
      year,
      examType: await getExamTypeId(examType),
      mode: ['live', 'practice'].includes(req.body.mode) ? req.body.mode : 'practice',
      startAt,
      endAt,

      ...(variants?.length > 0
        ? { variants }
        : sections?.length > 0
          ? { sections }
          : { questions }), // fallback to flat if no sections or variants
      totalMarks // Automatically computed
    });

    await newSeries.save();
    res.status(201).json(newSeries);
  } catch (error) {
    console.error('❌ Failed to create test series:', error);  // 👈 this logs the real error to terminal
    res.status(500).json({ message: 'Failed to create test series', error: error.message });
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
    const { examType } = req.query;
    const filter = {};

    if (examType) {
      const ExamType = require('../models/ExamType');
      const type = await ExamType.findOne({ code: examType.toLowerCase() });
      if (!type) return res.status(404).json({ message: 'Invalid exam type' });
      filter.examType = type._id;
    }

    const all = await TestSeries.find(filter)
      .populate('examType', 'code name')
      .sort({ createdAt: -1 });

    res.json(all);
  } catch (err) {
    console.error('Error in getAllTestSeries:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function createRandomTestSeries(req, res) {
  try {
    const {
      examType,       // "medical"
      count = 50,     // number of random questions
      title = "Practice Paper",
      duration = 90,
      marksPerQuestion = 1
    } = req.body;

    const typeId = await getExamTypeId(examType);

    const questions = await Question.aggregate([
      { $match: { examType: typeId } },
      { $sample: { size: parseInt(count, 10) } }
    ]);

    const formatted = questions.map(q => ({
      question: q._id,
      marks: marksPerQuestion
    }));

    const series = new TestSeries({
      title,
      examType: typeId,
      duration,
      totalMarks: formatted.length * marksPerQuestion,
      negativeMarking: false,
      questions: formatted
    });

    await series.save();
    return res.status(201).json(series);
  } catch (error) {
    console.error('❌ Random paper error:', error);
    res.status(500).json({ message: 'Failed to generate random paper' });
  }
}

// Removed duplicate import
// const TestSeries = require('../models/TestSeries');

exports.getAllSeries = async (req, res) => {
  try {
    const list = await TestSeries.find().lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Export handlers as properties
module.exports = {
  createTestSeries,
  cloneTestSeries,
  getAllTestSeries,
  createRandomTestSeries
};
