/**
 * Controller: testAttemptController.js
 * -------------------------------------
 * Handles the student's interaction with test attempts.
 *
 * Functions:
 * - startTest(): Creates a new test attempt for the logged-in student
 * - submitAttempt(): Grades the submitted test and stores score + response data
 * - getMyTestAttempts(): Returns all attempts by the current student
 * - reviewAttempt(): Allows student to view detailed feedback on a past attempt
 * - getStudentStats(): Returns test summary (average score, best performance)
 * - getLeaderboardForSeries(): Leaderboard for a specific TestSeries
 *
 * This controller works closely with:
 * - models/TestAttempt.js
 * - models/TestSeries.js
 * - models/Question.js
 */


const TestSeries = require('../models/TestSeries');
const TestAttempt = require('../models/TestAttempt');
const Question = require('../models/Question');

exports.startTest = async (req, res) => {
  try {
    const { seriesId } = req.body;

    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ message: 'Test not found' });

    // ✅ Time check should happen FIRST
    console.log('🕒 Checking mode:', series.mode);
    console.log('🕒 startAt:', series.startAt);
    console.log('🕒 endAt:', series.endAt);
    console.log('🕒 now:', new Date());

    if (series.mode?.toLowerCase() === 'live') {
      const now = new Date();

      if (series.startAt && now < series.startAt) {
        console.log('🛑 Too early');
        return res.status(403).json({ message: 'This test has not started yet.' });
      }

      if (series.endAt && now > series.endAt) {
        console.log('🛑 Too late');
        return res.status(403).json({ message: 'This test has ended.' });
      }
    }

    // ✅ THEN check if student already attempted
    const existingAttempts = await TestAttempt.countDocuments({
      student: req.user.userId,
      series: seriesId
    });

    if (existingAttempts >= series.maxAttempts) {
      return res.status(429).json({
        message: `You've reached the maximum number of ${series.maxAttempts} attempts for this test.`
      });
    }

    // ✅ Create the attempt
    const attempt = new TestAttempt({
      series: seriesId,
      student: req.user.userId,
      attemptNo: existingAttempts + 1,
      responses: [],
    });

    await attempt.save();

    return res.status(201).json({
      attemptId: attempt._id,
      duration: series.duration,
    });

  } catch (err) {
    console.error('❌ Error in startTest:', err);
    res.status(500).json({ message: 'Failed to start test', error: err.message });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const { responses } = req.body;

    const attempt = await TestAttempt.findById(attemptId).populate('series');
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

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

    const startTime = Date.now();

    for (const { question, selected } of responses) {
      const qDoc = await Question.findById(question);
      if (!qDoc) continue;

      const correct = qDoc.correctOptions?.sort().join(',') || '';
      const given = (selected || []).sort().join(',');

      const marks = marksMap.get(question) || 1;
      max += marks;

      const isCorrect = correct === given;
      const earned = isCorrect ? marks : negativeMarking ? -0.25 * marks : 0;
      total += earned;

      const timeSpent = (Date.now() - startTime) / 1000;

      checked.push({
        question,
        selected,
        correctOptions: qDoc.correctOptions,
        earned
      });

      // ✅ Update question analytics
      const qAnalytics = await Question.findById(qDoc._id);
      if (qAnalytics) {
        const { correct, total } = qAnalytics.meta.accuracy;
        const updatedTotal = total + 1;
        const updatedCorrect = correct + (isCorrect ? 1 : 0);

        const prevAvg = qAnalytics.meta.avgTime || 0;
        const newAvg = (prevAvg * total + timeSpent) / updatedTotal;

        qAnalytics.meta.accuracy.total = updatedTotal;
        qAnalytics.meta.accuracy.correct = updatedCorrect;
        qAnalytics.meta.avgTime = newAvg;

        await qAnalytics.save();
      }
    }

    // ✅ Save attempt
    attempt.responses = checked;
    attempt.score = total;
    attempt.maxScore = max;
    attempt.percentage = Math.round((total / max) * 100);
    attempt.submittedAt = new Date();

    await attempt.save();

    return res.status(200).json({
      score: total,
      maxScore: max,
      percentage: attempt.percentage,
      breakdown: checked
    });

  } catch (err) {
    console.error('🔥 submitTest error:', err);
    res.status(500).json({ message: 'Submit failed', error: err.message });
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

exports.submitAttempt = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const { responses } = req.body;

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students are allowed to attempt tests.' });
    }

    const attempt = await TestAttempt.findById(attemptId).populate('series');
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    const startTime = Date.now();

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

      const correct = qDoc.correctOptions?.sort().join(',') || '';
      const given = (selected || []).sort().join(',');

      const marks = marksMap.get(question) || 1;
      max += marks;

      const isCorrect = correct === given;
      const earned = isCorrect ? marks : negativeMarking ? -0.25 * marks : 0;

      total += earned;
      checked.push({ question, selected, correctOptions: qDoc.correctOptions, earned });

      const timeSpent = (Date.now() - startTime) / 1000; // in seconds

      // update accuracy and avgTime
      const qAnalytics = await Question.findById(qDoc._id);

      if (qAnalytics) {
        const { correct, total } = qAnalytics.meta.accuracy;
        const updatedTotal = total + 1;
        const updatedCorrect = correct + (isCorrect ? 1 : 0);

        const prevAvg = qAnalytics.meta.avgTime || 0;
        const newAvg = (prevAvg * total + timeSpent) / updatedTotal;

        qAnalytics.meta.accuracy.total = updatedTotal;
        qAnalytics.meta.accuracy.correct = updatedCorrect;
        qAnalytics.meta.avgTime = newAvg;

        await qAnalytics.save();
      }
    }

    attempt.responses = checked;
    attempt.score = total;
    attempt.maxScore = max;
    attempt.percentage = Math.round((total / max) * 100);
    attempt.submittedAt = new Date();

    await attempt.save();

    return res.status(200).json({
      score: total,
      maxScore: max,
      percentage: attempt.percentage,
      breakdown: checked
    });
  } catch (err) {
    console.error('🔥 submitAttempt failed:', err);
    res.status(500).json({ message: 'Submit failed', error: err.message });
  }
};
