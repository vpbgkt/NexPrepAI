// backend/routes/questions.js
// ------------------------------------------------------------------
// Question routes (add / create / CSV import / CRUD / filter)
// ------------------------------------------------------------------

const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/verifyToken');
const auditFields     = require('../middleware/auditFields');

// ⭐ one consistent import – no chance of missing a function
const questionCtrl = require('../controllers/questionController');

/* ──────────────── READ / FILTER ───────────────── */
router.get('/filter', verifyToken, questionCtrl.filterQuestions);
router.get('/all',    verifyToken, questionCtrl.getAllQuestions);
router.get('/:id',    verifyToken, questionCtrl.getQuestionById);

/* ──────────────── CREATE / UPDATE / DELETE ────── */
router.post('/add',   verifyToken, auditFields, questionCtrl.addQuestion);
router.put('/:id',    verifyToken, auditFields, questionCtrl.updateQuestion);
router.delete('/:id', verifyToken,              questionCtrl.deleteQuestion);

/* ──────────────── CSV IMPORT (kept unchanged) ─── */
const Question  = require('../models/Question');
const Branch    = require('../models/Branch');
const Subject   = require('../models/Subject');
const Topic     = require('../models/Topic');
const SubTopic  = require('../models/SubTopic');
const ExamType  = require('../models/ExamType');
const { isValidObjectId } = require('mongoose');

// ───────── helper to find or create by name / id ─────────
async function resolveEntity(Model, value, key = 'name') {
  if (!value) return null;

  if (isValidObjectId(value)) {
    const doc = await Model.findById(value);
    if (doc) return doc;
  }
  let doc = await Model.findOne({ [key]: new RegExp(`^${value}$`, 'i') });
  if (!doc) {
    doc = key === 'code' ? new Model({ code: value, name: value })
                         : new Model({ [key]: value });
    await doc.save();
  }
  return doc;
}

// ---------- CSV IMPORT ------------------------------------------------
router.post('/import-csv', verifyToken, async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [];
    if (!rows.length) return res.status(400).json({ message: 'No data' });

    const errors       = [];
    const docsToInsert = [];

    const allowedDifficulties = ['Easy', 'Medium', 'Hard'];
    const allowedTypes        = ['single', 'multiple', 'integer', 'matrix'];
    const allowedExpTypes     = ['text', 'video', 'pdf', 'image'];

    for (const [i, row] of rows.entries()) {
      try {
        // ─── Resolve hierarchy docs ──────────────────────────────
        const branchDoc   = await resolveEntity(Branch,   row.branch);
        const subjectDoc  = await resolveEntity(Subject,  row.subject);
        const topicDoc    = await resolveEntity(Topic,    row.topic);
        const subTopicDoc = await resolveEntity(SubTopic, row.subtopic);
        const examTypeDoc = await resolveEntity(ExamType, row.examType || 'default', 'code');

        if (!branchDoc) {
          errors.push({ row: i + 2, error: `Invalid branch '${row.branch}'` });
          continue;
        }

        // ─── Validate & parse new columns ───────────────────────
        const difficulty = (row.difficulty || 'Medium').trim();
        if (!allowedDifficulties.includes(difficulty)) {
          errors.push({ row: i + 2, error: `Invalid difficulty '${difficulty}'` });
          continue;
        }

        const qType = (row.type || 'single').trim();
        if (!allowedTypes.includes(qType)) {
          errors.push({ row: i + 2, error: `Invalid type '${qType}'` });
          continue;
        }

        const negativeMarks = parseFloat(row.negativeMarks || 0) || 0;

        // explanations.text | .video | .pdf | .image
        const explanations = [];
        for (const kind of allowedExpTypes) {
          const col = `explanations.${kind}`;
          if (row[col]) {
            row[col].split('|').forEach(txt =>
              explanations.push({ type: kind, label: '', content: txt.trim() })
            );
          }
        }

        // ─── Options & correct options parsing ──────────────────
        const opts = (row.options || '').split('|').map(s => s.trim());
        const correctOpts = (row.correctOptions || '')
          .split('|')
          .map(s => s.trim())
          .filter(Boolean);

        if (opts.length < 2) {
          errors.push({ row: i + 2, error: 'Less than 2 options' });
          continue;
        }
        if (!correctOpts.length) {
          errors.push({ row: i + 2, error: 'No correctOptions' });
          continue;
        }

        // ─── Build doc ──────────────────────────────────────────
        docsToInsert.push({
          branch:   branchDoc._id,
          subject:  subjectDoc?._id,
          topic:    topicDoc?._id,
          subTopic: subTopicDoc?._id,
          examType: examTypeDoc._id,

          questionText: row.questionText,
          images:       (row.images || '').split('|').map(s => s.trim()).filter(Boolean),

          options: opts,
          correctOptions: correctOpts.map(opt => opts.indexOf(opt)).filter(i => i >= 0),

          marks:         Number(row.marks || 1),
          negativeMarks, difficulty, type: qType,
          explanations,

          askedIn: row.askedIn ? JSON.parse(row.askedIn) : [],
          status:  row.status || 'active',
          version: row.version ? Number(row.version) : 1
        });
      } catch (err) {
        errors.push({ row: i + 2, error: err.message });
      }
    }

    if (docsToInsert.length) await Question.insertMany(docsToInsert);

    const code = errors.length ? 207 : 201;
    res.status(code).json({
      message: errors.length ? 'Partial import' : 'Import successful',
      inserted: docsToInsert.length,
      errors
    });

  } catch (err) {
    console.error('Fatal CSV import error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
