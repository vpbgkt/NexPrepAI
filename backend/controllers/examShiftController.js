/**
 * @fileoverview Exam Shift Controller
 * 
 * This module handles exam shift management operations for the NexPrep platform,
 * providing functionality to manage different exam shifts within the educational
 * hierarchy. Exam shifts represent different time slots or sessions for the same
 * exam paper (e.g., Morning Shift, Afternoon Shift, Evening Shift).
 * 
 * @module controllers/examShiftController
 * 
 * @requires ../models/ExamShift - Exam shift data model
 * 
 * @description Features include:
 * - Complete exam shift listing and retrieval
 * - Filtering shifts by associated exam papers
 * - Exam shift creation with hierarchy validation
 * - Alphabetical sorting for consistent ordering
 * - Creator tracking for audit trails
 * - Comprehensive error handling and validation
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const ExamShift = require('../models/ExamShift');

/**
 * Get all exam shifts in the system
 * 
 * @route GET /api/examShifts
 * @access Public
 * 
 * @description Retrieves all exam shifts from the database, sorted alphabetically
 * by code for consistent ordering. This endpoint provides a complete list of all
 * available exam shifts across all papers and exams in the system.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam shift objects
 * @returns {string} returns[]._id - Exam shift unique identifier
 * @returns {string} returns[].paper - Associated exam paper ObjectId
 * @returns {string} returns[].code - Exam shift code (e.g., "MORNING", "EVENING")
 * @returns {string} returns[].name - Exam shift display name
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Response with exam shifts list
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "paper": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "code": "MORNING",
 *     "name": "Morning Shift",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
exports.getShifts = async (req, res) => {
  try {
    const shifts = await ExamShift.find()
      .populate('paper', 'code name')
      .sort('code');
    res.json(shifts);
  } catch (err) {
    console.error('Error fetching exam shifts:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get exam shifts filtered by paper
 * 
 * @route GET /api/examShifts/by-paper?paper=<paperId>
 * @access Public
 * 
 * @description Retrieves all exam shifts associated with a specific exam paper.
 * This endpoint is useful for displaying available time slots when users select
 * a particular exam paper. Results are sorted alphabetically by code for
 * consistent ordering (e.g., MORNING before EVENING).
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.paper - Exam paper ObjectId (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam shift objects
 * @returns {string} returns[]._id - Exam shift unique identifier
 * @returns {string} returns[].paper - Associated exam paper ObjectId (matches query)
 * @returns {string} returns[].code - Exam shift code
 * @returns {string} returns[].name - Exam shift display name
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {400} Missing paper query parameter
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Request: GET /api/examShifts/by-paper?paper=64f8a1b2c3d4e5f6a7b8c9d1
 * // Response with paper-filtered shifts
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "paper": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "code": "MORNING",
 *     "name": "Morning Shift (9:00 AM - 12:00 PM)"
 *   }
 * ]
 */
exports.getShiftsByPaper = async (req, res) => {
  try {
    const { paper } = req.query;
    if (!paper) {
      return res.status(400).json({ message: 'paper query param is required' });
    }
    const shifts = await ExamShift.find({ paper }).sort('code');
    res.json(shifts);
  } catch (err) {
    console.error('Error fetching shifts by paper:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Create a new exam shift
 * 
 * @route POST /api/examShifts
 * @access Private/Admin
 * 
 * @description Creates a new exam shift in the system for a specific exam paper.
 * Exam shifts allow organizing exams into different time slots or sessions.
 * The creator's user ID is automatically extracted from the authenticated JWT
 * token for audit trail purposes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing shift data
 * @param {string} req.body.paper - Associated exam paper ObjectId
 * @param {string} req.body.code - Unique exam shift code (e.g., "MORNING", "EVENING")
 * @param {string} req.body.name - Exam shift display name
 * @param {Object} req.user - Authenticated user object from JWT middleware
 * @param {string} req.user.userId - Creator's user ID
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created exam shift data
 * @returns {string} returns._id - Generated exam shift unique identifier
 * @returns {string} returns.paper - Associated exam paper ObjectId
 * @returns {string} returns.code - Exam shift code
 * @returns {string} returns.name - Exam shift display name
 * @returns {string} returns.createdBy - Creator user ID
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
 * 
 * @throws {400} Invalid request data or validation errors
 * @throws {401} Unauthorized access (missing or invalid JWT token)
 * @throws {500} Server error during shift creation
 * 
 * @example
 * // Request body
 * {
 *   "paper": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "code": "MORNING",
 *   "name": "Morning Shift (9:00 AM - 12:00 PM)"
 * }
 * 
 * // Response
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "paper": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "code": "MORNING",
 *   "name": "Morning Shift (9:00 AM - 12:00 PM)",
 *   "createdBy": "64f8a1b2c3d4e5f6a7b8c9d2",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z"
 * }
 */
exports.createShift = async (req, res) => {
  try {
    const { paper, code, name } = req.body;
    const createdBy = req.user.userId;      // ← include creator
    const shift = new ExamShift({ paper, code, name, createdBy });
    await shift.save();
    res.status(201).json(shift);
  } catch (err) {
    console.error('Error creating exam shift:', err);
    res.status(400).json({ message: err.message });
  }
};