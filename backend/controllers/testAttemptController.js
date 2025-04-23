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

    // Choose one form at random (or use any assignment logic)
    let selectedVariant;
    if (series.variants?.length) {
      const idx = Math.floor(
        Math.random() * series.variants.length
      );
      selectedVariant = series.variants[idx];
    }

    // ✅ Create the attempt
    const attempt = new TestAttempt({
      series: seriesId,
      student: req.user.userId,
      attemptNo: existingAttempts + 1,
      responses: [],

      // ← if we picked a variant, store its code & sections
      ...(selectedVariant
        ? {
            variantCode: selectedVariant.code,
            sections: selectedVariant.sections
          }
        : {})
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
    const { attemptId, responses } = req.body;

    // Load the attempt, including the variant’s sections
    const attempt = await TestAttempt
      .findById(attemptId)
      .populate('student', 'name')
      .lean();

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    // Use the stored variant layout
    const layout = attempt.sections;

    // Initialize scoring
    let totalScore = 0;
    let maxScore   = 0;

    // Grade each question in each section (async-friendly)
    for (const section of layout) {
      for (const { question: qId, marks } of section.questions) {
        maxScore += marks;
        // find the student's response for this question
        const resp = responses.find(r => r.question === qId.toString());

        // fetch the full Question doc to get correctOptions
        const qDoc = await Question.findById(qId);
        const correctArr = Array.isArray(qDoc.correctOptions)
          ? qDoc.correctOptions
          : [];
        const selectedArr = Array.isArray(resp?.selectedOptions)
          ? resp.selectedOptions
          : [];

        // check if arrays match exactly
        const isCorrect =
          correctArr.length > 0 &&
          correctArr.length === selectedArr.length &&
          correctArr.sort().join(',') === selectedArr.sort().join(',');

        totalScore += isCorrect ? marks : 0;
        // TODO: implement negative marking by subtracting here if needed
      }
    }

    // Update attempt record
    await TestAttempt.findByIdAndUpdate(attemptId, {
      score:    totalScore,
      maxScore: maxScore,
      responses
    });

    return res.json({ totalScore, maxScore });
  } catch (err) {
    console.error('Error in submitTest:', err);
    return res.status(500).json({ message: 'Server error' });
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
    const attempt = await TestAttempt
      .findById(req.params.attemptId)
      .populate('student', 'name')
      .lean();
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    // Return the exact variant info and scoring
    return res.json({
      attemptId:   attempt._id,
      variantCode: attempt.variantCode,
      sections:    attempt.sections,
      responses:   attempt.responses,
      score:       attempt.score,
      maxScore:    attempt.maxScore
    });
  } catch (err) {
    console.error('Error in reviewAttempt:', err);
    return res.status(500).json({ message: 'Server error' });
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
    res.status  (500).json({ message: 'Failed to get stats' });
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

    // Load attempt with its stored variant details
    const attempt = await TestAttempt
      .findById(attemptId)
      .populate('series', 'variants')
      .lean();

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    // Find the variant object that matches this attempt
    const variant = attempt.series.variants.find(v => v.code === attempt.variantCode);
    const negativeMarking = variant?.negativeMarking || 0;

    // Use the stored sections layout
    const layout = attempt.sections;
    const marksMap = new Map();

    // Build a marks map from layout
    layout.forEach(section => {
      section.questions.forEach(q => {
        marksMap.set(q.question.toString(), q.marks);
      });
    });

    let total = 0;
    let max   = 0;
    const checked = [];

    // Grade each response
    for (const { question, selectedOptions } of responses) {
      const marks = marksMap.get(question) || 1;
      max += marks;

      // Fetch correctOptions
      const qDoc = await Question.findById(question);
      const correctArr = Array.isArray(qDoc.correctOptions)
        ? qDoc.correctOptions
        : [];
      const selArr = Array.isArray(selectedOptions)
        ? selectedOptions
        : [];

      const isCorrect = 
        correctArr.length > 0 &&
        correctArr.length === selArr.length &&
        correctArr.sort().join(',') === selArr.sort().join(',');

      const earned = isCorrect
        ? marks
        : -negativeMarking * marks;

      total += earned;
      checked.push({ question, selectedOptions, earned });

      // Update per‑question analytics
      const qAnalytics = await Question.findById(qDoc._id);
      if (qAnalytics) {
        const prevTotal = qAnalytics.meta.accuracy.total;
        const prevCorrect = qAnalytics.meta.accuracy.correct;
        const timeSpent = (Date.now() - attempt.startedAt) / 1000;

        qAnalytics.meta.accuracy.total   = prevTotal + 1;
        qAnalytics.meta.accuracy.correct = prevCorrect + (isCorrect ? 1 : 0);
        qAnalytics.meta.avgTime = 
          ((qAnalytics.meta.avgTime * prevTotal) + timeSpent) 
          / (prevTotal + 1);

        await qAnalytics.save();
      }
    }

    // Persist results
    await TestAttempt.findByIdAndUpdate(attemptId, {
      responses:   checked,
      score:       total,
      maxScore:    max,
      percentage:  Math.round((total / max) * 100),
      submittedAt: new Date()
    });

    return res.status(200).json({
      score:      total,
      maxScore:   max,
      percentage: Math.round((total / max) * 100),
      breakdown:  checked
    });

  } catch (err) {
    console.error('🔥 submitAttempt failed:', err);
    return res.status(500).json({ message: 'Submit failed', error: err.message });
  }
};
