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
exports.getAllQuestions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search
    } = req.query;

    // Validate and limit the page size to prevent memory issues
    const pageNumber = Math.max(1, parseInt(page, 10));
    const limitNumber = Math.min(1000, Math.max(1, parseInt(limit, 10))); // Max 1000 items per page
    const skip = (pageNumber - 1) * limitNumber;

    // Build query for optional search
    const query = {};
    if (search) {
      query.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { 'translations.questionText': { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination metadata
    const totalCount = await Question.countDocuments(query);

    // Fetch questions with pagination
    const questions = await Question.find(query)
      .populate('branch', 'name')
      .populate('subject', 'name')
      .populate('topic', 'name')
      .populate('subTopic', 'name')
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limitNumber)
      .lean();

    res.json({
      questions,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
        totalCount,
        itemsPerPage: limitNumber,
        hasNextPage: pageNumber < Math.ceil(totalCount / limitNumber),
        hasPrevPage: pageNumber > 1
      }
    });
  } catch (error) {
    console.error('Error fetching all questions:', error);
    res.status(500).json({ 
      message: 'Server error while fetching questions', 
      error: error.message 
    });
  }
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
      sortBy = 'createdAt', // Default sort by creation date
      sortOrder = 'desc', // Default to newest first
      page = 1, // Default to page 1
      limit = 15 // Default to 15 items per page (matching frontend)
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

    // Build sort object based on sortBy and sortOrder
    const sortObject = {};
    const validSortFields = ['createdAt', 'updatedAt', 'difficulty', 'type', 'status'];
    
    if (validSortFields.includes(sortBy)) {
      sortObject[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortObject['createdAt'] = -1; // Default fallback
    }

    // Get total count of documents matching the query (without pagination)
    const totalCount = await Question.countDocuments(query);

    const questions = await Question.find(query)
      .populate('branch', 'name')
      .populate('subject', 'name')
      .populate('topic', 'name')
      .populate('subTopic', 'name')
      .sort(sortObject) // Use dynamic sorting
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
    
    // Since S3 bucket is public, use direct S3 URL (permanent, never expires)
    const directS3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    
    res.status(200).json({
      imageUrl: directS3Url,
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

/**
 * Smart Question Upload - Step 1: Process JSON and Resolve Hierarchy
 * 
 * Processes a smart JSON question format where hierarchy items are provided as names.
 * Automatically resolves existing hierarchy items or creates new ones.
 * Returns the processed question with resolved ObjectIds and flags for image requirements.
 * 
 * @route POST /api/questions/smart-upload/process
 * @access Private (Authenticated users)
 * @param {Object} req.body - Smart question JSON with hierarchy names
 * @param {string} req.body.branchId - Branch name (will be resolved to ObjectId)
 * @param {string} req.body.subjectId - Subject name (will be resolved to ObjectId)
 * @param {string} req.body.topicId - Topic name (will be resolved to ObjectId)
 * @param {string} req.body.subtopicId - SubTopic name (will be resolved to ObjectId)
 * @param {Array} req.body.translations - Question translations array
 * @returns {Object} Processed question with resolved IDs and image requirements
 */
exports.smartUploadProcess = async (req, res) => {
  try {
    const questionData = req.body;
    
    // Extract hierarchy names - support both field name formats
    // Format 1: branchId, subjectId, topicId, subtopicId (original format)
    // Format 2: branch, subject, topic, subTopic (new format)
    const branchName = questionData.branchId || questionData.branch;
    const subjectName = questionData.subjectId || questionData.subject;
    const topicName = questionData.topicId || questionData.topic;
    const subtopicName = questionData.subtopicId || questionData.subTopic;
    
    if (!branchName) {
      return res.status(400).json({ message: 'Branch name is required (use "branchId" or "branch" field)' });
    }

    console.log('🔍 Processing hierarchy names:', { branchName, subjectName, topicName, subtopicName });

    // Step 1: Resolve Branch (create if doesn't exist)
    let branch = await Branch.findOne({ name: new RegExp(`^${branchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!branch) {
      console.log('📝 Creating new branch:', branchName);
      try {
        branch = await Branch.create({ name: branchName.toLowerCase() });
      } catch (error) {
        if (error.code === 11000) {
          console.log('⚠️ Branch already exists, finding existing one:', branchName);
          branch = await Branch.findOne({ name: new RegExp(`^${branchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        } else {
          throw error;
        }
      }
    }
    
    // Step 2: Resolve Subject (create if doesn't exist, link to branch)
    let subject = null;
    if (subjectName) {
      subject = await Subject.findOne({ 
        name: new RegExp(`^${subjectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        branch: branch._id 
      });
      if (!subject) {
        console.log('📝 Creating new subject:', subjectName);
        try {
          subject = await Subject.create({ 
            name: subjectName.toLowerCase(),
            branch: branch._id 
          });
        } catch (error) {
          if (error.code === 11000) {
            console.log('⚠️ Subject already exists, finding existing one:', subjectName);
            subject = await Subject.findOne({ 
              name: new RegExp(`^${subjectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
              branch: branch._id 
            });
          } else {
            throw error;
          }
        }
      }
    }
    
    // Step 3: Resolve Topic (create if doesn't exist, link to subject)
    let topic = null;
    if (topicName && subject) {
      topic = await Topic.findOne({ 
        name: new RegExp(`^${topicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        subject: subject._id 
      });
      if (!topic) {
        console.log('📝 Creating new topic:', topicName);
        try {
          topic = await Topic.create({ 
            name: topicName.toLowerCase(),
            subject: subject._id 
          });
        } catch (error) {
          if (error.code === 11000) {
            console.log('⚠️ Topic already exists, finding existing one:', topicName);
            topic = await Topic.findOne({ 
              name: new RegExp(`^${topicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
              subject: subject._id 
            });
          } else {
            throw error;
          }
        }
      }
    }
    
    // Step 4: Resolve SubTopic (create if doesn't exist, link to topic)
    let subTopic = null;
    if (subtopicName && topic) {
      subTopic = await SubTopic.findOne({ 
        name: new RegExp(`^${subtopicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        topic: topic._id 
      });
      if (!subTopic) {
        console.log('📝 Creating new subtopic:', subtopicName);
        try {
          subTopic = await SubTopic.create({ 
            name: subtopicName.toLowerCase(),
            topic: topic._id 
          });
        } catch (error) {
          // Handle duplicate key error - try to find existing one again
          if (error.code === 11000) {
            console.log('⚠️ Subtopic already exists, finding existing one:', subtopicName);
            subTopic = await SubTopic.findOne({ 
              name: new RegExp(`^${subtopicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
              topic: topic._id 
            });
          } else {
            throw error;
          }
        }
      }
    }

    // Step 5: Update question data with resolved ObjectIds
    const processedQuestion = {
      ...questionData,
      branchId: branch._id,
      subjectId: subject?._id || null,
      topicId: topic?._id || null,
      subtopicId: subTopic?._id || null
    };

    // Step 6: Format question history properly
    const formattedHistory = Array.isArray(questionData.questionHistory) ? 
      questionData.questionHistory.map(entry => ({
        title: entry.examName || entry.title || '',
        askedAt: entry.year ? new Date(entry.year, 0, 1) : (entry.askedAt ? new Date(entry.askedAt) : new Date()),
      })) : [];

    // Step 7: Check if question contains images (but don't auto-detect, ask user)
    const hasImages = false; // We'll ask user manually instead of auto-detecting
    
    // Step 8: Extract image information for upload tracking
    const imageRequirements = []; // Empty since we're asking user manually

    const response = {
      processedQuestion,
      hierarchyResolution: {
        branch: { id: branch._id, name: branch.name, created: !branch.createdAt },
        subject: subject ? { id: subject._id, name: subject.name, created: !subject.createdAt } : null,
        topic: topic ? { id: topic._id, name: topic.name, created: !topic.createdAt } : null,
        subTopic: subTopic ? { id: subTopic._id, name: subTopic.name, created: !subTopic.createdAt } : null
      },
      imageInfo: {
        hasImages,
        imageRequirements,
        nextStep: 'ask_user_about_images' // Always ask user about images
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in smart upload process:', error);
    res.status(500).json({ 
      message: 'Failed to process smart question upload', 
      error: error.message 
    });
  }
};

/**
 * Smart Question Upload - Step 2: Update Question with Image URLs
 * 
 * Updates the processed question JSON with uploaded image URLs.
 * This step is called after images have been uploaded via the image upload endpoint.
 * 
 * @route POST /api/questions/smart-upload/update-images
 * @access Private (Authenticated users)
 * @param {Object} req.body.questionData - Processed question data from step 1
 * @param {Array} req.body.imageUpdates - Array of image updates with paths and URLs
 * @returns {Object} Updated question data with image URLs
 */
exports.smartUploadUpdateImages = async (req, res) => {
  try {
    const { questionData, imageUpdates } = req.body;
    
    if (!questionData || !imageUpdates) {
      return res.status(400).json({ message: 'Question data and image updates are required' });
    }

    // Clone the question data to avoid mutation
    const updatedQuestion = JSON.parse(JSON.stringify(questionData));
    
    // Apply image updates
    imageUpdates.forEach(update => {
      const { path, imageUrl } = update;
      
      if (path.startsWith('translations[')) {
        // Handle translation images: translations[0].images[0]
        const match = path.match(/translations\[(\d+)\]\.images\[(\d+)\]/);
        if (match) {
          const translationIndex = parseInt(match[1]);
          const imageIndex = parseInt(match[2]);
          
          if (!updatedQuestion.translations[translationIndex].images) {
            updatedQuestion.translations[translationIndex].images = [];
          }
          updatedQuestion.translations[translationIndex].images[imageIndex] = imageUrl;
        }
        
        // Handle option images: translations[0].options[1].img
        const optionMatch = path.match(/translations\[(\d+)\]\.options\[(\d+)\]\.img/);
        if (optionMatch) {
          const translationIndex = parseInt(optionMatch[1]);
          const optionIndex = parseInt(optionMatch[2]);
          
          updatedQuestion.translations[translationIndex].options[optionIndex].img = imageUrl;
        }
      }
    });

    res.status(200).json({
      updatedQuestion,
      message: 'Question updated with image URLs successfully'
    });
  } catch (error) {
    console.error('Error updating question with images:', error);
    res.status(500).json({ 
      message: 'Failed to update question with images', 
      error: error.message 
    });
  }
};

/**
 * Smart Question Upload - Step 3: Preview and Final Upload
 * 
 * Provides a preview of the final question and handles the actual database insertion.
 * This is the final step where the question is saved to the database.
 * 
 * @route POST /api/questions/smart-upload/preview
 * @access Private (Authenticated users)
 * @param {Object} req.body.questionData - Final processed question data
 * @param {boolean} req.body.confirm - Whether to actually save to database
 * @returns {Object} Preview data or saved question
 */
exports.smartUploadPreview = async (req, res) => {
  try {
    const { questionData, confirm = false } = req.body;
    
    if (!questionData) {
      return res.status(400).json({ message: 'Question data is required' });
    }

    // Validate the question data
    const validation = validateSmartQuestion(questionData);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Question validation failed', 
        errors: validation.errors 
      });
    }

    // If this is just a preview request, return the formatted question
    if (!confirm) {
      const preview = await generateQuestionPreview(questionData);
      return res.status(200).json({
        preview,
        validation: validation,
        message: 'Question preview generated successfully'
      });
    }

    // Actually save the question to database
    const userId = req.user?.userId;
    
    // Prepare the question for database insertion
    const questionForDB = {
      ...questionData,
      branch: questionData.branchId,
      subject: questionData.subjectId,
      topic: questionData.topicId,
      subTopic: questionData.subtopicId,
      createdBy: userId,
      // Set default values if not provided
      status: questionData.status || 'draft',
      tags: questionData.tags || [],
      difficulty: questionData.difficulty || 'Medium',
      type: questionData.type || 'single',
      // Properly format question history
      questionHistory: questionData.questionHistory ? questionData.questionHistory.map(entry => ({
        title: entry.examName || entry.title || '',
        askedAt: entry.year ? new Date(entry.year, 0, 1) : (entry.askedAt ? new Date(entry.askedAt) : new Date()),
      })) : []
    };

    // Remove the string ID fields as we now have the proper ObjectId fields
    delete questionForDB.branchId;
    delete questionForDB.subjectId;
    delete questionForDB.topicId;
    delete questionForDB.subtopicId;

    // Create the question
    const savedQuestion = await Question.create(questionForDB);
    
    // Populate hierarchy fields for response
    const populatedQuestion = await Question.findById(savedQuestion._id)
      .populate('branch', 'name')
      .populate('subject', 'name')
      .populate('topic', 'name')
      .populate('subTopic', 'name')
      .lean();

    res.status(201).json({
      question: populatedQuestion,
      message: 'Question uploaded successfully'
    });
  } catch (error) {
    console.error('Error in smart upload preview/save:', error);
    res.status(500).json({ 
      message: 'Failed to preview/save question', 
      error: error.message 
    });
  }
};

/**
 * Helper Functions for Smart Upload
 */

/**
 * Check if question contains any images
 */
function checkForImages(questionData) {
  if (!questionData.translations) return false;
  
  for (const translation of questionData.translations) {
    // Check if there are images in the translation
    if (translation.images && translation.images.length > 0) {
      return true;
    }
    
    // Check if any options have images
    if (translation.options) {
      for (const option of translation.options) {
        if (option.img && option.img.trim() !== '') {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Extract image requirements for upload tracking
 */
function extractImageRequirements(questionData) {
  const requirements = [];
  
  if (!questionData.translations) return requirements;
  
  questionData.translations.forEach((translation, translationIndex) => {
    // Track main question images
    if (translation.images && translation.images.length > 0) {
      translation.images.forEach((img, imageIndex) => {
        if (img && img.trim() !== '') {
          requirements.push({
            type: 'question_image',
            path: `translations[${translationIndex}].images[${imageIndex}]`,
            language: translation.lang,
            description: `Question image ${imageIndex + 1} for ${translation.lang}`
          });
        }
      });
    }
    
    // Track option images
    if (translation.options) {
      translation.options.forEach((option, optionIndex) => {
        if (option.img && option.img.trim() !== '') {
          requirements.push({
            type: 'option_image',
            path: `translations[${translationIndex}].options[${optionIndex}].img`,
            language: translation.lang,
            optionText: option.text,
            description: `Option ${optionIndex + 1} image for ${translation.lang}: "${option.text}"`
          });
        }
      });
    }
  });
  
  return requirements;
}

/**
 * Validate smart question data
 */
function validateSmartQuestion(questionData) {
  const errors = [];
  
  // Check required fields
  if (!questionData.branchId) errors.push('Branch ID is required');
  if (!questionData.translations || questionData.translations.length === 0) {
    errors.push('At least one translation is required');
  }
  
  // Validate translations
  if (questionData.translations) {
    questionData.translations.forEach((translation, index) => {
      if (!translation.questionText || translation.questionText.trim() === '') {
        errors.push(`Translation ${index + 1}: Question text is required`);
      }
      
      if (!translation.options || translation.options.length < 2) {
        errors.push(`Translation ${index + 1}: At least 2 options are required`);
      } else {
        const correctOptions = translation.options.filter(opt => opt.isCorrect);
        if (correctOptions.length === 0) {
          errors.push(`Translation ${index + 1}: At least one correct option is required`);
        }
        
        if (questionData.type === 'single' && correctOptions.length > 1) {
          errors.push(`Translation ${index + 1}: Single choice questions can have only one correct option`);
        }
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate question preview with hierarchy names
 */
async function generateQuestionPreview(questionData) {
  try {
    // Get hierarchy names for display
    const hierarchy = {};
    
    if (questionData.branchId) {
      const branch = await Branch.findById(questionData.branchId);
      hierarchy.branch = branch?.name || 'Unknown';
    }
    
    if (questionData.subjectId) {
      const subject = await Subject.findById(questionData.subjectId);
      hierarchy.subject = subject?.name || 'Unknown';
    }
    
    if (questionData.topicId) {
      const topic = await Topic.findById(questionData.topicId);
      hierarchy.topic = topic?.name || 'Unknown';
    }
    
    if (questionData.subtopicId) {
      const subTopic = await SubTopic.findById(questionData.subtopicId);
      hierarchy.subTopic = subTopic?.name || 'Unknown';
    }
    
    return {
      hierarchy,
      questionData,
      summary: {
        totalTranslations: questionData.translations?.length || 0,
        languages: questionData.translations?.map(t => t.lang) || [],
        questionType: questionData.type || 'single',
        difficulty: questionData.difficulty || 'Medium',
        hasImages: checkForImages(questionData),
        tags: questionData.tags?.length || 0
      }
    };
  } catch (error) {
    console.error('Error generating preview:', error);
    throw error;
  }
}
