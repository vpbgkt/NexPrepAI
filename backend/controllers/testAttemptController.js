const TestSeries   = require('../models/TestSeries');
const TestAttempt  = require('../models/TestAttempt');
const Question     = require('../models/Question');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const mongoose = require('mongoose'); // Added mongoose require

// Helper function to shuffle an array
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// ────────────────────────────────────────────────────────────────────────────────
// startTest: creates a new TestAttempt and returns detailed question data
// ────────────────────────────────────────────────────────────────────────────────
exports.startTest = async (req, res) => {
  try {
    const { seriesId } = req.body;
    const userId = req.user.userId;
    const series = await TestSeries.findById(seriesId).lean(); // Use .lean() for plain JS object
    if (!series) return res.status(404).json({ message: 'Test not found' });

    // Abort any previous in-progress attempts for this user and series
    const existingInProgressAttempts = await TestAttempt.find({
      student: userId,
      series: seriesId,
      status: 'in-progress'
    });

    if (existingInProgressAttempts.length > 0) {
      for (const oldAttempt of existingInProgressAttempts) {
        oldAttempt.status = 'aborted';
        oldAttempt.remainingDurationSeconds = 0; // Or whatever is appropriate for aborted
        await oldAttempt.save();
      }
    }

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
      // If variant is a Mongoose subdocument, convert its sections to plain objects
      if (selectedVariant.sections) {
        selectedVariant.sections = selectedVariant.sections.map(s => (typeof s.toObject === 'function' ? s.toObject() : ({ ...s, questions: s.questions ? s.questions.map(q => (typeof q.toObject === 'function' ? q.toObject() : {...q})) : [] }) ));
      }
    }

    // assemble a raw layout of sections:
    let initialLayout = [];
    if (selectedVariant?.sections?.length) {
      // use the chosen variant’s sections (already converted to plain objects if selectedVariant was processed)
      initialLayout = selectedVariant.sections;
    } else if (Array.isArray(series.sections) && series.sections.length) {
      // use any sections defined on the series (convert to plain objects)
      initialLayout = series.sections.map(s => (typeof s.toObject === 'function' ? s.toObject() : ({ ...s, questions: s.questions ? s.questions.map(q => (typeof q.toObject === 'function' ? q.toObject() : {...q})) : [] }) ));
    } else if (Array.isArray(series.questions) && series.questions.length) {
      // fallback: wrap a flat questions[] into one section
      initialLayout = [{
        title: 'All Questions',
        order: 1,
        questions: series.questions.map(qItem => ({
          question: qItem.question, // Assuming qItem is {question: ObjectId, marks: Number, negativeMarks: Number}
          marks: qItem.marks || 1,
          negativeMarks: qItem.negativeMarks === undefined ? 0 : qItem.negativeMarks
        })),
        questionPool: [],
        questionsToSelectFromPool: 0,
        randomizeQuestionOrderInSection: false
      }];
    }

    // Process layout for randomization and pooling
    let processedLayout = JSON.parse(JSON.stringify(initialLayout)); // Deep copy to ensure plain objects and no side effects

    if (series.randomizeSectionOrder) {
      processedLayout = shuffleArray(processedLayout);
      // Re-assign order based on new shuffled positions
      processedLayout.forEach((sec, index) => sec.order = index + 1);
    }

    for (let i = 0; i < processedLayout.length; i++) {
      const section = processedLayout[i];

      if (section.questionsToSelectFromPool > 0 && section.questionPool && section.questionPool.length > 0) {
        let pool = [...section.questionPool];
        let selectedQuestionIds = shuffleArray(pool).slice(0, section.questionsToSelectFromPool);
        
        section.questions = selectedQuestionIds.map(qId => ({
          question: qId,
          marks: section.defaultMarksForPooledQuestion !== undefined ? section.defaultMarksForPooledQuestion : 1,
          negativeMarks: section.defaultNegativeMarksForPooledQuestion !== undefined ? section.defaultNegativeMarksForPooledQuestion : 0
        }));
      } else if (section.randomizeQuestionOrderInSection && section.questions && section.questions.length > 0) {
        section.questions = shuffleArray(section.questions);
      }
    }
    
    // now build detailed sections for the frontend and for storing in TestAttempt
    // using the processedLayout
    const detailedSectionsForAttempt = await Promise.all(
      processedLayout.map(async sec => ({
        title: sec.title,
        order: sec.order,
        questions: await Promise.all(
          (sec.questions || []).map(async q => { // q is an item from processedLayout.section.questions
            const doc = await Question.findById(q.question)
              .select('translations type difficulty questionHistory')
              .lean();

            let questionText = ''; 
            let options = [];      
            let translations = []; 

            if (Array.isArray(doc?.translations) && doc.translations.length) {
              translations = doc.translations; 
              const defaultTranslation = doc.translations.find(t => t.lang === 'en') || doc.translations[0];
              if (defaultTranslation) {
                questionText = defaultTranslation.questionText;
                options = defaultTranslation.options || [];
              }
            } else if (doc) {
              questionText = doc.questionText || ''; 
              options = doc.options || [];
            }

            return {
              question:     q.question.toString(),
              marks:        q.marks || 1, // Uses marks from processedLayout (derived from TestSeries), defaults to 1
              negativeMarks: q.negativeMarks || 0, // Uses negativeMarks from processedLayout, defaults to 0
              translations: translations, 
              questionText: questionText, 
              options:      options.map(opt => ({ text: opt.text, isCorrect: opt.isCorrect })), 
              type:         doc?.type,
              difficulty:   doc?.difficulty,
              questionHistory: doc?.questionHistory || []
            };
          })
        )
      }))
    );
    
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

    const series = await TestSeries.findById(attempt.series).lean(); // .lean() for series settings

    // Fetch master question data for all questions in the attempt
    const questionIdsInAttempt = Array.from(new Set(
      attempt.sections.flatMap(sec => sec.questions.map(q => q.question.toString()))
    ));

    const masterQuestionsData = await Question.find({ _id: { $in: questionIdsInAttempt }})
                                            .select('translations options type') // Select fields needed for correct options and type
                                            .lean();
    const masterQuestionsMap = new Map(masterQuestionsData.map(qDoc => [qDoc._id.toString(), qDoc]));

    let totalScore = 0;
    let maxScore = 0;
    const checkedResponses = [];

    for (const section of attempt.sections) {
      for (const qDetail of section.questions) { // qDetail is from attempt.sections
        const questionIdStr = qDetail.question.toString();
        maxScore += qDetail.marks || 0; // Marks from the attempt snapshot

        const masterQ = masterQuestionsMap.get(questionIdStr);
        let earnedMarks = 0;
        let userSelectedOptionIndices = [];

        const userResponse = responses.find(r => r.question.toString() === questionIdStr);

        if (!masterQ) {
          console.error(`Master question data not found for ID: ${questionIdStr} during submit. Awarding 0 marks.`);
          // Fallback or error handling if master question is missing (e.g., deleted)
          // For now, assume 0 marks if master data is gone.
        } else if (userResponse && userResponse.selected) {
          userSelectedOptionIndices = userResponse.selected.map(s => parseInt(s, 10)).filter(n => !isNaN(n));

          let definitiveOptionsSource = [];
          if (masterQ.translations && masterQ.translations.length > 0) {
            const defaultTranslation = masterQ.translations.find(t => t.lang === 'en') || masterQ.translations[0];
            definitiveOptionsSource = defaultTranslation.options || [];
          } else if (masterQ.options) { // Fallback to top-level options
            definitiveOptionsSource = masterQ.options || [];
          }

          const definitiveCorrectOptionIndices = [];
          definitiveOptionsSource.forEach((opt, index) => {
            if (opt.isCorrect) {
              definitiveCorrectOptionIndices.push(index);
            }
          });

          const numberOfCorrectOptions = definitiveCorrectOptionIndices.length;
          const numberOfSelectedOptions = userSelectedOptionIndices.length;

          let allSelectedAreTrulyCorrect = true;
          if (numberOfSelectedOptions > 0) {
            allSelectedAreTrulyCorrect = userSelectedOptionIndices.every(selectedIndex =>
              definitiveCorrectOptionIndices.includes(selectedIndex)
            );
          } else { // No options selected by user
            allSelectedAreTrulyCorrect = (numberOfCorrectOptions === 0); // Correct if there were no correct options to begin with
          }
          
          const selectedCorrectly = (numberOfSelectedOptions === numberOfCorrectOptions) && allSelectedAreTrulyCorrect;

          const negativeMarkValue = qDetail.negativeMarks !== undefined
            ? qDetail.negativeMarks
            : (series && series.negativeMarkEnabled ? (series.negativeMarkValue !== undefined ? series.negativeMarkValue : 0) : 0);
          
          earnedMarks = selectedCorrectly ? (qDetail.marks || 0) : -negativeMarkValue;
        } else {
          // No response from user for this question
          const negativeMarkValue = qDetail.negativeMarks !== undefined
            ? qDetail.negativeMarks
            : (series && series.negativeMarkEnabled ? (series.negativeMarkValue !== undefined ? series.negativeMarkValue : 0) : 0);
          // Typically, unattempted questions get 0, unless specific negative marking for unattempted is in place.
          // If negativeMarkValue applies to incorrect answers only, then unattempted should be 0.
          // For now, if -negativeMarkValue is 0, this results in 0. If negativeMarkValue is >0, it implies penalty for incorrect.
          // Let's assume 0 for unattempted unless explicitly defined otherwise by business logic for "negative marks for unattempted"
           earnedMarks = 0; // Default to 0 for unattempted.
        }
        
        totalScore += earnedMarks;
        checkedResponses.push({
          question: qDetail.question, // ObjectId
          selected: userResponse ? userResponse.selected : [], // Store what user sent (string indices)
          earned: earnedMarks,
          review: userResponse ? userResponse.review || false : false
        });
      }
    }

    attempt.responses = checkedResponses; // Save the processed responses
    attempt.score = totalScore;
    attempt.maxScore = maxScore;
    attempt.percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    attempt.submittedAt = new Date();
    attempt.status = 'completed';
    attempt.remainingDurationSeconds = 0;
    await attempt.save();

    return res.status(200).json({
      score: totalScore,
      maxScore: maxScore,
      percentage: attempt.percentage,
      breakdown: checkedResponses // Send processed responses for immediate feedback if needed
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
    const { responses, timeLeft } = req.body; 

    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Test is not in-progress. Cannot save.' });
    }

    attempt.responses = responses; 
    attempt.lastSavedAt = new Date();
    if (timeLeft !== undefined) {
      attempt.remainingDurationSeconds = timeLeft;
    }
    
    await attempt.save();
    
    const savedAttempt = await TestAttempt.findById(attemptId).lean(); // Fetch again to see saved data

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
        select: 'title year enablePublicLeaderboard' // Added enablePublicLeaderboard
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
    const attempt = await TestAttempt.findById(attemptId)
      .populate({
        path: 'responses.question',
        select: 'translations questionText options type difficulty correctOptions questionHistory',
      })
      .lean();

    if (!attempt) return res.status(404).json({ message: 'Not found' });

    if (attempt.sections && attempt.sections.length > 0) {
      const questionIdsFromSections = Array.from(new Set(
        attempt.sections.flatMap(s => s.questions.map(q => q.question.toString()))
      ));

      if (questionIdsFromSections.length > 0) {
        const masterQuestionsData = await Question.find({ '_id': { $in: questionIdsFromSections } })
                                            .select('translations options')
                                            .lean();
        const masterQuestionsMap = new Map(masterQuestionsData.map(qDoc => [qDoc._id.toString(), qDoc]));

        for (const section of attempt.sections) {
          for (const qInSection of section.questions) {
            const masterQData = masterQuestionsMap.get(qInSection.question.toString());
            if (masterQData) {
              if (Array.isArray(qInSection.options)) {
                let sourceOptionsForIsCorrect = [];
                const mDefaultTranslation = masterQData.translations?.find(t => t.lang === 'en') || masterQData.translations?.[0];
                if (mDefaultTranslation?.options) {
                  sourceOptionsForIsCorrect = mDefaultTranslation.options;
                } else if (Array.isArray(masterQData.options)) {
                  sourceOptionsForIsCorrect = masterQData.options;
                }
                qInSection.options = qInSection.options.map(optInAttempt => {
                  const masterOpt = sourceOptionsForIsCorrect.find(mOpt => mOpt.text === optInAttempt.text);
                  return {
                    ...optInAttempt,
                    isCorrect: masterOpt ? !!masterOpt.isCorrect : (typeof optInAttempt.isCorrect === 'boolean' ? optInAttempt.isCorrect : false)
                  };
                });
              }
              if (Array.isArray(qInSection.translations)) {
                qInSection.translations = qInSection.translations.map(transInAttempt => {
                  const masterTrans = masterQData.translations?.find(mt => mt.lang === transInAttempt.lang);
                  let enrichedTransOptions = transInAttempt.options;
                  if (masterTrans?.options && Array.isArray(transInAttempt.options)) {
                    enrichedTransOptions = transInAttempt.options.map(optInAttempt => {
                      const masterOpt = masterTrans.options.find(mOpt => mOpt.text === optInAttempt.text);
                      return {
                        ...optInAttempt,
                        isCorrect: masterOpt ? !!masterOpt.isCorrect : (typeof optInAttempt.isCorrect === 'boolean' ? optInAttempt.isCorrect : false)
                      };
                    });
                  }
                  return { ...transInAttempt, options: enrichedTransOptions };
                });
              }
            }
          }
        }
      }
    }
    return res.json(attempt);
  } catch (err) {
    console.error('❌ Error in reviewAttempt:', err);
    return res.status(500).json({ message: 'Failed to load review', error: err.message });
  }
};

exports.getStudentStats = async (req, res) => {
  try {
    const studentAttempts = await TestAttempt.find({
      student:     req.user.userId,
      submittedAt: { $exists: true }
    });
    const totalAttempts       = studentAttempts.length;
    const totalAttemptScore  = studentAttempts.reduce((s, a) => s + (a.score || 0), 0);
    const maxAttemptScoreSum = studentAttempts.reduce((s, a) => s + (a.maxScore || 0), 0);

    return res.json({
      total: totalAttempts,
      averagePercentage: maxAttemptScoreSum > 0
        ? Math.round((totalAttemptScore / maxAttemptScoreSum) * 100)
        : 0,
      bestPercentage: studentAttempts.reduce(
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
    const seriesId = req.params.seriesId;
    const currentSeries = await TestSeries.findById(seriesId).select('enablePublicLeaderboard title').lean();

    if (!currentSeries) {
      return res.status(404).json({ message: 'Test series not found.' });
    }

    if (!currentSeries.enablePublicLeaderboard) {
      return res.json({
        leaderboard: [],
        message: 'Leaderboard is not enabled for this test series.',
        title: currentSeries.title
      });
    }

    const leaderboardData = await TestAttempt.aggregate([
      {
        $match: {
          series: new mongoose.Types.ObjectId(seriesId),
          status: 'completed' // Consider only completed attempts
        }
      },
      {
        $sort: {
          student: 1,       // Sort by student to easily pick their best attempt
          percentage: -1,   // Best percentage first
          score: -1,        // Tie-break with score
          submittedAt: 1    // Further tie-break with submission time (earlier is better)
        }
      },      {
        $group: {
          _id: "$student",    // Group by student ID
          bestAttemptId: { $first: "$_id" }, // Keep the ID of the best attempt
          score: { $first: "$score" },
          maxScore: { $first: "$maxScore" },
          percentage: { $first: "$percentage" },
          submittedAt: { $first: "$submittedAt" },
          timeTakenSeconds: { $first: "$timeTakenSeconds" } // Include time taken
        }
      },
      {
        $lookup: {
          from: "users",      // Collection name for User model
          localField: "_id",  // This is the student ID from the $group stage
          foreignField: "_id",// Match with _id in the users collection
          as: "studentInfo"
        }
      },
      {
        $unwind: "$studentInfo" // Deconstruct the studentInfo array (should be one user per attempt)
      },
      {        $sort: {
          percentage: -1,   // Sort final list by percentage
          score: -1,         // Tie-break with score
          submittedAt: 1    // Further tie-break with submission time
        }
      },
      {
        $project: {
          _id: 0, // Exclude the default _id (which is studentId from $group stage)
          studentId: "$studentInfo._id",
          displayName: {
            $ifNull: ["$studentInfo.displayName", { $ifNull: ["$studentInfo.name", "$studentInfo.email"] }]
          },          score: 1,
          maxScore: 1,
          percentage: 1,
          submittedAt: 1,
          timeTakenSeconds: 1 // Include time taken
        }
      }
    ]);

    if (!leaderboardData.length) {
      return res.json({ 
        leaderboard: [], 
        message: 'No completed attempts yet for this series.',
        title: currentSeries.title
      });
    }

    const leaderboard = leaderboardData.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

    return res.json({ leaderboard, title: currentSeries.title });
  } catch (err) {
    console.error('❌ getLeaderboardForSeries error:', err);
    return res.status(500).json({ message: 'Failed to get leaderboard', error: err.message });
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

    const progressAttempt = await TestAttempt.findOne({
      student: userId,
      series:  seriesId,
      status: 'in-progress'
    })
    .populate('series', 'duration') // Populate only the duration field from TestSeries
    .sort({ startedAt: -1 })
    .lean();

    if (!progressAttempt) {
      return res.json({}); // Return empty object if no progress attempt
    }

    const remainingTime = progressAttempt.remainingDurationSeconds;
    const seriesDuration = progressAttempt.series?.duration; // in minutes
    const attemptExpiresAt = progressAttempt.expiresAt;
    const currentTime = new Date();

    // Check for expiration
    if (remainingTime <= 0 || (attemptExpiresAt && currentTime > new Date(attemptExpiresAt))) {
      
      const expiredResponse = {
        attemptId: progressAttempt._id.toString(),
        sections: progressAttempt.sections, 
        responses: progressAttempt.responses,
        status: 'expired', // Explicitly set status
        remainingDurationSeconds: 0, // Ensure 0 for expired
        duration: seriesDuration,
        startedAt: progressAttempt.startedAt,
        expiresAt: attemptExpiresAt,
        lastSavedAt: progressAttempt.lastSavedAt
      };
      return res.json(expiredResponse);
    }

    // If not expired, return the progress
    const successResponse = {
      attemptId: progressAttempt._id.toString(),
      sections: progressAttempt.sections,
      responses: progressAttempt.responses,
      remainingDurationSeconds: remainingTime,
      duration: seriesDuration, 
      status: 'in-progress', // Explicitly add status
      startedAt: progressAttempt.startedAt,
      expiresAt: attemptExpiresAt,
      lastSavedAt: progressAttempt.lastSavedAt
    };
    return res.json(successResponse);

  } catch (err) {
    console.error('❌ Error in getProgress:', err);
    return res.status(500).json({ message: 'Failed to get progress', error: err.message });
  }
};
