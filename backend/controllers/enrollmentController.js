/**
 * @fileoverview Student Enrollment Controller
 * 
 * This module handles all enrollment-related operations for the NexPrep platform.
 * It manages student enrollments in different exam categories, levels, and branches,
 * providing comprehensive enrollment management with support for:
 * - Self-enrollment by students
 * - Admin-managed enrollments
 * - Compulsory enrollments (like reasoning for all students)
 * - Access control and validation
 * - Enrollment validation and access control
 * 
 * Note: Account expiration is handled globally, not at enrollment level.
 * 
 * @module controllers/enrollmentController
 * @requires ../models/Enrollment
 * @requires ../models/ExamFamily
 * @requires ../models/ExamLevel
 * @requires ../models/Branch
 * @requires ../models/User
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const Enrollment = require('../models/Enrollment');
const ExamFamily = require('../models/ExamFamily');
const ExamLevel = require('../models/ExamLevel');
const ExamBranch = require('../models/ExamBranch');
const User = require('../models/User');

/**
 * Get all enrollments for the authenticated student
 * 
 * @route GET /api/enrollments/my-enrollments
 * @access Private (Student)
 * 
 * @description Retrieves all active enrollments for the authenticated student
 * with populated exam family, levels, and branch information.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user from middleware
 * @param {string} req.user.userId - Student's user ID
 * @param {Object} res - Express response object
 * 
 * @returns {Array} Array of enrollment objects with populated references
 * @throws {500} Server error during enrollment retrieval
 */
const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.getActiveEnrollments(req.user.userId);
    
    res.json({
      success: true,
      data: enrollments,
      message: 'Enrollments retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments'
    });
  }
};

/**
 * Get enrollment options for student enrollment form
 * 
 * @route GET /api/enrollments/enrollment-options
 * @access Private (Student)
 * 
 * @description Retrieves all available exam families, levels, and branches
 * that students can enroll in, excluding compulsory ones.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Object} Object containing available enrollment options
 * @returns {Array} returns.examFamilies - Available exam families
 * @returns {Array} returns.examLevels - Available exam levels grouped by family
 * @returns {Array} returns.branches - Available branches
 * @throws {500} Server error during data retrieval
 */
const getEnrollmentOptions = async (req, res) => {
  try {
    // Get all exam families
    const examFamilies = await ExamFamily.find().sort('name');
    
    // Get all exam levels grouped by family
    const examLevels = await ExamLevel.find()
      .populate('family', 'name code')
      .sort('name');
    
    // Get all exam branches with their exam levels populated
    const examBranches = await ExamBranch.find()
      .populate('level', 'name code family')
      .sort('name');

    // Group exam levels by family
    const examLevelsByFamily = examLevels.reduce((acc, level) => {
      const familyId = level.family._id.toString();
      if (!acc[familyId]) {
        acc[familyId] = [];
      }
      acc[familyId].push(level);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        examFamilies,
        examLevels: examLevelsByFamily,
        examBranches
      },
      message: 'Enrollment options retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching enrollment options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollment options'
    });
  }
};

/**
 * Create new enrollment for student (Self-enrollment)
 * 
 * @route POST /api/enrollments/enroll
 * @access Private (Student)
 * 
 * @description Allows students to enroll themselves in exam families with
 * selected levels and branches. Includes validation and duplicate prevention.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.examFamily - Exam family ID
 * @param {Array} req.body.examLevels - Array of exam level IDs
 * @param {Array} req.body.branches - Array of branch IDs
 * @param {string} [req.body.accessLevel] - Access level (basic/premium)
 * @param {Object} [req.body.preferences] - Student preferences
 * @param {Object} req.user - Authenticated user from middleware
 * @param {Object} res - Express response object
 * 
 * @returns {Object} Created enrollment object
 * @throws {400} Validation errors or duplicate enrollment
 * @throws {500} Server error during enrollment creation
 */
const createEnrollment = async (req, res) => {
  try {
    const {
      examFamily,
      examLevels,
      branches,
      accessLevel = 'basic',
      preferences = {}
    } = req.body;

    const studentId = req.user.userId;

    // Validate required fields
    if (!examFamily || !examLevels || !branches) {
      return res.status(400).json({
        success: false,
        message: 'Exam family, levels, and branches are required'
      });
    }

    if (!Array.isArray(examLevels) || examLevels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one exam level must be selected'
      });
    }

    if (!Array.isArray(branches) || branches.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one branch must be selected'
      });
    }

    // Check if student already has an identical enrollment (same family, levels, and branches)
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      examFamily: examFamily,
      status: 'active'
    });

    if (existingEnrollment) {
      // Check if it's exactly the same enrollment (same levels and branches)
      const existingLevels = existingEnrollment.examLevels.map(id => id.toString()).sort();
      const newLevels = examLevels.map(id => id.toString()).sort();
      const existingBranches = existingEnrollment.branches.map(id => id.toString()).sort();
      const newBranches = branches.map(id => id.toString()).sort();

      const sameLevels = JSON.stringify(existingLevels) === JSON.stringify(newLevels);
      const sameBranches = JSON.stringify(existingBranches) === JSON.stringify(newBranches);

      if (sameLevels && sameBranches) {
        return res.status(400).json({
          success: false,
          message: 'You already have an identical enrollment for this exam family'
        });
      }

      // If different levels/branches, update the existing enrollment instead of creating new
      existingEnrollment.examLevels = examLevels;
      existingEnrollment.branches = branches;
      existingEnrollment.preferences = {
        receiveNotifications: preferences.receiveNotifications !== false,
        difficultyLevel: preferences.difficultyLevel || 'mixed',
        preferredLanguage: preferences.preferredLanguage || 'english'
      };
      
      await existingEnrollment.save();

      // Return the updated enrollment
      const updatedEnrollment = await Enrollment.findById(existingEnrollment._id)
        .populate('examFamily', 'name code description')
        .populate('examLevels', 'name code description')
        .populate('branches', 'name description');

      return res.status(200).json({
        success: true,
        data: updatedEnrollment,
        message: 'Enrollment updated successfully'
      });
    }

    // Validate exam family exists
    const examFamilyDoc = await ExamFamily.findById(examFamily);
    if (!examFamilyDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam family selected'
      });
    }

    // Validate exam levels exist and belong to the family
    const examLevelDocs = await ExamLevel.find({
      _id: { $in: examLevels },
      family: examFamily
    });
    
    if (examLevelDocs.length !== examLevels.length) {
      return res.status(400).json({
        success: false,
        message: 'Some exam levels are invalid or do not belong to the selected family'
      });
    }

    // Validate exam branches exist
    const examBranchDocs = await ExamBranch.find({
      _id: { $in: branches }
    });
    
    if (examBranchDocs.length !== branches.length) {
      return res.status(400).json({
        success: false,
        message: 'Some exam branches are invalid'
      });
    }

    // Create enrollment
    const enrollment = new Enrollment({
      student: studentId,
      examFamily,
      examLevels,
      branches,
      enrollmentType: 'self',
      accessLevel,
      preferences: {
        receiveNotifications: preferences.receiveNotifications !== false,
        difficultyLevel: preferences.difficultyLevel || 'mixed',
        preferredLanguage: preferences.preferredLanguage || 'english'
      },
      enrolledBy: studentId
    });

    await enrollment.save();

    // Populate the enrollment before returning
    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('examFamily', 'name code description')
      .populate('examLevels', 'name code description')
      .populate('branches', 'name description'); // Note: This should reference ExamBranch IDs

    res.status(201).json({
      success: true,
      data: populatedEnrollment,
      message: 'Enrollment created successfully'
    });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create enrollment'
    });
  }
};

/**
 * Update existing enrollment
 * 
 * @route PUT /api/enrollments/:enrollmentId
 * @access Private (Student owns enrollment)
 * 
 * @description Allows students to update their enrollment preferences,
 * add/remove exam levels and branches.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.enrollmentId - Enrollment ID to update
 * @param {Object} req.body - Update data
 * @param {Object} res - Express response object
 * 
 * @returns {Object} Updated enrollment object
 * @throws {404} Enrollment not found
 * @throws {403} Not authorized to update enrollment
 * @throws {500} Server error during update
 */
const updateEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { examLevels, branches, preferences } = req.body;
    const studentId = req.user.userId;

    // Find enrollment and verify ownership
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      student: studentId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found or you do not have permission to update it'
      });
    }

    // Update exam levels if provided
    if (examLevels && Array.isArray(examLevels) && examLevels.length > 0) {
      // Validate exam levels belong to the enrollment's family
      const validLevels = await ExamLevel.find({
        _id: { $in: examLevels },
        family: enrollment.examFamily
      });
      
      if (validLevels.length !== examLevels.length) {
        return res.status(400).json({
          success: false,
          message: 'Some exam levels are invalid for this enrollment'
        });
      }
      
      enrollment.examLevels = examLevels;
    }

    // Update branches if provided
    if (branches && Array.isArray(branches) && branches.length > 0) {
      // Validate exam branches exist
      const validExamBranches = await ExamBranch.find({
        _id: { $in: branches }
      });
      
      if (validExamBranches.length !== branches.length) {
        return res.status(400).json({
          success: false,
          message: 'Some exam branches are invalid'
        });
      }
      
      enrollment.branches = branches;
    }

    // Update preferences if provided
    if (preferences && typeof preferences === 'object') {
      enrollment.preferences = {
        ...enrollment.preferences,
        ...preferences
      };
    }

    await enrollment.save();

    // Return populated enrollment
    const updatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('examFamily', 'name code description')
      .populate('examLevels', 'name code description')
      .populate('branches', 'name description'); // Now correctly references ExamBranch

    res.json({
      success: true,
      data: updatedEnrollment,
      message: 'Enrollment updated successfully'
    });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enrollment'
    });
  }
};

/**
 * Delete/Deactivate enrollment
 * 
 * @route DELETE /api/enrollments/:enrollmentId
 * @access Private (Student owns enrollment)
 * 
 * @description Deactivates an enrollment (soft delete) rather than permanently
 * deleting it to maintain data integrity and audit trails.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.enrollmentId - Enrollment ID to delete
 * @param {Object} res - Express response object
 * 
 * @returns {Object} Success message
 * @throws {404} Enrollment not found
 * @throws {403} Not authorized to delete enrollment
 * @throws {500} Server error during deletion
 */
const deleteEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const studentId = req.user.userId;

    // Find enrollment and verify ownership
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      student: studentId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found or you do not have permission to delete it'
      });
    }

    // Check if it's a compulsory enrollment
    if (enrollment.isCompulsory) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete compulsory enrollment'
      });
    }

    // Soft delete by setting status to inactive
    enrollment.status = 'inactive';
    await enrollment.save();

    res.json({
      success: true,
      message: 'Enrollment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete enrollment'
    });
  }
};

/**
 * Check if student has access to specific exam family
 * 
 * @route GET /api/enrollments/check-access/:examFamilyId
 * @access Private (Student)
 * 
 * @description Checks if the authenticated student has active enrollment
 * and access to a specific exam family.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.params.examFamilyId - Exam family ID to check
 * @param {Object} res - Express response object
 * 
 * @returns {Object} Access status and enrollment details
 * @throws {500} Server error during access check
 */
const checkAccess = async (req, res) => {
  try {
    const { examFamilyId } = req.params;
    const studentId = req.user.userId;

    const enrollment = await Enrollment.hasAccessToExamFamily(studentId, examFamilyId);

    if (!enrollment) {
      return res.json({
        success: true,
        hasAccess: false,
        message: 'No active enrollment found for this exam family'
      });
    }

    // Check if enrollment is active
    const hasAccess = enrollment.status === 'active';

    res.json({
      success: true,
      hasAccess: hasAccess,
      enrollment: {
        id: enrollment._id,
        accessLevel: enrollment.accessLevel,
        enrollmentType: enrollment.enrollmentType,
        status: enrollment.status
      },
      message: hasAccess ? 'Access granted' : 'Enrollment is not active'
    });
  } catch (error) {
    console.error('Error checking access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check access'
    });
  }
};

/**
 * Get enrollment statistics for student dashboard
 * 
 * @route GET /api/enrollments/stats
 * @access Private (Student)
 * 
 * @description Provides enrollment statistics and insights for the student dashboard.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Object} Enrollment statistics
 * @throws {500} Server error during statistics retrieval
 */
const getEnrollmentStats = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const enrollments = await Enrollment.find({
      student: studentId,
      status: 'active'
    }).populate('examFamily', 'name');

    const stats = {
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollments.filter(e => e.status === 'active').length,
      basicEnrollments: enrollments.filter(e => e.accessLevel === 'basic').length,
      premiumEnrollments: enrollments.filter(e => e.accessLevel === 'premium').length,
      compulsoryEnrollments: enrollments.filter(e => e.isCompulsory).length,
      examFamilies: enrollments.map(e => ({
        id: e.examFamily._id,
        name: e.examFamily.name,
        accessLevel: e.accessLevel,
        status: e.status,
        enrollmentType: e.enrollmentType
      }))
    };

    res.json({
      success: true,
      data: stats,
      message: 'Enrollment statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching enrollment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollment statistics'
    });
  }
};

/**
 * Get filtered branches based on exam family and levels
 * 
 * @route POST /api/enrollments/filtered-branches
 * @access Private
 * 
 * @description Retrieves branches filtered by selected exam family and levels.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.examFamily - Exam family ID
 * @param {Array} req.body.examLevels - Array of exam level IDs
 * @param {Object} res - Express response object
 * 
 * @returns {Array} Array of branch objects
 * @throws {400} Validation error if exam family is not provided
 * @throws {500} Server error during branch retrieval
 */
const getFilteredBranches = async (req, res) => {
  try {
    const { examFamily, examLevels } = req.body;
    
    if (!examLevels || examLevels.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No exam levels selected - no branches available'
      });
    }

    // Filter exam branches that belong to the selected exam levels
    const examBranches = await ExamBranch.find({
      level: { $in: examLevels }
    })
    .populate('level', 'name code family')
    .sort('name');

    res.json({
      success: true,
      data: examBranches,
      message: 'Filtered exam branches retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching filtered exam branches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filtered exam branches'
    });
  }
};

// Admin functions (for future admin panel integration)

/**
 * Create compulsory enrollment (Admin only)
 * 
 * @route POST /api/enrollments/admin/create-compulsory
 * @access Private (Admin)
 * 
 * @description Creates compulsory enrollments that are automatically applied
 * to all students (e.g., reasoning tests that all students must take).
 */
const createCompulsoryEnrollment = async (req, res) => {
  try {
    const {
      examFamily,
      examLevels,
      branches,
      compulsoryReason,
      targetStudents = 'all' // 'all' or array of student IDs
    } = req.body;

    const adminId = req.user.userId;

    // Validate admin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Get target students
    let students;
    if (targetStudents === 'all') {
      students = await User.find({ role: 'student' }, '_id');
    } else if (Array.isArray(targetStudents)) {
      students = await User.find({ _id: { $in: targetStudents }, role: 'student' }, '_id');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid target students specification'
      });
    }

    const enrollments = [];
    const errors = [];

    // Create enrollments for each student
    for (const student of students) {
      try {
        // Check if student already has enrollment for this family
        const existingEnrollment = await Enrollment.findOne({
          student: student._id,
          examFamily,
          status: 'active'
        });

        if (!existingEnrollment) {
          const enrollment = new Enrollment({
            student: student._id,
            examFamily,
            examLevels,
            branches,
            enrollmentType: 'compulsory',
            accessLevel: 'full',
            isCompulsory: true,
            compulsoryReason,
            enrolledBy: adminId
          });

          await enrollment.save();
          enrollments.push(enrollment);
        }
      } catch (error) {
        errors.push({
          studentId: student._id,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: enrollments.length,
        errors: errors.length,
        enrollments,
        errors
      },
      message: `Compulsory enrollment created for ${enrollments.length} students`
    });
  } catch (error) {
    console.error('Error creating compulsory enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create compulsory enrollment'
    });
  }
};

/**
 * Get all enrollments (Admin only)
 * 
 * @route GET /api/enrollments/admin/all-enrollments
 * @access Private (Admin)
 * 
 * @description Retrieves all enrollments in the system for admin management.
 */
const getAllEnrollments = async (req, res) => {
  try {
    // Validate admin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const enrollments = await Enrollment.find()
      .populate('student', 'name email')
      .populate('examFamily', 'name code description')
      .populate('examLevels', 'name code description')
      .populate('branches', 'name description')
      .sort({ enrolledAt: -1 });

    res.json({
      success: true,
      data: enrollments,
      message: 'All enrollments retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching all enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments'
    });
  }
};

/**
 * Get admin enrollment statistics
 * 
 * @route GET /api/enrollments/admin/stats
 * @access Private (Admin)
 * 
 * @description Provides comprehensive enrollment statistics for admin dashboard.
 */
const getAdminEnrollmentStats = async (req, res) => {
  try {
    // Validate admin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const totalEnrollments = await Enrollment.countDocuments();
    const activeEnrollments = await Enrollment.countDocuments({ status: 'active' });
    const compulsoryEnrollments = await Enrollment.countDocuments({ isCompulsory: true });
    const selfEnrollments = await Enrollment.countDocuments({ enrollmentType: 'self' });

    // Get enrollment breakdown by exam family
    const enrollmentsByFamily = await Enrollment.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'examfamilies',
          localField: 'examFamily',
          foreignField: '_id',
          as: 'familyInfo'
        }
      },
      { $unwind: '$familyInfo' },
      {
        $group: {
          _id: '$familyInfo.name',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      total: totalEnrollments,
      active: activeEnrollments,
      compulsory: compulsoryEnrollments,
      self: selfEnrollments,
      inactive: totalEnrollments - activeEnrollments,
      byFamily: enrollmentsByFamily
    };

    res.json({
      success: true,
      data: stats,
      message: 'Admin enrollment statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching admin enrollment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollment statistics'
    });
  }
};

/**
 * Deactivate enrollment (Admin only)
 * 
 * @route PATCH /api/enrollments/admin/:enrollmentId/deactivate
 * @access Private (Admin)
 * 
 * @description Allows admin to deactivate any enrollment.
 */
const adminDeactivateEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    // Validate admin role
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    enrollment.status = 'inactive';
    await enrollment.save();

    res.json({
      success: true,
      message: 'Enrollment deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate enrollment'
    });
  }
};

module.exports = {
  getMyEnrollments,
  getEnrollmentOptions,
  getFilteredBranches,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
  checkAccess,
  getEnrollmentStats,
  createCompulsoryEnrollment,
  getAllEnrollments,
  getAdminEnrollmentStats,
  adminDeactivateEnrollment
};
