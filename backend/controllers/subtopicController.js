/**
 * Controller: subtopicController.js
 * -------------------------------------
 * Handles SubTopic creation and retrieval, the lowest level in question hierarchy.
 *
 * Functions:
 * - addSubTopic(): Adds a new subtopic under a topic
 * - getAllSubTopics(): Retrieves all subtopics, optionally filtered by topic
 *
 * Used in:
 * - Question tagging
 * - Dynamic dropdowns in UI
 *
 * Depends on:
 * - models/SubTopic.js
 * - models/Topic.js
 */

const SubTopic = require('../models/SubTopic');

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

const getAllSubTopics = async (req, res) => {
  try {
    const subTopics = await SubTopic.find();
    res.status(200).json(subTopics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sub-topics', error });
  }
};

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

module.exports = {
  addSubTopic,
  getAllSubTopics,
  updateSubTopic,
};
