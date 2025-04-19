/**
 * Controller: topicController.js
 * -------------------------------------
 * Manages CRUD operations for the Topic entity, which falls under a Subject.
 *
 * Functions:
 * - addTopic(): Creates a new topic within a subject
 * - getAllTopics(): Lists all topics, optionally filtered by subject
 *
 * Used in:
 * - Admin panel for question categorization
 * - CSV import auto-tagging
 *
 * Depends on:
 * - models/Topic.js
 * - models/Subject.js
 */

const Topic = require('../models/Topic');

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

const getAllTopics = async (req, res) => {
  try {
    const topics = await Topic.find();
    res.status(200).json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching topics', error });
  }
};

module.exports = {
  addTopic,
  getAllTopics,
};
