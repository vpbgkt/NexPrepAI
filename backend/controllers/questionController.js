const Question = require('../models/Question');
const Branch = require('../models/Branch');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const SubTopic = require('../models/SubTopic');

// Create a question
const createQuestion = async (req, res) => {
  try {
    const {
      questionText,
      options,
      correctOption,
      branch,
      subject,
      topic,
      subTopic,
    } = req.body;

    const newQuestion = new Question({
      questionText,
      options,
      correctOption,
      branch,
      subject,
      topic,
      subTopic,
    });

    await newQuestion.save();
    res.status(201).json({ message: 'Question created successfully', question: newQuestion });
  } catch (err) {
    console.error('Error creating question:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ Add a new question
const addQuestion = async (req, res) => {
  try {
    console.log('📥 Incoming Request Body:', req.body);

    const {
      questionText,
      options,
      explanation,
      difficulty,
      branch,
      subject,
      topic,
      subtopic,
    } = req.body;

    // Minimal required field validation
    if (!questionText || !options || !branch) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate branch existence
    const foundBranch = await Branch.findById(branch);
    if (!foundBranch) {
      return res.status(400).json({ message: 'Invalid branch ID' });
    }

    // Optionally validate subject/topic/subtopic
    const foundSubject = subject ? await Subject.findById(subject) : null;
    const foundTopic = topic ? await Topic.findById(topic) : null;
    const foundSubTopic = subtopic ? await SubTopic.findById(subtopic) : null;

    // Save the question
    const newQuestion = new Question({
      questionText,
      options,
      explanation,
      difficulty,
      branch,
      subject: foundSubject?._id,
      topic: foundTopic?._id,
      subtopic: foundSubTopic?._id,
    });

    console.log('📦 Saving New Question:', newQuestion);

    await newQuestion.save();

    res.status(201).json({ message: 'Question added successfully', question: newQuestion });
  } catch (error) {
    console.error('❌ Error adding question:', error); // This will give the real issue
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ✅ This function gets all questions
const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .populate('branch', 'name')      // only pull in the `name` field
      .populate('subject', 'name')
      .populate('topic', 'name')
      .populate('subtopic', 'name');
    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔍 Filter questions by hierarchy
const filterQuestions = async (req, res) => {
  try {
    const { branch, subject, topic, subtopic, difficulty } = req.query;

    if (!branch) {
      return res.status(400).json({ message: 'Branch is required to filter questions' });
    }

    const filter = { branch };
    if (subject) filter.subject = subject;
    if (topic) filter.topic = topic;
    if (subtopic) filter.subtopic = subtopic;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await Question.find(filter)
      .populate('branch', 'name')
      .populate('subject', 'name')
      .populate('topic', 'name')
      .populate('subtopic', 'name');

    res.status(200).json(questions);
  } catch (error) {
    console.error('Error filtering questions:', error);
    res.status(500).json({ message: 'Server error while filtering questions' });
  }
};

// Get a single question by ID
const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json(question);
  } catch (err) {
    console.error('Error fetching question:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update a question by ID
const updateQuestion = async (req, res) => {
  try {
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.status(200).json(updatedQuestion);
  } catch (err) {
    console.error('Error updating question:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a question by ID
const deleteQuestion = async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error('Error deleting question:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  addQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  filterQuestions,
  createQuestion,
};
