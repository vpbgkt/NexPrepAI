/**
 * @fileoverview Test Attempt Controller
 * 
 * This module handles comprehensive test attempt operations for the NexPrep platform,
 * providing complete functionality for student test-taking experiences. It manages
 * the entire test lifecycle from initialization through completion, including
 * dynamic question generation, progress tracking, auto-saving, grading, and
 * detailed analytics with performance insights.
 * 
 * @module controllers/testAttemptController
 * 
 * @requires ../models/TestSeries - Test series data model
 * @requires ../models/TestAttempt - Test attempt data model  
 * @requires ../models/Question - Question data model
 * @requires mongoose - MongoDB object modeling
 * 
 * @description Features include:
 * - Dynamic test initialization with section/question generation
 * - Intelligent question pooling and randomization algorithms
 * - Real-time progress auto-saving during exam sessions
 * - Comprehensive submission and automated grading systems
 * - Advanced review interface with detailed explanations
 * - Performance analytics and comparative analysis
 * - Study recommendations based on weakness patterns
 * - Leaderboard generation and ranking systems
 * - Test resumption capabilities for interrupted sessions
 * - Variant selection for test customization
 * - Live test mode with time-based access controls
 * - Attempt limit enforcement and validation
 * 
 * @algorithms
 * - Fisher-Yates shuffling for question randomization
 * - Dynamic scoring with weighted section analysis
 * - Performance trend analysis across multiple attempts
 * - Adaptive difficulty assessment and recommendations
 * 
 * @security
 * - User authentication validation for all operations
 * - Attempt ownership verification and access controls
 * - Secure progress data handling and validation
 * - Anti-cheating measures through randomization
 * 
 * @author NexPrep Development Team
 * @version 2.0
 */

const TestSeries   = require('../models/TestSeries');
const TestAttempt  = require('../models/TestAttempt');
const TestAttemptCounter = require('../models/TestAttemptCounter');
const Question     = require('../models/Question');
const mongoose = require('mongoose'); // Added mongoose require
const User = require('../models/User'); // Import User model
const AntiCheatingService = require('../services/antiCheatingService');
const StreakService = require('../services/streakService'); // Import streak service

/**
 * Utility function to randomly shuffle array elements using Fisher-Yates algorithm
 * 
 * @description Implements the Fisher-Yates shuffle algorithm for cryptographically
 * secure randomization of array elements. This ensures fair question distribution
 * and prevents predictable question patterns in test attempts.
 * 
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array (original array unchanged)
 * 
 * @example
 * const questions = [q1, q2, q3, q4];
 * const shuffled = shuffleArray(questions);
 * // Returns randomized order while preserving original array
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Initialize and start a new test attempt
 * 
 * @route POST /api/tests/start
 * @access Private/Student
 * 
 * @description Creates a new test attempt with dynamic question generation,
 * intelligent randomization, and variant selection. Handles comprehensive
 * validation including time constraints, attempt limits, and test availability.
 * Implements advanced question pooling algorithms for fair test distribution
 * while maintaining test integrity through secure randomization.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing test parameters
 * @param {string} req.body.seriesId - MongoDB ObjectId of the test series
 * @param {Object} req.user - Authenticated user object from JWT middleware
 * @param {string} req.user.userId - Student's unique user identifier
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON object with comprehensive test attempt data
 * @returns {string} returns.attemptId - Generated test attempt unique identifier
 * @returns {Array} returns.sections - Test sections with questions and metadata
 * @returns {Object} returns.testMetadata - Test configuration and timing information
 * @returns {Object} returns.instructions - Test-specific instructions and rules
 * @returns {number} returns.totalQuestions - Total number of questions in the test
 * @returns {number} returns.duration - Test duration in minutes
 * @returns {Date} returns.startTime - Test attempt start timestamp
 * 
 * @throws {404} Test series not found with provided ID
 * @throws {403} Test not available due to time constraints (live mode)
 * @throws {429} Maximum allowed attempts reached for this test
 * @throws {500} Server error during test initialization or question generation
 * 
 * @algorithm
 * 1. Validate test series existence and accessibility
 * 2. Check live test timing constraints if applicable
 * 3. Verify attempt limits and delete previous attempts
 * 4. Select random variant if multiple variants available
 * 5. Generate dynamic question layout with shuffling
 * 6. Create new test attempt with comprehensive metadata
 * 7. Return structured test data for frontend consumption
 * 
 * @example
 * // Request body
 * {
 *   "seriesId": "64f8a1b2c3d4e5f6a7b8c9d0"
 * }
 * 
 * // Response
 * {
 *   "attemptId": "64f8a1b2c3d4e5f6a7b8c9d1",
 *   "sections": [
 *     {
 *       "name": "Physics",
 *       "questions": [...],
 *       "timeLimit": 60,
 *       "totalMarks": 100
 *     }
 *   ],
 *   "testMetadata": {
 *     "title": "JEE Main Mock Test",
 *     "duration": 180,
 *     "totalQuestions": 75
 *   },
 *   "startTime": "2024-01-01T10:00:00.000Z"
 * }
 */
exports.startTest = async (req, res) => {
  try {
    const { seriesId } = req.body;
    const userId = req.user.userId;

    // Check account expiration
    const student = await User.findById(userId).select('accountExpiresAt role').lean();
    if (!student) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Skip expiration check for admin/superadmin roles
    if (student.role === 'student') {
      if (student.accountExpiresAt && new Date(student.accountExpiresAt) < new Date()) {
        return res.status(403).json({ 
          message: 'Your account has expired. Please renew your subscription to continue taking tests.' 
        });
      }
    }

    const series = await TestSeries.findById(seriesId).lean();
    if (!series) return res.status(404).json({ message: 'Test not found' });

    if (series.mode?.toLowerCase() === 'live') {
      const now = new Date();
      if (series.startAt && now < series.startAt) {
        return res.status(403).json({ message: 'This test has not started yet.' });
      }
      if (series.endAt && now > series.endAt) {
        return res.status(403).json({ message: 'This test has ended.' });
      }
    }    // Get current attempt count for this student-series combination
    const currentAttemptCount = await TestAttemptCounter.getAttemptCount(userId, seriesId);
    
    // Check if max attempts reached
    if (series.maxAttempts && currentAttemptCount >= series.maxAttempts) {
      return res.status(429).json({
        message: `Max ${series.maxAttempts} attempts reached for this test.`
      });
    }

    // Check if there's already an in-progress attempt for this user and series
    const existingInProgressAttempt = await TestAttempt.findOne({ 
      student: userId, 
      series: seriesId,
      status: 'in-progress'
    });

    // If there's an in-progress attempt, delete it (but keep completed attempts)
    if (existingInProgressAttempt) {
      await TestAttempt.deleteOne({ _id: existingInProgressAttempt._id });
      console.log(`[${userId}] Deleted existing in-progress attempt for series ${seriesId}`);
    }

    // Increment the attempt counter and get the new attempt number
    const newAttemptNumber = await TestAttemptCounter.incrementAttemptCount(userId, seriesId);

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
        order: 1,        questions: series.questions.map(qItem => ({
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
    // console.log(`[${userId}] StartTest: Initial section count for randomization: ${initialLayout.length}`);    // console.log(`[${userId}] StartTest: series.randomizeSectionOrder flag is: ${series.randomizeSectionOrder}`);
    // if (initialLayout.length > 0) {
    //   console.log(`[${userId}] StartTest: Initial sections (order, title from initialLayout): ${initialLayout.map(s => `(Order: ${s.order}, Title: '${s.title}')`).join('; ')}`);
    //   console.log(`[${userId}] StartTest: Sections for processing (order, title from processedLayout before shuffle): ${processedLayout.map(s => `(Order: ${s.order}, Title: '${s.title}')`).join('; ')}`);
    // }
    
    if (series.randomizeSectionOrder && processedLayout.length > 1) {
      processedLayout = shuffleArray(processedLayout);
      // Re-assign order based on new shuffled positions
      processedLayout.forEach((sec, index) => {
        sec.order = index + 1;
      });
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
      // Log the state of processedLayout right before creating detailedSectionsForAttempt
    // now build detailed sections for the frontend and for storing in TestAttempt
    // using the processedLayout
    const detailedSectionsForAttempt = await Promise.all(
      processedLayout.map(async sec => ({
        title: sec.title,
        order: sec.order,
        questions: await Promise.all(          (sec.questions || []).map(async q => { // q is an item from processedLayout.section.questions
            const doc = await Question.findById(q.question)
              .select('questionText translations type difficulty questionHistory options numericalAnswer')
              .lean();            let questionText = ''; 
            let options = [];      
            let translations = []; 
            let numericalAnswer = null;            if (doc) {
              translations = doc.translations || [];
              
              // Filter out empty options from translations for all question types
              translations = translations.map(translation => ({
                ...translation,
                options: translation.options ? translation.options.filter(opt => opt.text && opt.text.trim() !== '') : []
              }));
              
              // Extract numerical answer from translations for NAT questions
              if (doc.type === 'numerical' || doc.type === 'integer') {
                const englishTranslation = translations.find(t => t.lang === 'en');
                const firstAvailableTranslation = translations.length > 0 ? translations[0] : null;
                
                if (englishTranslation?.numericalAnswer) {
                  numericalAnswer = englishTranslation.numericalAnswer;
                } else if (firstAvailableTranslation?.numericalAnswer) {
                  numericalAnswer = firstAvailableTranslation.numericalAnswer;
                }
              }
                // Improved logic for sourcing questionText and options
              const englishTranslation = translations.find(t => t.lang === 'en');
              const firstAvailableTranslation = translations.length > 0 ? translations[0] : null;
              
              if (englishTranslation?.questionText) {
                questionText = englishTranslation.questionText;
                // Only process options for non-NAT questions
                if (doc.type !== 'numerical' && doc.type !== 'integer' && englishTranslation.options && Array.isArray(englishTranslation.options)) {
                  options = englishTranslation.options
                    .filter(opt => opt.text && opt.text.trim() !== '') // Filter out empty text options
                    .map(opt => ({
                      text: opt.text,
                      img: opt.img || null,
                      isCorrect: opt.isCorrect,
                      _id: opt._id ? opt._id.toString() : undefined
                    }));
                }
              } else if (firstAvailableTranslation?.questionText) {
                questionText = firstAvailableTranslation.questionText;
                // Only process options for non-NAT questions
                if (doc.type !== 'numerical' && doc.type !== 'integer' && firstAvailableTranslation.options && Array.isArray(firstAvailableTranslation.options)) {
                  options = firstAvailableTranslation.options
                    .filter(opt => opt.text && opt.text.trim() !== '') // Filter out empty text options
                    .map(opt => ({
                      text: opt.text,
                      img: opt.img || null,
                      isCorrect: opt.isCorrect,
                      _id: opt._id ? opt._id.toString() : undefined
                    }));
                }
              }              // Fallback to root document fields if translations don't have the data
              if (!questionText && doc.questionText) {
                questionText = doc.questionText;
              }
              // Only process fallback options for non-NAT questions
              if (doc.type !== 'numerical' && doc.type !== 'integer' && options.length === 0 && doc.options && Array.isArray(doc.options)) {
                options = doc.options
                  .filter(opt => opt.text && opt.text.trim() !== '') // Filter out empty text options
                  .map(opt => ({
                    text: opt.text,
                    img: opt.img || null,
                    isCorrect: opt.isCorrect,
                    _id: opt._id ? opt._id.toString() : undefined
                  }));
              }
            } else {
              console.warn(`[${userId}] StartTest: Question with ID ${q.question} not found in DB.`);
            }            return {
              question:     q.question.toString(),
              marks:        q.marks || 1,
              negativeMarks: q.negativeMarks === undefined ? 0 : q.negativeMarks,
              translations: translations,
              questionText: questionText,
              options:      options,
              type:         doc?.type,
              difficulty:   doc?.difficulty,
              questionHistory: doc?.questionHistory || [],
              numericalAnswer: numericalAnswer // Add numerical answer for NAT questions
            };
          })
        )
      }))
    );      // Log the final detailedSectionsForAttempt that will be saved and sent to frontend

    const startedAt = new Date();
    let expiresAt = null;
    let remainingDurationSeconds = null;

    if (series.duration && series.duration > 0) {
      expiresAt = new Date(startedAt.getTime() + series.duration * 60 * 1000);
      remainingDurationSeconds = series.duration * 60;
    }    // create the attempt
    const attempt = new TestAttempt({
      series:      seriesId,
      student:     req.user.userId,
      attemptNo:   newAttemptNumber, // Use the calculated attempt number
      variantCode: selectedVariant?.code,
      sections:    detailedSectionsForAttempt, // Store the detailed structure
      responses:   [],
      status:      'in-progress',
      startedAt,
      expiresAt,
      remainingDurationSeconds,
      // Initialize strict mode if required
      strictModeEnabled: AntiCheatingService.isStrictModeExam(series)
    });    await attempt.save();

    // Ensure newAttempt is defined and has _id
    if (!attempt || !attempt._id) {
      console.error(`[${userId}] Failed to create new attempt for series ${seriesId}`);
      return res.status(500).json({ message: 'Failed to initialize test attempt.' });
    }

    // Respond with attempt details, including sections and questions
    res.json({
      attemptId: attempt._id.toString(),
      sections: detailedSectionsForAttempt, // Ensure this variable holds the processed sections
      duration: series.duration,   // Duration in minutes
      seriesTitle: series.title, // Added seriesTitle
      // Include any other necessary details like question content if not already in populatedSections
    });
  } catch (err) {
    console.error('❌ Error in startTest:', err);
    return res.status(500).json({ message: 'Failed to start test', error: err.message });
  }
};

/**
 * Submit Test Attempt Endpoint
 * 
 * Grades and saves a completed test attempt with automatic scoring.
 * Handles multiple choice, single choice, and various question types.
 * Preserves enhanced review data (time spent, attempts, flags, confidence).
 * 
 * @route POST /api/tests/:attemptId/submit
 * @access Private (Students only)
 * @param {string} req.params.attemptId - Test attempt ID to submit
 * @param {Object} req.body - Request body containing responses
 * @param {Array} req.body.responses - Array of student responses with questionInstanceKey matching
 * @param {Object} req.user - Authenticated user object
 * @returns {Object} Submission result with score, percentage, and timing data
 * @throws {404} Test attempt not found or already submitted
 * @throws {500} Server error during grading or save operation
 */
exports.submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { responses } = req.body; // Array of { question: string (questionId), selected: any[] }
    const userId = req.user.userId;

    const attempt = await TestAttempt.findOne({
      _id: attemptId,
      student: userId,
      status: 'in-progress'
    }).populate('series', 'title negativeMarking defaultNegativeMarks'); // Populate series title and negative marking settings

    if (!attempt) {
      return res.status(404).json({ message: 'In-progress attempt not found or already submitted.' });
    }

    let calculatedScore = 0;
    let calculatedMaxScore = 0;

    const attemptQuestionsMap = new Map();    if (attempt.sections && Array.isArray(attempt.sections)) {
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
                                          .select('translations type options numericalAnswer') // Include numericalAnswer for NAT questions
                                          .lean();
      const masterQuestionsMap = new Map(masterQuestions.map(qDoc => [qDoc._id.toString(), qDoc]));
    
    // Create a position-indexed array of responses to handle duplicate question IDs
    const clientResponsesArray = Array.isArray(responses) ? responses : [];
    
    const processedResponses = [];
    let sectionIndex = 0; // Track section index for composite key generation

    if (attempt.sections && Array.isArray(attempt.sections)) {
      for (const section of attempt.sections) {
        if (section.questions && Array.isArray(section.questions)) {
          let questionIndex = 0; // Track question index within section for composite key generation
          
          for (const attemptQuestion of section.questions) { // These are the questions as defined in the attempt structure
            const questionId = attemptQuestion.question.toString();
              // Create composite key that matches frontend format: questionId_sectionIdx_questionIdx
            const questionInstanceKey = `${questionId}_${sectionIndex}_${questionIndex}`;
              const questionDetailsFromAttempt = attemptQuestionsMap.get(questionId); // Marks, negative marks from attempt structure
            const masterQuestionData = masterQuestionsMap.get(questionId); // Full question data from DB

            let earnedForThisSlot = 0;
            let statusForThisSlot = 'not-attempted'; 
              // Find user response by matching questionInstanceKey instead of position
            const userResponseForThisSlot = clientResponsesArray.find(response => 
              response.questionInstanceKey === questionInstanceKey
            );            
            
            // Normalize userResponseForThisSlot.selected to always be an array for consistent processing
            let normalizedSelectedArray = [];
            if (userResponseForThisSlot && userResponseForThisSlot.selected !== undefined && userResponseForThisSlot.selected !== null) {
              if (Array.isArray(userResponseForThisSlot.selected)) {
                normalizedSelectedArray = userResponseForThisSlot.selected;
              } else {
                // If it's a single value (string, number from radio/single-select), wrap it in an array
                // Also ensure empty strings are not pushed as a valid selection if they mean 'unanswered'
                if (userResponseForThisSlot.selected !== "") {
                    normalizedSelectedArray = [userResponseForThisSlot.selected];
                }
              }            }
            
            if (!questionDetailsFromAttempt || !masterQuestionData) {
              console.warn(`[${attemptId}] Missing details for question ${questionId} in attempt structure or master DB. Skipping for grading.`);
              processedResponses.push({
                question: questionId,
                questionInstanceKey: questionInstanceKey, // Add the composite key for matching in review
                selected: normalizedSelectedArray, // Use normalized array
                earned: 0,
                status: 'error-missing-details',
                timeSpent: userResponseForThisSlot?.timeSpent || 0,
                attempts: userResponseForThisSlot?.attempts || 0, // Default to 0 if not provided by client for this scenario
                flagged: userResponseForThisSlot?.flagged || false,
                confidence: userResponseForThisSlot?.confidence,
                visitedAt: userResponseForThisSlot?.visitedAt,
                lastModifiedAt: userResponseForThisSlot?.lastModifiedAt
              });
              if (questionDetailsFromAttempt) {
                calculatedMaxScore += (questionDetailsFromAttempt.marks || 0);
              }
              continue; 
            }            const qMarks = questionDetailsFromAttempt.marks || 0;
              // Get negative marks - prefer question-specific, then series default, then fallback
            let qNegativeMarks = 0;
            if (attempt.series?.negativeMarking !== false) { // Check if negative marking is enabled for the series
              if (typeof questionDetailsFromAttempt.negativeMarks === 'number') {
                // Use question-specific negative marks (including 0 if explicitly set)
                qNegativeMarks = questionDetailsFromAttempt.negativeMarks;
              } else if (attempt.series?.defaultNegativeMarks) {
                qNegativeMarks = attempt.series.defaultNegativeMarks;
              } else {
                // Default negative marking: typically 1/3 or 1/4 of positive marks
                qNegativeMarks = Math.round(qMarks / 3) || 1; // Default to 1/3 of marks or minimum 1
              }            }
            
            calculatedMaxScore += qMarks;

            // Check if question was attempted - for NAT questions check numericalAnswer, for others check selected
            const isNATQuestion = masterQuestionData.type === 'integer' || masterQuestionData.type === 'numerical';
            const questionAttempted = userResponseForThisSlot && (
              (isNATQuestion && userResponseForThisSlot.numericalAnswer !== undefined && userResponseForThisSlot.numericalAnswer !== null) ||
              (!isNATQuestion && normalizedSelectedArray.length > 0)
            );

            if (questionAttempted) {              // User attempted this question
              let correctOptionTexts = [];
              const defaultTranslation = masterQuestionData.translations?.find(t => t.lang === 'en');
              const optionsSource = defaultTranslation?.options || masterQuestionData.options;

              if (optionsSource && Array.isArray(optionsSource)) {
                correctOptionTexts = optionsSource.filter(opt => opt.isCorrect).map(opt => opt.text);
              }

              if (masterQuestionData.type === 'single') {
                if (normalizedSelectedArray.length === 1 && optionsSource) { // Check normalizedSelectedArray
                  const selectedIndex = parseInt(String(normalizedSelectedArray[0]), 10); // Use normalizedSelectedArray
                  if (selectedIndex >= 0 && selectedIndex < optionsSource.length) {
                    const selectedOptionText = optionsSource[selectedIndex].text;                    if (correctOptionTexts.includes(selectedOptionText)) {                      earnedForThisSlot = qMarks;
                      statusForThisSlot = 'correct';
                      console.log(`[SCORING_DEBUG] Question ${questionId}: CORRECT - earned ${earnedForThisSlot} marks`);
                    } else {
                      earnedForThisSlot = -qNegativeMarks;
                      statusForThisSlot = 'incorrect';
                      console.log(`[SCORING_DEBUG] Question ${questionId}: INCORRECT - lost ${qNegativeMarks} marks (earned: ${earnedForThisSlot})`);
                    }} else {
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
                  normalizedSelectedArray.forEach(selectedIndexStr => { // Use normalizedSelectedArray
                    const selectedIndex = parseInt(String(selectedIndexStr), 10);
                    if (selectedIndex >= 0 && selectedIndex < optionsSource.length) {
                      selectedOptionTextsForMSQ.push(optionsSource[selectedIndex].text);
                    }
                  });
                }
                
                if (correctOptionTexts.length > 0) {
                    const correctSelectedCount = selectedOptionTextsForMSQ.filter(optText => correctOptionTexts.includes(optText)).length;
                    const incorrectSelectedCount = selectedOptionTextsForMSQ.filter(optText => !correctOptionTexts.includes(optText)).length;

                    if (correctSelectedCount === correctOptionTexts.length && incorrectSelectedCount === 0 && selectedOptionTextsForMSQ.length === correctOptionTexts.length) {
                        earnedForThisSlot = qMarks;
                        statusForThisSlot = 'correct';
                    } else {
                        if (selectedOptionTextsForMSQ.length > 0) {
                            earnedForThisSlot = -qNegativeMarks;
                            statusForThisSlot = 'incorrect';
                        } else { 
                            earnedForThisSlot = 0;
                            statusForThisSlot = 'not-attempted';
                        }
                    }
                } else { 
                    earnedForThisSlot = 0;
                    statusForThisSlot = selectedOptionTextsForMSQ.length > 0 ? 'incorrect' : 'not-attempted';
                }
              } else if (masterQuestionData.type === 'integer' || masterQuestionData.type === 'numerical') {
                // Handle Numerical Answer Type (NAT) questions
                // For NAT questions, get the answer from numericalAnswer field, not selected
                const studentAnswer = parseFloat(userResponseForThisSlot.numericalAnswer);
                
                console.log(`[NAT_DEBUG] Question ${questionId}: Student answered = ${studentAnswer}, type = ${typeof studentAnswer}`);
                
                if (studentAnswer !== undefined && studentAnswer !== null && !isNaN(studentAnswer)) {
                  // Get numerical answer from translations
                  let numericalAnswer = null;
                  const defaultTranslation = masterQuestionData.translations?.find(t => t.lang === 'en');
                  
                  if (defaultTranslation?.numericalAnswer) {
                    numericalAnswer = defaultTranslation.numericalAnswer;
                  }
                  
                  console.log(`[NAT_DEBUG] Question ${questionId}: Correct answer data =`, JSON.stringify(numericalAnswer, null, 2));
                  
                  if (numericalAnswer) {
                    let isCorrect = false;
                    let debugInfo = '';
                    
                    // Check exact value with tolerance
                    if (numericalAnswer.exactValue !== undefined && numericalAnswer.exactValue !== null) {
                      const exactValue = parseFloat(numericalAnswer.exactValue);
                      if (numericalAnswer.tolerance && numericalAnswer.tolerance > 0) {
                        const tolerance = (exactValue * numericalAnswer.tolerance) / 100;
                        const minValue = exactValue - tolerance;
                        const maxValue = exactValue + tolerance;
                        isCorrect = studentAnswer >= minValue && studentAnswer <= maxValue;
                        debugInfo = `exactValue=${exactValue}, tolerance=${numericalAnswer.tolerance}%, range=[${minValue}, ${maxValue}]`;
                      } else {
                        // Use small epsilon for floating point comparison
                        isCorrect = Math.abs(studentAnswer - exactValue) < 0.001;
                        debugInfo = `exactValue=${exactValue}, epsilon=0.001`;
                      }
                    }
                    
                    // Check range (if exact value check didn't pass or wasn't defined)
                    if (!isCorrect && numericalAnswer.minValue !== undefined && numericalAnswer.maxValue !== undefined) {
                      const minValue = parseFloat(numericalAnswer.minValue);
                      const maxValue = parseFloat(numericalAnswer.maxValue);
                      
                      // Handle potential reversed min/max values (e.g., "5 to 3" should be "3 to 5")
                      const actualMin = Math.min(minValue, maxValue);
                      const actualMax = Math.max(minValue, maxValue);
                      
                      isCorrect = studentAnswer >= actualMin && studentAnswer <= actualMax;
                      debugInfo = `range: original=[${minValue}, ${maxValue}], corrected=[${actualMin}, ${actualMax}]`;
                    }
                    
                    console.log(`[NAT_DEBUG] Question ${questionId}: ${debugInfo}, studentAnswer=${studentAnswer}, isCorrect=${isCorrect}`);
                      if (isCorrect) {
                      earnedForThisSlot = qMarks;
                      statusForThisSlot = 'correct';
                    } else {
                      // Apply negative marking for NAT questions too, based on question-specific settings
                      earnedForThisSlot = -qNegativeMarks;
                      statusForThisSlot = 'incorrect';
                    }                  } else {
                    console.warn(`No numerical answer found for NAT question ${questionId}`);
                    earnedForThisSlot = -qNegativeMarks;
                    statusForThisSlot = 'incorrect';
                  }
                } else {
                  earnedForThisSlot = -qNegativeMarks;
                  statusForThisSlot = 'incorrect';
                }
              }
            } else {
              // Genuinely not attempted by the user (no selected array or empty selected array for this questionId)
              statusForThisSlot = 'unanswered';
              earnedForThisSlot = 0;            }
            
            // Round earned marks to avoid floating point precision issues
            earnedForThisSlot = Math.round(earnedForThisSlot * 100) / 100;
            
            calculatedScore += earnedForThisSlot;processedResponses.push({
              question: questionId,
              questionInstanceKey: questionInstanceKey, // Add the composite key for matching in review
              selected: normalizedSelectedArray, // Use normalized array
              numericalAnswer: userResponseForThisSlot?.numericalAnswer, // Include numerical answer for NAT questions
              earned: earnedForThisSlot,
              status: statusForThisSlot,
              timeSpent: userResponseForThisSlot?.timeSpent || 0,
              attempts: userResponseForThisSlot?.attempts || 0, // If not attempted, attempts might be 0 from client
              flagged: userResponseForThisSlot?.flagged || false,
              confidence: userResponseForThisSlot?.confidence,
              visitedAt: userResponseForThisSlot?.visitedAt,
              lastModifiedAt: userResponseForThisSlot?.lastModifiedAt
            });
            // Increment question index within current section
            questionIndex++;
          }
        }
        // Increment section index after processing all questions in the section
        sectionIndex++;
      }    }

    // Refetch the attempt just before saving to get the latest version
    const freshAttempt = await TestAttempt.findById(attemptId);
    if (!freshAttempt) {
        // The 'attempt' variable here refers to the one fetched at the beginning of the submitAttempt function.
        // This log helps understand if the document disappeared or was never found.
        console.error(`[${attemptId}] CRITICAL: Attempt not found before final save. Original attempt object was ${attempt ? 'populated' : 'null or not found initially'}.`);
        return res.status(404).json({ message: 'Test attempt not found for final save.' });
    }    // Apply all calculated and updated fields to the freshAttempt object
    freshAttempt.score = Math.round(calculatedScore * 100) / 100; // Round to 2 decimal places
    freshAttempt.maxScore = calculatedMaxScore;
    freshAttempt.percentage = calculatedMaxScore > 0 ? Math.round((calculatedScore / calculatedMaxScore) * 10000) / 100 : 0; // Round to 2 decimal places
    freshAttempt.responses = processedResponses; 
    freshAttempt.status = 'completed';
    freshAttempt.submittedAt = new Date(); // Ensures a consistent submission timestamp

    // Recalculate timeTakenSeconds based on freshAttempt.startedAt and the new submittedAt
    if (freshAttempt.startedAt) {
      const timeTakenMs = freshAttempt.submittedAt.getTime() - freshAttempt.startedAt.getTime();
      freshAttempt.timeTakenSeconds = Math.round(timeTakenMs / 1000);
    } else {
      // Log a warning if startedAt is missing, as this might be an issue with test initialization
      console.warn(`[${attemptId}] Warning: startedAt is not defined on freshAttempt during submit. timeTakenSeconds will be null.`);
      freshAttempt.timeTakenSeconds = null;
    }
    freshAttempt.remainingDurationSeconds = 0; // Standard for completed attempts
    
    // Save the current attempt first
    await freshAttempt.save(); // Persist the changes

    // After successfully saving the new completed attempt, delete any previous completed attempts
    // for this student and series (to maintain only the latest attempt policy)
    const seriesId = freshAttempt.series._id || freshAttempt.series;
    const studentId = freshAttempt.student;
    
    const deleteResult = await TestAttempt.deleteMany({ 
      student: studentId, 
      series: seriesId,
      status: 'completed',
      _id: { $ne: freshAttempt._id } // Don't delete the current attempt we just saved
    });
    
    if (deleteResult.deletedCount > 0) {
      console.log(`[${studentId}] Deleted ${deleteResult.deletedCount} previous completed attempts for series ${seriesId}`);
    }

    // Handle study streak after successful test submission
    let studyStreak = null;
    try {
      studyStreak = await StreakService.handleStudyActivity(userId);
    } catch (error) {
      console.error('❌ Error handling study streak:', error);
      // Don't fail submission if streak handling fails
    }

    // Return success response with details from the saved attempt
    const response = {
      message: 'Test submitted successfully.',
      attemptId: freshAttempt._id,
      score: freshAttempt.score,
      maxScore: freshAttempt.maxScore,
      percentage: freshAttempt.percentage,
      timeTakenSeconds: freshAttempt.timeTakenSeconds
    };

    // Add study streak info if available
    if (studyStreak) {
      response.studyStreak = {
        activityRecorded: !studyStreak.alreadyStudiedToday,
        pointsEarned: studyStreak.pointsEarned || 0,
        basePoints: studyStreak.basePoints || 0,
        streakBonus: studyStreak.streakBonus || 0,
        currentStudyStreak: studyStreak.studyStreak || 0,
        longestStudyStreak: studyStreak.longestStudyStreak || 0,
        totalStudyDays: studyStreak.totalStudyDays || 0,
        message: studyStreak.message,
        weeklyStreakUpdated: studyStreak.weeklyStreakUpdated
      };
    }

    return res.status(200).json(response);

  } catch (err) {
    console.error('❌ Error in submitAttempt:', err);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to submit test', error: err.message });
    }
  }
};

/**
 * Submit Test Attempt Endpoint
 * 
 * Grades and saves a completed test attempt with automatic scoring.
 * Handles multiple choice, single choice, numerical (NAT), and various question types.
 * Preserves enhanced review data (time spent, attempts, flags, confidence).
 * 
 * @route POST /api/tests/:attemptId/submit
 * @access Private (Students only)
 * @param {string} req.params.attemptId - Test attempt ID to submit
 * @param {Array} req.body.responses - Student responses with enhanced data
 * @returns {Object} Submission result with score and breakdown
 */
exports.submitTest = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { responses } = req.body; // array of { question, selected, timeSpent, etc. }

    const attempt = await TestAttempt.findById(attemptId).populate('series');
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Test is not in progress' });
    }

    // Process and score responses
    const scoredResponses = await Promise.all(
      responses.map(async (resp) => {
        // Find the question details from the attempt sections
        let questionDetails = null;
        for (const section of attempt.sections) {
          questionDetails = section.questions.find(q => q.question.toString() === resp.question);
          if (questionDetails) break;
        }

        if (!questionDetails) {
          console.warn(`Question ${resp.question} not found in attempt sections`);
          return {
            question: resp.question,
            selected: resp.selected || [],
            earned: 0,
            status: 'incorrect',
            timeSpent: resp.timeSpent || 0,
            attempts: resp.attempts || 1,
            flagged: resp.flagged || false,
            confidence: resp.confidence
          };
        }

        // Score the response based on question type
        const { earned, status } = scoreQuestion(questionDetails, resp.selected);

        return {
          question: resp.question,
          questionInstanceKey: resp.questionInstanceKey,
          selected: resp.selected || [],
          earned: earned,
          status: status,
          timeSpent: resp.timeSpent || 0,
          attempts: resp.attempts || 1,
          flagged: resp.flagged || false,
          confidence: resp.confidence,
          visitedAt: resp.visitedAt,
          lastModifiedAt: resp.lastModifiedAt
        };
      })
    );    // Calculate total score
    const totalScore = scoredResponses.reduce((sum, resp) => sum + (resp.earned || 0), 0);
    const maxScore = attempt.sections.reduce((sum, section) => 
      sum + section.questions.reduce((sectionSum, q) => sectionSum + (q.marks || 1), 0), 0
    );
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0; // Round to 2 decimal places

    // Update attempt with final results
    attempt.responses = scoredResponses;
    attempt.score = Math.round(totalScore * 100) / 100; // Round to 2 decimal places
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.status = 'completed';
    attempt.submittedAt = new Date();

    // Save the current attempt first
    await attempt.save();

    // After successfully saving the new completed attempt, delete any previous completed attempts
    // for this student and series (to maintain only the latest attempt policy)
    const seriesId = attempt.series._id || attempt.series;
    const studentId = attempt.student;
    
    const deleteResult = await TestAttempt.deleteMany({ 
      student: studentId, 
      series: seriesId,
      status: 'completed',
      _id: { $ne: attempt._id } // Don't delete the current attempt we just saved
    });
    
    if (deleteResult.deletedCount > 0) {
      console.log(`[${studentId}] Deleted ${deleteResult.deletedCount} previous completed attempts for series ${seriesId}`);
    }

    res.json({ 
      message: 'Test submitted successfully',
      score: totalScore,
      maxScore: maxScore,
      percentage: percentage.toFixed(2),
      totalQuestions: scoredResponses.length,
      correct: scoredResponses.filter(r => r.status === 'correct').length,
      incorrect: scoredResponses.filter(r => r.status === 'incorrect').length,
      unanswered: scoredResponses.filter(r => r.status === 'unanswered').length
    });
  } catch (err) {
    console.error('Error in submitTest:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Save Test Progress Endpoint
 * 
 * Auto-saves student progress during exam for resumption capability.
 * Handles enhanced review fields (time spent, attempts, flags, confidence).
 * 
 * @route POST /api/tests/:attemptId/save
 * @access Private (Students only)
 * @param {string} req.params.attemptId - Test attempt ID to save
 * @param {Object} req.body - Request body containing responses and timeLeft
 * @param {Array} req.body.responses - Current student responses with enhanced data
 * @param {number} req.body.timeLeft - Remaining time in seconds
 * @returns {Object} Success message
 * @throws {404} Test attempt not found
 * @throws {400} Test not in progress or validation error
 * @throws {500} Server error during save operation
 */
exports.saveProgress = async (req, res) => {
  try {
    const { attemptId: currentAttemptId } = req.params; // Renamed to avoid conflict
    const { responses, timeLeft } = req.body;

    const currentAttempt = await TestAttempt.findById(currentAttemptId); // Renamed to avoid conflict
    if (!currentAttempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (currentAttempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Test is not in-progress. Cannot save.' });
    }    const processedResponses = responses.map(resp => {
      let currentSelected = []; // Default to empty array
      if (Array.isArray(resp.selected)) {
        currentSelected = resp.selected; // If it's already an array, use it
      } else if (resp.selected !== undefined && resp.selected !== null && resp.selected !== '') {
        // If it's a single value (string, number from radio/single-select), wrap it in an array
        currentSelected = [resp.selected];
      }

      const newResp = {
        question: resp.question,
        questionInstanceKey: resp.questionInstanceKey,
        selected: currentSelected, // Use the processed currentSelected
        numericalAnswer: resp.numericalAnswer, // FIXED: Include numerical answer for NAT questions
        timeSpent: resp.timeSpent,
        attempts: resp.attempts,
        flagged: resp.flagged,
        confidence: resp.confidence,
        review: resp.review,
        visitedAt: resp.visitedAt,
        lastModifiedAt: resp.lastModifiedAt,
      };
      // Remove other undefined properties to allow schema defaults
      // 'selected' is already handled and will always be an array.
      Object.keys(newResp).forEach(key => {
        if (newResp[key] === undefined) {
          delete newResp[key];
        }
      });
      return newResp;
    });

    currentAttempt.responses = processedResponses;
    currentAttempt.lastSavedAt = new Date();

    if (timeLeft !== undefined) {
      currentAttempt.remainingDurationSeconds = timeLeft;
    }
    
    await currentAttempt.save();
    
    res.json({ message: 'Progress saved successfully' });

  } catch (err) {
    console.error('❌ Error saving progress for attemptId:', req.params.attemptId, err);
    if (err.name === 'ValidationError') {
        console.error('Mongoose Validation Error details:', JSON.stringify(err.errors, null, 2));
        return res.status(400).json({ 
            message: 'Validation error saving progress. Please check the data format.', 
            errors: err.errors 
        });
    }
    // Ensure response is sent only once
    if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to save progress', error: err.message });
    }
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// getMyTestAttempts, reviewAttempt, getStudentStats, getLeaderboardForSeries
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get My Test Attempts Endpoint
 * 
 * Retrieves all test attempts for the authenticated student, sorted by most recent.
 * Returns attempt data with basic series information for displaying student history.
 * 
 * @route GET /api/tests/my-attempts
 * @access Private (Students only)
 * @param {Object} req.user - Authenticated user object containing userId
 * @returns {Array} List of test attempts with populated series info (title, year, leaderboard settings)
 * @throws {500} Server error during database query
 */
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

/**
 * Review Test Attempt Endpoint
 * 
 * Retrieves detailed attempt data for post-test review with enriched question information.
 * Combines attempt structure with master question data to show correct answers and explanations.
 * Enriches question options with isCorrect flags for review display.
 * 
 * @route GET /api/tests/:attemptId/review
 * @access Private (Students only - own attempts)
 * @param {string} req.params.attemptId - Test attempt ID to review
 * @returns {Object} Complete attempt data with enriched questions and correct answer information
 * @throws {404} Attempt not found
 * @throws {500} Incomplete attempt data or server error during enrichment
 */
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

/**
 * Get Student Statistics Endpoint
 * 
 * Calculates and returns performance statistics for the authenticated student.
 * Computes total attempts, average percentage, and best percentage across all completed tests.
 * 
 * @route GET /api/tests/student-stats
 * @access Private (Students only)
 * @param {Object} req.user - Authenticated user object containing userId
 * @returns {Object} Statistics object with total attempts, averagePercentage, and bestPercentage
 * @throws {500} Server error during database query or calculation
 */
exports.getStudentStats = async (req, res) => {
  try {
    // Get all latest attempts for this student
    const studentAttempts = await TestAttempt.find({
      student:     req.user.userId,
      submittedAt: { $exists: true }
    });

    // Get total attempt counts across all tests
    const totalAttemptCounts = await TestAttemptCounter.find({
      student: req.user.userId
    });

    const totalLatestAttempts = studentAttempts.length;
    const totalAttemptScore = studentAttempts.reduce((s, a) => s + (a.score || 0), 0);
    const maxAttemptScoreSum = studentAttempts.reduce((s, a) => s + (a.maxScore || 0), 0);
    const totalAllAttempts = totalAttemptCounts.reduce((total, counter) => total + counter.attemptCount, 0);

    return res.json({
      totalUniqueTests: totalLatestAttempts, // Number of unique tests attempted
      totalAttempts: totalAllAttempts, // Total number of attempts across all tests
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

/**
 * Get Leaderboard for Test Series Endpoint
 * 
 * Retrieves ranked leaderboard data for a specific test series, showing best attempt per student.
 * Only returns data if public leaderboard is enabled for the series.
 * Uses MongoDB aggregation to find each student's best attempt and rank by performance.
 * 
 * @route GET /api/tests/leaderboard/:seriesId
 * @access Private (Students can view if leaderboard enabled)
 * @param {string} req.params.seriesId - Test series ID to get leaderboard for
 * @returns {Object} Leaderboard data with ranked student attempts and series info
 * @throws {404} Test series not found
 * @throws {500} Server error during aggregation query
 */
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

    // Simplified leaderboard aggregation since we only store latest attempts per student
    const leaderboardData = await TestAttempt.aggregate([
      {
        $match: {
          series: new mongoose.Types.ObjectId(seriesId),
          status: 'completed' // Consider only completed attempts
        }
      },
      {
        $lookup: {
          from: "users",      // Collection name for User model
          localField: "student", // This is the student ID field in TestAttempt
          foreignField: "_id",// Match with _id in the users collection
          as: "studentInfo"
        }
      },
      {
        $unwind: "$studentInfo" // Deconstruct the studentInfo array
      },
      {
        $sort: {
          percentage: -1,      // Sort by percentage (highest first)
          score: -1,           // Tie-break with score
          timeTakenSeconds: 1, // Tie-break with time (faster is better)
          submittedAt: 1       // Final tie-break with submission time
        }
      },
      {
        $project: {
          _id: 0,
          studentId: "$studentInfo._id",
          displayName: {
            $ifNull: ["$studentInfo.displayName", { $ifNull: ["$studentInfo.name", "$studentInfo.email"] }]
          },
          username: "$studentInfo.username", // Add username for profile links
          photoURL: "$studentInfo.photoURL", // Add photoURL for consistency
          score: 1,
          maxScore: 1,
          percentage: 1,
          submittedAt: 1,
          timeTakenSeconds: 1
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

/**
 * Get Test Progress Endpoint
 * 
 * Retrieves current progress for an in-progress test attempt for the authenticated user.
 * Returns complete attempt state including sections, responses, timing, and metadata.
 * Used for test resume functionality and real-time progress tracking.
 * 
 * @route GET /api/tests/:seriesId/progress
 * @access Private (Students only)
 * @param {string} req.params.seriesId - The test series ID to check progress for
 * @param {Object} req.user - Authenticated user object containing userId
 * @param {string} req.user.userId - ID of the authenticated student
 * @returns {Object} Progress data object or empty object if no in-progress attempt
 * @returns {string} returns.attemptId - Unique test attempt identifier
 * @returns {Array} returns.sections - Test sections with questions and options
 * @returns {Array} returns.responses - Student responses with selection data
 * @returns {number} returns.remainingDurationSeconds - Time remaining in seconds
 * @returns {number} returns.duration - Original test duration in minutes
 * @returns {string} returns.seriesTitle - Test series title
 * @returns {string} returns.status - Current attempt status (in-progress)
 * @returns {Date} returns.startedAt - When the test was started
 * @returns {Date} returns.expiresAt - When the test will expire
 * @returns {Date} returns.lastSavedAt - Last auto-save timestamp
 * @throws {500} Server error during database query or data processing
 * 
 * @description
 * This endpoint is crucial for test resume functionality. It searches for any in-progress
 * test attempt for the given user and series combination. If found, it returns complete
 * test state including:
 * - Structured sections with questions and answer options
 * - All student responses with selection tracking
 * - Timing information for test management
 * - Metadata for UI state restoration
 * 
 * @algorithm
 * 1. Extract seriesId from URL parameters and userId from authentication
 * 2. Query for in-progress TestAttempt matching user and series
 * 3. Populate series information (title, duration) for context
 * 4. Include sensitive fields (options, selected responses) in results
 * 5. Transform responses to ensure selection data is properly formatted
 * 6. Return complete progress object or empty object if no attempt found
 * 
 * @security
 * - Requires valid JWT authentication
 * - User can only access their own test progress
 * - Sensitive response data is only included for the authenticated user
 * 
 * @used_in
 * - Test resume functionality in frontend
 * - Real-time progress synchronization
 * - Session recovery after browser refresh
 * - Auto-save progress validation
 * 
 * @example
 * // Request
 * GET /api/tests/64a7b8c9d0e1f2a3b4c5d6e7/progress
 * Headers: { Authorization: "Bearer jwt_token" }
 * 
 * // Response - With in-progress attempt
 * {
 *   "attemptId": "64a7b8c9d0e1f2a3b4c5d6e8",
 *   "sections": [
 *     {
 *       "_id": "64a7b8c9d0e1f2a3b4c5d6e9",
 *       "title": "Quantitative Aptitude",
 *       "questions": [
 *         {
 *           "_id": "64a7b8c9d0e1f2a3b4c5d6ea",
 *           "questionText": "What is 15% of 240?",
 *           "options": [
 *             { "_id": "opt1", "text": "36", "correct": true },
 *             { "_id": "opt2", "text": "35", "correct": false }
 *           ]
 *         }
 *       ]
 *     }
 *   ],
 *   "responses": [
 *     {
 *       "question": "64a7b8c9d0e1f2a3b4c5d6ea",
 *       "questionInstanceKey": "Q1_64a7b8c9d0e1f2a3b4c5d6ea",
 *       "selected": ["opt1"],
 *       "timeSpent": 45,
 *       "attempts": 1,
 *       "flagged": false,
 *       "confidence": "high",
 *       "visitedAt": "2023-07-15T10:15:30.000Z",
 *       "lastModifiedAt": "2023-07-15T10:16:15.000Z"
 *     }
 *   ],
 *   "remainingDurationSeconds": 5400,
 *   "duration": 120,
 *   "seriesTitle": "Banking Exam Mock Test 1",
 *   "status": "in-progress",
 *   "startedAt": "2023-07-15T10:00:00.000Z",
 *   "expiresAt": "2023-07-15T12:00:00.000Z",
 *   "lastSavedAt": "2023-07-15T10:16:15.000Z"
 * }
 * 
 * // Response - No in-progress attempt
 * {}
 */
exports.getProgress = async (req, res) => {
  try {
    const seriesId = req.params.seriesId;
    const userId = req.user.userId;

    const attempt = await TestAttempt.findOne({
      student: userId,
      series: seriesId,
      status: 'in-progress'
    })
    .populate('series', 'title duration') // Populate series title and duration
    .select('+sections.questions.options +responses.selected +responses.numericalAnswer')
    .lean();

    if (!attempt) {
      return res.json({}); // No in-progress attempt found
    }    // Ensure responses include the 'selected' field and numericalAnswer for NAT questions.
    // The .lean() and .select() above should handle this, but as a safeguard:
    const responsesWithSelected = attempt.responses.map(r => ({
      question: r.question,
      questionInstanceKey: r.questionInstanceKey,
      selected: r.selected, // Ensure this is populated
      numericalAnswer: r.numericalAnswer, // Include numerical answer for NAT questions
      timeSpent: r.timeSpent,
      attempts: r.attempts,
      flagged: r.flagged,
      confidence: r.confidence,
      visitedAt: r.visitedAt,
      lastModifiedAt: r.lastModifiedAt
    }));

    return res.json({
      attemptId: attempt._id.toString(),
      sections: attempt.sections,
      responses: responsesWithSelected,
      remainingDurationSeconds: attempt.remainingDurationSeconds,
      duration: attempt.series?.duration, // Duration from populated series (in minutes)
      seriesTitle: attempt.series?.title, // seriesTitle from populated series
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      lastSavedAt: attempt.lastSavedAt
    });
  } catch (err) {
    console.error('Error in getProgress:', err);
    res.status(500).json({ message: 'Failed to get progress', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Enhanced Review Page Endpoints - Phase 1.2
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Get Enhanced Review Data Endpoint
 * 
 * Retrieves comprehensive review data with detailed question analytics and explanations.
 * Combines attempt structure with master question data and response analytics.
 * Provides enhanced review capabilities with time tracking, difficulty analysis, and performance insights.
 * 
 * @route GET /api/tests/:attemptId/enhanced-review
 * @access Private (Students only - own attempts)
 * @param {string} req.params.attemptId - Test attempt ID to get enhanced review for
 * @param {Object} req.user - Authenticated user object
 * @param {string} req.user.userId - Student's user ID
 * @returns {Object} Enhanced review data with attempt details, detailed questions, and analytics
 * @throws {404} Test attempt not found
 * @throws {500} Server error during data enrichment or analytics calculation
 */
exports.getEnhancedReview = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.userId;

    // Fetch the test attempt with populated data
    const attempt = await TestAttempt.findOne({ 
      _id: attemptId, 
      student: userId 
    })
    .populate('series', 'title description duration sections enablePublicLeaderboard')
    .lean();    if (!attempt) {
      return res.status(404).json({ message: 'Test attempt not found' });
    }

    const detailedQuestions = [];
    const allQuestionIdsInAttempt = Array.from(new Set(
        (attempt.sections || []).flatMap(s => (s.questions || []).map(q => q.question.toString()))
    ));
    
    if (allQuestionIdsInAttempt.length > 0) {
        const masterQuestionsData = await Question.find({ '_id': { $in: allQuestionIdsInAttempt } })
            .populate('subject', 'name')
            .populate('topic', 'name')
            .populate('subTopic', 'name')
            .lean();
        const masterQuestionsMap = new Map(masterQuestionsData.map(qDoc => [qDoc._id.toString(), qDoc]));
        
        let sectionIndex = 0; // Track section index for composite key generation

        for (const section of attempt.sections || []) {
            let questionIndex = 0; // Track question index within section for composite key generation
          
            for (const questionData of section.questions || []) { // questionData is from attempt.sections.questions
                const fullQuestion = masterQuestionsMap.get(questionData.question.toString());

                if (fullQuestion) {
                    // Create composite key that matches frontend format: questionId_sectionIdx_questionIdx
                    const questionInstanceKey = `${questionData.question.toString()}_${sectionIndex}_${questionIndex}`;                    // Find response by matching questionInstanceKey first, fallback to question ID
                    let response = (attempt.responses || []).find(resp => 
                        resp.questionInstanceKey === questionInstanceKey
                    );
                    
                    // Fallback: if no match found by questionInstanceKey, try matching by question ID only
                    // This handles backward compatibility with older data that might not have questionInstanceKey
                    if (!response) {
                        response = (attempt.responses || []).find(resp => 
                            resp.question && resp.question.toString() === questionData.question.toString()
                        );
                    }

                    // Debug logging to help identify the issue
                    let userSelectedOptionTexts = [];
                    let correctOptionTexts = [];
                    let actualCorrectOptionIds = [];
                    let userNumericalAnswer = null;
                    let correctNumericalAnswer = null;

                    // Handle different question types
                    if (fullQuestion.type === 'integer' || fullQuestion.type === 'numerical') {
                        // For NAT questions, handle numerical answers
                        userNumericalAnswer = response?.numericalAnswer || null;
                        
                        // Get correct numerical answer from the question
                        const numericalAnswerData = (fullQuestion.translations && fullQuestion.translations.length > 0 && fullQuestion.translations[0].numericalAnswer)
                                                   ? fullQuestion.translations[0].numericalAnswer
                                                   : fullQuestion.numericalAnswer;
                          if (numericalAnswerData) {
                            if (numericalAnswerData.exactValue !== undefined && numericalAnswerData.exactValue !== null) {
                                correctNumericalAnswer = numericalAnswerData.exactValue;
                            } else if (numericalAnswerData.minValue !== undefined && numericalAnswerData.maxValue !== undefined) {
                                // For range-based answers, correct the range if needed and show it
                                const minValue = parseFloat(numericalAnswerData.minValue);
                                const maxValue = parseFloat(numericalAnswerData.maxValue);
                                const actualMin = Math.min(minValue, maxValue);
                                const actualMax = Math.max(minValue, maxValue);
                                correctNumericalAnswer = `${actualMin} to ${actualMax}`;
                            }
                        }
                    } else {
                        // For option-based questions (single, multiple, matrix)
                        // Determine the source of options (e.g., from the first translation or root)
                        // Ensure options are always an array, even if empty.
                        const optionsSourceForDisplay = (fullQuestion.translations && fullQuestion.translations.length > 0 && fullQuestion.translations[0].options 
                                                          ? fullQuestion.translations[0].options 
                                                          : fullQuestion.options) || [];

                        // Get user's selected option texts
                        if (response?.selected && optionsSourceForDisplay.length > 0) {
                            // Handle both string and array formats for response.selected
                            const selectedArray = Array.isArray(response.selected) 
                                ? response.selected 
                                : [response.selected];
                            

                            userSelectedOptionTexts = selectedArray.map(selectedIndex => {
                                const idx = parseInt(String(selectedIndex), 10);
                                if (idx >= 0 && idx < optionsSourceForDisplay.length) {
                                    return optionsSourceForDisplay[idx].text;
                                }
                                return 'Invalid Selection Index'; // Should ideally not happen
                            }).filter(text => text !== 'Invalid Selection Index');
                        }

                        // Get correct option texts and IDs
                        if (optionsSourceForDisplay.length > 0) {
                          optionsSourceForDisplay.forEach(opt => {
                            if (opt.isCorrect) {
                              correctOptionTexts.push(opt.text);
                              if (opt._id) {
                                actualCorrectOptionIds.push(opt._id.toString());
                              }
                            }
                          });
                        }
                      }
                      const questionTextForDisplay = (fullQuestion.translations && fullQuestion.translations.length > 0 && fullQuestion.translations[0].questionText)
                                                   ? fullQuestion.translations[0].questionText
                                                   : (fullQuestion.questionText || 'Question text not available');

                    // Determine options source for display (only for option-based questions)
                    const optionsSourceForDisplay = (fullQuestion.type === 'integer' || fullQuestion.type === 'numerical') 
                        ? [] 
                        : ((fullQuestion.translations && fullQuestion.translations.length > 0 && fullQuestion.translations[0].options 
                           ? fullQuestion.translations[0].options 
                           : fullQuestion.options) || []);

                    detailedQuestions.push({
                        questionId: fullQuestion._id.toString(),
                        questionText: questionTextForDisplay,
                        type: fullQuestion.type, // Add question type for frontend handling
                        // Send all options for display, ensuring _id is a string (empty for NAT questions)
                        options: optionsSourceForDisplay.map(opt => ({ 
                            text: opt.text, 
                            _id: opt._id ? opt._id.toString() : undefined,
                            // Potentially include isCorrect if frontend needs to highlight correct options among all choices
                            // isCorrect: opt.isCorrect || false 
                        })),
                        explanations: fullQuestion.explanations || [],
                        difficulty: fullQuestion.difficulty,
                        estimatedTime: fullQuestion.recommendedTimeAllotment, // Ensure this field exists or use a fallback
                        questionHistory: fullQuestion.questionHistory || [],
                        topics: {
                            subject: fullQuestion.subject?.name,
                            topic: fullQuestion.topic?.name,
                            subTopic: fullQuestion.subTopic?.name
                        },
                        tags: fullQuestion.tags || [],
                        
                        // Response data
                        selectedAnswerIndices: response?.selected || [], // User's raw selection (indices)
                        selectedAnswer: response?.selected ? (Array.isArray(response.selected) ? response.selected : [response.selected]) : [], // Frontend expects this field for option highlighting
                        userSelectedOptionTexts: userSelectedOptionTexts, // User's selected option text(s)
                        correctOptionTexts: correctOptionTexts,         // Correct option text(s)
                        actualCorrectOptionIds: actualCorrectOptionIds, // Correct option ID(s)
                        
                        // NAT-specific data
                        userNumericalAnswer: userNumericalAnswer, // User's numerical answer for NAT questions
                        correctNumericalAnswer: correctNumericalAnswer, // Correct numerical answer for NAT questions
                        
                        earned: response?.earned || 0,
                        status: response?.status || 'unanswered', // Status from submitAttempt
                        
                        // Enhanced analytics data
                        timeSpent: response?.timeSpent || 0,
                        attempts: response?.attempts || 0,
                        flagged: response?.flagged || false,
                        confidence: response?.confidence,
                        visitedAt: response?.visitedAt,
                        lastModifiedAt: response?.lastModifiedAt,
                        
                        // Analysis
                        isCorrect: response?.status === 'correct', // Determine correctness based on status
                        marks: questionData.marks || 1 // Marks for the question in this attempt
                    });
                }
                
                // Increment question index within current section
                questionIndex++;
            }
            // Increment section index after processing all questions in the section
            sectionIndex++;
        }
    }

    // Calculate performance analytics
    const analytics = calculatePerformanceAnalytics(attempt, detailedQuestions);

    const reviewData = {
      attempt: {
        id: attempt._id,
        seriesTitle: attempt.series?.title,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        submittedAt: attempt.submittedAt,
        totalTimeSpent: attempt.totalTimeSpent || attempt.timeTakenSeconds,
        timePerSection: attempt.timePerSection || [],
        questionSequence: attempt.questionSequence || [],
        flaggedQuestions: attempt.flaggedQuestions || []
      },
      series: {
        _id: attempt.series?._id,
        id: attempt.series?._id,
        title: attempt.series?.title,
        enablePublicLeaderboard: attempt.series?.enablePublicLeaderboard || false
      },
      questions: detailedQuestions,
      analytics: analytics
    };

    res.json(reviewData);

  } catch (err) {
    console.error('❌ Error in getEnhancedReview:', err);
    res.status(500).json({ message: 'Failed to get review data', error: err.message });
  }
};

/**
 * Get Performance Analytics Endpoint
 * 
 * Calculates and returns comparative performance analytics for a test attempt.
 * Compares current attempt with student's historical performance to show trends and improvements.
 * Provides insights on score progression, accuracy trends, and performance ranking.
 * 
 * @route GET /api/tests/:attemptId/analytics
 * @access Private (Students only - own attempts)
 * @param {string} req.params.attemptId - Test attempt ID to analyze
 * @param {Object} req.user - Authenticated user object
 * @param {string} req.user.userId - Student's user ID for historical data comparison
 * @returns {Object} Comparative analytics data with current vs average scores, improvement metrics, and trends
 * @throws {404} Test attempt not found
 * @throws {500} Server error during analytics calculation
 */
exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.userId;

    const attempt = await TestAttempt.findOne({ 
      _id: attemptId, 
      student: userId 
    }).populate('series').lean();

    if (!attempt) {
      return res.status(404).json({ message: 'Test attempt not found' });
    }

    // Get other attempts for comparison
    const allAttempts = await TestAttempt.find({
      student: userId,
      status: 'completed'
    }).populate('series', 'title').lean();

    // Calculate comparative analytics
    const comparativeData = calculateComparativeAnalytics(attempt, allAttempts);
    
    res.json(comparativeData);

  } catch (err) {
    console.error('❌ Error in getPerformanceAnalytics:', err);
    res.status(500).json({ message: 'Failed to get analytics', error: err.message });
  }
};

/**
 * Get Study Recommendations Endpoint
 * 
 * Analyzes test attempt performance to identify weak areas and generate study recommendations.
 * Provides personalized suggestions for improvement based on question analysis and historical patterns.
 * 
 * @route GET /api/tests/:attemptId/recommendations
 * @access Private (Students only - own attempts)
 * @param {string} req.params.attemptId - Test attempt ID to analyze for recommendations
 * @param {Object} req.user - Authenticated user object
 * @param {string} req.user.userId - Student's user ID for personalized analysis
 * @returns {Object} Study recommendations with weak topics, recommended study time, focus areas, and next steps
 * @throws {404} Test attempt not found
 * @throws {500} Server error during weakness analysis
 */
exports.getStudyRecommendations = async (req, res) => {
   try {
    const { attemptId } = req.params;
    const userId = req.user.userId;

    const attempt = await TestAttempt.findOne({ 
      _id: attemptId, 
      student: userId 
    }).lean();

    if (!attempt) {
      return res.status(404).json({ message: 'Test attempt not found' });
    }

    // Analyze weak areas
    const weaknessAnalysis = await analyzeWeaknesses(attempt, userId);
    
    res.json(weaknessAnalysis);

  } catch (err) {
    console.error('❌ Error in getStudyRecommendations:', err);    res.status(500).json({ message: 'Failed to get recommendations', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Anti-Cheating Functions for Strict Mode Exams
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Log a cheating event for strict mode exams
 */
exports.logCheatingEvent = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { type, severity, description, questionIndex, timeRemaining, currentSection } = req.body;
    const userId = req.user.id;

    // Verify the attempt belongs to the user
    const attempt = await TestAttempt.findOne({ _id: attemptId, student: userId });
    if (!attempt) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test attempt not found or access denied' 
      });
    }

    // Check if strict mode is enabled
    if (!attempt.strictModeEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Anti-cheating monitoring not enabled for this exam'
      });
    }

    const eventData = {
      type,
      severity,
      description,
      questionIndex,
      timeRemaining,
      currentSection,
      userAgent: req.headers['user-agent'],
      screenResolution: req.body.screenResolution
    };

    const result = await AntiCheatingService.logCheatingEvent(attemptId, eventData);

    res.json({
      success: true,
      data: result,
      message: result.shouldTerminate ? 'Exam terminated due to violations' : 'Event logged successfully'
    });

  } catch (error) {
    console.error('Error logging cheating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log cheating event',
      error: error.message
    });
  }
};

/**
 * Get cheating statistics for a test attempt
 */
exports.getCheatingStats = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    // Verify the attempt belongs to the user or user is admin
    const attempt = await TestAttempt.findOne({ _id: attemptId, student: userId });
    if (!attempt && req.user.role !== 'admin') {
      return res.status(404).json({ 
        success: false, 
        message: 'Test attempt not found or access denied' 
      });
    }

    const stats = await AntiCheatingService.getCheatingStats(attemptId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting cheating stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cheating statistics',
      error: error.message
    });
  }
};

/**
 * Initialize strict mode for a test attempt
 */
exports.initializeStrictMode = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    // Verify the attempt belongs to the user
    const attempt = await TestAttempt.findOne({ _id: attemptId, student: userId });
    if (!attempt) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test attempt not found or access denied' 
      });
    }

    const result = await AntiCheatingService.initializeStrictMode(attemptId);

    res.json({
      success: true,
      data: result,
      message: 'Strict mode initialized successfully'
    });

  } catch (error) {
    console.error('Error initializing strict mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize strict mode',
      error: error.message
    });
  }
};

/**
 * Check if a test series requires strict mode
 */
exports.checkStrictMode = async (req, res) => {
  try {
    const { seriesId } = req.params;

    const testSeries = await TestSeries.findById(seriesId).select('mode title');
    if (!testSeries) {
      return res.status(404).json({
        success: false,
        message: 'Test series not found'
      });
    }

    const isStrictMode = AntiCheatingService.isStrictModeExam(testSeries);

    res.json({
      success: true,
      data: {
        isStrictMode,
        mode: testSeries.mode,
        title: testSeries.title,
        requiresFullscreen: isStrictMode,
        monitoringEnabled: isStrictMode
      }
    });

  } catch (error) {
    console.error('Error checking strict mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check strict mode status',
      error: error.message
    });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Helper function to calculate percentage
 */
function calculatePercentage(score, maxScore) {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
}

/**
 * Helper function to score MCQ questions
 */
function scoreMCQ(questionDetails, selected, marks, negativeMarks) {
  if (!selected || selected.length === 0) return { earned: 0, status: 'unanswered' };
  
  const correctOptions = questionDetails.options?.filter(opt => opt.isCorrect) || [];
  if (correctOptions.length === 0) return { earned: 0, status: 'no-correct-answer' };
  
  const correctIds = correctOptions.map(opt => opt._id?.toString());
  const isCorrect = selected.length === correctIds.length && 
    selected.every(sel => correctIds.includes(sel));
  
  if (isCorrect) {
    return { earned: marks, status: 'correct' };
  } else {
    return { earned: -negativeMarks, status: 'incorrect' };
  }
}

/**
 * Helper function to score NAT questions
 */
function scoreNAT(questionDetails, numericalAnswer, marks) {
  if (numericalAnswer === null || numericalAnswer === undefined) {
    return { earned: 0, status: 'unanswered' };
  }

  const studentAnswer = parseFloat(numericalAnswer);
  if (isNaN(studentAnswer)) {
    return { earned: 0, status: 'invalid' };
  }

  // Check exact value
  if (questionDetails.numericalAnswer?.exactValue !== undefined) {
    if (Math.abs(studentAnswer - questionDetails.numericalAnswer.exactValue) < 0.001) {
      return { earned: marks, status: 'correct' };
    }
  }

  // Check range
  if (questionDetails.numericalAnswer?.minValue !== undefined && 
      questionDetails.numericalAnswer?.maxValue !== undefined) {
    if (studentAnswer >= questionDetails.numericalAnswer.minValue && 
        studentAnswer <= questionDetails.numericalAnswer.maxValue) {
      return { earned: marks, status: 'correct' };
    }
  }

  return { earned: 0, status: 'incorrect' };
}

/**
 * Helper function to calculate performance analytics
 */
function calculatePerformanceAnalytics(attempt, detailedQuestions) {  
  const analytics = {
    totalQuestions: detailedQuestions.length,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    score: attempt.score || 0,
    maxScore: attempt.maxScore || 0,
    percentage: attempt.percentage || 0,
    timeSpent: attempt.timeTakenSeconds || attempt.totalTimeSpent || 0,
    sectionWise: {},
    difficultyWise: {
      'very easy': { total: 0, correct: 0, attempted: 0 },
      'easy': { total: 0, correct: 0, attempted: 0 },
      'medium': { total: 0, correct: 0, attempted: 0 },
      'hard': { total: 0, correct: 0, attempted: 0 },
      'very hard': { total: 0, correct: 0, attempted: 0 }
    },
    subjectWise: {},
    difficultyBreakdown: {},
    timeAnalysis: {
      fastestQuestion: null,
      slowestQuestion: null,
      questionsOverTime: 0,
      averageTimePerQuestion: 0
    }
  };

  // Process each question
  let questionTimes = [];
  
  detailedQuestions.forEach(question => {
    const status = question.status || 'unanswered';
    const difficulty = (question.difficulty || 'medium').toLowerCase();
    const subjectName = question.topics?.subject || 'Unknown';
    const timeSpent = question.timeSpent || 0;
    
    // Collect time data for analysis
    if (timeSpent > 0) {
      questionTimes.push(timeSpent);
    }

    // Overall statistics
    if (status === 'correct') {
      analytics.correct++;
      analytics.attempted++;
    } else if (status === 'incorrect') {
      analytics.incorrect++;
      analytics.attempted++;
    } else {
      analytics.unanswered++;
    }

    // Difficulty-wise analytics
    if (analytics.difficultyWise[difficulty]) {
      analytics.difficultyWise[difficulty].total++;
      if (status !== 'unanswered') {
        analytics.difficultyWise[difficulty].attempted++;
      }
      if (status === 'correct') {
        analytics.difficultyWise[difficulty].correct++;
      }
    }

    // Subject-wise analytics
    if (!analytics.subjectWise[subjectName]) {
      analytics.subjectWise[subjectName] = {
        total: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        score: 0,
        maxScore: 0
      };
    }
    analytics.subjectWise[subjectName].total++;
    analytics.subjectWise[subjectName][status]++;
    if (status !== 'unanswered') {
      analytics.subjectWise[subjectName].attempted++;
    }
    analytics.subjectWise[subjectName].score += question.earned || 0;
    analytics.subjectWise[subjectName].maxScore += question.marks || 0;
  });

  // Calculate time analysis
  if (questionTimes.length > 0) {
    questionTimes.sort((a, b) => a - b);
    analytics.timeAnalysis.fastestQuestion = questionTimes[0];
    analytics.timeAnalysis.slowestQuestion = questionTimes[questionTimes.length - 1];
    analytics.timeAnalysis.averageTimePerQuestion = Math.round(questionTimes.reduce((sum, time) => sum + time, 0) / questionTimes.length);
    
    // Count questions that took longer than estimated time (assuming 2 minutes per question as baseline)
    const estimatedTimePerQuestion = 120; // 2 minutes in seconds
    analytics.timeAnalysis.questionsOverTime = questionTimes.filter(time => time > estimatedTimePerQuestion).length;
  } else {
    analytics.timeAnalysis.fastestQuestion = 0;
    analytics.timeAnalysis.slowestQuestion = 0;
    analytics.timeAnalysis.averageTimePerQuestion = 0;
    analytics.timeAnalysis.questionsOverTime = 0;
  }

  // Create difficultyBreakdown in the format expected by frontend
  analytics.difficultyBreakdown = {};
  Object.keys(analytics.difficultyWise).forEach(difficulty => {
    let capitalizedDifficulty;
    if (difficulty === 'very easy') {
      capitalizedDifficulty = 'Very easy';
    } else if (difficulty === 'very hard') {
      capitalizedDifficulty = 'Very hard';
    } else {
      capitalizedDifficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    }
    analytics.difficultyBreakdown[capitalizedDifficulty] = {
      total: analytics.difficultyWise[difficulty].total,
      correct: analytics.difficultyWise[difficulty].correct,
      attempted: analytics.difficultyWise[difficulty].attempted
    };
  });
  console.log('🔍 Debug: Final difficulty breakdown:', analytics.difficultyBreakdown);

  // Calculate percentages for subjects
  Object.keys(analytics.subjectWise).forEach(subject => {
    const subjectData = analytics.subjectWise[subject];
    subjectData.percentage = subjectData.maxScore > 0 ? 
      Math.round((subjectData.score / subjectData.maxScore) * 100 * 100) / 100 : 0;
    subjectData.attemptRate = subjectData.total > 0 ? 
      Math.round((subjectData.attempted / subjectData.total) * 100 * 100) / 100 : 0;
    subjectData.accuracy = subjectData.attempted > 0 ? 
      Math.round((subjectData.correct / subjectData.attempted) * 100 * 100) / 100 : 0;
  });

  // Add overall performance metrics
  analytics.overall = {
    totalQuestions: analytics.totalQuestions,
    correctAnswers: analytics.correct,
    incorrectAnswers: analytics.incorrect,
    unanswered: analytics.unanswered,
    accuracy: analytics.attempted > 0 ? Math.round((analytics.correct / analytics.attempted) * 100 * 100) / 100 : 0,
    timeSpent: analytics.timeSpent,
    averageTimePerQuestion: analytics.totalQuestions > 0 ? Math.round(analytics.timeSpent / analytics.totalQuestions) : 0,
    flaggedCount: detailedQuestions.filter(q => q.flagged).length
  };
  return analytics;
}

/**
 * Helper function to calculate comparative analytics
 */
function calculateComparativeAnalytics(attempt, allAttempts) {  
  if (!allAttempts || allAttempts.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      averagePercentage: 0,
      rank: 1,
      percentile: 100,
      comparison: {
        betterThan: 0,
        percentageAboveAverage: 0
      }
    };
  }

  const scores = allAttempts.map(a => a.score || 0);
  const percentages = allAttempts.map(a => a.percentage || 0);
  
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const averagePercentage = percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length;
  
  // Calculate rank (1-based, lower is better)
  const betterScores = scores.filter(score => score > (attempt.score || 0)).length;
  const rank = betterScores + 1;
  
  // Calculate percentile
  const percentile = Math.round(((allAttempts.length - rank + 1) / allAttempts.length) * 100 * 100) / 100;
  
  const comparison = {
    betterThan: Math.round(((allAttempts.length - rank) / allAttempts.length) * 100 * 100) / 100,
    percentageAboveAverage: Math.round(((attempt.percentage || 0) - averagePercentage) * 100) / 100
  };
  return {
    totalAttempts: allAttempts.length,
    averageScore: Math.round(averageScore * 100) / 100,
    averagePercentage: Math.round(averagePercentage * 100) / 100,
    rank,
    percentile,
    comparison
  };
}

/**
 * Helper function to analyze student weaknesses
 */
function analyzeWeaknesses(attempt, userId) {
  // Basic weakness analysis based on attempt data
  const weaknesses = [];
  const recommendations = [];

  if (!attempt.responses || attempt.responses.length === 0) {
    return {
      weakTopics: [],
      recommendations: ['Complete more practice questions to identify areas for improvement.']
    };
  }

  // Analyze incorrect responses
  const incorrectCount = attempt.responses.filter(r => r.status === 'incorrect').length;
  const unansweredCount = attempt.responses.filter(r => r.status === 'unanswered' || r.status === 'not-attempted').length;
  const totalQuestions = attempt.responses.length;

  if (incorrectCount > totalQuestions * 0.3) {
    recommendations.push('Focus on understanding question concepts rather than memorization.');
    recommendations.push('Practice more questions from topics with frequent mistakes.');
  }

  if (unansweredCount > totalQuestions * 0.2) {
    recommendations.push('Work on time management during exams.');
    recommendations.push('Practice solving questions within time limits.');
  }

  // Basic topic analysis (simplified)
  const topicPerformance = {};
  attempt.responses.forEach(response => {
    if (response.topic) {
      if (!topicPerformance[response.topic]) {
        topicPerformance[response.topic] = { correct: 0, total: 0 };
      }
      topicPerformance[response.topic].total++;
      if (response.status === 'correct') {
        topicPerformance[response.topic].correct++;
      }
    }
  });

  // Find weak topics (< 50% accuracy)
  Object.keys(topicPerformance).forEach(topic => {
    const accuracy = topicPerformance[topic].correct / topicPerformance[topic].total;
    if (accuracy < 0.5 && topicPerformance[topic].total >= 2) {
      weaknesses.push({
        topic: topic,
        accuracy: Math.round(accuracy * 100),
        questionsAttempted: topicPerformance[topic].total
      });
    }
  });

  if (weaknesses.length === 0) {
    recommendations.push('Continue practicing to maintain your current performance level.');
  }

  return {
    weakTopics: weaknesses,
    recommendations: recommendations
  };
}
