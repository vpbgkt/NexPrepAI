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
 * Get exam streams filtered by branch
 * 
 * @route GET /api/examStreams?branch=<branchId>
 * @access Public
 * 
 * @description Retrieves all exam streams associated with a specific exam branch.
 * This endpoint is essential for the hierarchical navigation of exams, allowing
 * users to see available streams when they select a particular exam branch.
 * Results are sorted alphabetically by name for consistent user experience.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.branch - Exam branch ObjectId (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam stream objects
 * @returns {string} returns[]._id - Exam stream unique identifier
 * @returns {string} returns[].family - Associated exam family ObjectId
 * @returns {string} returns[].level - Associated exam level ObjectId
 * @returns {string} returns[].branch - Associated exam branch ObjectId (matches query)
 * @returns {string} returns[].code - Exam stream code
 * @returns {string} returns[].name - Exam stream display name
 * @returns {string} returns[].conductingAuthority - Conducting authority
 * @returns {string} returns[].region - Region/state
 * @returns {string} returns[].language - Language
 * @returns {string} returns[].status - Status (Active/Archived)
 * @returns {string} returns[].description - Optional description
 * @returns {string} returns[].createdBy - Creator user ID
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {400} Missing branch query parameter
 * @throws {500} Server error during data retrieval
 */
exports.getByBranch = async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) return res.status(400).json({ message: 'branch query required' });
    const list = await ExamStream.find({ branch, status: 'Active' })
      .populate('family', 'code name')
      .populate('level', 'code name')
      .populate('branch', 'code name')
      .sort('name');
    res.json(list);
  } catch (err) {
    console.error('Error loading streams by branch:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get exam streams filtered by level
 * 
 * @route GET /api/examStreams?level=<levelId>
 * @access Public
 * 
 * @description Retrieves all exam streams associated with a specific exam level.
 * This endpoint provides backward compatibility and aggregated view of streams
 * across all branches within a level.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.level - Exam level ObjectId (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam stream objects
 */
exports.getByLevel = async (req, res) => {
  try {
    const { level } = req.query;
    if (!level) return res.status(400).json({ message: 'level query required' });
    const list = await ExamStream.find({ level, status: 'Active' })
      .populate('family', 'code name')
      .populate('level', 'code name')
      .populate('branch', 'code name')
      .sort('name');
    res.json(list);
  } catch (err) {
    console.error('Error loading streams by level:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get exam streams filtered by family (legacy support)
 * 
 * @route GET /api/examStreams?family=<familyId>
 * @access Public
 * 
 * @description Retrieves all exam streams associated with a specific exam family.
 * This endpoint maintains backward compatibility while the hierarchy transitions
 * to use levels. Results include all active streams within the family.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.family - Exam family ObjectId (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam stream objects
 */
exports.getByFamily = async (req, res) => {
  try {
    const { family } = req.query;
    if (!family) return res.status(400).json({ message: 'family query required' });
    const list = await ExamStream.find({ family, status: 'Active' })
      .populate('family', 'code name')
      .populate('level', 'code name')
      .populate('branch', 'code name')
      .sort('name');
    res.json(list);
  } catch (err) {
    console.error('Error loading streams by family:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all exam streams in the system
 * 
 * @route GET /api/examStreams
 * @access Public
 * 
 * @description Retrieves all active exam streams from the database with populated
 * references to family and level. This endpoint provides a complete list of all
 * available exam streams across all families and levels in the system.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of exam stream objects with populated references
 */
exports.getStreams = async (req, res) => {
  try {
    const streams = await ExamStream.find({ status: 'Active' })
      .populate('family', 'code name')
      .populate('level', 'code name')
      .populate('branch', 'code name')
      .sort('name');
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
 * @description Creates a new exam stream in the system within a specific exam level.
 * Exam streams help organize exams into logical categories with detailed classification
 * including conducting authority, region, language, and status information.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing stream data
 * @param {string} req.body.family - Associated exam family ObjectId
 * @param {string} req.body.level - Associated exam level ObjectId
 * @param {string} req.body.code - Unique exam stream code
 * @param {string} req.body.name - Exam stream display name
 * @param {string} req.body.conductingAuthority - Conducting authority (e.g., NTA, UPSC)
 * @param {string} [req.body.region] - Region/state (defaults to 'All-India')
 * @param {string} [req.body.language] - Language (defaults to 'English')
 * @param {string} [req.body.status] - Status (defaults to 'Active')
 * @param {string} [req.body.description] - Optional description
 * @param {Object} req.user - Authenticated user object from JWT middleware
 * @param {string} req.user.userId - Creator's user ID
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created exam stream data
 * 
 * @throws {400} Invalid request data or validation errors
 * @throws {401} Unauthorized access (missing or invalid JWT token)
 * @throws {500} Server error during stream creation
 */
exports.createStream = async (req, res) => {
  try {
    const { 
      family, 
      level,
      branch, 
      code, 
      name, 
      conductingAuthority,
      region = 'All-India',
      language = 'English',
      status = 'Active',
      description = ''
    } = req.body;
    
    const createdBy = req.user.userId;
    
    // Auto-generate code if not provided
    let streamCode = code;
    if (!streamCode || streamCode.trim() === '') {
      streamCode = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    }
    
    const stream = new ExamStream({ 
      family, 
      level,
      branch,
      code: streamCode.toUpperCase(), 
      name, 
      conductingAuthority,
      region,
      language,
      status,
      description,
      createdBy 
    });
    
    await stream.save();
    
    // Populate references before returning
    await stream.populate([
      { path: 'family', select: 'code name' },
      { path: 'level', select: 'code name' },
      { path: 'branch', select: 'code name' }
    ]);
    
    res.status(201).json(stream);
  } catch (err) {
    console.error('Error creating stream:', err);
    res.status(400).json({ message: err.message });
  }
};