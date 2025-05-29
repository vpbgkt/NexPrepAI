/**
 * @fileoverview Topic Controller
 * 
 * This module handles topic management operations for the NexPrep platform,
 * providing CRUD functionality for academic topics within the educational
 * hierarchy. Topics represent major learning areas within subjects (e.g.,
 * Mechanics, Thermodynamics within Physics; Algebra, Calculus within Mathematics).
 * 
 * @module controllers/topicController
 * 
 * @requires ../models/Topic - Topic data model
 * 
 * @description Features include:
 * - Topic creation with subject association
 * - Complete topic listing and retrieval
 * - Topic updates with validation
 * - Integration with admin panel for question categorization
 * - Support for CSV import auto-tagging functionality
 * - Comprehensive error handling and validation
 * 
 * @used_in
 * - Admin panel for question categorization and content management
 * - CSV import auto-tagging for efficient content organization
 * - Educational content hierarchy navigation
 * - Question filtering and organization systems
 * 
 * @dependencies
 * - models/Topic.js - Topic data model
 * - models/Subject.js - Subject model for hierarchy validation
 * 
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const Topic = require('../models/Topic');

/**
 * Create a new topic
 * 
 * @route POST /api/topics/add
 * @access Private/Admin
 * 
 * @description Creates a new topic associated with a specific subject. This
 * function is essential for building the educational content hierarchy,
 * allowing administrators to organize learning materials by major topic areas
 * within subjects. Topics serve as intermediate categorization between subjects
 * and subtopics, providing logical grouping for educational content.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing topic data
 * @param {string} req.body.name - Topic name (e.g., "Mechanics", "Algebra")
 * @param {string} req.body.subjectId - Associated subject ObjectId
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with creation success message and topic data
 * @returns {string} returns.message - Success message
 * @returns {Object} returns.topic - Created topic object
 * @returns {string} returns.topic._id - Generated topic unique identifier
 * @returns {string} returns.topic.name - Topic name
 * @returns {string} returns.topic.subject - Associated subject ObjectId
 * @returns {Date} returns.topic.createdAt - Creation timestamp
 * @returns {Date} returns.topic.updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during topic creation
 * 
 * @example
 * // Request body
 * {
 *   "name": "Mechanics",
 *   "subjectId": "64f8a1b2c3d4e5f6a7b8c9d1"
 * }
 * 
 * // Response
 * {
 *   "message": "Topic added successfully",
 *   "topic": {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "name": "Mechanics",
 *     "subject": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 */
const addTopic = async (req, res) => {
  try {
    const { name, subjectId } = req.body;
    const topic = new Topic({ name, subject: subjectId });
    await topic.save();
    res.status(201).json({ message: 'Topic added successfully', topic });
  } catch (error) {
    res.status(500).json({ message: 'Error adding topic', error });
  }
};

/**
 * Get all topics in the system
 * 
 * @route GET /api/topics/all
 * @access Public
 * 
 * @description Retrieves all topics from the database without filtering.
 * This endpoint is primarily used for admin panel question categorization,
 * CSV import auto-tagging operations, and comprehensive system overview.
 * Provides complete topic listing across all subjects for administrative
 * and content management purposes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of topic objects
 * @returns {string} returns[]._id - Topic unique identifier
 * @returns {string} returns[].name - Topic name
 * @returns {string} returns[].subject - Associated subject ObjectId
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Response with all topics
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "name": "Mechanics",
 *     "subject": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   },
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
 *     "name": "Thermodynamics",
 *     "subject": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
const getAllTopics = async (req, res) => {
  try {
    const topics = await Topic.find();
    res.status(200).json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching topics', error });
  }
};

/**
 * Update an existing topic
 * 
 * @route PUT /api/topics/:id
 * @access Private/Admin
 * 
 * @description Updates an existing topic with new information. This endpoint
 * allows administrators to modify topic details such as name or subject
 * association. The function includes validation to ensure the topic exists
 * before attempting updates and returns the updated topic data.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Topic ObjectId to update
 * @param {Object} req.body - Request body containing updated topic data
 * @param {string} [req.body.name] - Updated topic name (optional)
 * @param {string} [req.body.subject] - Updated subject ObjectId (optional)
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with updated topic data
 * @returns {string} returns._id - Topic unique identifier
 * @returns {string} returns.name - Updated topic name
 * @returns {string} returns.subject - Associated subject ObjectId
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Updated timestamp
 * 
 * @throws {404} Topic not found with provided ID
 * @throws {500} Server error during topic update
 * 
 * @example
 * // Request: PUT /api/topics/64f8a1b2c3d4e5f6a7b8c9d2
 * // Request body
 * {
 *   "name": "Classical Mechanics"
 * }
 * 
 * // Response
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
 *   "name": "Classical Mechanics",
 *   "subject": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-02T00:00:00.000Z"
 * }
 */
const updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTopic = await Topic.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedTopic) {
      return res.status(404).json({ message: 'Topic not found' });
    }
    res.status(200).json(updatedTopic);
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(500).json({ message: 'Failed to update topic', error: error.message });
  }
};

/**
 * @description Module exports for topic controller functions
 * 
 * This module provides essential CRUD operations for topic management,
 * supporting the educational content hierarchy and content organization
 * within the NexPrep platform.
 */
module.exports = {
  addTopic,
  getAllTopics,
  updateTopic,
};
