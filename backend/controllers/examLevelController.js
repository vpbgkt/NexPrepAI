/**
 * @fileoverview Exam Level Controller
 * 
 * This module handles exam level management operations for the NexPrep platform,
 * providing functionality to manage different educational levels within exam families.
 * Exam levels represent educational categories (UG, PG, Doctorate, etc.) that help
 * organize exams by academic qualification requirements.
 * 
 * @module controllers/examLevelController
 * 
 * @requires ../models/ExamLevel - Exam level data model
 * 
 * @description Features include:
 * - Complete exam level listing and retrieval
 * - Filtering levels by associated exam families
 * - Exam level creation with validation
 * - Alphabetical sorting for consistent ordering
 * - Creator tracking for audit trails
 * - Comprehensive error handling and validation
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const ExamLevel = require('../models/ExamLevel');

/**
 * Get all exam levels in the system
 * 
 * @route GET /api/examLevels
 * @access Private (requires authentication)
 * 
 * @description Retrieves all exam levels from the database, sorted alphabetically
 * by name for consistent ordering. Populates family information for complete context.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam level objects
 * @returns {string} returns[]._id - Exam level unique identifier
 * @returns {Object} returns[].family - Associated exam family object
 * @returns {string} returns[].code - Exam level code (UG, PG, etc.)
 * @returns {string} returns[].name - Exam level display name
 * @returns {string} returns[].description - Optional description
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during data retrieval
 */
exports.getLevels = async (req, res) => {
  try {
    const levels = await ExamLevel.find()
      .populate('family', 'code name')
      .sort('name');
    res.json(levels);
  } catch (err) {
    console.error('Error fetching exam levels:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get exam levels filtered by family
 * 
 * @route GET /api/examLevels/by-family?family=<familyId>
 * @access Private (requires authentication)
 * 
 * @description Retrieves all exam levels associated with a specific exam family.
 * This endpoint is useful for displaying available educational levels when users 
 * select a particular exam family. Results are sorted alphabetically by name.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.family - Exam family ObjectId (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam level objects
 * @returns {string} returns[]._id - Exam level unique identifier
 * @returns {string} returns[].family - Associated exam family ObjectId
 * @returns {string} returns[].code - Exam level code
 * @returns {string} returns[].name - Exam level display name
 * @returns {string} returns[].description - Optional description
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {400} Missing family query parameter
 * @throws {500} Server error during data retrieval
 */
exports.getLevelsByFamily = async (req, res) => {
  try {
    const { family } = req.query;
    if (!family) {
      return res.status(400).json({ message: 'family query param is required' });
    }
    const levels = await ExamLevel.find({ family }).sort('name');
    res.json(levels);
  } catch (err) {
    console.error('Error fetching levels by family:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Create a new exam level
 * 
 * @route POST /api/examLevels
 * @access Private/Admin
 * 
 * @description Creates a new exam level in the system for a specific exam family.
 * Exam levels help categorize exams by educational qualification requirements.
 * The creator's user ID is automatically extracted from the authenticated JWT
 * token for audit trail purposes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing level data
 * @param {string} req.body.family - Associated exam family ObjectId
 * @param {string} req.body.code - Exam level code (UG, PG, DOC, DIP, 10+2, GRAD, SCH)
 * @param {string} req.body.name - Exam level display name
 * @param {string} [req.body.description] - Optional description
 * @param {Object} req.user - Authenticated user object from JWT middleware
 * @param {string} req.user.userId - Creator's user ID
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created exam level data
 * @returns {string} returns._id - Generated exam level unique identifier
 * @returns {string} returns.family - Associated exam family ObjectId
 * @returns {string} returns.code - Exam level code
 * @returns {string} returns.name - Exam level display name
 * @returns {string} returns.description - Optional description
 * @returns {string} returns.createdBy - Creator user ID
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
 * 
 * @throws {400} Invalid request data or validation errors
 * @throws {401} Unauthorized access (missing or invalid JWT token)
 * @throws {500} Server error during level creation
 */
exports.createLevel = async (req, res) => {
  try {
    const { family, code, name, description } = req.body;
    const createdBy = req.user.userId;
    
    const level = new ExamLevel({ 
      family, 
      code: code.toUpperCase(), 
      name, 
      description: description || '',
      createdBy 
    });
    
    await level.save();
    res.status(201).json(level);
  } catch (err) {
    console.error('Error creating exam level:', err);
    res.status(400).json({ message: err.message });
  }
};
