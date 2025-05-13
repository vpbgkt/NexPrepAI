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

// Helper function to process sections and include new fields
function processSections(sections) {
  if (!sections || !Array.isArray(sections)) {
    return [];
  }
  return sections.map(section => ({
    ...section, // Keep existing section properties like title, order, questions
    questionPool: section.questionPool || [],
    questionsToSelectFromPool: section.questionsToSelectFromPool || 0,
    randomizeQuestionOrderInSection: section.randomizeQuestionOrderInSection || false,
  }));
}

// Helper function to process variants and their sections
function processVariants(variants) {
  if (!variants || !Array.isArray(variants)) {
    return [];
  }
  return variants.map(variant => ({
    ...variant, // Keep existing variant properties like code
    sections: processSections(variant.sections), // Process sections within each variant
  }));
}

// 1) Create a new TestSeries by sampling questions
async function createTestSeries(req, res) {
  try {
    const {
      title,
      duration,
      mode,
      type,
      year,
      maxAttempts,
      sections,
      variants,
      startAt,
      endAt,
      family,
      stream,
      paper,
      shift,
      createdBy,
      randomizeSectionOrder // Added: new field for randomizing section order
    } = req.body;

    // Fixed user ID access - verifyToken middleware stores it as req.user.userId
    const userId = createdBy || req.user?.userId;
    
    if (!userId) {
      console.log('DEBUG: User data available:', req.user); // Add debug logging
      return res.status(400).json({ message: 'User ID is required but not found' });
    }

    const newSeries = new TestSeries({
      title,
      family,
      stream,
      paper,
      shift,
      duration,
      mode,
      type,
      year,
      maxAttempts,
      startAt,
      endAt,
      randomizeSectionOrder, // Added: save the new field
      ...(variants?.length > 0 ? { variants: processVariants(variants) }
        : sections?.length > 0 ? { sections: processSections(sections) }
        : { questions: req.body.questions }),
      createdBy: userId  // Use the correctly accessed userId
    });

    await newSeries.save();
    res.status(201).json(newSeries);
  } catch (error) {
    console.error('Error creating test series:', error);
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
    const all = await TestSeries.find()
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
      count = 50,     // number of random questions
      title = "Practice Paper",
      duration = 90,
      marksPerQuestion = 1
    } = req.body;

    const questions = await Question.aggregate([
      { $sample: { size: parseInt(count, 10) } }
    ]);

    const formatted = questions.map(q => ({
      question: q._id,
      marks: marksPerQuestion
    }));

    const series = new TestSeries({
      title,
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

exports.updateTestSeries = async (req, res) => {
  try {
    const { id } = req.params;

    // only allow these specific fields (optional)
    const fields = [
      'title', 'family', 'stream', 'paper', 'shift', 'duration',
      'negativeMarkEnabled', 'negativeMarkValue', 'mode', 'type',
      'year', 'maxAttempts', 'sections', 'variants', 'startAt', 'endAt',
      'randomizeSectionOrder' // Added randomizeSectionOrder
    ];
    const payload = {};
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        if (f === 'sections') {
          payload[f] = processSections(req.body[f]);
        } else if (f === 'variants') {
          payload[f] = processVariants(req.body[f]);
        } else {
          payload[f] = req.body[f];
        }
      }
    });
    payload.updatedBy = req.user._id; // Assuming req.user._id is available from auth middleware

    const updated = await TestSeries.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'TestSeries not found' });
    }
    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating test series:', error);
    res.status(500).json({ message: 'Failed to update test series', error: error.message });
  }
};

// Export handlers as properties
module.exports = {
  createTestSeries,
  cloneTestSeries,
  getAllTestSeries,
  createRandomTestSeries,
  updateTestSeries: exports.updateTestSeries // Use exports reference instead of direct reference
};
