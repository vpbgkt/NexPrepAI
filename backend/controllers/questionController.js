/**
 * Question Controller
 * 
 * CRUD controller for Question documents with multilingual support.
 * Handles question creation, retrieval, updating, deletion, and filtering operations.
 * Supports translations (en/hi) content stored in `translations` array.
 * Manages hierarchical relationships with Branch, Subject, Topic, and SubTopic.
 * 
 * Features:
 * - Multilingual question content (English/Hindi with auto-detection)
 * - Hierarchical categorization (Branch -> Subject -> Topic -> SubTopic)
 * - Multiple question types (single, multiple, integer, matrix)
 * - CSV import functionality
 * - Advanced filtering and pagination
 * - Question history and tagging system
 * 
 * NOTE: Audit middleware should put `req.user.userId` on the request object.
 * 
 * @requires mongoose
 * @requires ../models/Question
 * @requires ../models/Branch
 * @requires ../models/Subject
 * @requires ../models/Topic
 * @requires ../models/SubTopic
 */

// backend/controllers/questionController.js
// -----------------------------------------
// CRUD controller for Question documents.
// Multilingual (en / hi) content is stored in `translations`.
//
// NOTE: audit middleware should already put `req.user.userId` on the
//       request object. If you use another field, adjust it below.

const mongoose  = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { s3, deleteFromS3, getFileUrl } = require('../config/s3Config');
const Question  = require('../models/Question');
const Branch    = require('../models/Branch');
const Subject   = require('../models/Subject');
const Topic     = require('../models/Topic');
const SubTopic  = require('../models/SubTopic');

/**
 * Hierarchy ID Resolution Helper
 * 
 * Resolves hierarchy references (Branch, Subject, Topic, SubTopic) by ID or name.
 * If value is a valid ObjectId, returns it if document exists.
 * If value is a string name, finds existing document or creates new one.
 * 
 * @param {mongoose.Model} Model - Mongoose model to query (Branch, Subject, etc.)
 * @param {string} value - ObjectId string or document name
 * @returns {Promise<ObjectId|null>} Resolved ObjectId or null if no value provided
 */
const resolveId = async (Model, value) => {
  if (!value) return null;

  // 1️⃣ valid ObjectId → return if exists, else null
  if (mongoose.Types.ObjectId.isValid(value)) {
    const doc = await Model.findById(value).lean();
    return doc ? doc._id : null;
  }

  // 2️⃣ treat as name (case-insensitive) → create if missing
  let doc = await Model.findOne({ name: new RegExp(`^${value}$`, 'i') });
  if (!doc) doc = await Model.create({ name: value });
  return doc._id;
};

/**
 * Language Detection Helper
 * 
 * Automatically detects language of text content based on Unicode ranges.
 * Currently supports Hindi (Devanagari script) detection, defaults to English.
 * 
 * @param {string} text - Text content to analyze for language detection
 * @returns {string} Language code ('hi' for Hindi, 'en' for English/default)
 */
const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return 'en';
  
  // Hindi Unicode range: 0900-097F
  const hindiPattern = /[\u0900-\u097F]/;
  
  // Check if the text contains Hindi characters
  if (hindiPattern.test(text)) {
    return 'hi';
  }
  
  return 'en'; // Default to English
};

/**
 * Add Question Endpoint
 * 
 * Creates a new question with multilingual support and hierarchical categorization.
 * Handles both object-based and array-based translation formats with automatic language detection.
 * Validates question types, options, and correct answers based on question type requirements.
 * 
 * @route POST /api/questions/add
 * @access Private (Authenticated users)
 * @param {Object} req.body - Question data
 * @param {Object|Array} req.body.translations - Translation data ({ en:{...}, hi:{...} } or array format)
 * @param {string} req.body.difficulty - Question difficulty (Easy/Medium/Hard/Not-mentioned)
 * @param {string} req.body.type - Question type (single/multiple/integer/matrix)
 * @param {string} req.body.branchId - Branch ID or name (auto-created if name)
 * @param {string} req.body.subjectId - Subject ID or name (auto-created if name)
 * @param {string} req.body.topicId - Topic ID or name (auto-created if name)
 * @param {string} req.body.subtopicId - SubTopic ID or name (auto-created if name)
 * @param {Array} req.body.questionHistory - Array of exam history entries
 * @param {string} req.body.status - Question status (draft/active/inactive)
 * @param {Array} req.body.tags - Question tags for categorization
 * @param {number} req.body.recommendedTimeAllotment - Suggested time in minutes
 * @param {string} req.body.internalNotes - Internal admin notes
 * @param {Object} req.user - Authenticated user object
 * @param {string} req.user.userId - User ID for audit trail
 * @returns {Object} Created question object with populated hierarchy
 * @throws {400} Invalid question type, insufficient options, or validation errors
 * @throws {500} Server error during question creation
 */
exports.addQuestion = async (req, res) => {
  try {
    /* ---------- 1. pull & sanitise body ------------------------- */
    const {
      translations           = {},          // { en:{…}, hi:{…} } or empty
      difficulty             = 'Not-mentioned',
      type:  qType           = 'single',    // single | multiple | integer | matrix
      branchId, subjectId, topicId, subtopicId,
      options                = [],          // *deprecated* flat options
      correctOptions         = [],          // *deprecated* flat answers
      questionHistory        = [],           // [{examName,year}, …]
      status,
      tags,
      recommendedTimeAllotment,
      internalNotes
    } = req.body;

    /* ---------- 2. basic ENUM validations ----------------------- */
    const allowedTypes       = ['single','multiple','integer','matrix'];
    const allowedDifficulty  = ['Easy','Medium','Hard','Not-mentioned'];

    if (!allowedTypes.includes(qType))
      return res.status(400).json({ message:'Invalid type value' });

    const diff = allowedDifficulty.includes(difficulty)
               ? difficulty
               : 'Not-mentioned';

    /* ---------- 3. guarantee translations.en exists ------------- */
    let finalTranslationsArr = [];          // ← will be an array in the end

    if (translations && translations.en) {
      // convert the { en:{…}, hi:{…} } object → array
      for (const [lang, pack] of Object.entries(translations)) {
        finalTranslationsArr.push({ lang, ...pack });
      }
    } else {
      // legacy flat payload → wrap as English
      // This block is also entered if req.body.translations is an array,
      // as array.en is undefined.
      finalTranslationsArr = [{
        lang: 'en',
        questionText : req.body.questionText || '',
        images       : [], // CORRECTED: Was 'images', which is undefined. Default to empty array.
        options      : options.map(o =>
          typeof o === 'string'
            ? { text:o, img:'', isCorrect:false }
            : { text:o.text, img:o.img||'', isCorrect:!!o.isCorrect }
        ),
        explanations : req.body.explanations || []
      }];
    }

    // 1️⃣  clean up incoming array (or object -> array)
    let packs = Array.isArray(req.body.translations)
                ? req.body.translations
                : Object.values(req.body.translations || {});    // throw away packs that are obviously blank
    packs = packs.filter(p => {
      // Basic requirement: must have question text
      if (!p.questionText?.trim()) return false;
      
      // For integer/numerical questions, check for numerical answer instead of options
      if (qType === 'integer' || qType === 'numerical') {
        return p.numericalAnswer && 
               p.numericalAnswer.minValue !== undefined && 
               p.numericalAnswer.maxValue !== undefined;
      }
      
      // For other question types, require at least 2 options
      return Array.isArray(p.options) &&
             p.options.filter(o => o.text?.trim()).length >= 2;
    });

    /* packs currently looks like [{ questionText:'...', options:[…] }, …]   */
    /* ensure every block carries an explicit lang tag                      */
    const langFallbacks = ['en', 'hi', 'ta', 'bn'];           // any order you like
    packs = packs.map((p, idx) => {
      // If no language is explicitly specified, detect it from the question text
      const detectedLang = p.lang || detectLanguage(p.questionText) || langFallbacks[idx] || `lang${idx}`;
      
      return {
        lang: detectedLang,
        ...p,
        // Make sure images are included in each translation
        images: p.images || []
      };
    });

    if (!packs.length)
      return res.status(400).json({ message:'Need at least one filled language' });

    // 2️⃣  choose the first pack as the "mirror" for quick queries  
    const [primary] = packs;         // could be en or hi    /* ---------- 4. validate options/answers -------------------- */    // `packs` is already an array that contains every non-empty language pack.
    // The first element is English if it was present – otherwise the next
    // available language (e.g. Hindi-only submissions).
    const primaryLangPack = packs[0];

    // Initialize baseCorrect for use later in question creation
    let baseCorrect = [];

    // Validation differs based on question type
    if (qType === 'integer' || qType === 'numerical') {
      // For numerical questions, validate numerical answer
      const numericalAnswer = primaryLangPack.numericalAnswer;
      if (!numericalAnswer || 
          numericalAnswer.minValue === undefined || 
          numericalAnswer.maxValue === undefined) {
        return res.status(400).json({ message:'Numerical answer with min/max values is required for integer questions.' });
      }
      // For numerical questions, no correct options
      baseCorrect = [];
    } else {
      // For multiple choice questions, validate options
      const baseOpts = primaryLangPack.options || [];

      if (baseOpts.length < 2)
        return res.status(400).json({ message:'At least two options are required.' });

      baseCorrect = baseOpts
        .map((o,idx)=>o.isCorrect?idx:-1)
        .filter(i=>i>=0);

      if (qType==='single' && baseCorrect.length!==1)
        return res.status(400).json({ message:'Single-correct must have exactly one correct option.' });

      if ((qType==='multiple'||qType==='matrix') && baseCorrect.length<2)
        return res.status(400).json({ message:'Multiple / matrix must have 2+ correct options.' });
    }

    /* ---------- 5. resolve hierarchy IDs ------------------------ */
    const branch   = await resolveId(Branch  , branchId);
    const subject  = await resolveId(Subject , subjectId);
    const topic    = await resolveId(Topic   , topicId);
    const subTopic = await resolveId(SubTopic, subtopicId);

    /* ---------- 6. Format explanations and question history ------ */
    // Extract explanations from primary language pack
    const explanations = primaryLangPack.explanations || [];
    
    // Format question history properly
    const formattedHistory = Array.isArray(questionHistory) ? 
      questionHistory.map(entry => ({
        title: entry.examName,
        askedAt: entry.year ? new Date(entry.year, 0, 1) : new Date(),
      })) : [];

    /* ---------- 7. build & save document ------------------------ */
    // packs has already been filtered to contain only
    // language blocks that have questionText and ≥2 options.
    const trArr = packs;                 // ← just reuse it

    // Get user ID exactly as it's set in verifyToken middleware
    const userId = req.user?.userId;

    // quick-access mirrors come from the first pack (Hindi-only works too)
    const question = await Question.create({
      branch, subject, topic, subTopic,
      type        : qType,
      difficulty  : diff,
      translations: trArr,

      status: status || 'draft', // Provide a default if not sent
      tags: tags || [],
      recommendedTimeAllotment,
      internalNotes,

      questionText  : trArr[0].questionText,
      options       : trArr[0].options,
      correctOptions: baseCorrect,

      explanations  : explanations,
      questionHistory: formattedHistory,
      createdBy     : userId
    });

    return res.status(201).json(question);
  } catch (err) {
    return res.status(500).json({ message:'Server error', error:err.message });
  }
};

/**
 * Get All Questions Endpoint
 * 
 * Retrieves all questions from the database with populated hierarchy information.
 * Returns complete question list with branch, subject, topic, and subtopic details.
 * 
 * @route GET /api/questions/all
 * @access Private (Authenticated users)
 * @returns {Array} Array of all questions with populated hierarchy fields
 * @throws {500} Server error during question retrieval
 */
exports.getAllQuestions = async (_req, res) => {
  const list = await Question.find()
    .populate('branch',  'name')
    .populate('subject', 'name')
    .populate('topic',   'name')
    .populate('subTopic','name')
    .lean();
  res.json(list);
};

/**
 * Get Question By ID Endpoint
 * 
 * Retrieves a specific question by its MongoDB ObjectId.
 * Supports language-specific translation retrieval via query parameter.
 * 
 * @route GET /api/questions/:id
 * @access Private (Authenticated users)
 * @param {string} req.params.id - MongoDB ObjectId of the question
 * @param {string} req.query.lang - Optional language code for specific translation (default: 'en')
 * @returns {Object} Question object with requested translation or fallback
 * @throws {404} Question not found
 * @throws {500} Server error during question retrieval
 */
exports.getQuestionById = async (req, res) => {
  try {
    const q = await Question.findById(req.params.id)
      .populate('branch', 'name')
      .populate('subject', 'name')
      .populate('topic', 'name')
      .populate('subTopic', 'name')
      .lean();
    
    if (!q) return res.status(404).json({ message: 'Not found' });

    const askLang = req.query.lang ?? 'en';
    const pack = q.translations.find(t => t.lang === askLang) ||
                 q.translations[0]; // fallback

    res.json({ ...q, translation: pack });
  } catch (error) {
    console.error('Error fetching question by ID:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update Question Endpoint
 * 
 * Updates an existing question with provided data.
 * Performs complete document replacement with new values.
 * 
 * @route PUT /api/questions/:id
 * @access Private (Authenticated users)
 * @param {string} req.params.id - MongoDB ObjectId of question to update
 * @param {Object} req.body - Updated question data (follows same structure as addQuestion)
 * @returns {Object} Updated question object
 * @throws {404} Question not found
 * @throws {500} Server error during question update
 */
exports.updateQuestion = async (req,res)=>{
  const q = await Question.findByIdAndUpdate(req.params.id, req.body, {new:true});
  if(!q) return res.status(404).json({message:'Not found'});
  res.json(q);
};

/**
 * Delete Question Endpoint
 * 
 * Permanently removes a question from the database.
 * Performs hard delete with no recovery option.
 * 
 * @route DELETE /api/questions/:id
 * @access Private (Authenticated users)
 * @param {string} req.params.id - MongoDB ObjectId of question to delete
 * @returns {Object} Success message confirming deletion
 * @throws {404} Question not found
 * @throws {500} Server error during question deletion
 */
exports.deleteQuestion = async (req,res)=>{
  const ok = await Question.findByIdAndDelete(req.params.id);
  if(!ok) return res.status(404).json({message:'Not found'});
  res.json({message:'Deleted'});
};

/**
 * Filter Questions Endpoint
 * 
 * Advanced question filtering with pagination support.
 * Supports filtering by hierarchy (branch/subject/topic/subtopic), difficulty, type, status.
 * Includes text search across question content and translations.
 * Returns paginated results with total count and page information.
 * 
 * @route GET /api/questions/filter
 * @access Private (Authenticated users)
 * @param {string} req.query.branch - Branch ObjectId filter
 * @param {string} req.query.subject - Subject ObjectId filter
 * @param {string} req.query.topic - Topic ObjectId filter
 * @param {string} req.query.subtopic - SubTopic ObjectId filter
 * @param {string} req.query.difficulty - Difficulty filter (Easy/Medium/Hard/Not-mentioned)
 * @param {string} req.query.type - Question type filter (single/multiple/integer/matrix)
 * @param {string} req.query.status - Status filter (draft/active/inactive)
 * @param {string} req.query.searchTerm - Text search in questionText and translations
 * @param {number} req.query.page - Page number for pagination (default: 1)
 * @param {number} req.query.limit - Items per page (default: 10)
 * @returns {Object} Paginated questions with populated hierarchy and pagination metadata
 * @throws {500} Server error during question filtering
 */
exports.filterQuestions = async (req, res) => {
  try {
    const {
      branch,
      subject,
      topic,
      subtopic, // Matches frontend filter key
      difficulty,
      type,
      status,
      searchTerm,
      page = 1, // Default to page 1
      limit = 10 // Default to 10 items per page
    } = req.query; // Filters will come from query parameters

    const query = {};

    if (branch && mongoose.Types.ObjectId.isValid(branch)) query.branch = branch;
    if (subject && mongoose.Types.ObjectId.isValid(subject)) query.subject = subject;
    if (topic && mongoose.Types.ObjectId.isValid(topic)) query.topic = topic;
    // Frontend sends 'subtopic', backend model uses 'subTopic'
    if (subtopic && mongoose.Types.ObjectId.isValid(subtopic)) query.subTopic = subtopic;
    if (difficulty) query.difficulty = difficulty;
    if (type) query.type = type;
    if (status) query.status = status;

    if (searchTerm) {
      query.$or = [
        { questionText: { $regex: searchTerm, $options: 'i' } },
        { 'translations.questionText': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Get total count of documents matching the query (without pagination)
    const totalCount = await Question.countDocuments(query);

    const questions = await Question.find(query)
      .populate('branch', 'name')
      .populate('subject', 'name')
      .populate('topic', 'name')
      .populate('subTopic', 'name')
      .skip(skip)
      .limit(limitNumber)
      .lean();

    res.json({
      questions,
      totalCount,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error while filtering questions', error: err.message });
  }
};

/**
 * Update Question Status Endpoint
 *
 * Updates the status of a specific question.
 * Only 'superadmin' users can perform this action.
 * Allowed statuses: 'Published', 'draft'.
 *
 * @route PUT /api/questions/:id/status
 * @access Private (Superadmin only)
 * @param {string} req.params.id - MongoDB ObjectId of the question
 * @param {string} req.body.status - New status for the question ('Published' or 'draft')
 * @param {Object} req.user - Authenticated user object (from verifyToken middleware)
 * @param {string} req.user.role - Role of the authenticated user
 * @returns {Object} Updated question object
 * @throws {400} Invalid status value
 * @throws {401} Unauthorized if user is not superadmin
 * @throws {404} Question not found
 * @throws {500} Server error during question status update
 */
exports.updateQuestionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { role } = req.user; // Assuming role is available in req.user

    // 1. Authorization: Check if user is superadmin
    if (role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Only superadmins can update question status.' });
    }

    // 2. Validate status
    const allowedStatuses = ['Published', 'draft'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    // 3. Find and update question
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    question.status = status;
    // If you have an 'updatedBy' field or similar, update it here
    // question.updatedBy = req.user.userId; 
    // question.updatedAt = Date.now();

    await question.save();

    // Populate hierarchy fields for the response, similar to other GET endpoints
    const populatedQuestion = await Question.findById(question._id)
      .populate('branch', 'name')
      .populate('subject', 'name')
      .populate('topic', 'name')
      .populate('subTopic', 'name')
      .lean();

    return res.json(populatedQuestion);
  } catch (err) {
    if (err.name === 'CastError') { // Handle invalid ObjectId format
        return res.status(400).json({ message: 'Invalid question ID format' });
    }
    return res.status(500).json({ message: 'Server error while updating question status', error: err.message });
  }
};

/**
 * Upload Question Image to S3
 * 
 * Handles image upload for question body or option images.
 * Implements "Upload As You Go" approach with immediate S3 upload.
 * 
 * @route POST /api/v1/questions/upload-image
 * @access Private (requires authentication)
 * @param {File} req.file - Image file from multer
 * @param {string} req.body.branchId - Branch ID for S3 categorization
 * @param {string} req.body.subjectId - Subject ID for S3 categorization
 * @param {string} req.body.topicId - Topic ID for S3 categorization
 * @param {string} req.body.imageFor - 'body' or 'option'
 * @param {string} req.body.optionIndex - Option index (if imageFor is 'option') * @param {string} req.body.questionId - Question ID (if editing existing question)
 */
exports.uploadQuestionImage = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { branchId, subjectId, topicId, imageFor, optionIndex, questionId } = req.body;

    // Validate required fields
    if (!branchId || !subjectId || !topicId || !imageFor) {
      return res.status(400).json({ 
        message: 'Missing required fields: branchId, subjectId, topicId, imageFor are required.' 
      });
    }

    // Validate imageFor
    if (!['body', 'option'].includes(imageFor)) {
      return res.status(400).json({ 
        message: 'Invalid imageFor value. Must be "body" or "option".' 
      });
    }

    // If imageFor is 'option', optionIndex is required
    if (imageFor === 'option' && optionIndex === undefined) {
      return res.status(400).json({ 
        message: 'optionIndex is required when imageFor is "option".' 
      });
    }

    // Get branch, subject, topic names for S3 path
    const [branch, subject, topic] = await Promise.all([
      Branch.findById(branchId).select('name'),
      Subject.findById(subjectId).select('name'),
      Topic.findById(topicId).select('name')
    ]);

    if (!branch || !subject || !topic) {
      return res.status(400).json({ 
        message: 'Invalid hierarchy: Branch, Subject, or Topic not found.' 
      });
    }

    // Sanitize names for S3 path
    const sanitizedBranch = branch.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const sanitizedSubject = subject.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const sanitizedTopic = topic.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // Generate unique filename
    const originalName = req.file.originalname;
    const extension = path.extname(originalName).toLowerCase();
    const uniqueFileName = `${uuidv4()}${extension}`;

    // Construct S3 key based on strategy
    let s3Key;
    if (questionId) {
      // Editing existing question - use questionId in path
      const imageType = imageFor === 'option' ? `option-${optionIndex}` : 'body';
      s3Key = `question-images/${sanitizedBranch}/${sanitizedSubject}/${sanitizedTopic}/${questionId}/${imageType}-${uniqueFileName}`;
    } else {
      // New question - simpler path without questionId
      const imageType = imageFor === 'option' ? `option-${optionIndex}` : 'body';
      s3Key = `question-images/${sanitizedBranch}/${sanitizedSubject}/${sanitizedTopic}/${imageType}-${uniqueFileName}`;
    }    // TODO: Implement actual S3 upload
    // Upload to S3 (without ACL since bucket doesn't allow ACLs)
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
      // Removed ACL: 'public-read' since bucket doesn't allow ACLs
    };    const uploadResult = await s3.upload(uploadParams).promise();
    
    // Store the S3 key and provide a proxy URL for accessing the image
    const proxyUrl = `${req.protocol}://${req.get('host')}/api/images/s3-proxy?key=${s3Key}`;
    
    res.status(200).json({
      imageUrl: proxyUrl,
      s3Key: s3Key,
      message: 'Image uploaded successfully'
    });  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to upload image', 
      error: error.message 
    });
  }
};

/**
 * Delete Question Image from S3
 * 
 * Removes uploaded image from S3 storage.
 * 
 * @route DELETE /api/v1/questions/delete-image
 * @access Private (requires authentication) * @param {string} req.body.imageUrl - S3 URL of image to delete
 */
exports.deleteQuestionImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required.' });
    }    // Delete from S3
    await deleteFromS3(imageUrl);
    
    res.status(200).json({
      message: 'Image deleted successfully'    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to delete image', 
      error: error.message 
    });
  }
};
