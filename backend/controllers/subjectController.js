const Subject = require('../models/Subject');

// @desc Add a subject
// @route POST /api/subjects/add
const addSubject = async (req, res) => {
  try {
    const { name, branchId } = req.body;
    const subject = new Subject({ name, branch: branchId });
    await subject.save();
    res.status(201).json({ message: 'Subject added successfully', subject });
  } catch (error) {
    console.error('Error adding subject:', error);
    res.status(500).json({ message: 'Error adding subject', error });
  }
};

// @desc Get all subjects
// @route GET /api/subjects/all
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  addSubject,
  getAllSubjects,
};
