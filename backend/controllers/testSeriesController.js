/**
 * @fileoverview Test Series Controller
 * 
 * This module handles comprehensive test series management for the NexPrep platform,
 * providing admin-side operations for creating, managing, and organizing test series
 * with advanced features including section-based organization, question pooling,
 * variant management, and sophisticated randomization capabilities.
 * 
 * @module controllers/testSeriesController
 * 
 * @requires mongoose - MongoDB object modeling
 * @requires ../models/TestSeries - Test series data model
 * @requires ../models/Question - Question data model
 * @requires ../models/ExamShift - Exam shift model for automatic shift creation
 * 
 * @description Features include:
 * - Test series creation with sections and variants
 * - Question pool management and random selection
 * - Section and question order randomization
 * - Automatic shift creation for papers
 * - Test series cloning and duplication
 * - Comprehensive test series listing with population
 * - Random test generation from question banks
 * - Update operations with audit trail support
 * - Minimum question validation and enforcement
 * - Multi-variant test support with individual sections
 * 
 * @author NexPrep Development Team
 * @version 2.0.0
 */

const mongoose   = require('mongoose');
const TestSeries = require('../models/TestSeries');   // ← make sure this points to /backend/models/tests.js
const Question   = require('../models/Question');
const Enrollment = require('../models/Enrollment');   // Add enrollment model

/**
 * Process sections array to include new randomization and pooling fields
 * 
 * @description Helper function that ensures all section objects have the required
 * fields for question pooling and randomization features. Maintains existing
 * section properties while adding default values for new features.
 * 
 * @param {Array} sections - Array of section objects to process
 * @returns {Array} Processed sections with complete field structure
 * 
 * @example
 * const processedSections = processSections([
 *   {
 *     title: "Math",
 *     order: 1,
 *     questions: [{ question: "objectId", marks: 4 }]
 *   }
 * ]);
 */
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

/**
 * Process variants array and their sections
 * 
 * @description Helper function that processes test series variants and ensures
 * all variant sections have complete field structures for randomization and
 * pooling features. Used for multi-variant test series support.
 * 
 * @param {Array} variants - Array of variant objects to process
 * @returns {Array} Processed variants with complete section structures
 * 
 * @example
 * const processedVariants = processVariants([
 *   {
 *     code: "A",
 *     sections: [{ title: "Math", questions: [...] }]
 *   }
 * ]);
 */
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

/**
 * Create a new test series with comprehensive configuration options
 * 
 * @route POST /api/testSeries/create
 * @access Private (Admin only)
 * 
 * @description Creates a new test series with support for sections, variants, 
 * question pooling, randomization features, and automatic shift management.
 * Validates minimum question requirements and handles complex test configurations
 * including multi-variant papers and section-based organization.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing test series configuration
 * @param {string} req.body.title - Test series title (required)
 * @param {number} req.body.duration - Test duration in minutes (required)
 * @param {string} req.body.mode - Test mode (practice/live)
 * @param {string} req.body.type - Test type (Real_Exam/Practice_Exam/Live_Exam/Quiz_Exam)
 * @param {number} [req.body.year] - Exam year
 * @param {number} [req.body.maxAttempts] - Maximum attempts allowed
 * @param {Array} [req.body.sections] - Array of section objects
 * @param {Array} [req.body.variants] - Array of variant objects for multi-form tests
 * @param {Date} [req.body.startAt] - Test start time for live mode
 * @param {Date} [req.body.endAt] - Test end time for live mode
 * @param {string} req.body.family - Exam family ObjectId (required)
 * @param {string} req.body.stream - Exam stream ObjectId (required)
 * @param {string} req.body.paper - Exam paper ObjectId (required)
 * @param {string} [req.body.shift] - Exam shift ObjectId (auto-created if not provided)
 * @param {string} [req.body.createdBy] - Creator user ID (defaults to authenticated user)
 * @param {boolean} [req.body.randomizeSectionOrder] - Whether to randomize section order
 * @param {Object} req.user - Authenticated user information
 * @param {string} req.user.userId - User's unique identifier
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with created test series
 * @returns {string} returns._id - Created test series ID
 * @returns {string} returns.title - Test series title
 * @returns {Array} returns.sections - Processed sections array
 * @returns {Array} returns.variants - Processed variants array
 * @returns {Object} returns.shift - Created or found shift information
 * 
 * @throws {400} User ID is required but not found
 * @throws {400} Test series must have minimum required questions
 * @throws {500} Server error during test series creation
 * 
 * @example
 * // Request body for creating a test series
 * {
 *   "title": "JEE Main 2024 Practice Test",
 *   "duration": 180,
 *   "mode": "practice",
 *   "type": "Practice_Exam",
 *   "family": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "stream": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "paper": "64f8a1b2c3d4e5f6a7b8c9d2",
 *   "randomizeSectionOrder": true,
 *   "sections": [
 *     {
 *       "title": "Physics",
 *       "order": 1,
 *       "questions": [...]
 *     }
 *   ]
 * }
 */
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
      return res.status(400).json({ message: 'User ID is required but not found' });    }

    // Validate minimum question count
    let totalQuestions = 0;
    
    // Count questions from sections
    if (sections && Array.isArray(sections)) {
      sections.forEach(section => {
        // Count manual questions
        if (section.questions && Array.isArray(section.questions)) {
          totalQuestions += section.questions.length;
        }
        
        // Count questions from pool if applicable
        if (section.questionPool && Array.isArray(section.questionPool) && 
            section.questionsToSelectFromPool && section.questionsToSelectFromPool > 0) {
          const poolSize = section.questionPool.length;
          const toSelect = section.questionsToSelectFromPool;
          totalQuestions += Math.min(poolSize, toSelect);
        }
      });
    }
    
    // Count questions from variants
    if (variants && Array.isArray(variants)) {
      variants.forEach(variant => {
        if (variant.sections && Array.isArray(variant.sections)) {
          variant.sections.forEach(section => {
            // Count manual questions in variant sections
            if (section.questions && Array.isArray(section.questions)) {
              totalQuestions += section.questions.length;
            }
            
            // Count questions from pool in variant sections
            if (section.questionPool && Array.isArray(section.questionPool) && 
                section.questionsToSelectFromPool && section.questionsToSelectFromPool > 0) {
              const poolSize = section.questionPool.length;
              const toSelect = section.questionsToSelectFromPool;
              totalQuestions += Math.min(poolSize, toSelect);
            }
          });
        }
      });
    }
    
    // Count individual questions if used directly
    if (req.body.questions && Array.isArray(req.body.questions)) {
      totalQuestions += req.body.questions.length;
    }
    
    // Enforce minimum question count
    const MIN_QUESTIONS_REQUIRED = 2;
    if (totalQuestions < MIN_QUESTIONS_REQUIRED) {
      return res.status(400).json({ 
        message: `Test series must have at least ${MIN_QUESTIONS_REQUIRED} questions. Current count: ${totalQuestions}` 
      });
    }

    // Handle the case where shift is not provided but needed for the test series
    let shiftId = shift;
    
    // If shift is not provided but paper is, try to find a default shift
    if (!shiftId && paper) {
      const ExamShift = require('../models/ExamShift');
      
      // Try to find any shift for this paper
      const existingShifts = await ExamShift.find({ paper }).limit(1);
      
      if (existingShifts && existingShifts.length > 0) {
        // Use the first available shift
        shiftId = existingShifts[0]._id;
        console.log(`Using existing shift ${shiftId} for paper ${paper}`);
      } else {
        // Create a default "Main Shift" for this paper
        const defaultShift = new ExamShift({
          paper,
          code: 'main-shift',
          name: 'Main Shift',
          createdBy: userId
        });
        
        const savedShift = await defaultShift.save();
        shiftId = savedShift._id;
        console.log(`Created default shift ${shiftId} for paper ${paper}`);
      }
    }

    const newSeries = new TestSeries({
      title,
      family,
      stream,
      paper,
      shift: shiftId, // Use the found or created shift ID
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

/**
 * Clone an existing test series for reuse and modification
 * 
 * @route POST /api/testSeries/clone/:id
 * @access Private (Admin only)
 * 
 * @description Creates a duplicate copy of an existing test series with a modified
 * title to indicate it's a clone. Preserves all original configuration including
 * sections, questions, timing, and marking schemes while allowing for subsequent
 * modifications without affecting the original test series.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Original test series ID to clone
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with cloned test series
 * @returns {string} returns._id - New cloned test series ID
 * @returns {string} returns.name - Original title with " (Clone)" suffix
 * @returns {Array} returns.questions - Copied questions array
 * @returns {number} returns.totalMarks - Preserved total marks
 * @returns {number} returns.durationMinutes - Preserved duration
 * 
 * @throws {404} Original test series not found
 * @throws {500} Server error during cloning process
 * 
 * @example
 * // Clone test series with ID "64f8a1b2c3d4e5f6a7b8c9d0"
 * POST /api/testSeries/clone/64f8a1b2c3d4e5f6a7b8c9d0
 * 
 * // Response includes cloned series with modified title
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
 *   "name": "Original Test Series (Clone)",
 *   "questions": [...],
 *   "totalMarks": 100
 * }
 */
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

/**
 * Retrieve all test series with populated reference data
 * 
 * @route GET /api/testSeries
 * @access Private (Student/Admin)
 * 
 * @description Fetches all test series from the database with populated exam family,
 * stream, and paper information. Results are sorted by creation date (newest first)
 * and include complete reference data for display purposes in admin panels and
 * student dashboards.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of test series objects
 * @returns {string} returns[]._id - Test series unique identifier
 * @returns {string} returns[].title - Test series title
 * @returns {Object} returns[].family - Populated exam family with name and code
 * @returns {Object} returns[].stream - Populated exam stream with name and code
 * @returns {Object} returns[].paper - Populated exam paper with name and code
 * @returns {number} returns[].duration - Test duration in minutes
 * @returns {string} returns[].mode - Test mode (practice/live)
 * @returns {Array} returns[].sections - Test sections array
 * @returns {Date} returns[].createdAt - Creation timestamp
 * 
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Response array with populated test series
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "title": "JEE Main 2024 Practice",
 *     "family": { "name": "JEE", "code": "JEE" },
 *     "stream": { "name": "Engineering", "code": "ENG" },
 *     "paper": { "name": "Paper 1", "code": "P1" },
 *     "duration": 180,
 *     "mode": "practice"
 *   }
 * ]
 */
// 3) Get all TestSeries with enrollment filtering
async function getAllTestSeries(req, res) {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // For admin users, return all test series
    if (userRole === 'admin' || userRole === 'superadmin') {
      const all = await TestSeries.find()
        .populate('family', 'name code') // Populate family with name and code
        .populate('stream', 'name code') // Populate stream with name and code
        .populate('paper', 'name code')  // Populate paper with name and code
        .populate('shift', 'name code')  // Populate shift with name and code
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        data: all,
        message: 'All test series retrieved successfully'
      });
    }

    // For students, filter based on enrollments
    const studentEnrollments = await Enrollment.getActiveEnrollments(userId);
    
    if (!studentEnrollments || studentEnrollments.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No enrollments found. Please enroll in exam categories to access test series.',
        requiresEnrollment: true
      });
    }

    // Extract exam family IDs from enrollments
    const enrolledFamilyIds = studentEnrollments.map(enrollment => enrollment.examFamily._id);

    // Get all test series for enrolled exam families
    const testSeries = await TestSeries.find({
      family: { $in: enrolledFamilyIds }
    })
      .populate('family', 'name code')
      .populate('stream', 'name code')
      .populate('paper', 'name code')
      .populate('shift', 'name code')
      .sort({ createdAt: -1 });

    // Add enrollment metadata to each test series
    const enrichedTestSeries = testSeries.map(series => {
      const enrollment = studentEnrollments.find(e => 
        e.examFamily._id.toString() === series.family._id.toString()
      );

      return {
        ...series.toObject(),
        hasAccess: !enrollment.isExpired,
        accessLevel: enrollment.accessLevel,
        isTrialAccess: enrollment.isTrialEnrollment,
        trialDaysRemaining: enrollment.trialDaysRemaining,
        enrollmentId: enrollment._id
      };
    });

    res.json({
      success: true,
      data: enrichedTestSeries,
      message: 'Test series retrieved successfully',
      enrollmentInfo: {
        totalEnrollments: studentEnrollments.length,
        enrolledFamilies: studentEnrollments.map(e => ({
          id: e.examFamily._id,
          name: e.examFamily.name,
          accessLevel: e.accessLevel
        }))
      }
    });
  } catch (err) {
    console.error('Error in getAllTestSeries:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching test series' 
    });
  }
}

/**
 * Generate a random test series from question bank
 * 
 * @route POST /api/testSeries/random
 * @access Private (Admin only)
 * 
 * @description Creates a practice test series by randomly sampling questions from
 * the question bank. Useful for generating quick practice tests or assessment
 * papers without manual question selection. Uses MongoDB's aggregation pipeline
 * for efficient random sampling.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing generation parameters
 * @param {number} [req.body.count=50] - Number of random questions to include
 * @param {string} [req.body.title="Practice Paper"] - Generated test series title
 * @param {number} [req.body.duration=90] - Test duration in minutes
 * @param {number} [req.body.marksPerQuestion=1] - Marks assigned per question
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with created random test series
 * @returns {string} returns._id - Generated test series ID
 * @returns {string} returns.title - Test series title
 * @returns {Array} returns.questions - Array of randomly selected questions
 * @returns {number} returns.totalMarks - Calculated total marks
 * @returns {number} returns.duration - Test duration
 * @returns {boolean} returns.negativeMarking - Negative marking setting
 * 
 * @throws {500} Server error during random generation or database operations
 * 
 * @example
 * // Request body for random test generation
 * {
 *   "count": 100,
 *   "title": "Random Practice Test - Physics",
 *   "duration": 120,
 *   "marksPerQuestion": 2
 * }
 * 
 * // Response with generated test
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "title": "Random Practice Test - Physics",
 *   "questions": [...],
 *   "totalMarks": 200,
 *   "duration": 120
 * }
 */
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

/**
 * Get all test series with lean query for performance
 * 
 * @route GET /api/testSeries/all
 * @access Private (Student/Admin)
 * 
 * @description Alternative endpoint to fetch all test series using lean queries
 * for better performance. Returns basic test series data without populated
 * references, suitable for lightweight operations and quick listings.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of lean test series objects
 * @returns {string} returns[]._id - Test series ID
 * @returns {string} returns[].title - Test series title
 * @returns {string} returns[].family - Exam family ObjectId
 * @returns {string} returns[].stream - Exam stream ObjectId
 * @returns {string} returns[].paper - Exam paper ObjectId
 * 
 * @throws {500} Server error with error message
 * 
 * @example
 * // Lean response format
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "title": "JEE Main Practice",
 *     "family": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "stream": "64f8a1b2c3d4e5f6a7b8c9d2"
 *   }
 * ]
 */
exports.getAllSeries = async (req, res) => {
  try {
    const list = await TestSeries.find().lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update an existing test series with validation and audit trail
 * 
 * @route PUT /api/testSeries/:id
 * @access Private (Admin only)
 * 
 * @description Updates an existing test series with comprehensive field validation
 * and audit trail support. Processes sections and variants through helper functions
 * and maintains data integrity while allowing flexible updates to test configuration.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Test series ID to update
 * @param {Object} req.body - Request body containing update fields
 * @param {string} [req.body.title] - Updated test series title
 * @param {string} [req.body.family] - Updated exam family ObjectId
 * @param {string} [req.body.stream] - Updated exam stream ObjectId
 * @param {string} [req.body.paper] - Updated exam paper ObjectId
 * @param {string} [req.body.shift] - Updated exam shift ObjectId
 * @param {number} [req.body.duration] - Updated duration in minutes
 * @param {boolean} [req.body.negativeMarkEnabled] - Negative marking toggle
 * @param {number} [req.body.negativeMarkValue] - Negative marking value
 * @param {string} [req.body.mode] - Updated test mode
 * @param {string} [req.body.type] - Updated test type
 * @param {number} [req.body.year] - Updated exam year
 * @param {number} [req.body.maxAttempts] - Updated maximum attempts
 * @param {Array} [req.body.sections] - Updated sections array
 * @param {Array} [req.body.variants] - Updated variants array
 * @param {Date} [req.body.startAt] - Updated start time
 * @param {Date} [req.body.endAt] - Updated end time
 * @param {boolean} [req.body.randomizeSectionOrder] - Section randomization setting
 * @param {Object} req.user - Authenticated user information
 * @param {string} req.user._id - User ID for audit trail
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with updated test series
 * @returns {string} returns._id - Test series ID
 * @returns {string} returns.title - Updated title
 * @returns {Array} returns.sections - Processed sections
 * @returns {string} returns.updatedBy - User who performed the update
 * @returns {Date} returns.updatedAt - Update timestamp
 * 
 * @throws {404} Test series not found
 * @throws {500} Server error during update process
 * 
 * @example
 * // Request body for updating test series
 * {
 *   "title": "Updated JEE Main Practice",
 *   "duration": 200,
 *   "randomizeSectionOrder": false,
 *   "sections": [...]
 * }
 * 
 * // Response with updated test series
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "title": "Updated JEE Main Practice",
 *   "duration": 200,
 *   "updatedBy": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "updatedAt": "2024-01-15T10:30:00.000Z"
 * }
 */
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

/**
 * Module exports for test series controller functions
 * 
 * @description Exports all test series management functions for use in route handlers.
 * Includes both function declarations and exports references to maintain compatibility
 * with different import patterns and ensure proper function binding.
 */
// Export handlers as properties
module.exports = {
  createTestSeries,
  cloneTestSeries,
  getAllTestSeries,
  createRandomTestSeries,
  updateTestSeries: exports.updateTestSeries // Use exports reference instead of direct reference
};
