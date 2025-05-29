/**
 * @fileoverview Subject Controller
 * 
 * This module handles subject management operations for the NexPrep platform,
 * providing CRUD functionality for academic subjects within the educational
 * hierarchy. Subjects represent major academic disciplines within branches
 * (e.g., Physics, Chemistry, Mathematics within Engineering branch).
 * 
 * @module controllers/subjectController
 * 
 * @requires ../models/Subject - Subject data model
 * 
 * @description Features include:
 * - Subject creation with branch association
 * - Complete subject listing and retrieval
 * - Subject updates with validation
 * - Integration with admin panel dropdowns
 * - Support for CSV question import logic
 * - Comprehensive error handling and validation
 * 
 * @used_in
 * - Admin panel dropdowns for content management
 * - CSV question import functionality
 * - Educational content organization
 * 
 * @dependencies
 * - models/Subject.js - Subject data model
 * - models/Branch.js - Branch model for hierarchy validation
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const Subject = require('../models/Subject');

/**
 * Create a new subject
 * 
 * @route POST /api/subjects/add
 * @access Private/Admin
 * 
 * @description Creates a new subject associated with a specific academic branch.
 * This function is essential for building the educational content hierarchy,
 * allowing administrators to organize academic content by subjects within
 * branches. The subject-branch relationship is crucial for content categorization
 * and question organization.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing subject data
 * @param {string} req.body.name - Subject name (e.g., "Physics", "Chemistry")
 * @param {string} req.body.branchId - Associated branch ObjectId
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with creation success message and subject data
 * @returns {string} returns.message - Success message
 * @returns {Object} returns.subject - Created subject object
 * @returns {string} returns.subject._id - Generated subject unique identifier
 * @returns {string} returns.subject.name - Subject name
 * @returns {string} returns.subject.branch - Associated branch ObjectId
 * @returns {Date} returns.subject.createdAt - Creation timestamp
 * @returns {Date} returns.subject.updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during subject creation
 * 
 * @example
 * // Request body
 * {
 *   "name": "Physics",
 *   "branchId": "64f8a1b2c3d4e5f6a7b8c9d0"
 * }
 * 
 * // Response
 * {
 *   "message": "Subject added successfully",
 *   "subject": {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "name": "Physics",
 *     "branch": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */
const addSubject = async (req, res) => {
  try {
    const { name, branchId } = req.body;
    const subject = new Subject({ name, branch: branchId });
    await subject.save();
    res.status(201).json({ message: 'Subject added successfully', subject });
  } catch (error) {
    console.error('Error adding subject:', error);
    res.status(500).json({ message: 'Error adding subject', error });
  }
};

/**
 * Get all subjects in the system
 * 
 * @route GET /api/subjects/all
 * @access Public
 * 
 * @description Retrieves all subjects from the database without filtering.
 * This endpoint is primarily used for admin panel dropdowns, CSV import
 * operations, and comprehensive system overview. Provides complete subject
 * listing across all branches for administrative and content management purposes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of subject objects
 * @returns {string} returns[]._id - Subject unique identifier
 * @returns {string} returns[].name - Subject name
 * @returns {string} returns[].branch - Associated branch ObjectId
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Response with all subjects
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "name": "Physics",
 *     "branch": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   },
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "name": "Chemistry",
 *     "branch": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update an existing subject
 * 
 * @route PUT /api/subjects/:id
 * @access Private/Admin
 * 
 * @description Updates an existing subject with new information. This endpoint
 * allows administrators to modify subject details such as name or branch
 * association. The function includes validation to ensure the subject exists
 * before attempting updates and returns the updated subject data.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Subject ObjectId to update
 * @param {Object} req.body - Request body containing updated subject data
 * @param {string} [req.body.name] - Updated subject name (optional)
 * @param {string} [req.body.branch] - Updated branch ObjectId (optional)
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with updated subject data
 * @returns {string} returns._id - Subject unique identifier
 * @returns {string} returns.name - Updated subject name
 * @returns {string} returns.branch - Associated branch ObjectId
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Updated timestamp
 * 
 * @throws {404} Subject not found with provided ID
 * @throws {500} Server error during subject update
 * 
 * @example
 * // Request: PUT /api/subjects/64f8a1b2c3d4e5f6a7b8c9d1
 * // Request body
 * {
 *   "name": "Advanced Physics"
 * }
 * 
 * // Response
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "name": "Advanced Physics",
 *   "branch": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-02T00:00:00.000Z"
 * }
 */
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSubject = await Subject.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.status(200).json(updatedSubject);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ message: 'Failed to update subject', error: error.message });
  }
};

/**
 * @description Module exports for subject controller functions
 * 
 * This module provides essential CRUD operations for subject management,
 * supporting the educational content hierarchy and administrative operations
 * within the NexPrep platform.
 */
module.exports = {
  addSubject,
  getAllSubjects,
  updateSubject,
};
