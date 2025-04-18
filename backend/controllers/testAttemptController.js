const TestSeries = require('../models/TestSeries');
const TestAttempt = require('../models/TestAttempt');
const Question = require('../models/Question');

exports.startTest = async (req, res) => {
  try {
    const { seriesId } = req.body;
    const studentId = req.user.userId; // from JWT middleware

    const series = await TestSeries.findById(seriesId)
      .populate('questions.question')  // if flat
      .populate('sections.questions.question'); // if sectioned

    if (!series) return res.status(404).json({ message: 'Test not found' });

    const attempt = new TestAttempt({
      series: series._id,
      student: studentId,
      responses: [], // initialized empty
    });

    await attempt.save();
    res.status(201).json({ attemptId: attempt._id, duration: series.duration });
  } catch (err) {
    console.error('startTest error:', err);
    res.status(500).json({ message: 'Failed to start test' });
  }
};

exports.submitTest = async (req, res) => {
  console.log('🚨 Inside submitTest controller');

  const attemptId = req.params.attemptId;
  console.log('🔎 Received attemptId:', attemptId);

  const attempt = await TestAttempt.findById(attemptId).populate('series');

  if (!attempt) {
    console.log('❌ attempt NOT found in DB');
    return res.status(404).json({ message: 'Attempt not found' });
  }

  try {
    const { responses } = req.body;
    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ message: 'Invalid or missing responses' });
    }

    console.log('✅ Loaded attempt:', {
      id: attempt._id,
      student: attempt.student,
      series: attempt.series?._id,
    });

    const { questions, sections, negativeMarking } = attempt.series;
    const marksMap = new Map();

    if (sections?.length) {
      for (const sec of sections) {
        for (const q of sec.questions) {
          marksMap.set(q.question.toString(), q.marks);
        }
      }
    } else {
      for (const q of questions) {
        marksMap.set(q.question.toString(), q.marks);
      }
    }

    let total = 0;
    let max = 0;
    const checked = [];

    for (const { question, selected } of responses) {
      const qDoc = await Question.findById(question);
      if (!qDoc) continue;

      const correct = (qDoc.correctOptions || []).sort().join(',');
      const given = (selected || []).sort().join(',');

      const marks = marksMap.get(question) || 1;
      max += marks;

      const isCorrect = correct === given;
      const earned = isCorrect
        ? marks
        : negativeMarking
        ? -0.25 * marks
        : 0;

      total += earned;
      checked.push({
        question,
        selected,
        correctOptions: qDoc.correctOptions,
        earned
      });
    }

    attempt.responses = checked;
    attempt.score = total;
    attempt.maxScore = max;
    attempt.percentage = Math.round((total / max) * 100);
    attempt.submittedAt = new Date();

    await attempt.save();

    res.status(200).json({
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      breakdown: checked
    });

  } catch (err) {
    console.error('❌ Error in submitTest:', err);
    res.status(500).json({ message: 'Failed to submit test', error: err.message });
  }
};
