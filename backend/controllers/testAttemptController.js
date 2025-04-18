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

    // 🔒 Check cooldown (3 hours = 10800000 ms)
    const recent = await TestAttempt.findOne({
      student: studentId,
      series: seriesId,
      submittedAt: { $exists: true }
    }).sort({ submittedAt: -1 });

    if (recent) {
      const now = Date.now();
      const last = new Date(recent.submittedAt).getTime();
      const diff = now - last;

      const cooldown = 3 * 60 * 60 * 1000; // 3 hours in ms

      if (diff < cooldown) {
        const remaining = Math.ceil((cooldown - diff) / (60 * 1000)); // in minutes
        return res.status(429).json({
          message: `Cooldown active. You can retake this test in ${remaining} minutes.`
        });
      }
    }

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

exports.getMyTestAttempts = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const attempts = await TestAttempt.find({ student: studentId })
      .populate({
        path: 'series',
        select: 'title examType year',
        populate: { path: 'examType', select: 'code name' }
      })
      .sort({ submittedAt: -1 });

    res.status(200).json(attempts);
  } catch (err) {
    console.error('❌ Error in getMyTestAttempts:', err);
    res.status(500).json({ message: 'Failed to fetch attempts' });
  }
};

exports.reviewAttempt = async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.id)
      .populate({
        path: 'responses.question',
        select: 'text options correctOptions'
      })
      .populate({
        path: 'series',
        select: 'title examType year',
        populate: { path: 'examType', select: 'code name' }
      });

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    res.status(200).json({
      _id: attempt._id,
      series: attempt.series,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      percentage: attempt.percentage,
      responses: attempt.responses.map(r => ({
        question: {
          _id: r.question._id,
          text: r.question.text,
          options: r.question.options
        },
        selected: r.selected,
        correctOptions: r.question.correctOptions,
        earned: r.earned
      }))
    });
  } catch (err) {
    console.error('❌ reviewAttempt error:', err);
    res.status(500).json({ message: 'Failed to review test' });
  }
};

exports.getStudentStats = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const attempts = await TestAttempt.find({
      student: studentId,
      submittedAt: { $exists: true }
    });

    const total = attempts.length;
    if (total === 0) return res.json({ total: 0 });

    const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
    const maxScore = attempts.reduce((sum, a) => sum + (a.maxScore || 0), 0);
    const bestScore = Math.max(...attempts.map(a => a.percentage || 0));

    res.json({
      total,
      averagePercentage: Math.round((totalScore / maxScore) * 100),
      bestPercentage: bestScore
    });
  } catch (err) {
    console.error('❌ getStudentStats error:', err);
    res.status(500).json({ message: 'Failed to get stats' });
  }
};



exports.getLeaderboardForSeries = async (req, res) => {
    try {
      const { seriesId } = req.params;
  
      const attempts = await TestAttempt.find({
        series: seriesId,
        submittedAt: { $exists: true }
      })
        .populate('student', 'name email')
        .sort({ percentage: -1, submittedAt: 1 })
        .limit(10);
  
      if (attempts.length === 0) {
        return res.status(200).json({
          leaderboard: [],
          message: 'No submissions yet.'
        });
      }
  
      const leaderboard = attempts.map((a, i) => ({
        rank: i + 1,
        student: a.student?.name || a.student?.email || 'Anonymous',
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        submittedAt: a.submittedAt
      }));
  
      return res.status(200).json({ leaderboard });
    } catch (err) {
      console.error('❌ getLeaderboardForSeries error:', err);
      res.status(500).json({ message: 'Failed to get leaderboard' });
    }
  };
  