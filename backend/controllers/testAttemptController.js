const TestSeries   = require('../models/TestSeries');
const TestAttempt  = require('../models/TestAttempt');
const Question     = require('../models/Question');

// ────────────────────────────────────────────────────────────────────────────────
// startTest: creates a new TestAttempt and returns detailed question data
// ────────────────────────────────────────────────────────────────────────────────
exports.startTest = async (req, res) => {
  try {
    const { seriesId } = req.body;
    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ message: 'Test not found' });

    console.log('🕒 Checking mode:', series.mode);
    console.log('🕒 startAt:', series.startAt);
    console.log('🕒 endAt:', series.endAt);
    console.log('🕒 now:', new Date());

    if (series.mode?.toLowerCase() === 'live') {
      const now = new Date();
      if (series.startAt && now < series.startAt) {
        return res.status(403).json({ message: 'This test has not started yet.' });
      }
      if (series.endAt && now > series.endAt) {
        return res.status(403).json({ message: 'This test has ended.' });
      }
    }

    const existingCount = await TestAttempt.countDocuments({
      student: req.user.userId,
      series:  seriesId
    });
    if (existingCount >= series.maxAttempts) {
      return res.status(429).json({
        message: `Max ${series.maxAttempts} attempts reached for this test.`
      });
    }

    // pick a variant if available
    let selectedVariant = undefined;
    if (series.variants?.length) {
      selectedVariant = series.variants[
        Math.floor(Math.random() * series.variants.length)
      ];
    }

    // assemble a raw layout of sections:
    let rawLayout = [];
    if (selectedVariant?.sections?.length) {
      // use the chosen variant’s sections
      rawLayout = selectedVariant.sections;
    } else if (Array.isArray(series.sections) && series.sections.length) {
      // use any sections defined on the series
      rawLayout = series.sections;
    } else if (Array.isArray(series.questions) && series.questions.length) {
      // fallback: wrap a flat questions[] into one section
      rawLayout = [{
        title: 'All Questions',
        order: 1,
        questions: series.questions.map(qId => ({
          question: qId,
          marks: 1
        }))
      }];
    }

    const layout = rawLayout;

    // create the attempt
    const attempt = new TestAttempt({
      series:      seriesId,
      student:     req.user.userId,
      attemptNo:   existingCount + 1,
      variantCode: selectedVariant?.code,
      sections:    selectedVariant?.sections || series.sections,
      responses:   []
    });
    await attempt.save();

    // now build detailed sections for the frontend
    const detailedSections = await Promise.all(
      layout.map(async sec => ({
        title: sec.title,
        order: sec.order,
        questions: await Promise.all(
          sec.questions.map(async q => {
            const doc = await Question.findById(q.question)
              .select('questionText options')
              .lean();
            return {
              question:     q.question.toString(),
              marks:        q.marks,
              questionText: doc?.questionText || '',
              options:      doc?.options      || []
            };
          })
        )
      }))
    );

    return res.status(201).json({
      attemptId: attempt._id.toString(),
      duration:  series.duration,
      sections:  detailedSections
    });
  } catch (err) {
    console.error('❌ Error in startTest:', err);
    return res.status(500).json({ message: 'Failed to start test', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// submitAttempt: grades and saves a completed attempt
// ────────────────────────────────────────────────────────────────────────────────
exports.submitAttempt = async (req, res) => {
  try {
    // Commented out debug logs for production readiness
    // console.log('❗️ submitAttempt req.body:', JSON.stringify(req.body, null, 2));
    // console.log('❗️ req.body.responses is:', req.body.responses);

    const attemptId = req.params.attemptId;
    const { responses } = req.body;

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit tests.' });
    }

    // load the attempt document (not lean, so we can save it)
    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    // build a quick map of marks per question
    const marksMap = new Map();
    attempt.sections.forEach(sec =>
      sec.questions.forEach(q => marksMap.set(q.question.toString(), q.marks))
    );

    // find negative marking for this variant
    const series = await TestSeries.findById(attempt.series);
    const variant = series.variants.find(v => v.code === attempt.variantCode);
    const negativeMarking = variant?.negativeMarking || 0;

    let total = 0, max = 0;
    const checked = [];

    // grade each submitted response
    for (const { question, selected } of responses) {
      const marks = marksMap.get(question.toString()) || 0;
      max += marks;

      // fetch the question doc to get correctOptions
      const qDoc = await Question.findById(question);
      const correctArr = Array.isArray(qDoc.correctOptions) ? qDoc.correctOptions : [];
      const selArr     = Array.isArray(selected)               ? selected               : [];

      const isCorrect =
        correctArr.length > 0 &&
        correctArr.length === selArr.length &&
        correctArr.sort().join(',') === selArr.sort().join(',');

      const earned = isCorrect ? marks : -negativeMarking * marks;
      total += earned;

      checked.push({
        question,
        selected,
        correctOptions: correctArr,
        earned
      });

      // update per-question analytics
      const qAnalytics = await Question.findById(question);
      if (qAnalytics) {
        const prevTotal   = qAnalytics.meta.accuracy.total;
        const prevCorrect = qAnalytics.meta.accuracy.correct;
        const timeSpent   = (Date.now() - (attempt.startedAt?.getTime() || Date.now())) / 1000;

        qAnalytics.meta.accuracy.total   = prevTotal + 1;
        qAnalytics.meta.accuracy.correct = prevCorrect + (isCorrect ? 1 : 0);
        qAnalytics.meta.avgTime =
          ((qAnalytics.meta.avgTime * prevTotal) + timeSpent) / (prevTotal + 1);

        await qAnalytics.save();
      }
    }

    // persist results back to the same document
    attempt.responses   = checked;
    attempt.score       = total;
    attempt.maxScore    = max;
    attempt.percentage  = max > 0 ? Math.round((total / max) * 100) : 0;
    attempt.submittedAt = new Date();
    await attempt.save();

    // Commented out final debug log
    // console.log(
    //   '🛢️ Saved attempt document:',
    //   await TestAttempt.findById(attemptId).lean()
    // );

    return res.status(200).json({
      score:      total,
      maxScore:   max,
      percentage: attempt.percentage,
      breakdown:  checked
    });
  } catch (err) {
    console.error('🔥 submitAttempt failed:', err);
    return res.status(500).json({ message: 'Submit failed', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// submitTest: saves the student's answers in the TestAttempt model
// ────────────────────────────────────────────────────────────────────────────────
exports.submitTest = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { responses } = req.body; // array of { question, selected }

    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    attempt.responses = responses.map(r => ({
      question: r.question,
      selected: r.selected
    }));
    attempt.submittedAt = new Date();
    await attempt.save();

    res.json({ message: 'Submitted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// saveProgress: saves the student's progress in the TestAttempt model
// ────────────────────────────────────────────────────────────────────────────────
exports.saveProgress = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { responses } = req.body;  // array with question, selected, review

    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Not found' });

    attempt.responses = responses;
    await attempt.save();
    res.json({ message: 'Progress saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// getMyTestAttempts, reviewAttempt, getStudentStats, getLeaderboardForSeries
// ────────────────────────────────────────────────────────────────────────────────

exports.getMyTestAttempts = async (req, res) => {
  try {
    const attempts = await TestAttempt.find({ student: req.user.userId })
      .populate({
        path: 'series',
        select: 'title examType year',
        populate: { path: 'examType', select: 'code name' }
      })
      .sort({ submittedAt: -1 });
    return res.json(attempts);
  } catch (err) {
    console.error('❌ getMyTestAttempts error:', err);
    return res.status(500).json({ message: 'Failed to fetch attempts' });
  }
};

exports.reviewAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    // Populate both the question reference and its correctOptions
    const attempt = await TestAttempt.findById(attemptId)
      .populate({
        path: 'responses.question',
        select: 'questionText options correctOptions',
      })
      .lean();
    if (!attempt) return res.status(404).json({ message: 'Not found' });
    return res.json(attempt);
  } catch (err) {
    console.error('❌ Error in reviewAttempt:', err);
    return res.status(500).json({ message: 'Failed to load review', error: err.message });
  }
};

exports.getStudentStats = async (req, res) => {
  try {
    const attempts = await TestAttempt.find({
      student:     req.user.userId,
      submittedAt: { $exists: true }
    });
    const total       = attempts.length;
    const totalScore  = attempts.reduce((s, a) => s + (a.score || 0), 0);
    const maxScoreSum = attempts.reduce((s, a) => s + (a.maxScore || 0), 0);

    return res.json({
      total,
      averagePercentage: maxScoreSum > 0
        ? Math.round((totalScore / maxScoreSum) * 100)
        : 0,
      bestPercentage: attempts.reduce(
        (best, a) => Math.max(best, a.percentage || 0), 0
      )
    });
  } catch (err) {
    console.error('❌ getStudentStats error:', err);
    return res.status(500).json({ message: 'Failed to get stats' });
  }
};

exports.getLeaderboardForSeries = async (req, res) => {
  try {
    const attempts = await TestAttempt.find({
      series:      req.params.seriesId,
      submittedAt: { $exists: true }
    })
      .populate('student', 'name email')
      .sort({ percentage: -1, submittedAt: 1 })
      .limit(10);

    if (!attempts.length) {
      return res.json({ leaderboard: [], message: 'No submissions yet.' });
    }

    const leaderboard = attempts.map((a, i) => ({
      rank:       i + 1,
      student:    a.student?.name || a.student?.email || 'Anonymous',
      score:      a.score,
      maxScore:   a.maxScore,
      percentage: a.percentage,
      submittedAt: a.submittedAt
    }));

    return res.json({ leaderboard });
  } catch (err) {
    console.error('❌ getLeaderboardForSeries error:', err);
    return res.status(500).json({ message: 'Failed to get leaderboard' });
  }
};
