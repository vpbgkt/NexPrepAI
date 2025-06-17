/**
 * @fileoverview Exam Branch Controller
 * 
 * This module handles exam branch management operations for the NexPrep platform,
 * providing functionality to manage different branches within exam levels.
 * Exam branches represent specific study fields or disciplines within an educational
 * level (e.g., Engineering, Medical, Commerce branches within UG level).
 * 
 * @module controllers/examBranchController
 * 
 * @requires ../models/ExamBranch - Exam branch data model
 * 
 * @description Features include:
 * - Complete exam branch listing and retrieval
 * - Filtering branches by associated exam levels
 * - Exam branch creation with auto-code generation
 * - Alphabetical sorting for consistent ordering
 * - Creator tracking for audit trails
 * - Comprehensive error handling and validation
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const ExamBranch = require('../models/ExamBranch');

/**
 * Get all exam branches in the system
 * 
 * @route GET /api/examBranches
 * @access Private (requires authentication)
 * 
 * @description Retrieves all exam branches from the database, sorted alphabetically
 * by name for consistent ordering. Populates level information for complete context.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam branch objects
 * @returns {string} returns[]._id - Exam branch unique identifier
 * @returns {Object} returns[].level - Associated exam level object
 * @returns {string} returns[].code - Exam branch code
 * @returns {string} returns[].name - Exam branch display name
 * @returns {string} returns[].description - Optional description
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during data retrieval
 */
exports.getBranches = async (req, res) => {
  try {
    const branches = await ExamBranch.find({ status: 'Active' })
      .populate('level', 'code name')
      .sort('name');
    res.json(branches);
  } catch (err) {
    console.error('Error fetching exam branches:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get exam branches filtered by level
 * 
 * @route GET /api/examBranches?level=<levelId>
 * @access Private (requires authentication)
 * 
 * @description Retrieves all exam branches associated with a specific exam level.
 * This endpoint is useful for displaying available branches when users select
 * a particular exam level. Results are sorted alphabetically by name.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.level - Exam level ObjectId (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam branch objects
 * @returns {string} returns[]._id - Exam branch unique identifier
 * @returns {string} returns[].level - Associated exam level ObjectId
 * @returns {string} returns[].code - Exam branch code
 * @returns {string} returns[].name - Exam branch display name
 * @returns {string} returns[].description - Optional description
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {400} Missing level query parameter
 * @throws {500} Server error during data retrieval
 */
exports.getBranchesByLevel = async (req, res) => {
  try {
    const { level } = req.query;
    
    if (!level) {
      return res.status(400).json({ message: 'Level ID is required' });
    }

    const branches = await ExamBranch.find({ level })
      .sort('name');
    res.json(branches);
  } catch (err) {
    console.error('Error fetching branches by level:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Create a new exam branch
 * 
 * @route POST /api/examBranches
 * @access Private/Admin
 * 
 * @description Creates a new exam branch in the system within a specific exam level.
 * Exam branches help organize educational disciplines with detailed classification
 * including level association, auto-generated codes, and comprehensive metadata.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing branch data
 * @param {string} req.body.level - Associated exam level ObjectId (required)
 * @param {string} req.body.code - Branch code (optional, auto-generated if not provided)
 * @param {string} req.body.name - Branch display name (required)
 * @param {string} req.body.description - Optional description
 * @param {Object} req.user - Authenticated user object
 * @param {string} req.user.userId - Creator user ID from JWT token
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created exam branch data
 * 
 * @throws {400} Invalid request data or validation errors
 * @throws {401} Unauthorized access (missing or invalid JWT token)
 * @throws {500} Server error during branch creation
 */
exports.createBranch = async (req, res) => {
  try {
    const { 
      level, 
      code, 
      name, 
      description = ''
    } = req.body;
    
    const createdBy = req.user.userId;
    
    // Auto-generate code if not provided
    let branchCode = code;
    if (!branchCode || branchCode.trim() === '') {
      branchCode = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    }
    
    const branch = new ExamBranch({ 
      level, 
      code: branchCode.toUpperCase(), 
      name, 
      description,
      createdBy 
    });
    
    await branch.save();
    
    // Populate references before returning
    await branch.populate([
      { path: 'level', select: 'code name' }
    ]);
    
    res.status(201).json(branch);
  } catch (err) {
    console.error('Error creating exam branch:', err);
    res.status(400).json({ message: err.message });
  }
};
