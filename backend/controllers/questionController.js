// backend/controllers/questionController.js
// -----------------------------------------
// CRUD controller for Question documents.
// Multilingual (en / hi) content is stored in `translations`.
//
// NOTE: audit middleware should already put `req.user.userId` on the
//       request object. If you use another field, adjust it below.

const mongoose  = require('mongoose');
const Question  = require('../models/Question');
const Branch    = require('../models/Branch');
const Subject   = require('../models/Subject');
const Topic     = require('../models/Topic');
const SubTopic  = require('../models/SubTopic');

/*──────────────── helper ────────────────*/
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

/*──────────────── language detection helper ────────────────*/
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

/*──────────────── addQuestion ────────────*/
exports.addQuestion = async (req, res) => {
  try {
    /* ---------- 1. pull & sanitise body ------------------------- */
    const {
      translations           = {},          // { en:{…}, hi:{…} } or empty
      difficulty             = 'Not-mentioned',
      type:  qType           = 'single',    // single | multiple | integer | matrix
      branchId, subjectId, topicId, subtopicId,
      images                 = [],          // language-neutral images
      options                = [],          // *deprecated* flat options
      correctOptions         = [],          // *deprecated* flat answers
      questionHistory        = []           // [{examName,year}, …]
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
      finalTranslationsArr = [{
        lang: 'en',
        questionText : req.body.questionText || '',
        images       : images,
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
                : Object.values(req.body.translations || {});

    // throw away packs that are obviously blank
    packs = packs.filter(p =>
      p.questionText?.trim() &&
      Array.isArray(p.options) &&
      p.options.filter(o => o.text?.trim()).length >= 2
    );

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
        images: p.images || images || []
      };
    });

    if (!packs.length)
      return res.status(400).json({ message:'Need at least one filled language' });

    // 2️⃣  choose the first pack as the "mirror" for quick queries  
    const [primary] = packs;         // could be en or hi

    /* ---------- 4. validate options ----------------------------- */
    // `packs` is already an array that contains every non-empty language pack.
    // The first element is English if it was present – otherwise the next
    // available language (e.g. Hindi-only submissions).
    const primaryLangPack = packs[0];

    const baseOpts = primaryLangPack.options || [];

    if (baseOpts.length < 2)
      return res.status(400).json({ message:'At least two options are required.' });

    const baseCorrect = baseOpts
      .map((o,idx)=>o.isCorrect?idx:-1)
      .filter(i=>i>=0);

    if (qType==='single' && baseCorrect.length!==1)
      return res.status(400).json({ message:'Single-correct must have exactly one correct option.' });

    if ((qType==='multiple'||qType==='matrix') && baseCorrect.length<2)
      return res.status(400).json({ message:'Multiple / matrix must have 2+ correct options.' });

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
      images,
      translations: trArr,

      questionText  : trArr[0].questionText,
      options       : trArr[0].options,
      correctOptions: baseCorrect,

      explanations  : explanations,
      questionHistory: formattedHistory,
      createdBy     : userId
    });

    return res.status(201).json(question);

  } catch (err) {
    console.error('❌ addQuestion error:', err);
    return res.status(500).json({ message:'Server error', error:err.message });
  }
};

/*──────────── other CRUD (unchanged) ───────────*/
exports.getAllQuestions = async (_req, res) => {
  const list = await Question.find()
    .populate('branch',  'name')
    .populate('subject', 'name')
    .populate('topic',   'name')
    .populate('subTopic','name')
    .lean();
  res.json(list);
};

exports.getQuestionById = async (req, res) => {
  const q = await Question.findById(req.params.id).lean();
  if (!q) return res.status(404).json({ message: 'Not found' });

  const askLang = req.query.lang ?? 'en';
  const pack = q.translations.find(t => t.lang === askLang) ||
               q.translations[0]; // fallback

  res.json({ ...q, translation: pack });
};

exports.updateQuestion = async (req,res)=>{
  const q = await Question.findByIdAndUpdate(req.params.id, req.body, {new:true});
  if(!q) return res.status(404).json({message:'Not found'});
  res.json(q);
};

exports.deleteQuestion = async (req,res)=>{
  const ok = await Question.findByIdAndDelete(req.params.id);
  if(!ok) return res.status(404).json({message:'Not found'});
  res.json({message:'Deleted'});
};

/*──────────────── filterQuestions ────────────────*/
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
    console.error('❌ filterQuestions error:', err);
    res.status(500).json({ message: 'Server error while filtering questions', error: err.message });
  }
};
