console.log('🏄 questionController.js loaded');

/**
 * Controller: questionController.js
 * -------------------------------------
 * Handles creation, fetching, and importing of questions into the system.
 *
 * Functions:
 * - createQuestion(): Add a new question with tags (branch, subject, topic, etc.)
 * - bulkUpload(): Import questions from a CSV (supports variable options, tags, marks)
 * - getAllQuestions(): List all questions with optional filters (e.g., subject, topic)
 *
 * Auto-creates hierarchy entities if they don't exist (case-insensitive matching).
 *
 * Works with:
 * - models/Question.js
 * - models/Branch.js, Subject.js, Topic.js, SubTopic.js
 */

const Question = require('../models/Question');
const Branch = require('../models/Branch');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const SubTopic = require('../models/SubTopic');
const getExamTypeId = require('../utils/getExamTypeId');
const mongoose = require('mongoose');
const ExamType = require('../models/ExamType');

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
const resolveEntityWithParent = async (Model, name, parentField, parentId) => {
  if (!name || !parentId) return null;

  // If it's a valid ObjectId, try to find it by ID first
  if (mongoose.Types.ObjectId.isValid(name)) {
    try {
      const docById = await Model.findById(name);
      if (docById) return docById;
      
      // If not found by ID, don't create a new entity with ObjectId as name
      console.log(`No ${Model.modelName} found with ID: ${name}`);
      return null;
    } catch (err) {
      console.log(`Error finding ${Model.modelName} by ID:`, err);
      return null;
    }
  }

  // It's not an ObjectId, so proceed with name-based lookup
  // Try finding it
  let doc = await Model.findOne({
    name: new RegExp(`^${name}$`, 'i'),
    [parentField]: parentId,
  });

  // Create if not found
  if (!doc) {
    doc = new Model({
      name,
      [parentField]: parentId,
    });
    await doc.save();
  }

  return doc;
};

const addQuestion = async (req, res) => {
  try {
    const {
      questionText,
      options = [],
      correctOptions,
      branch,
      subject,
      topic,
      subTopic, // Changed from subtopic to match the frontend's parameter name
      examType,
      difficulty,
      explanation,
      explanations = [],
      marks = 1,
      negativeMarks = 0,
      images = [],
      askedIn = [],
      status = "active",
      version = 1,
      questionHistory = []
    } = req.body;
    
    // Parse negativeMarks as float to prevent integer casting
    const negativeMarksFloat = parseFloat(negativeMarks);

    console.log("📥 Incoming Request Body:", req.body);

    // Step 1: Resolve Entities (string or ObjectId)
    const resolveEntity = async (Model, value, key = "name") => {
      if (!value) return null;
      
      // If it's a valid ObjectId, find the document by ID
      if (mongoose.Types.ObjectId.isValid(value)) {
        try {
          const doc = await Model.findById(value);
          if (doc) return doc._id; // If found, return the ObjectId
          
          // If not found (deleted entity), return null instead of recreating
          console.log(`No ${Model.modelName} found with ID: ${value}`);
          return null;
        } catch (err) {
          console.log(`Error finding ${Model.modelName} by ID:`, err);
          return null;
        }
      }

      // Handle string values (create if not found)
      let doc;
      if (Model.modelName === 'ExamType') {
        doc = new Model({ code: value, name: value });
      } else {
        doc = new Model({ [key]: value });
      }
      await doc.save();
      return doc._id;
    };

    const branchDoc = await resolveEntity(Branch, branch);
    const subjectDoc = await resolveEntity(Subject, subject, 'name', { branch: branchDoc?._id });
    const topicDoc = await resolveEntityWithParent(Topic, topic, 'subject', subjectDoc?._id);
    const subtopicDoc = await resolveEntityWithParent(SubTopic, subTopic, 'topic', topicDoc?._id);
    // Ensure examType has a default value if not provided
    const examTypeId = examType ? await resolveEntity(ExamType, examType, "code") : 'general';

    // Step 2: Validate and format options
    const formattedOptions = options.map((opt) => {
      if (typeof opt === 'string') {
        return { text: opt.trim(), isCorrect: false };
      } else if (typeof opt === 'object' && opt.text) {
        return { 
          text: opt.text.trim(), 
          img: opt.img || '',  // Preserve the img property
          isCorrect: !!opt.isCorrect 
        };
      }
      return null;
    }).filter(o => o && o.text); // Remove invalid or empty options

    if (formattedOptions.length < 2) {
      return res.status(400).json({ message: "At least two options are required." });
    }

    // Step 3: Parse correctOptions if it's still string
    let formattedCorrectOptions = correctOptions;
    if (typeof correctOptions === 'string') {
      try {
        formattedCorrectOptions = JSON.parse(correctOptions);
      } catch {
        formattedCorrectOptions = correctOptions.split('|').map(s => s.trim());
      }
    }

    // Step 4: Parse askedIn
    let askedInArray = Array.isArray(askedIn) ? askedIn : [];
    if (typeof askedIn === 'string') {
      try {
        askedInArray = JSON.parse(askedIn);
      } catch {
        askedInArray = [];
      }
    }

    // Step 5: Parse explanations
    let explanationArray = Array.isArray(explanations) ? explanations : [];
    if (typeof explanations === 'string') {
      try {
        explanationArray = JSON.parse(explanations);
      } catch {
        explanationArray = [];
      }
    }

    // Step 6: Validate difficulty
    const validDifficulties = ["Easy", "Medium", "Hard"];
    const difficultyValue = validDifficulties.includes(difficulty) ? 
                           difficulty : 
                           'Not-mentioned'; // Default to "Not-mentioned" instead of null

    const question = new Question({
      questionText,
      options: formattedOptions,
      correctOptions: formattedCorrectOptions,
      branch: branchDoc,
      subject: subjectDoc,
      topic: topicDoc,
      subTopic: subtopicDoc,  // Changed from "subtopic" to "subTopic" to match the schema
      examType: examTypeId,
      difficulty: difficultyValue,
      explanation,
      explanations: explanationArray,
      marks,
      negativeMarks: negativeMarksFloat,
      images,
      questionHistory,
      askedIn: askedInArray,
      status,
      version,
      createdBy: req.user?.userId || req.user?.id || req.user?._id  // Check all possible user ID properties
    });

    await question.save();
    res.status(201).json(question);

  } catch (error) {
    console.error("❌ Error adding question:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ This function gets all questions
const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .populate('branch',   'name')
      .populate('subject',  'name')
      .populate('topic',    'name')
      .populate('subtopic', 'name');
    return res.json(questions);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
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

// ✅ Get a specific question by ID
const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json(question);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ Update question
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ Delete question
const deleteQuestion = async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (err) {
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
