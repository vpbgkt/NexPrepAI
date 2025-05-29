const TestSeries   = require('../models/TestSeries');
const TestAttempt  = require('../models/TestAttempt');
const Question     = require('../models/Question');
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

// ────────────────────────────────────────────────────────────────────────────────
// submitTest: saves the student's answers in the TestAttempt model
// ────────────────────────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────────────────────────
// saveProgress: saves the student's progress in the TestAttempt model
// ────────────────────────────────────────────────────────────────────────────────
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

/**
 * GET /api/tests/:seriesId/progress
 * If there’s an in-progress attempt for this user+series, return its ID,
 * remaining time, and saved sections/responses; otherwise return {}.
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
 * Get comprehensive review data with explanations and time analytics
 * Enhanced for the new review page implementation
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
 * Get performance comparison and analytics data
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
 * Get weakness identification and study recommendations
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
// Helper Functions

function getGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

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
