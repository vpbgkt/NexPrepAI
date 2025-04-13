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
