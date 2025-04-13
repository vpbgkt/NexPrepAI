const Branch = require('../models/Branch');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const SubTopic = require('../models/SubTopic');

// ========== BRANCH ==========

// Create Branch
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

// Get all Branches
const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find();
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get branches' });
  }
};

// ========== SUBJECT ==========

// Create Subject
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

// Get all Subjects for a Branch
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

// Create Topic
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

// Get all Topics for a Subject
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

// Create SubTopic
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

// Get all SubTopics for a Topic
const getSubTopics = async (req, res) => {
  try {
    const { topicId } = req.query;
    const subtopics = await SubTopic.find({ topic: topicId });
    res.json(subtopics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get subtopics' });
  }
};

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
