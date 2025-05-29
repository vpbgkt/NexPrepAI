/**
 * @fileoverview Branch Controller
 * 
 * This module handles branch management operations for the NexPrep platform,
 * providing functionality to manage academic branches or departments within
 * the educational hierarchy. Branches represent different academic disciplines
 * or study areas that can be associated with subjects and questions.
 * 
 * @module controllers/branchController
 * 
 * @requires ../models/Branch - Branch data model for academic branch operations
 * 
 * @description Features include:
 * - Branch creation with name validation
 * - Duplicate branch prevention
 * - Error handling for invalid requests
 * - Comprehensive input validation
 * - Database interaction with proper error handling
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const Branch = require('../models/Branch');

/**
 * Add a new academic branch to the system
 * 
 * @route POST /api/branches
 * @access Private (Admin only)
 * 
 * @description Creates a new academic branch in the system with proper validation
 * to ensure unique branch names and prevent duplicates. Academic branches are used
 * to organize subjects and questions within specific fields of study, providing
 * a hierarchical structure for content organization.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing branch information
 * @param {string} req.body.name - Branch name (required, must be unique)
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with operation result
 * @returns {string} returns.message - Success message
 * @returns {Object} returns.branch - Created branch object
 * @returns {string} returns.branch._id - Branch unique identifier
 * @returns {string} returns.branch.name - Branch name
 * @returns {Date} returns.branch.createdAt - Creation timestamp
 * @returns {Date} returns.branch.updatedAt - Last update timestamp
 * 
 * @throws {400} Branch name is required
 * @throws {400} Branch already exists (duplicate name)
 * @throws {500} Server error during branch creation
 * 
 * @example
 * // Request body for adding a new branch
 * {
 *   "name": "Computer Science"
 * }
 * 
 * // Response for successful branch creation
 * {
 *   "message": "Branch added successfully",
 *   "branch": {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "name": "Computer Science",
 *     "createdAt": "2024-01-15T10:30:00.000Z",
 *     "updatedAt": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 */
// Add a new branch
const addBranch = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Branch name is required" });
    }

    const existing = await Branch.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: "Branch already exists" });
    }

    const branch = new Branch({ name });
    await branch.save();

    res.status(201).json({ message: "Branch added successfully", branch });
  } catch (error) {
    console.error("Error adding branch:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Module exports for branch controller functions
 * 
 * @description Exports branch management functions for use in route handlers.
 * Currently includes the addBranch function for creating new academic branches.
 */
module.exports = { addBranch };
