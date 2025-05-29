/**
 * @fileoverview Exam Type Controller
 * 
 * This module handles exam type management operations for the NexPrep platform,
 * providing functionality to manage different types of examinations. Exam types
 * represent broad categories of examinations (e.g., Engineering Entrance,
 * Medical Entrance, Banking, SSC, etc.) that serve as the foundation of the
 * educational hierarchy.
 * 
 * @module controllers/examTypeController
 * 
 * @requires ../models/ExamType - Exam type data model
 * 
 * @description Features include:
 * - Listing of active exam types for selection
 * - Exam type creation with duplicate prevention
 * - Code-based uniqueness validation
 * - Selective field projection for performance
 * - Comprehensive error handling and validation
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const ExamType = require('../models/ExamType');

/**
 * Get list of active exam types
 * 
 * @route GET /api/examTypes
 * @access Public
 * 
 * @description Retrieves all active exam types from the database with selective
 * field projection for optimal performance. Only returns the essential fields
 * (code and name) for dropdown lists and selection components. Inactive exam
 * types are filtered out to maintain data integrity.
 * 
 * @param {Object} req - Express request object (unused)
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of active exam type objects
 * @returns {string} returns[]._id - Exam type unique identifier
 * @returns {string} returns[].code - Exam type code
 * @returns {string} returns[].name - Exam type display name
 * 
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Response with active exam types
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "code": "ENGINEERING",
 *     "name": "Engineering Entrance"
 *   },
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "code": "MEDICAL",
 *     "name": "Medical Entrance"
 *   }
 * ]
 */
exports.list = async (_, res) => {
  try {
    const list = await ExamType.find({ active: true }).select('code name');
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch exam types' });
  }
};

/**
 * Create a new exam type
 * 
 * @route POST /api/examTypes
 * @access Private/Admin
 * 
 * @description Creates a new exam type in the system with duplicate prevention.
 * Validates that the exam type code is unique before creation to maintain data
 * integrity. Exam types serve as the top-level categorization in the educational
 * hierarchy, so uniqueness is critical for proper organization.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing exam type data
 * @param {string} req.body.code - Unique exam type code (e.g., "ENGINEERING", "MEDICAL")
 * @param {string} req.body.name - Exam type display name
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created exam type data
 * @returns {string} returns._id - Generated exam type unique identifier
 * @returns {string} returns.code - Exam type code
 * @returns {string} returns.name - Exam type display name
 * @returns {boolean} returns.active - Active status (defaults to true)
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
 * 
 * @throws {409} Exam type with the same code already exists
 * @throws {500} Server error during exam type creation
 * 
 * @example
 * // Request body
 * {
 *   "code": "ENGINEERING",
 *   "name": "Engineering Entrance"
 * }
 * 
 * // Response
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "code": "ENGINEERING",
 *   "name": "Engineering Entrance",
 *   "active": true,
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z"
 * }
 */
exports.create = async (req, res) => {
  try {
    const { code, name } = req.body;
    const exists = await ExamType.findOne({ code });
    if (exists) return res.status(409).json({ message: 'Exam type already exists' });

    const et = await ExamType.create({ code, name });
    res.status(201).json(et);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create exam type' });
  }
};
