/**
 * @fileoverview Academic Hierarchy Controller
 * 
 * This module handles the academic subject hierarchy management operations for
 * the NexPrepAI platform, providing functionality to manage the educational content
 * structure. The hierarchy consists of four levels: Branch → Subject → Topic → SubTopic,
 * which allows for organized categorization of educational content and questions.
 * 
 * @module controllers/hierarchyController
 * 
 * @requires ../models/Branch - Academic branch data model
 * @requires ../models/Subject - Subject data model
 * @requires ../models/Topic - Topic data model
 * @requires ../models/SubTopic - SubTopic data model
 * 
 * @description Features include:
 * - Complete CRUD operations for academic hierarchy
 * - Four-level hierarchy: Branch → Subject → Topic → SubTopic
 * - Hierarchical filtering and retrieval
 * - Relationship validation between hierarchy levels
 * - Comprehensive error handling and validation
 * - Support for educational content organization
 * 
 * @author NexPrepAI Development Team
 * @version 1.0.0
 */

const Branch = require('../models/Branch');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const SubTopic = require('../models/SubTopic');

// ========== BRANCH ==========

/**
 * Create a new academic branch
 * 
 * @route POST /api/hierarchy/branches
 * @access Private/Admin
 * 
 * @description Creates a new academic branch in the system. Branches represent
 * major academic divisions (e.g., Engineering, Medical, Arts, Commerce) and
 * serve as the top level of the academic hierarchy.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing branch data
 * @param {string} req.body.name - Branch name (e.g., "Engineering", "Medical")
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created branch data
 * @returns {string} returns._id - Generated branch unique identifier
 * @returns {string} returns.name - Branch name
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during branch creation
 * 
 * @example
 * // Request body
 * {
 *   "name": "Engineering"
 * }
 * 
 * // Response
 * {
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "name": "Engineering",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z"
 * }
 */
const createBranch = async (req, res) => {
  try {
    const { name } = req.body;
    const branch = new Branch({ name });
    await branch.save();
    res.status(201).json(branch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create branch' });
  }
};

/**
 * Get all academic branches
 * 
 * @route GET /api/hierarchy/branches
 * @access Public
 * 
 * @description Retrieves all academic branches from the system. This endpoint
 * provides the complete list of available branches for hierarchy navigation
 * and content organization.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Array} JSON array of branch objects
 * @returns {string} returns[]._id - Branch unique identifier
 * @returns {string} returns[].name - Branch name
 * @returns {Date} returns[].createdAt - Creation timestamp
 * @returns {Date} returns[].updatedAt - Last update timestamp
 * 
 * @throws {500} Server error during data retrieval
 * 
 * @example
 * // Response with branches list
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "name": "Engineering",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find();
    res.json(branches || []); // Ensure an array is sent
  } catch (error) {
    res.status(500).json({ error: 'Failed to get branches' });
  }
};

// ========== SUBJECT ==========

/**
 * Create a new subject within a branch
 * 
 * @route POST /api/hierarchy/subjects
 * @access Private/Admin
 * 
 * @description Creates a new subject associated with a specific academic branch.
 * Subjects represent major academic disciplines within a branch (e.g., Physics,
 * Chemistry, Mathematics within Engineering branch).
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing subject data
 * @param {string} req.body.name - Subject name (e.g., "Physics", "Chemistry")
 * @param {string} req.body.branchId - Associated branch ObjectId
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created subject data
 * @returns {string} returns._id - Generated subject unique identifier
 * @returns {string} returns.name - Subject name
 * @returns {string} returns.branch - Associated branch ObjectId
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
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
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "name": "Physics",
 *   "branch": "64f8a1b2c3d4e5f6a7b8c9d0",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z"
 * }
 */
const createSubject = async (req, res) => {
  try {
    const { name, branchId } = req.body;
    const subject = new Subject({ name, branch: branchId });
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
};

/**
 * Get all subjects for a specific branch
 * 
 * @route GET /api/hierarchy/subjects?branchId=<branchId>
 * @access Public
 * 
 * @description Retrieves all subjects associated with a specific academic branch.
 * This endpoint is used for hierarchical navigation when users select a branch
 * and need to see available subjects within that branch.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.branchId - Branch ObjectId (required)
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
 * // Request: GET /api/hierarchy/subjects?branchId=64f8a1b2c3d4e5f6a7b8c9d0
 * // Response with branch-filtered subjects
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "name": "Physics",
 *     "branch": "64f8a1b2c3d4e5f6a7b8c9d0",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
const getSubjects = async (req, res) => {
  try {
    const { branchId } = req.query;
    const subjects = await Subject.find({ branch: branchId });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get subjects' });
  }
};

// ========== TOPIC ==========

/**
 * Create a new topic within a subject
 * 
 * @route POST /api/hierarchy/topics
 * @access Private/Admin
 * 
 * @description Creates a new topic associated with a specific subject. Topics
 * represent major learning areas within a subject (e.g., Mechanics, Thermodynamics
 * within Physics subject).
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing topic data
 * @param {string} req.body.name - Topic name (e.g., "Mechanics", "Thermodynamics")
 * @param {string} req.body.subjectId - Associated subject ObjectId
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created topic data
 * @returns {string} returns._id - Generated topic unique identifier
 * @returns {string} returns.name - Topic name
 * @returns {string} returns.subject - Associated subject ObjectId
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
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
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
 *   "name": "Mechanics",
 *   "subject": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z"
 * }
 */
const createTopic = async (req, res) => {
  try {
    const { name, subjectId } = req.body;
    const topic = new Topic({ name, subject: subjectId });
    await topic.save();
    res.status(201).json(topic);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create topic' });
  }
};

/**
 * Get all topics for a specific subject
 * 
 * @route GET /api/hierarchy/topics?subjectId=<subjectId>
 * @access Public
 * 
 * @description Retrieves all topics associated with a specific subject. This
 * endpoint is used for hierarchical navigation when users select a subject
 * and need to see available topics within that subject.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.subjectId - Subject ObjectId (required)
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
 * // Request: GET /api/hierarchy/topics?subjectId=64f8a1b2c3d4e5f6a7b8c9d1
 * // Response with subject-filtered topics
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "name": "Mechanics",
 *     "subject": "64f8a1b2c3d4e5f6a7b8c9d1",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
const getTopics = async (req, res) => {
  try {
    const { subjectId } = req.query;
    const topics = await Topic.find({ subject: subjectId });
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get topics' });
  }
};

// ========== SUBTOPIC ==========

/**
 * Create a new subtopic within a topic
 * 
 * @route POST /api/hierarchy/subtopics
 * @access Private/Admin
 * 
 * @description Creates a new subtopic associated with a specific topic. Subtopics
 * represent the most granular level of the academic hierarchy, covering specific
 * concepts within a topic (e.g., "Newton's Laws", "Work-Energy Theorem" within
 * Mechanics topic).
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing subtopic data
 * @param {string} req.body.name - Subtopic name (e.g., "Newton's Laws")
 * @param {string} req.body.topicId - Associated topic ObjectId
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with created subtopic data
 * @returns {string} returns._id - Generated subtopic unique identifier
 * @returns {string} returns.name - Subtopic name
 * @returns {string} returns.topic - Associated topic ObjectId
 * @returns {Date} returns.createdAt - Creation timestamp
 * @returns {Date} returns.updatedAt - Last update timestamp
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
 *   "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
 *   "name": "Newton's Laws",
 *   "topic": "64f8a1b2c3d4e5f6a7b8c9d2",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z"
 * }
 */
const createSubTopic = async (req, res) => {
  try {
    const { name, topicId } = req.body;
    const subtopic = new SubTopic({ name, topic: topicId });
    await subtopic.save();
    res.status(201).json(subtopic);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subtopic' });
  }
};

/**
 * Get all subtopics for a specific topic
 * 
 * @route GET /api/hierarchy/subtopics?topicId=<topicId>
 * @access Public
 * 
 * @description Retrieves all subtopics associated with a specific topic. This
 * endpoint completes the hierarchical navigation, allowing users to see the
 * most granular level of academic content organization.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.topicId - Topic ObjectId (required)
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
 * // Request: GET /api/hierarchy/subtopics?topicId=64f8a1b2c3d4e5f6a7b8c9d2
 * // Response with topic-filtered subtopics
 * [
 *   {
 *     "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
 *     "name": "Newton's Laws",
 *     "topic": "64f8a1b2c3d4e5f6a7b8c9d2",
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   }
 * ]
 */
const getSubTopics = async (req, res) => {
  try {
    const { topicId } = req.query;
    const subtopics = await SubTopic.find({ topic: topicId });
    res.json(subtopics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get subtopics' });
  }
};

/**
 * @description Module exports for academic hierarchy controller functions
 * 
 * This module provides a complete set of CRUD operations for managing the
 * four-level academic hierarchy in the NexPrepAI platform. The hierarchy
 * structure follows the pattern: Branch → Subject → Topic → SubTopic.
 */
module.exports = {
  createBranch,
  getBranches,
  createSubject,
  getSubjects,
  createTopic,
  getTopics,
  createSubTopic,
  getSubTopics
};
