const Branch = require('../models/Branch');

// Add a new branch
const addBranch = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Branch name is required" });
    }

    const existing = await Branch.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: "Branch already exists" });
    }

    const branch = new Branch({ name });
    await branch.save();

    res.status(201).json({ message: "Branch added successfully", branch });
  } catch (error) {
    console.error("Error adding branch:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { addBranch };
