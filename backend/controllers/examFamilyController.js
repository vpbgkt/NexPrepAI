/**
 * @fileoverview Exam Family Controller
 * 
 * This module handles exam family management operations for the NexPrep platform,
 * providing functionality to manage different examination families or categories.
 * Exam families represent major examination systems (like JEE, NEET, GATE, etc.)
 * that group related exams, streams, and papers together in a hierarchical structure.
 * 
 * @module controllers/examFamilyController
 * 
 * @requires ../models/ExamFamily - Exam family data model
 * 
 * @description Features include:
 * - Comprehensive exam family listing with sorting
 * - Exam family creation with automatic code generation
 * - Input validation and sanitization
 * - Duplicate prevention through unique constraints
 * - Audit trail support with creator tracking
 * - Error handling for invalid requests
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const ExamFamily = require('../models/ExamFamily');

/**
 * Get all exam families in the system
 * 
 * @route GET /api/examFamilies
 * @access Public
 * 
 * @description Retrieves all exam families from the database sorted alphabetically
 * by name. This endpoint provides a complete list of available examination families
 * for use in dropdowns, filters, and navigation throughout the application.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam family objects
 * @returns {string} returns[]._id - Exam family unique identifier
 * @returns {string} returns[].code - Exam family code (slug)
 * @returns {string} returns[].name - Exam family display name
 * @returns {string} returns[].description - Exam family description
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Response with exam families list
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "code": "jee",
 *     "name": "JEE (Joint Entrance Examination)",
 *     "description": "Engineering entrance examination",
 *     "createdBy": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   },
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "code": "neet",
 *     "name": "NEET",
 *     "description": "Medical entrance examination",
 *     "createdBy": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
// GET /api/examFamilies
exports.getAllFamilies = async (req, res) => {
  try {
    const list = await ExamFamily.find().sort('name');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new exam family with automatic code generation
 * 
 * @route POST /api/examFamilies
 * @access Private (Admin only)
 * 
 * @description Creates a new exam family in the system with intelligent code generation.
 * If no code is provided, automatically generates a URL-friendly slug from the name.
 * Includes comprehensive validation, creator tracking for audit trails, and proper
 * error handling for duplicate entries and validation failures.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing exam family data
 * @param {string} [req.body.code] - Optional exam family code (auto-generated if not provided)
 * @param {string} req.body.name - Exam family name (required)
 * @param {string} [req.body.description] - Optional exam family description
 * @param {Object} req.user - Authenticated user information from middleware
 * @param {string} req.user.userId - Creator's user ID for audit trail
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with created exam family
 * @returns {string} returns._id - Exam family unique identifier
 * @returns {string} returns.code - Generated or provided exam family code
 * @returns {string} returns.name - Exam family name
 * @returns {string} returns.description - Exam family description
 * @returns {string} returns.createdBy - Creator user ID
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
 * 
 * @throws {400} Validation errors (missing name, duplicate code, etc.)
 * @throws {500} Server error during exam family creation
 * 
 * @algorithm Code Generation:
 * 1. If code is provided in request, use it after trimming whitespace
 * 2. If no code provided, generate from name by:
 *    - Converting to lowercase
 *    - Replacing spaces with hyphens
 *    - Creating URL-friendly slug
 * 
 * @example
 * // Request body with manual code
 * {
 *   "code": "jee-main",
 *   "name": "JEE Main",
 *   "description": "Joint Entrance Examination Main"
 * }
 * 
 * // Request body with auto-generated code
 * {
 *   "name": "NEET UG",
 *   "description": "National Eligibility Entrance Test"
 * }
 * // Generated code will be: "neet-ug"
 * 
 * // Response for successful creation
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "code": "jee-main",
 *   "name": "JEE Main",
 *   "description": "Joint Entrance Examination Main",
 *   "createdBy": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "createdAt": "2024-01-15T10:30:00.000Z",
 *   "updatedAt": "2024-01-15T10:30:00.000Z"
 * }
 */
// POST /api/examFamilies  (admin only)
exports.createFamily = async (req, res) => {
  try {
    // 1️⃣ Get the raw inputs
    const { code: codeInput, name, description } = req.body;

    // 2️⃣ Generate a slug if no code was provided
    const code = codeInput?.trim()
      ? codeInput.trim()
      : name.trim().toLowerCase().replace(/\s+/g, '-');

    // 3️⃣ Pull the creator’s ID from the authenticated token
    //    verifyToken middleware sets req.user = { userId, role }
    const createdBy = req.user.userId;

    // 4️⃣ Build and save
    const family = new ExamFamily({ code, name, description, createdBy });
    await family.save();

    // 5️⃣ Return the new document
    res.status(201).json(family);

  } catch (err) {
    console.error('Error creating exam family:', err);
    // Send the validation error message back to the client
    res.status(400).json({ message: err.message });
  }
};