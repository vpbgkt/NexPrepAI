/**
 * Controller: subjectController.js
 * -------------------------------------
 * Manages CRUD operations for the Subject entity, which falls under a Branch.
 *
 * Functions:
 * - addSubject(): Adds a new subject to a specific branch
 * - getAllSubjects(): Retrieves all subjects, optionally filtered by branch
 *
 * Used in:
 * - Admin panel dropdowns
 * - CSV question import logic
 *
 * Depends on:
 * - models/Subject.js
 * - models/Branch.js
 */

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

// @desc Update a subject
// @route PUT /api/subjects/:id
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSubject = await Subject.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.status(200).json(updatedSubject);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ message: 'Failed to update subject', error: error.message });
  }
};

module.exports = {
  addSubject,
  getAllSubjects,
  updateSubject,
};
