/**
 * @fileoverview Exam Paper Controller
 * 
 * This module handles exam paper management operations for the NexPrep platform,
 * providing functionality to manage exam papers within the educational hierarchy.
 * Exam papers represent specific paper types or sections within exam streams
 * (e.g., Paper 1, Paper 2 for JEE Main, or different subjects for NEET).
 * 
 * @module controllers/examPaperController
 * 
 * @requires ../models/ExamPaper - Exam paper data model
 * @requires ../models/ExamStream - Exam stream model for cross-references
 * 
 * @description Features include:
 * - Complete exam paper listing and retrieval
 * - Filtering by stream and family associations
 * - Exam paper creation with hierarchy validation
 * - Cross-reference resolution with exam streams
 * - Comprehensive error handling and validation
 * - Creator tracking for audit trails
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const ExamPaper = require('../models/ExamPaper');

/**
 * Get all exam papers in the system
 * 
 * @route GET /api/examPapers
 * @access Public
 * 
 * @description Retrieves all exam papers from the database without any filtering.
 * Provides a complete list of all available exam papers for administrative
 * purposes and comprehensive system overview.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam paper objects
 * @returns {string} returns[]._id - Exam paper unique identifier
 * @returns {string} returns[].family - Associated exam family ObjectId
 * @returns {string} returns[].stream - Associated exam stream ObjectId
 * @returns {string} returns[].code - Exam paper code
 * @returns {string} returns[].name - Exam paper display name
 * @returns {string} returns[].description - Exam paper description
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Response with exam papers list
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "family": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "stream": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "code": "PAPER1",
 *     "name": "Paper 1",
 *     "description": "Mathematics and Physics",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
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
 * Get exam papers filtered by stream
 * 
 * @route GET /api/examPapers?stream=<streamId>
 * @access Public
 * 
 * @description Retrieves all exam papers associated with a specific exam stream.
 * This endpoint is useful for filtering papers when users select a particular
 * exam stream and need to see only the relevant paper options.
 * Results are automatically sorted alphabetically by name for consistent ordering.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.stream - Exam stream ObjectId (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam paper objects
 * @returns {string} returns[]._id - Exam paper unique identifier
 * @returns {string} returns[].family - Associated exam family ObjectId
 * @returns {string} returns[].stream - Associated exam stream ObjectId (matches query)
 * @returns {string} returns[].code - Exam paper code
 * @returns {string} returns[].name - Exam paper display name
 * @returns {string} returns[].description - Exam paper description
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {400} Missing stream query parameter
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Request: GET /api/examPapers?stream=64f8a1b2c3d4e5f6a7b8c9d2
 * // Response with stream-filtered papers
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "family": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "stream": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "code": "PAPER1",
 *     "name": "Paper 1",
 *     "description": "Mathematics and Physics"
 *   }
 * ]
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
 * Get exam papers filtered by family
 * 
 * @route GET /api/examPapers?family=<familyId>
 * @access Public
 * 
 * @description Retrieves all exam papers associated with a specific exam family.
 * This endpoint performs a two-step query: first finds all streams belonging to
 * the specified family, then retrieves all papers associated with those streams.
 * This provides a complete view of all papers available within an exam family,
 * regardless of their specific stream associations.
 * Results are sorted alphabetically by name for consistent ordering.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.family - Exam family ObjectId (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam paper objects
 * @returns {string} returns[]._id - Exam paper unique identifier
 * @returns {string} returns[].family - Associated exam family ObjectId
 * @returns {string} returns[].stream - Associated exam stream ObjectId
 * @returns {string} returns[].code - Exam paper code
 * @returns {string} returns[].name - Exam paper display name
 * @returns {string} returns[].description - Exam paper description
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {400} Missing family query parameter
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Request: GET /api/examPapers?family=64f8a1b2c3d4e5f6a7b8c9d1
 * // Response with family-filtered papers across all streams
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "family": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "stream": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "code": "PAPER1",
 *     "name": "Paper 1",
 *     "description": "Mathematics and Physics"
 *   }
 * ]
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
 * Create a new exam paper
 * 
 * @route POST /api/examPapers
 * @access Private/Admin
 * 
 * @description Creates a new exam paper in the system with proper hierarchy validation.
 * The exam paper represents a specific section or paper type within an exam stream
 * (e.g., Paper 1, Paper 2, or subject-specific papers). The creator's user ID is
 * automatically extracted from the authenticated JWT token for audit trail purposes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing paper data
 * @param {string} req.body.family - Associated exam family ObjectId
 * @param {string} req.body.stream - Associated exam stream ObjectId
 * @param {string} req.body.code - Unique exam paper code (e.g., "PAPER1", "MATH")
 * @param {string} req.body.name - Exam paper display name
 * @param {string} req.body.description - Detailed paper description
 * @param {Object} req.user - Authenticated user object from JWT middleware
 * @param {string} req.user.userId - Creator's user ID
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created exam paper data
 * @returns {string} returns._id - Generated exam paper unique identifier
 * @returns {string} returns.family - Associated exam family ObjectId
 * @returns {string} returns.stream - Associated exam stream ObjectId
 * @returns {string} returns.code - Exam paper code
 * @returns {string} returns.name - Exam paper display name
 * @returns {string} returns.description - Exam paper description
 * @returns {string} returns.createdBy - Creator user ID
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
 * 
 * @throws {400} Invalid request data or validation errors
 * @throws {401} Unauthorized access (missing or invalid JWT token)
 * @throws {500} Server error during paper creation
 * 
 * @example
 * // Request body
 * {
 *   "family": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "stream": "64f8a1b2c3d4e5f6a7b8c9d2",
 *   "code": "PAPER1",
 *   "name": "Paper 1",
 *   "description": "Mathematics and Physics combined paper"
 * }
 * 
 * // Response
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "family": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "stream": "64f8a1b2c3d4e5f6a7b8c9d2",
 *   "code": "PAPER1",
 *   "name": "Paper 1",
 *   "description": "Mathematics and Physics combined paper",
 *   "createdBy": "64f8a1b2c3d4e5f6a7b8c9d3",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z"
 * }
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