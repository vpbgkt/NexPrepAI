const ExamFamily = require('../models/ExamFamily');

// GET /api/examFamilies
exports.getAllFamilies = async (req, res) => {
  try {
    const list = await ExamFamily.find().sort('name');
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/examFamilies  (admin only)
exports.createFamily = async (req, res) => {
  try {
    // 1️⃣ Get the raw inputs
    const { code: codeInput, name, description } = req.body;

    // 2️⃣ Generate a slug if no code was provided
    const code = codeInput?.trim()
      ? codeInput.trim()
      : name.trim().toLowerCase().replace(/\s+/g, '-');

    // 3️⃣ Pull the creator’s ID from the authenticated token
    //    verifyToken middleware sets req.user = { userId, role }
    const createdBy = req.user.userId;

    // 4️⃣ Build and save
    const family = new ExamFamily({ code, name, description, createdBy });
    await family.save();

    // 5️⃣ Return the new document
    res.status(201).json(family);

  } catch (err) {
    console.error('Error creating exam family:', err);
    // Send the validation error message back to the client
    res.status(400).json({ message: err.message });
  }
};