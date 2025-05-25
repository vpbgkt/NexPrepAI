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
    if (series.maxAttempts && existingCount >= series.maxAttempts) { // Ensure series.maxAttempts is checked if it exists
      return res.status(429).json({
        message: `Max ${series.maxAttempts} attempts reached for this test.`
      });
    }

    // NEW LOGIC: Delete all previous attempts for this user and series
    // This ensures only the current attempt will be stored.
    await TestAttempt.deleteMany({ student: userId, series: seriesId });
    console.log(`[${userId}] Deleted previous attempts for series ${seriesId}`);

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

    // Enhanced logging for section randomization
    // console.log(`[${userId}] StartTest: Initial section count for randomization: ${initialLayout.length}`);
    // console.log(`[${userId}] StartTest: series.randomizeSectionOrder flag is: ${series.randomizeSectionOrder}`);
    // if (initialLayout.length > 0) {
    //   console.log(`[${userId}] StartTest: Initial sections (order, title from initialLayout): ${initialLayout.map(s => `(Order: ${s.order}, Title: '${s.title}')`).join('; ')}`);
    //   console.log(`[${userId}] StartTest: Sections for processing (order, title from processedLayout before shuffle): ${processedLayout.map(s => `(Order: ${s.order}, Title: '${s.title}')`).join('; ')}`);
    // }

    if (series.randomizeSectionOrder && processedLayout.length > 1) {
      console.log(`[${userId}] StartTest: Applying section shuffle as randomizeSectionOrder is true and section count > 1.`);
      processedLayout = shuffleArray(processedLayout);
      // Re-assign order based on new shuffled positions
      processedLayout.forEach((sec, index) => {
        sec.order = index + 1;
      });
      // console.log(`[${userId}] StartTest: After shuffle - New sections order (order, title): ${processedLayout.map(s => `(Order: ${s.order}, Title: '${s.title}')`).join('; ')}`);
    } else if (processedLayout.length <= 1) {
      // console.log(`[${userId}] StartTest: Not shuffling sections - only one or zero sections present.`);
      // if (processedLayout.length > 0) {
      //   console.log(`[${userId}] StartTest: Sections order (no shuffle, <=1 section): ${processedLayout.map(s => `(Order: ${s.order}, Title: '${s.title}')`).join('; ')}`);
      // }
    } else { // series.randomizeSectionOrder is false
      // console.log(`[${userId}] StartTest: Not shuffling sections - randomizeSectionOrder is false.`);
      // if (processedLayout.length > 0) {
      //   console.log(`[${userId}] StartTest: Sections order (no shuffle, flag false): ${processedLayout.map(s => `(Order: ${s.order}, Title: '${s.title}')`).join('; ')}`);
      // }
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
      attemptNo:   existingCount + 1, // attemptNo reflects the sequence of tries
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
    const { attemptId } = req.params;
    const { responses } = req.body; // Array of { question: string (questionId), selected: any[] }
    const userId = req.user.userId;

    const attempt = await TestAttempt.findOne({
      _id: attemptId,
      student: userId,
      status: 'in-progress'
    }).populate('series', 'title'); // Populate series title, useful for context if needed

    if (!attempt) {
      return res.status(404).json({ message: 'In-progress attempt not found or already submitted.' });
    }

    let calculatedScore = 0;
    let calculatedMaxScore = 0;

    const attemptQuestionsMap = new Map();
    if (attempt.sections && Array.isArray(attempt.sections)) {
      attempt.sections.forEach(section => {
        if (section.questions && Array.isArray(section.questions)) {
          section.questions.forEach(q => {
            // q.question should be the ID string.
            attemptQuestionsMap.set(q.question.toString(), {
              marks: q.marks,
              negativeMarks: q.negativeMarks,
            });
          });
        }
      });
    }

    const questionIdsFromAttempt = Array.from(attemptQuestionsMap.keys());
    const masterQuestions = await Question.find({ '_id': { $in: questionIdsFromAttempt } })
                                          .select('translations type options') // Ensure options are selected for correct answer check
                                          .lean(); 
    
    const masterQuestionsMap = new Map(masterQuestions.map(qDoc => [qDoc._id.toString(), qDoc]));

    console.log(`--- Starting Grade Calculation for Attempt: ${attemptId} ---`);
    console.log(`User ID: ${userId}`);
    console.log(`Raw responses from client (length ${responses.length}):`, JSON.stringify(responses, null, 2));

    let responseIndex = 0;
    const processedResponses = []; 

    if (attempt.sections && Array.isArray(attempt.sections)) {
      for (const section of attempt.sections) {
        if (section.questions && Array.isArray(section.questions)) {
          for (const attemptQuestion of section.questions) {
            const questionId = attemptQuestion.question.toString();
            const questionDetailsFromAttempt = attemptQuestionsMap.get(questionId);
            const masterQuestionData = masterQuestionsMap.get(questionId);

            let earnedForThisSlot = 0;
            let statusForThisSlot = 'not-attempted'; 

            if (!questionDetailsFromAttempt || !masterQuestionData) {
              console.warn(`[${attemptId}] Missing details for question ${questionId}. Skipping.`);
              const userResponseForSkippedSlot = responses[responseIndex];
              processedResponses.push({
                question: questionId,
                selected: userResponseForSkippedSlot ? userResponseForSkippedSlot.selected : [],
                earned: 0,
                status: 'error-missing-details'
              });
              if (questionDetailsFromAttempt) { // Still add to max score if question was in attempt structure
                calculatedMaxScore += (questionDetailsFromAttempt.marks || 0);
              }
              if (responseIndex < responses.length) {
                 responseIndex++;
              }
              continue; 
            }

            const qMarks = questionDetailsFromAttempt.marks || 0; // Default to 0 if undefined
            const qNegativeMarks = typeof questionDetailsFromAttempt.negativeMarks === 'number' ? questionDetailsFromAttempt.negativeMarks : 0;
            calculatedMaxScore += qMarks; // Increment max score for every question slot in the attempt

            const userResponseForThisSlot = responses[responseIndex];

            if (!userResponseForThisSlot || userResponseForThisSlot.question !== questionId) {
              console.warn(`[${attemptId}] Response/Question ID mismatch or missing response at index ${responseIndex}. Expected Q_ID: ${questionId}, Got response for Q_ID: ${userResponseForThisSlot ? userResponseForThisSlot.question : 'undefined'}. Slot marked not-attempted.`);
              statusForThisSlot = 'not-attempted'; // Or 'response-mismatch' if a response existed but for wrong Q
              earnedForThisSlot = 0;
            } else if (userResponseForThisSlot.selected && userResponseForThisSlot.selected.length > 0) {
              // Determine correct options from masterQuestionData (e.g., from 'en' translation or root options)
              let correctOptionTexts = [];
              const defaultTranslation = masterQuestionData.translations?.find(t => t.lang === 'en');
              const optionsSource = defaultTranslation?.options || masterQuestionData.options;

              if (optionsSource && Array.isArray(optionsSource)) {
                correctOptionTexts = optionsSource.filter(opt => opt.isCorrect).map(opt => opt.text);
              }

              if (masterQuestionData.type === 'single') {
                if (userResponseForThisSlot.selected.length === 1 && optionsSource) {
                  const selectedIndex = parseInt(String(userResponseForThisSlot.selected[0]), 10);
                  if (selectedIndex >= 0 && selectedIndex < optionsSource.length) {
                    const selectedOptionText = optionsSource[selectedIndex].text;
                    if (correctOptionTexts.includes(selectedOptionText)) {
                      earnedForThisSlot = qMarks;
                      statusForThisSlot = 'correct';
                    } else {
                      earnedForThisSlot = -qNegativeMarks;
                      statusForThisSlot = 'incorrect';
                    }
                  } else {
                    earnedForThisSlot = -qNegativeMarks; // Invalid index
                    statusForThisSlot = 'incorrect';
                  }
                } else {
                  earnedForThisSlot = -qNegativeMarks; // Multiple selected for SCQ or no options source
                  statusForThisSlot = 'incorrect';
                }
              } else if (masterQuestionData.type === 'multiple') {
                const selectedOptionTextsForMSQ = [];
                if (optionsSource) {
                  userResponseForThisSlot.selected.forEach(selectedIndexStr => {
                    const selectedIndex = parseInt(String(selectedIndexStr), 10);
                    if (selectedIndex >= 0 && selectedIndex < optionsSource.length) {
                      selectedOptionTextsForMSQ.push(optionsSource[selectedIndex].text);
                    }
                  });
                }
                
                if (correctOptionTexts.length > 0) { // Proceed only if there are defined correct options
                    const correctSelectedCount = selectedOptionTextsForMSQ.filter(optText => correctOptionTexts.includes(optText)).length;
                    const incorrectSelectedCount = selectedOptionTextsForMSQ.filter(optText => !correctOptionTexts.includes(optText)).length;

                    if (correctSelectedCount === correctOptionTexts.length && incorrectSelectedCount === 0 && selectedOptionTextsForMSQ.length === correctOptionTexts.length) {
                        earnedForThisSlot = qMarks;
                        statusForThisSlot = 'correct';
                    } else {
                        // MSQs can have partial marking or specific negative marking rules.
                        // For now, any deviation from perfect match is incorrect and gets negative marks if attempted.
                        if (selectedOptionTextsForMSQ.length > 0) { // Penalize only if an attempt was made
                            earnedForThisSlot = -qNegativeMarks;
                            statusForThisSlot = 'incorrect';
                        } else { // Not attempted
                            earnedForThisSlot = 0;
                            statusForThisSlot = 'not-attempted';
                        }
                    }
                } else { // No correct options defined for the MSQ in master, treat as not attempted or error
                    earnedForThisSlot = 0;
                    statusForThisSlot = selectedOptionTextsForMSQ.length > 0 ? 'incorrect' : 'not-attempted'; // If user selected something, it's incorrect
                }
              } else if (masterQuestionData.type === 'integer') {
                const selectedAnswerText = String(userResponseForThisSlot.selected[0]);
                // For integer, correctOptionTexts should contain the correct integer answer as a string
                if (correctOptionTexts.includes(selectedAnswerText)) {
                  earnedForThisSlot = qMarks;
                  statusForThisSlot = 'correct';
                } else {
                  earnedForThisSlot = -qNegativeMarks;
                  statusForThisSlot = 'incorrect';
                }
              }
            } else {
              // Genuinely not attempted (selected array is empty or not present)
              statusForThisSlot = 'not-attempted';
              earnedForThisSlot = 0;
            }
            
            calculatedScore += earnedForThisSlot; // Add earned marks for this slot to total score

            processedResponses.push({
              question: questionId,
              selected: userResponseForThisSlot ? userResponseForThisSlot.selected : [],
              earned: earnedForThisSlot,
              status: statusForThisSlot
            });
            
            if (responseIndex < responses.length) {
                responseIndex++;
            }
          }
        }
      }
    }

    console.log(`[${attemptId}] PRE-SAVE CHECK: Calculated Score: ${calculatedScore}, Calculated MaxScore: ${calculatedMaxScore}`);

    attempt.score = calculatedScore;
    attempt.maxScore = calculatedMaxScore;
    attempt.percentage = calculatedMaxScore > 0 ? (calculatedScore / calculatedMaxScore) * 100 : 0;
    attempt.responses = processedResponses; 
    attempt.status = 'completed';
    attempt.submittedAt = new Date();

    if (attempt.startedAt) {
      const timeTakenMs = attempt.submittedAt.getTime() - attempt.startedAt.getTime();
      attempt.timeTakenSeconds = Math.round(timeTakenMs / 1000);
    } else {
      attempt.timeTakenSeconds = null;
    }

    attempt.remainingDurationSeconds = 0;

    await attempt.save();

    return res.status(200).json({
      message: 'Test submitted successfully.',
      attemptId: attempt._id,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      timeTakenSeconds: attempt.timeTakenSeconds
    });

  } catch (err) {
    console.error('❌ Error in submitAttempt:', err);
    // It's good practice to check if headers have already been sent before trying to send a response.
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to submit test', error: err.message });
    }
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
      .populate('series', 'title') 
      .lean(); 

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Ensure attempt.sections and attempt.responses exist before trying to use them
    if (!attempt.sections || !attempt.responses) {
        console.error(`[${attemptId}] Review error: Attempt sections or responses are missing.`);
        return res.status(500).json({ message: 'Attempt data is incomplete for review.' });
    }
    
    // The frontend expects `attempt.sections` for structure and `attempt.responses` (with earned/status) for user's answers.
    // Enrich `attempt.sections.questions` with `isCorrect` for options from master Question data.
    if (attempt.sections && attempt.sections.length > 0) {
      const questionIdsFromSections = Array.from(new Set(
        attempt.sections.flatMap(s => s.questions.map(q => q.question.toString()))
      ));

      if (questionIdsFromSections.length > 0) {
        const masterQuestionsData = await Question.find({ '_id': { $in: questionIdsFromSections } })
                                            .select('translations options type correctOptions') 
                                            .lean();
        const masterQuestionsMap = new Map(masterQuestionsData.map(qDoc => [qDoc._id.toString(), qDoc]));

        for (const section of attempt.sections) {
          for (const qInSection of section.questions) { 
            const masterQData = masterQuestionsMap.get(qInSection.question.toString());
            if (masterQData) {
              qInSection.type = masterQData.type; 

              const defaultMasterTranslation = masterQData.translations?.find(t => t.lang === 'en') || masterQData.translations?.[0];
              let correctOptionsForDisplay = [];
              const masterOptionsSource = defaultMasterTranslation?.options || masterQData.options;

              if (masterOptionsSource) {
                correctOptionsForDisplay = masterOptionsSource.filter(opt => opt.isCorrect);
              }
              qInSection.correctOptionsDisplay = correctOptionsForDisplay.map(opt => opt.text); 

              const enrichOptionsWithIsCorrect = (optionsToEnrich, currentMasterOptionsSource) => {
                if (!Array.isArray(optionsToEnrich) || !Array.isArray(currentMasterOptionsSource)) return optionsToEnrich;
                return optionsToEnrich.map(optInAttempt => {
                  const masterOpt = currentMasterOptionsSource.find(mOpt => mOpt.text === optInAttempt.text);
                  return {
                    ...optInAttempt,
                    isCorrect: masterOpt ? !!masterOpt.isCorrect : (typeof optInAttempt.isCorrect === 'boolean' ? optInAttempt.isCorrect : false)
                  };
                });
              };

              if (Array.isArray(qInSection.translations)) {
                qInSection.translations = qInSection.translations.map(transInAttempt => {
                  const masterTrans = masterQData.translations?.find(mt => mt.lang === transInAttempt.lang);
                  const currentMasterOptionsForLang = masterTrans?.options || masterOptionsSource;
                  return {
                    ...transInAttempt,
                    options: enrichOptionsWithIsCorrect(transInAttempt.options, currentMasterOptionsForLang)
                  };
                });
              }
              qInSection.options = enrichOptionsWithIsCorrect(qInSection.options, masterOptionsSource);
            }
          }
        }
      }
    }
    // console.log(\`[${attemptId}] Sending attempt data to review:\`, JSON.stringify(attempt, null, 2));
    return res.json(attempt); 
  } catch (err) {
    console.error('❌ Error in reviewAttempt:', err);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to load review', error: err.message });
    }
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
          timeTakenSeconds: 1, // For tie-breaking, prefer faster times if scores are identical
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
          timeTakenSeconds: { $first: "$timeTakenSeconds" } // This should now correctly pick from the $first (best) attempt
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
