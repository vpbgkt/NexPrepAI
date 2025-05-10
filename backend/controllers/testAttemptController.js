const TestSeries   = require('../models/TestSeries');
const TestAttempt  = require('../models/TestAttempt');
const Question     = require('../models/Question');
const PDFDocument = require('pdfkit');
const moment = require('moment');

// ────────────────────────────────────────────────────────────────────────────────
// startTest: creates a new TestAttempt and returns detailed question data
// ────────────────────────────────────────────────────────────────────────────────
exports.startTest = async (req, res) => {
  try {
    const { seriesId } = req.body;
    const userId = req.user.userId;
    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ message: 'Test not found' });

    // Abort any previous in-progress attempts for this user and series
    const existingInProgressAttempts = await TestAttempt.find({
      student: userId,
      series: seriesId,
      status: 'in-progress'
    });

    if (existingInProgressAttempts.length > 0) {
      console.log(`Found ${existingInProgressAttempts.length} existing in-progress attempts. Marking as aborted.`);
      for (const oldAttempt of existingInProgressAttempts) {
        oldAttempt.status = 'aborted';
        oldAttempt.remainingDurationSeconds = 0; // Or whatever is appropriate for aborted
        await oldAttempt.save();
        console.log(`Marked attempt ${oldAttempt._id} as aborted.`);
      }
    }

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

    // now build detailed sections for the frontend and for storing in TestAttempt
    const detailedSectionsForAttempt = await Promise.all(
      rawLayout.map(async sec => ({
        title: sec.title,
        order: sec.order,
        questions: await Promise.all(
          sec.questions.map(async q => {
            const doc = await Question.findById(q.question)
              .select('translations type difficulty questionHistory') // MODIFIED: Added questionHistory
              .lean();

            // We will now pass the full translations array if it exists
            // and retain the existing fallback for questionText and options
            // if translations are not present (though the goal is for translations to always be present)

            let questionText = ''; // Fallback
            let options = [];      // Fallback
            let translations = []; // Default to empty array

            if (Array.isArray(doc?.translations) && doc.translations.length) {
              translations = doc.translations; // Send all translations
              // Still provide a default top-level questionText and options,
              // preferably from English or the first available translation.
              const defaultTranslation = doc.translations.find(t => t.lang === 'en') || doc.translations[0];
              if (defaultTranslation) {
                questionText = defaultTranslation.questionText;
                options = defaultTranslation.options || [];
              }
            } else if (doc) {
              // Fallback if translations array is missing but doc exists (legacy data perhaps)
              questionText = doc.questionText || ''; // Assuming direct fields if no translations
              options = doc.options || [];
            }

            return {
              question:     q.question.toString(),
              marks:        q.marks || 1,
              translations: translations, // Send the full translations array
              questionText: questionText, // Keep a fallback/default
              options:      options.map(opt => ({ text: opt.text, isCorrect: opt.isCorrect })), // Keep a fallback/default
              type:         doc?.type,
              difficulty:   doc?.difficulty,
              questionHistory: doc?.questionHistory || [] // ADDED: Include questionHistory
            };
          })
        )
      }))
    );
    
    console.log('Backend startTest: detailedSectionsForAttempt before save:', JSON.stringify(detailedSectionsForAttempt, null, 2)); // <--- ADD THIS LOG

    const startedAt = new Date();
    let expiresAt = null;
    let remainingDurationSeconds = null;

    if (series.duration && series.duration > 0) {
      expiresAt = new Date(startedAt.getTime() + series.duration * 60 * 1000);
      remainingDurationSeconds = series.duration * 60;
    }

    // create the attempt
    const attempt = new TestAttempt({
      series:      seriesId,
      student:     req.user.userId,
      attemptNo:   existingCount + 1,
      variantCode: selectedVariant?.code,
      sections:    detailedSectionsForAttempt, // Store the detailed structure
      responses:   [],
      status:      'in-progress',
      startedAt,
      expiresAt,
      remainingDurationSeconds
    });
    await attempt.save();

    console.log('🚀 Test started, attempt created:', attempt._id);

    return res.status(201).json({
      attemptId: attempt._id.toString(),
      duration:  series.duration, // Send original duration in minutes
      sections:  detailedSectionsForAttempt // Send detailed sections to frontend
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
    const attemptId = req.params.attemptId;
    const { responses } = req.body; // responses from frontend

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit tests.' });
    }

    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (attempt.status === 'completed') {
      return res.status(400).json({ message: 'This test has already been submitted.' });
    }

    const series = await TestSeries.findById(attempt.series);

    let total = 0, max = 0;
    const checkedResponses = [];

    // Iterate over the questions in the attempt's sections to ensure correct marks and structure
    for (const section of attempt.sections) {
      for (const qDetail of section.questions) {
        const questionIdStr = qDetail.question.toString();
        max += qDetail.marks || 0;

        const userResponse = responses.find(r => r.question.toString() === questionIdStr);
        let earned = 0;
        let selectedOptions = [];

        if (userResponse) {
          selectedOptions = Array.isArray(userResponse.selected) ? userResponse.selected : (userResponse.selected ? [userResponse.selected.toString()] : []);
          
          // Fetch full question for correct options if not already in qDetail (best to have it in qDetail from startTest)
          // For now, assuming qDetail.options has isCorrect field
          const correctOptTexts = qDetail.options.filter(opt => opt.isCorrect).map(opt => opt.text);
          
          // Convert selected indices to option texts if necessary, or ensure comparison logic is robust
          // This part needs careful alignment with how frontend sends `selected` (indices or values)
          // Assuming frontend sends option *values* (text) or *indices* that map to qDetail.options
          // For simplicity, let's assume frontend sends selected option *indices* as strings.
          
          const selectedCorrectly = selectedOptions.length === correctOptTexts.length &&
                                   selectedOptions.every(selectedIndex => {
                                       const optionIndex = parseInt(selectedIndex, 10);
                                       return qDetail.options[optionIndex] && qDetail.options[optionIndex].isCorrect;
                                   });

          const nm = qDetail.negativeMarks != null // Assuming negativeMarks might be per question
            ? qDetail.negativeMarks
            : (series.negativeMarkEnabled ? series.negativeMarkValue : 0);

          earned = selectedCorrectly ? (qDetail.marks || 0) : -nm;
        }
        total += earned;
        checkedResponses.push({
          question: qDetail.question,
          selected: selectedOptions, // Store what the user selected
          // correctOptions: correctOptTexts, // Storing correct options for review
          earned,
          review: userResponse ? userResponse.review || false : false
        });
      }
    }

    attempt.responses = checkedResponses;
    attempt.score = total;
    attempt.maxScore = max;
    attempt.percentage = max > 0 ? Math.round((total / max) * 100) : 0;
    attempt.submittedAt = new Date();
    attempt.status = 'completed';
    attempt.remainingDurationSeconds = 0; // Test completed
    await attempt.save();

    console.log('✅ Test submitted and graded for attemptId:', attemptId);

    return res.status(200).json({
      score: total,
      maxScore: max,
      percentage: attempt.percentage,
      breakdown: checkedResponses
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
    // Frontend should send: { responses: [...], timeLeft: ... }
    const { responses, timeLeft } = req.body; 

    console.log(`Backend saveProgress: Received for attemptId: ${attemptId}`); // <--- ADD THIS LOG
    console.log('Backend saveProgress: Received responses payload:', JSON.stringify(responses, null, 2)); // <--- ADD THIS LOG
    console.log(`Backend saveProgress: Received timeLeft: ${timeLeft}`); // <--- ADD THIS LOG

    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Test is not in-progress. Cannot save.' });
    }

    attempt.responses = responses; // Assuming `responses` from frontend matches `responseSchema` structure
    attempt.lastSavedAt = new Date();
    if (timeLeft !== undefined) {
      attempt.remainingDurationSeconds = timeLeft;
    }
    
    await attempt.save();
    console.log('💾 Progress saved for attemptId:', attemptId, 'TimeLeft:', timeLeft, 'Responses Count:', responses.length);
    // Log what was actually saved to DB for responses
    const savedAttempt = await TestAttempt.findById(attemptId).lean(); // Fetch again to see saved data
    console.log('Backend saveProgress: attempt.responses after save in DB:', JSON.stringify(savedAttempt.responses, null, 2)); // <--- ADD THIS LOG

    res.json({ message: 'Progress saved successfully' });
  } catch (err) {
    console.error('❌ Error saving progress for attemptId:', req.params.attemptId, err);
    res.status(500).json({ message: 'Failed to save progress', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// getMyTestAttempts, reviewAttempt, getStudentStats, getLeaderboardForSeries
// ────────────────────────────────────────────────────────────────────────────────

exports.getMyTestAttempts = async (req, res) => {
  try {
    const attempts = await TestAttempt.find({ student: req.user.userId })
      // only pull title & year—no nested populate on examType
      .populate({
        path: 'series',
        select: 'title year'
      })
      .sort({ submittedAt: -1 });

    return res.json(attempts);
  } catch (err) {
    console.error('❌ getMyTestAttempts error:', err);
    return res
      .status(500)
      .json({ message: 'Failed to fetch attempts' });
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

exports.generatePdf = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;

    const attempt = await TestAttempt.findById(attemptId)
      .populate('student', 'username email')
      .populate('series', 'title examType')
      .lean();

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    // 1) Kick-off streaming PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=scorecard-${attemptId}.pdf`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // 2) Header
    doc.fontSize(18).text('NexPrep Scorecard', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Series: ${attempt.series.title}`);
    doc.text(`Attempt #: ${attempt.attemptNo}`);
    doc.text(`Student : ${attempt.student.username} (${attempt.student.email})`);
    doc.text(`Date    : ${moment(attempt.submittedAt).format('YYYY-MM-DD  HH:mm')}`);
    doc.moveDown();

    // 3) Big score
    doc.fontSize(22).fillColor('#1565c0')
       .text(`${attempt.score} / ${attempt.maxScore}`, { align: 'center' })
       .fillColor('black')
       .fontSize(12)
       .text(`Percentage: ${attempt.percentage}%`, { align: 'center' });
    doc.moveDown();

    // 4) Section breakdown (if any)
    if (attempt.sections?.length) {
      doc.fontSize(14).text('Section Breakdown');
      attempt.sections.forEach(sec => {
        doc.fontSize(12).list([`${sec.title}  –  ${sec.questions.length} Qs`]);
      });
      doc.moveDown();
    }

    doc.text('Thank you for using NexPrep.', { align: 'center' });
    doc.end(); // triggers stream end
  } catch (err) {
    console.error('PDF gen error:', err);
    res.status(500).json({ message: 'PDF generation failed', error: err.message });
  }
};

/**
 * GET /api/tests/:seriesId/progress
 * If there’s an in-progress attempt for this user+series, return its ID,
 * remaining time, and saved sections/responses; otherwise return {}.
 */
exports.getProgress = async (req, res) => {
  try {
    const seriesId = req.params.seriesId;
    const userId   = req.user.userId;

    console.log(`🔍 Getting progress for seriesId: ${seriesId}, userId: ${userId}`);

    // Find the most recent attempt that’s in progress (not submitted)
    const attempt = await TestAttempt.findOne({
      student: userId,
      series:  seriesId,
      status: 'in-progress'
    })
    .sort({ startedAt: -1 }) // Sort by startedAt descending to get the latest
    // .populate('sections.questions.question') // Optionally populate if sections don't store full q data
    .lean();

    if (!attempt) {
      console.log('🤔 No in-progress attempt found.');
      return res.json({}); // no progress
    }

    console.log('Backend getProgress: attempt.sections from DB:', JSON.stringify(attempt.sections, null, 2)); // <--- ADD THIS LOG
    console.log('Backend getProgress: attempt.responses from DB:', JSON.stringify(attempt.responses, null, 2)); // <--- ADD THIS LOG

    // Frontend expects remainingTime in seconds for the timer.
    // The `remainingDurationSeconds` field should be the authoritative source.
    const remainingTime = attempt.remainingDurationSeconds;

    // If remainingDurationSeconds is 0 or less, and there's an expiresAt, check server-side expiry
    if (remainingTime <= 0 && attempt.expiresAt && new Date(attempt.expiresAt) < new Date()) {
        console.log('⏰ Attempt expired server-side. Marking as aborted/completed.');
        // Optionally, update status to 'aborted' or 'completed' here if it makes sense for your logic
        // For now, just return no progress or an expired status
        // await TestAttempt.findByIdAndUpdate(attempt._id, { status: 'aborted', remainingDurationSeconds: 0 });
        return res.json({ attemptId: attempt._id.toString(), remainingTime: 0, sections: attempt.sections, expired: true });
    }
    
    console.log('✅ In-progress attempt found:', attempt._id, 'Remaining Duration:', remainingTime);

    return res.json({
      attemptId:     attempt._id.toString(),
      remainingTime: remainingTime, // This is in seconds
      sections:      attempt.sections,  // These sections should include question details and saved responses
      responses:     attempt.responses // Send the saved responses
    });
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ message: 'Server error fetching progress' });
  }
};
