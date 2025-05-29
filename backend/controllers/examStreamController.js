/**
 * @fileoverview Exam Stream Controller
 * 
 * This module handles exam stream management operations for the NexPrep platform,
 * providing functionality to manage different exam streams within the educational
 * hierarchy. Exam streams represent specific tracks or categories within an exam
 * family (e.g., JEE Main, JEE Advanced within JEE family, or AIIMS, NEET within
 * Medical entrance family).
 * 
 * @module controllers/examStreamController
 * 
 * @requires ../models/ExamStream - Exam stream data model
 * 
 * @description Features include:
 * - Complete exam stream listing and retrieval
 * - Filtering streams by associated exam families
 * - Exam stream creation with hierarchy validation
 * - Alphabetical sorting for consistent ordering
 * - Creator tracking for audit trails
 * - Comprehensive error handling and validation
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const ExamStream = require('../models/ExamStream');

/**
 * Get exam streams filtered by family
 * 
 * @route GET /api/examStreams?family=<familyId>
 * @access Public
 * 
 * @description Retrieves all exam streams associated with a specific exam family.
 * This endpoint is essential for the hierarchical navigation of exams, allowing
 * users to see available streams when they select a particular exam family.
 * Results are sorted alphabetically by name for consistent user experience.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.family - Exam family ObjectId (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam stream objects
 * @returns {string} returns[]._id - Exam stream unique identifier
 * @returns {string} returns[].family - Associated exam family ObjectId (matches query)
 * @returns {string} returns[].code - Exam stream code
 * @returns {string} returns[].name - Exam stream display name
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {400} Missing family query parameter
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Request: GET /api/examStreams?family=64f8a1b2c3d4e5f6a7b8c9d1
 * // Response with family-filtered streams
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "family": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "code": "JEE_MAIN",
 *     "name": "JEE Main",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
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

/**
 * Get all exam streams in the system
 * 
 * @route GET /api/examStreams
 * @access Public
 * 
 * @description Retrieves all exam streams from the database without any filtering.
 * This endpoint provides a complete list of all available exam streams across
 * all families in the system, useful for administrative purposes and system
 * overview.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam stream objects
 * @returns {string} returns[]._id - Exam stream unique identifier
 * @returns {string} returns[].family - Associated exam family ObjectId
 * @returns {string} returns[].code - Exam stream code
 * @returns {string} returns[].name - Exam stream display name
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Response with all exam streams
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "family": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "code": "JEE_MAIN",
 *     "name": "JEE Main",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
exports.getStreams = async (req, res) => {
  try {
    const streams = await ExamStream.find();
    res.json(streams);
  } catch (err) {
    console.error('Error fetching streams:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Create a new exam stream
 * 
 * @route POST /api/examStreams
 * @access Private/Admin
 * 
 * @description Creates a new exam stream in the system within a specific exam family.
 * Exam streams help organize exams into logical categories or tracks within a
 * broader examination family. The creator's user ID is automatically extracted
 * from the authenticated JWT token for audit trail purposes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing stream data
 * @param {string} req.body.family - Associated exam family ObjectId
 * @param {string} req.body.code - Unique exam stream code (e.g., "JEE_MAIN", "NEET")
 * @param {string} req.body.name - Exam stream display name
 * @param {Object} req.user - Authenticated user object from JWT middleware
 * @param {string} req.user.userId - Creator's user ID
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created exam stream data
 * @returns {string} returns._id - Generated exam stream unique identifier
 * @returns {string} returns.family - Associated exam family ObjectId
 * @returns {string} returns.code - Exam stream code
 * @returns {string} returns.name - Exam stream display name
 * @returns {string} returns.createdBy - Creator user ID
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
 * 
 * @throws {400} Invalid request data or validation errors
 * @throws {401} Unauthorized access (missing or invalid JWT token)
 * @throws {500} Server error during stream creation
 * 
 * @example
 * // Request body
 * {
 *   "family": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "code": "JEE_MAIN",
 *   "name": "JEE Main"
 * }
 * 
 * // Response
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "family": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "code": "JEE_MAIN",
 *   "name": "JEE Main",
 *   "createdBy": "64f8a1b2c3d4e5f6a7b8c9d2",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z"
 * }
 */
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