// All import statements
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const Question = require('../models/Question');
const Branch = require('../models/Branch');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const SubTopic = require('../models/SubTopic');
const ExamType = require('../models/ExamType'); // Added this line
const getExamTypeId = require('../utils/getExamTypeId');
const { isValidObjectId } = require('mongoose');

const {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  filterQuestions,
  addQuestion,
} = require('../controllers/questionController');

async function resolveEntity(Model, value, key = 'name') {
  if (isValidObjectId(value)) {
    const doc = await Model.findById(value);
    if (doc) return doc;
  }

  let doc = await Model.findOne({ [key]: new RegExp(`^${value}$`, 'i') });
  if (!doc) {
    if (Model.modelName === 'ExamType') {
      doc = new Model({ code: value, name: value }); // ✅ fix for ExamType
    } else {
      doc = new Model({ [key]: value });
    }
    await doc.save();
  }
  return doc;
}

// ✅ Route to filter questions by branch, subject, topic, subtopic
router.get('/filter', verifyToken, filterQuestions);

// ✅ Add a new question
router.post('/add', verifyToken, addQuestion);

// ✅ Get all questions
router.get('/all', verifyToken, getAllQuestions);

// ✅ Create question (used by admin maybe)
router.post('/create', verifyToken, createQuestion);

// ✅ Import CSV questions
router.post('/import-csv', verifyToken, async (req, res) => {
  try {
    const questions = Array.isArray(req.body) ? req.body : [];
    if (!questions.length) {
      return res.status(400).json({ message: 'No questions found in request body.' });
    }

    const inserted = [];
    const errors = [];

    for (const [index, q] of questions.entries()) {
      try {
        const {
          questionText,
          options,
          correctOptions,
          explanation,
          difficulty,
          branch: branchName,
          subject: subjectName,
          topic: topicName,
          subtopic: subtopicName,
          examType: examTypeName,
          marks,
          askedIn,
          explanations,
          version,
          status
        } = q;

        const branchDoc = await resolveEntity(Branch, branchName);
        if (!branchDoc) {
          errors.push(`Row ${index + 1}: Invalid branch '${branchName}'`);
          continue;
        }

        let subjectDoc = await Subject.findOne({ name: new RegExp(`^${subjectName}$`, 'i'), branch: branchDoc._id });
        if (!subjectDoc && subjectName) {
          subjectDoc = new Subject({ name: subjectName, branch: branchDoc._id });
          await subjectDoc.save();
        }

        let topicDoc = null;
        if (subjectDoc && topicName) {
          topicDoc = await Topic.findOne({ name: new RegExp(`^${topicName}$`, 'i'), subject: subjectDoc._id });
          if (!topicDoc) {
            topicDoc = new Topic({ name: topicName, subject: subjectDoc._id });
            await topicDoc.save();
          }
        }

        let subtopicDoc = null;
        if (topicDoc && subtopicName) {
          subtopicDoc = await SubTopic.findOne({ name: new RegExp(`^${subtopicName}$`, 'i'), topic: topicDoc._id });
          if (!subtopicDoc) {
            subtopicDoc = new SubTopic({ name: subtopicName, topic: topicDoc._id });
            await subtopicDoc.save();
          }
        }

        const examTypeDoc = await resolveEntity(ExamType, examTypeName || 'Default', 'code');

        let optionTexts = [];
        let correctOpts = [];

        if (Array.isArray(options)) {
          if (typeof options[0] === 'string') {
            optionTexts = options;
          } else {
            optionTexts = options.map((o) => o.text?.trim() || '');
            correctOpts = options.filter(o => o.isCorrect).map(o => o.text?.trim() || '');
          }
        } else if (typeof options === 'string') {
          optionTexts = options.split('|').map(s => s.trim());
        }

        if (typeof correctOptions === 'string') {
          if (correctOptions.trim().startsWith('[')) {
            correctOpts = JSON.parse(correctOptions);
          } else {
            correctOpts = correctOptions.split('|').map(opt => opt.trim());
          }
        } else if (Array.isArray(correctOptions)) {
          correctOpts = correctOptions;
        }

        const optionsArray = optionTexts.map(text => ({
          text,
          isCorrect: correctOpts.includes(text)
        }));

        const askedInData = (() => {
          try {
            const parsed = typeof askedIn === 'string' ? JSON.parse(askedIn) : askedIn;
            return Array.isArray(parsed) ? parsed : [{ examName: 'NEET', year: new Date().getFullYear() }];
          } catch {
            return [{ examName: 'NEET', year: new Date().getFullYear() }];
          }
        })();

        const newQ = new Question({
          questionText,
          options: optionsArray,
          correctOptions: correctOpts,
          branch: branchDoc._id,
          subject: subjectDoc?._id,
          topic: topicDoc?._id,
          subtopic: subtopicDoc?._id,
          examType: examTypeDoc._id,
          difficulty: difficulty || 'Medium',
          marks: parseFloat(marks) || 4,
          explanation: explanation || '',
          explanations: Array.isArray(explanations) ? explanations : [],
          askedIn: askedInData,
          version: version || 1,
          status: status || 'active',
          meta: {
            accuracy: { correct: 0, total: 0 },
            avgTime: 0
          }
        });

        await newQ.save();
        inserted.push(newQ);

      } catch (err) {
        console.error(`Error processing row ${index + 1}:`, err.message);
        errors.push(`Row ${index + 1}: ${err.message}`);
      }
    }

    if (errors.length) {
      res.status(207).json({ message: 'Partial import', insertedCount: inserted.length, errors });
    } else {
      res.status(201).json({ message: 'Questions imported successfully', insertedCount: inserted.length });
    }

  } catch (error) {
    console.error('Fatal import error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Get a specific question by ID — THIS MUST BE AT BOTTOM!
router.get('/:id', verifyToken, getQuestionById);

// ✅ Update question
router.put('/:id', verifyToken, updateQuestion);

// ✅ Delete question
router.delete('/:id', verifyToken, deleteQuestion);

module.exports = router;
