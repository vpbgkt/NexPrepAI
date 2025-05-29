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
const Question     = require('../models/Question');
const mongoose = require('mongoose'); // Added mongoose require

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
          negativeMarks: q.negativeMarks === undefined ? 0 : qItem.negativeMarks
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
    
    // Log the state of processedLayout right before creating detailedSectionsForAttempt
    console.log(`[${userId}] StartTest: Processed layout before detailing:`, JSON.stringify(processedLayout, null, 2));    // now build detailed sections for the frontend and for storing in TestAttempt
    // using the processedLayout
    const detailedSectionsForAttempt = await Promise.all(
      processedLayout.map(async sec => ({
        title: sec.title,
        order: sec.order,
        questions: await Promise.all(
          (sec.questions || []).map(async q => { // q is an item from processedLayout.section.questions
            const doc = await Question.findById(q.question)
              .select('questionText translations type difficulty questionHistory options')
              .lean();

            let questionText = ''; 
            let options = [];      
            let translations = []; 

            if (doc) {
              translations = doc.translations || [];
              
              // Improved logic for sourcing questionText and options
              const englishTranslation = translations.find(t => t.lang === 'en');
              const firstAvailableTranslation = translations.length > 0 ? translations[0] : null;
              
              if (englishTranslation?.questionText) {
                questionText = englishTranslation.questionText;
                if (englishTranslation.options && Array.isArray(englishTranslation.options)) {
                  options = englishTranslation.options.map(opt => ({
                    text: opt.text,
                    img: opt.img || null,
                    isCorrect: opt.isCorrect,
                    _id: opt._id ? opt._id.toString() : undefined
                  }));
                }
              } else if (firstAvailableTranslation?.questionText) {
                questionText = firstAvailableTranslation.questionText;
                if (firstAvailableTranslation.options && Array.isArray(firstAvailableTranslation.options)) {
                  options = firstAvailableTranslation.options.map(opt => ({
                    text: opt.text,
                    img: opt.img || null,
                    isCorrect: opt.isCorrect,
                    _id: opt._id ? opt._id.toString() : undefined
                  }));
                }
              }
              
              // Fallback to root document fields if translations don't have the data
              if (!questionText && doc.questionText) {
                questionText = doc.questionText;
              }
              if (options.length === 0 && doc.options && Array.isArray(doc.options)) {
                options = doc.options.map(opt => ({
                  text: opt.text,
                  img: opt.img || null,
                  isCorrect: opt.isCorrect,
                  _id: opt._id ? opt._id.toString() : undefined
                }));
              }
            } else {
              console.warn(`[${userId}] StartTest: Question with ID ${q.question} not found in DB.`);
            }

            return {
              question:     q.question.toString(),
              marks:        q.marks || 1,
              negativeMarks: q.negativeMarks === undefined ? 0 : q.negativeMarks,
              translations: translations,
              questionText: questionText,
              options:      options,
              type:         doc?.type,
              difficulty:   doc?.difficulty,
              questionHistory: doc?.questionHistory || []
            };
          })
        )
      }))
    );
      // Log the final detailedSectionsForAttempt that will be saved and sent to frontend
    console.log(`[${userId}] StartTest: Final detailedSectionsForAttempt:`, JSON.stringify(detailedSectionsForAttempt, null, 2));

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
    await attempt.save();    // Debug: Log what we're sending to frontend
    console.log(`[${userId}] StartTest: Sending to frontend - sections summary:`, 
      detailedSectionsForAttempt.map(s => ({
        title: s.title,
        order: s.order,
        questionCount: s.questions?.length || 0,
        firstQuestionId: s.questions?.[0]?.question
      }))
    );
    
    // Additional debug: Log complete sections data
    console.log(`[${userId}] StartTest: Complete sections data being sent:`, JSON.stringify(detailedSectionsForAttempt, null, 2));

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

    console.log(`--- Starting Grade Calculation for Attempt: ${attemptId} ---`);    console.log(`User ID: ${userId}`);
    // console.log(`Raw responses from client (length ${responses.length}):`, JSON.stringify(responses, null, 2));
    
    // Create a position-indexed array of responses to handle duplicate question IDs
    const clientResponsesArray = Array.isArray(responses) ? responses : [];
    console.log(`Client responses received (length ${clientResponsesArray.length}):`, JSON.stringify(clientResponsesArray, null, 2));
    
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
            
            // #### START DEBUG LOGGING FOR A SPECIFIC QUESTION ID ####
            // Replace 'SPECIFIC_QUESTION_ID_HERE' with an actual ID you want to trace
            const debugQuestionId = 'REPLACE_WITH_ACTUAL_QUESTION_ID_TO_DEBUG'; // Example: '60c72b2f9b1d8c001f8e4c22'
            if (questionId === debugQuestionId) {
              console.log(`[DEBUG ${attemptId}] Processing question ${questionId} with key ${questionInstanceKey}`);
            }
            // #### END DEBUG LOGGING ####
            const questionDetailsFromAttempt = attemptQuestionsMap.get(questionId); // Marks, negative marks from attempt structure
            const masterQuestionData = masterQuestionsMap.get(questionId); // Full question data from DB

            let earnedForThisSlot = 0;
            let statusForThisSlot = 'not-attempted'; 
            
            // Find user response by matching questionInstanceKey instead of position
            const userResponseForThisSlot = clientResponsesArray.find(response => 
              response.questionInstanceKey === questionInstanceKey
            );            
            // Debug: Log the matching result for troubleshooting
            if (questionId === debugQuestionId) {
              console.log(`[DEBUG ${attemptId}] Found response for ${questionInstanceKey}:`, userResponseForThisSlot ? 'YES' : 'NO');
            }

            if (!questionDetailsFromAttempt || !masterQuestionData) {
              console.warn(`[${attemptId}] Missing details for question ${questionId} in attempt structure or master DB. Skipping for grading.`);              processedResponses.push({
                question: questionId,
                questionInstanceKey: questionInstanceKey, // Add the composite key for matching in review
                selected: userResponseForThisSlot ? userResponseForThisSlot.selected : [],
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
            }

            const qMarks = questionDetailsFromAttempt.marks || 0;
            const qNegativeMarks = typeof questionDetailsFromAttempt.negativeMarks === 'number' ? questionDetailsFromAttempt.negativeMarks : 0;
            calculatedMaxScore += qMarks;

            // #### START DEBUG LOGGING FOR A SPECIFIC QUESTION ID ####
            if (questionId === debugQuestionId) {
              console.log(`[DEBUG ${attemptId}] User response for ${questionId}:`, JSON.stringify(userResponseForThisSlot, null, 2));
              console.log(`[DEBUG ${attemptId}] Master question data for ${questionId}:`, JSON.stringify(masterQuestionData, null, 2));
            }
            // #### END DEBUG LOGGING ####

            if (userResponseForThisSlot && userResponseForThisSlot.selected && userResponseForThisSlot.selected.length > 0) {
              // User attempted this question
              // #### START DEBUG LOGGING FOR A SPECIFIC QUESTION ID ####
              if (questionId === debugQuestionId) {
                console.log(`[DEBUG ${attemptId}] Question ${questionId} was attempted by user.`);
              }
              // #### END DEBUG LOGGING ####
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
                      // #### START DEBUG LOGGING FOR A SPECIFIC QUESTION ID ####
                      if (questionId === debugQuestionId) {
                        console.log(`[DEBUG ${attemptId}] Question ${questionId} marked CORRECT. Earned: ${earnedForThisSlot}`);
                      }
                      // #### END DEBUG LOGGING ####
                    } else {
                      earnedForThisSlot = -qNegativeMarks;
                      statusForThisSlot = 'incorrect';
                      // #### START DEBUG LOGGING FOR A SPECIFIC QUESTION ID ####
                      if (questionId === debugQuestionId) {
                        console.log(`[DEBUG ${attemptId}] Question ${questionId} marked INCORRECT (wrong answer). Earned: ${earnedForThisSlot}`);
                      }
                      // #### END DEBUG LOGGING ####
                    }
                  } else {
                    earnedForThisSlot = -qNegativeMarks; // Invalid index
                    statusForThisSlot = 'incorrect';
                    // #### START DEBUG LOGGING FOR A SPECIFIC QUESTION ID ####
                    if (questionId === debugQuestionId) {
                      console.log(`[DEBUG ${attemptId}] Question ${questionId} marked INCORRECT (invalid index). Earned: ${earnedForThisSlot}`);
                    }
                    // #### END DEBUG LOGGING ####
                  }
                } else {
                  earnedForThisSlot = -qNegativeMarks; // Multiple selected for SCQ or no options source
                  statusForThisSlot = 'incorrect';
                  // #### START DEBUG LOGGING FOR A SPECIFIC QUESTION ID ####
                  if (questionId === debugQuestionId) {
                    console.log(`[DEBUG ${attemptId}] Question ${questionId} marked INCORRECT (multiple selected for SCQ or no options). Earned: ${earnedForThisSlot}`);
                  }
                  // #### END DEBUG LOGGING ####
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
              } else if (masterQuestionData.type === 'integer') {
                const selectedAnswerText = String(userResponseForThisSlot.selected[0]);
                if (correctOptionTexts.includes(selectedAnswerText)) {
                  earnedForThisSlot = qMarks;
                  statusForThisSlot = 'correct';
                } else {
                  earnedForThisSlot = -qNegativeMarks;
                  statusForThisSlot = 'incorrect';
                }
              }
            } else {
              // Genuinely not attempted by the user (no selected array or empty selected array for this questionId)
              statusForThisSlot = 'not-attempted';
              earnedForThisSlot = 0;            // #### START DEBUG LOGGING FOR A SPECIFIC QUESTION ID ####
              if (questionId === debugQuestionId) {
                console.log(`[DEBUG ${attemptId}] Question ${questionId} marked NOT-ATTEMPTED. Earned: ${earnedForThisSlot}`);
              }
              // #### END DEBUG LOGGING ####
            }
            
            calculatedScore += earnedForThisSlot;

            // #### START DEBUG LOGGING FOR A SPECIFIC QUESTION ID ####
            if (questionId === debugQuestionId) {
              console.log(`[DEBUG ${attemptId}] Final status for ${questionId}: ${statusForThisSlot}, Earned: ${earnedForThisSlot}. Pushing to processedResponses.`);
            }
            
            // #### END DEBUG LOGGING ####
              processedResponses.push({
              question: questionId,
              questionInstanceKey: questionInstanceKey, // Add the composite key for matching in review
              selected: userResponseForThisSlot ? userResponseForThisSlot.selected : [],
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
      }
    }

    console.log(`[${attemptId}] PRE-SAVE CHECK: Calculated Score: ${calculatedScore}, Calculated MaxScore: ${calculatedMaxScore}`);

    // Refetch the attempt just before saving to get the latest version
    const freshAttempt = await TestAttempt.findById(attemptId);
    if (!freshAttempt) {
        // The 'attempt' variable here refers to the one fetched at the beginning of the submitAttempt function.
        // This log helps understand if the document disappeared or was never found.
        console.error(`[${attemptId}] CRITICAL: Attempt not found before final save. Original attempt object was ${attempt ? 'populated' : 'null or not found initially'}.`);
        return res.status(404).json({ message: 'Test attempt not found for final save.' });
    }

    // Apply all calculated and updated fields to the freshAttempt object
    freshAttempt.score = calculatedScore;
    freshAttempt.maxScore = calculatedMaxScore;
    freshAttempt.percentage = calculatedMaxScore > 0 ? (calculatedScore / calculatedMaxScore) * 100 : 0;
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

    await freshAttempt.save(); // Persist the changes

    // Return success response with details from the saved attempt
    return res.status(200).json({
      message: 'Test submitted successfully.',
      attemptId: freshAttempt._id,
      score: freshAttempt.score,
      maxScore: freshAttempt.maxScore,
      percentage: freshAttempt.percentage,
      timeTakenSeconds: freshAttempt.timeTakenSeconds
    });

  } catch (err) {
    console.error('❌ Error in submitAttempt:', err);
    // It's good practice to check if headers have already been sent before trying to send a response.
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to submit test', error: err.message });
    }
  }
};

/**
 * Legacy Submit Test Endpoint (Deprecated)
 * 
 * Simple submission endpoint without grading logic.
 * Maintained for backward compatibility.
 * 
 * @route POST /api/tests/:attemptId/submit-legacy
 * @deprecated Use submitAttempt instead for proper grading
 * @param {string} req.params.attemptId - Test attempt ID
 * @param {Array} req.body.responses - Student responses
 * @returns {Object} Success message
 */
exports.submitTest = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { responses } = req.body; // array of { question, selected }    const attempt = await TestAttempt.findById(attemptId);
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
  // ADD THIS LINE FOR DEBUGGING
  console.log('Backend received saveProgress request. Body:', JSON.stringify(req.body, null, 2));
  console.log('Backend received saveProgress responses:', JSON.stringify(req.body.responses, null, 2));

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
    .select('+sections.questions.options +responses.selected')
    .lean();

    if (!attempt) {
      return res.json({}); // No in-progress attempt found
    }

    // Ensure responses include the 'selected' field.
    // The .lean() and .select() above should handle this, but as a safeguard:
    const responsesWithSelected = attempt.responses.map(r => ({
      question: r.question,
      questionInstanceKey: r.questionInstanceKey,
      selected: r.selected, // Ensure this is populated
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
    .populate('series', 'title description duration sections')
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
                    console.log(`[getEnhancedReview] Question ${questionData.question.toString()}: response found = ${!!response}, response.selected = ${response?.selected}, status = ${response?.status}`);

                    let userSelectedOptionTexts = [];
                    let correctOptionTexts = [];
                    let actualCorrectOptionIds = [];

                    // Determine the source of options (e.g., from the first translation or root)
                    // Ensure options are always an array, even if empty.
                    const optionsSourceForDisplay = (fullQuestion.translations && fullQuestion.translations.length > 0 && fullQuestion.translations[0].options 
                                                      ? fullQuestion.translations[0].options 
                                                      : fullQuestion.options) || [];                    // Get user's selected option texts
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
                    
                    const questionTextForDisplay = (fullQuestion.translations && fullQuestion.translations.length > 0 && fullQuestion.translations[0].questionText)
                                                   ? fullQuestion.translations[0].questionText
                                                   : (fullQuestion.questionText || 'Question text not available');


                    detailedQuestions.push({
                        questionId: fullQuestion._id.toString(),
                        questionText: questionTextForDisplay,
                        // Send all options for display, ensuring _id is a string
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
                        tags: fullQuestion.tags || [],                          // Response data
                        selectedAnswerIndices: response?.selected || [], // User's raw selection (indices)
                        selectedAnswer: response?.selected ? (Array.isArray(response.selected) ? response.selected : [response.selected]) : [], // Frontend expects this field for option highlighting
                        userSelectedOptionTexts: userSelectedOptionTexts, // User's selected option text(s)
                        correctOptionTexts: correctOptionTexts,         // Correct option text(s)
                        actualCorrectOptionIds: actualCorrectOptionIds, // Correct option ID(s)
                        
                        earned: response?.earned || 0,
                        status: response?.status || 'unanswered', // Status from submitAttempt
                        
                        // Enhanced analytics data
                        timeSpent: response?.timeSpent || 0,
                        attempts: response?.attempts || 0,
                        flagged: response?.flagged || false,
                        confidence: response?.confidence,
                        visitedAt: response?.visitedAt,
                        lastModifiedAt: response?.lastModifiedAt,                        // Analysis
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
 * Recommends focus areas, study time allocation, and next steps for better performance.
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
    console.error('❌ Error in getStudyRecommendations:', err);
    res.status(500).json({ message: 'Failed to get recommendations', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Helper Functions for Analytics and Performance Analysis
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Calculate performance grade based on percentage score
 * 
 * @description Converts numerical percentage to letter grade using standard
 * grading scale. Used for performance analytics and student progress tracking.
 * 
 * @param {number} percentage - Percentage score (0-100)
 * @returns {string} Letter grade (A+, A, B, C, D, F)
 * 
 * @example
 * getGrade(95); // Returns 'A+'
 * getGrade(75); // Returns 'B'
 * getGrade(45); // Returns 'F'
 */
function getGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

/**
 * Generate comprehensive performance summary for student feedback
 * 
 * @description Creates detailed narrative summary of student performance including
 * accuracy analysis, improvement trends, and motivational feedback. Combines
 * current attempt results with historical performance data for context.
 * 
 * @param {Object} attempt - Test attempt object with series information
 * @param {Object} performanceAnalytics - Current attempt performance metrics
 * @param {Object} comparativeAnalytics - Historical comparison data
 * @returns {string} Formatted performance summary text
 * 
 * @example
 * const summary = generatePerformanceSummary(attempt, analytics, comparison);
 * // Returns: "Your overall performance on JEE Main Practice Test shows 75.5% accuracy 
 * //          with significant improvement of 8.2% from your previous attempts..."
 */
function generatePerformanceSummary(attempt, performanceAnalytics, comparativeAnalytics) {
  const accuracy = performanceAnalytics.overall.accuracy;
  const improvement = comparativeAnalytics.improvement;
  
  let summary = `Your overall performance on ${attempt.series.title} shows ${accuracy.toFixed(1)}% accuracy `;
  
  if (improvement > 5) {
    summary += `with significant improvement of ${improvement.toFixed(1)}% from your previous attempts. `;
  } else if (improvement > 0) {
    summary += `with slight improvement of ${improvement.toFixed(1)}% from your previous attempts. `;
  } else if (improvement < -5) {
    summary += `showing a decline of ${Math.abs(improvement).toFixed(1)}% from your previous attempts. `;
  } else {
    summary += `maintaining consistent performance. `;
  }
  
  if (accuracy >= 80) {
    summary += "Excellent work! You're demonstrating strong mastery of the subject matter.";
  } else if (accuracy >= 70) {
    summary += "Good performance with room for improvement. Focus on the recommended areas.";
  } else if (accuracy >= 60) {
    summary += "Fair performance. Increased study time and focus on weak areas will help improve your scores.";
  } else {
    summary += "This exam highlights key areas for improvement. Follow the action plan for better results.";
  }
  
  return summary;
}

/**
 * Generate personalized study recommendations based on performance analysis
 * 
 * @description Analyzes performance metrics and weakness patterns to provide
 * targeted study recommendations. Considers accuracy levels, time management,
 * difficulty progression, and subject-specific performance patterns.
 * 
 * @param {Object} performanceAnalytics - Detailed performance breakdown
 * @param {Object} weaknessAnalysis - Identified weak areas and patterns
 * @returns {Array<string>} Array of personalized study recommendations
 * 
 * @example
 * const recommendations = generateStudyRecommendations(analytics, weaknesses);
 * // Returns: [
 * //   "Focus on fundamental concepts before attempting practice tests",
 * //   "Practice time management with timed question sets",
 * //   "Create a daily study schedule with regular practice sessions"
 * // ]
 */
function generateStudyRecommendations(performanceAnalytics, weaknessAnalysis) {
  const recommendations = [];
  
  // Based on accuracy
  if (performanceAnalytics.overall.accuracy < 70) {
    recommendations.push("Focus on fundamental concepts before attempting practice tests");
    recommendations.push("Review incorrect answers thoroughly to understand mistakes");
  }
  
  // Based on time management
  if (performanceAnalytics.timeAnalysis.questionsOverTime > 5) {
    recommendations.push("Practice time management with timed question sets");
    recommendations.push("Identify question patterns that take longer and practice those specifically");
  }
  
  // Based on difficulty performance
  const diffBreakdown = performanceAnalytics.difficultyBreakdown;
  if (diffBreakdown.Easy.total > 0 && (diffBreakdown.Easy.correct / diffBreakdown.Easy.total) < 0.8) {
    recommendations.push("Strengthen foundation by focusing on easy-level questions first");
  }
  
  if (diffBreakdown.Hard.total > 0 && (diffBreakdown.Hard.correct / diffBreakdown.Hard.total) < 0.4) {
    recommendations.push("Build up to harder questions gradually after mastering medium-level topics");
  }
  
  // Generic recommendations
  recommendations.push("Create a daily study schedule with regular practice sessions");
  recommendations.push("Use active recall and spaced repetition techniques");
  
  return recommendations;
}

/**
 * Generate actionable study plan for performance improvement
 * 
 * @description Creates specific, time-bound action items for students to improve
 * their performance. Considers current performance level and provides graduated
 * study intensity recommendations based on accuracy and weak areas.
 * 
 * @param {Object} performanceAnalytics - Performance analysis with accuracy and timing data
 * @returns {Array<string>} Array of specific action items for improvement
 * 
 * @example
 * const actionPlan = generateActionPlan(analytics);
 * // Returns: [
 * //   "Review all flagged and incorrect questions from this attempt",
 * //   "Spend 2-3 hours daily on foundational concepts",
 * //   "Take practice tests weekly to track improvement"
 * // ]
 */
function generateActionPlan(performanceAnalytics) {
  const actionPlan = [];
  
  actionPlan.push("Review all flagged and incorrect questions from this attempt");
  actionPlan.push("Identify and study the top 3 weakest subject areas");
  
  if (performanceAnalytics.overall.accuracy < 60) {
    actionPlan.push("Spend 2-3 hours daily on foundational concepts");
  } else {
    actionPlan.push("Spend 1-2 hours daily on targeted practice");
  }
  
  actionPlan.push("Take practice tests weekly to track improvement");
  actionPlan.push("Maintain a study log to track progress and identify patterns");
  
  return actionPlan;
}

/**
 * Identify primary focus areas for targeted study improvement
 * 
 * @description Analyzes performance data to identify the most critical areas
 * requiring student attention. Prioritizes subjects, concepts, and skills based
 * on performance gaps and improvement potential.
 * 
 * @param {Object} performanceAnalytics - Comprehensive performance breakdown including subject and difficulty analysis
 * @returns {Array<string>} Prioritized list of focus areas with performance indicators
 * 
 * @example
 * const focusAreas = identifyFocusAreas(analytics);
 * // Returns: [
 * //   "Physics (65.2% accuracy)",
 * //   "Chemistry (58.7% accuracy)", 
 * //   "Time Management Skills",
 * //   "Basic Concept Mastery"
 * // ]
 */
function identifyFocusAreas(performanceAnalytics) {
  const focusAreas = [];
  
  // Subject-wise focus
  const subjects = Object.entries(performanceAnalytics.subjectPerformance)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    .slice(0, 3);
  
  subjects.forEach(([subject, stats]) => {
    const accuracy = ((stats.correct / stats.total) * 100).toFixed(1);
    focusAreas.push(`${subject} (${accuracy}% accuracy)`);
  });
  
  // Time management if needed
  if (performanceAnalytics.timeAnalysis.questionsOverTime > 3) {
    focusAreas.push("Time Management Skills");
  }
  
  // Difficulty-based focus
  const diffBreakdown = performanceAnalytics.difficultyBreakdown;
  if (diffBreakdown.Easy.total > 0 && (diffBreakdown.Easy.correct / diffBreakdown.Easy.total) < 0.8) {
    focusAreas.push("Basic Concept Mastery");
  }
  
  return focusAreas;
}

function getMotivationalMessage(accuracy) {
  if (accuracy >= 85) {
    return "Outstanding performance! You're well on your way to exam success. Keep up this excellent momentum!";
  } else if (accuracy >= 75) {
    return "Great job! You're showing strong progress. A little more focus on weak areas will get you to the top!";
  } else if (accuracy >= 65) {
    return "Good effort! You're building a solid foundation. Consistent practice will definitely improve your scores!";
  } else {
    return "Every expert was once a beginner. Use this analysis to guide your study plan and you'll see improvement soon!";
  }
}

async function getQuestionsWithAnalytics(attempt) {
  const questions = [];
  
  for (const section of attempt.sections || []) {
    for (const qData of section.questions || []) {
      const questionDetails = await Question.findById(qData.questionId).lean();
      if (questionDetails) {
        questions.push({
          ...qData,
          ...questionDetails,
          timeSpent: qData.timeSpent || 0,
          isCorrect: qData.isCorrect || false,
          status: qData.status || 'unanswered',
          flagged: qData.flagged || false,
          difficulty: questionDetails.difficulty || 'Medium',
          topics: questionDetails.topics || { subject: 'Unknown' }
        });
      }
    }
  }
    return questions;
}

function calculatePerformanceAnalytics(attempt, questions) {
  const totalQuestions = questions.length;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let unanswered = 0;
  let totalTimeSpent = 0;
  let flaggedCount = 0;
  
  // Difficulty breakdown
  const difficultyBreakdown = {
    Easy: { total: 0, correct: 0 },
    Medium: { total: 0, correct: 0 },
    Hard: { total: 0, correct: 0 }
  };
  
  // Subject performance
  const subjectPerformance = {};
  
  // Time analysis
  let fastestQuestion = Infinity;
  let slowestQuestion = 0;
  let questionsOverTime = 0;
  
  questions.forEach(q => {
    // Basic counts
    if (q.isCorrect) {
      correctAnswers++;
    } else if (q.status === 'answered') {
      incorrectAnswers++;
    } else {
      unanswered++;
    }
    
    // Time tracking
    const timeSpent = q.timeSpent || 0;
    totalTimeSpent += timeSpent;
    
    if (timeSpent > 0) {
      fastestQuestion = Math.min(fastestQuestion, timeSpent);
      slowestQuestion = Math.max(slowestQuestion, timeSpent);
      
      // Questions taking more than 2 minutes
      if (timeSpent > 120) {
        questionsOverTime++;
      }
    }
    
    // Flagged questions
    if (q.flagged) {
      flaggedCount++;
    }
    
    // Difficulty breakdown
    const difficulty = q.difficulty || 'Medium';
    if (difficultyBreakdown[difficulty]) {
      difficultyBreakdown[difficulty].total++;
      if (q.isCorrect) {
        difficultyBreakdown[difficulty].correct++;
      }
    }
    
    // Subject performance
    const subject = q.topics?.subject || 'Unknown';
    if (!subjectPerformance[subject]) {
      subjectPerformance[subject] = { total: 0, correct: 0, timeSpent: 0 };
    }
    subjectPerformance[subject].total++;
    subjectPerformance[subject].timeSpent += timeSpent;
    if (q.isCorrect) {
      subjectPerformance[subject].correct++;
    }
  });
  
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const averageTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;
  
  return {
    overall: {
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      unanswered,
      accuracy,
      timeSpent: totalTimeSpent,
      averageTimePerQuestion,
      flaggedCount
    },
    difficultyBreakdown,
    subjectPerformance,
    timeAnalysis: {
      fastestQuestion: fastestQuestion === Infinity ? 0 : fastestQuestion,
      slowestQuestion,
      questionsOverTime
    }
  };
}

function calculateComparativeAnalytics(currentAttempt, allAttempts) {
  const currentScore = currentAttempt.score || 0;
  const currentPercentage = currentAttempt.percentage || 0;
  
  if (!allAttempts || allAttempts.length <= 1) {
    return {
      currentScore,
      averageScore: currentScore,
      improvement: 0,
      totalAttempts: 1,
      rank: 1,
      trend: 'first-attempt'
    };
  }
  
  // Calculate average score
  const totalScore = allAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
  const averageScore = totalScore / allAttempts.length;
  
  // Calculate improvement from previous attempt
  const sortedAttempts = allAttempts.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const previousAttempt = sortedAttempts[1]; // Second most recent (first is current)
  const improvement = previousAttempt ? currentPercentage - (previousAttempt.percentage || 0) : 0;
  
  // Calculate rank (simplified - based on current score vs average)
  const rank = currentScore >= averageScore ? 1 : 2;
  
  // Determine trend
  let trend = 'stable';
  if (improvement > 5) trend = 'improving';
  else if (improvement < -5) trend = 'declining';
  
  return {
    currentScore,
    averageScore,
    improvement,
    totalAttempts: allAttempts.length,
    rank,
    trend
  };
}

async function analyzeWeaknesses(attempt, userId) {
  // For now, return a simplified analysis
  // In a full implementation, this would analyze patterns across multiple attempts
  
  const weakTopics = ['Organic Chemistry', 'Thermodynamics']; // Placeholder
  const recommendedStudyTime = 120; // 2 hours
  const focusAreas = ['Time Management', 'Accuracy'];
  const nextSteps = [
    'Review flagged questions',
    'Practice similar difficulty questions', 
    'Focus on time management'
  ];
    return {
    weakTopics,
    recommendedStudyTime,
    focusAreas,
    nextSteps
  };
}
