/**
 * @fileoverview SubTopic Controller
 * 
 * This module handles subtopic management operations for the NexPrep platform,
 * providing CRUD functionality for subtopics within the educational hierarchy.
 * Subtopics represent the most granular level of content organization,
 * covering specific concepts within topics (e.g., "Newton's Laws", "Work-Energy
 * Theorem" within the Mechanics topic).
 * 
 * @module controllers/subtopicController
 * 
 * @requires ../models/SubTopic - SubTopic data model
 * 
 * @description Features include:
 * - Subtopic creation with topic association
 * - Complete subtopic listing and retrieval
 * - Subtopic updates with validation
 * - Integration with question tagging system
 * - Support for dynamic UI dropdowns
 * - Comprehensive error handling and validation
 * 
 * @used_in
 * - Question tagging and categorization
 * - Dynamic dropdown population in admin UI
 * - Fine-grained content organization
 * - Educational content hierarchy completion
 * 
 * @dependencies
 * - models/SubTopic.js - SubTopic data model
 * - models/Topic.js - Topic model for hierarchy validation
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const SubTopic = require('../models/SubTopic');

/**
 * Create a new subtopic
 * 
 * @route POST /api/subtopics/add
 * @access Private/Admin
 * 
 * @description Creates a new subtopic associated with a specific topic. This
 * function provides the most granular level of content organization in the
 * educational hierarchy. Subtopics are essential for precise question tagging
 * and detailed content categorization, allowing for specific concept tracking
 * and targeted learning paths.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing subtopic data
 * @param {string} req.body.name - Subtopic name (e.g., "Newton's Laws", "Ohm's Law")
 * @param {string} req.body.topicId - Associated topic ObjectId
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with creation success message and subtopic data
 * @returns {string} returns.message - Success message
 * @returns {Object} returns.subTopic - Created subtopic object
 * @returns {string} returns.subTopic._id - Generated subtopic unique identifier
 * @returns {string} returns.subTopic.name - Subtopic name
 * @returns {string} returns.subTopic.topic - Associated topic ObjectId
 * @returns {Date} returns.subTopic.createdAt - Creation timestamp
 * @returns {Date} returns.subTopic.updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during subtopic creation
 * 
 * @example
 * // Request body
 * {
 *   "name": "Newton's Laws",
 *   "topicId": "64f8a1b2c3d4e5f6a7b8c9d2"
 * }
 * 
 * // Response
 * {
 *   "message": "Sub-topic added successfully",
 *   "subTopic": {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
 *     "name": "Newton's Laws",
 *     "topic": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */
const addSubTopic = async (req, res) => {
  try {
    const { name, topicId } = req.body;
    const subTopic = new SubTopic({ name, topic: topicId });
    await subTopic.save();
    res.status(201).json({ message: 'Sub-topic added successfully', subTopic });
  } catch (error) {
    res.status(500).json({ message: 'Error adding sub-topic', error });
  }
};

/**
 * Get all subtopics in the system
 * 
 * @route GET /api/subtopics/all
 * @access Public
 * 
 * @description Retrieves all subtopics from the database without filtering.
 * This endpoint is primarily used for question tagging interfaces, dynamic
 * dropdown population, and comprehensive system overview. Provides the complete
 * subtopic listing across all topics for administrative and content management
 * purposes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of subtopic objects
 * @returns {string} returns[]._id - Subtopic unique identifier
 * @returns {string} returns[].name - Subtopic name
 * @returns {string} returns[].topic - Associated topic ObjectId
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Response with all subtopics
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
 *     "name": "Newton's Laws",
 *     "topic": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   },
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d4",
 *     "name": "Work-Energy Theorem",
 *     "topic": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
const getAllSubTopics = async (req, res) => {
  try {
    const subTopics = await SubTopic.find();
    res.status(200).json(subTopics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sub-topics', error });
  }
};

/**
 * Update an existing subtopic
 * 
 * @route PUT /api/subtopics/:id
 * @access Private/Admin
 * 
 * @description Updates an existing subtopic with new information. This endpoint
 * allows administrators to modify subtopic details such as name or topic
 * association. The function includes validation to ensure the subtopic exists
 * before attempting updates and returns the updated subtopic data.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Subtopic ObjectId to update
 * @param {Object} req.body - Request body containing updated subtopic data
 * @param {string} [req.body.name] - Updated subtopic name (optional)
 * @param {string} [req.body.topic] - Updated topic ObjectId (optional)
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with updated subtopic data
 * @returns {string} returns._id - Subtopic unique identifier
 * @returns {string} returns.name - Updated subtopic name
 * @returns {string} returns.topic - Associated topic ObjectId
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Updated timestamp
 * 
 * @throws {404} Subtopic not found with provided ID
 * @throws {500} Server error during subtopic update
 * 
 * @example
 * // Request: PUT /api/subtopics/64f8a1b2c3d4e5f6a7b8c9d3
 * // Request body
 * {
 *   "name": "Newton's Laws of Motion"
 * }
 * 
 * // Response
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
 *   "name": "Newton's Laws of Motion",
 *   "topic": "64f8a1b2c3d4e5f6a7b8c9d2",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-02T00:00:00.000Z"
 * }
 */
const updateSubTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSubTopic = await SubTopic.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedSubTopic) {
      return res.status(404).json({ message: 'SubTopic not found' });
    }
    res.status(200).json(updatedSubTopic);
  } catch (error) {
    console.error('Error updating subtopic:', error);
    res.status(500).json({ message: 'Failed to update subtopic', error: error.message });
  }
};

/**
 * @description Module exports for subtopic controller functions
 * 
 * This module provides essential CRUD operations for subtopic management,
 * completing the educational content hierarchy and supporting fine-grained
 * content organization within the NexPrep platform.
 */
module.exports = {
  addSubTopic,
  getAllSubTopics,
  updateSubTopic,
};
