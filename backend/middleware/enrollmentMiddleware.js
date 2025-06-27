/**
 * @fileoverview Enrollment Middleware
 * 
 * This middleware module provides enrollment validation and access control
 * for the NexPrep platform. It ensures that students can only access content
 * and features for which they have active enrollments.
 * 
 * @module middleware/enrollmentMiddleware
 * @requires ../models/Enrollment
 * @requires ../models/TestSeries
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const Enrollment = require('../models/Enrollment');
const TestSeries = require('../models/TestSeries');

/**
 * Check if user has active enrollments
 * 
 * @description Middleware that checks if a student has at least one active enrollment.
 * Used to ensure students are enrolled before accessing exam content.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user from verifyToken middleware
 * @param {string} req.user.userId - User ID
 * @param {string} req.user.role - User role
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * 
 * @returns {void} Calls next() if user has enrollments or is admin
 * @throws {403} If student has no active enrollments
 */
const requireEnrollment = async (req, res, next) => {
  try {
    // Skip enrollment check for admin users
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    const studentId = req.user.userId;
    const enrollments = await Enrollment.getActiveEnrollments(studentId);

    if (!enrollments || enrollments.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No active enrollments found. Please enroll in exam categories to access this content.',
        requiresEnrollment: true,
        redirectTo: '/profile'
      });
    }

    // Add enrollments to request for use in subsequent middleware/controllers
    req.userEnrollments = enrollments;
    next();
  } catch (error) {
    console.error('Error in enrollment middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking enrollment status'
    });
  }
};

/**
 * Check access to specific exam family
 * 
 * @description Middleware that checks if a student has access to a specific exam family.
 * Extracts examFamilyId from request parameters or body and validates enrollment.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} [req.params.examFamilyId] - Exam family ID from URL
 * @param {Object} [req.body] - Request body
 * @param {string} [req.body.examFamily] - Exam family ID from body
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * 
 * @returns {void} Calls next() if user has access
 * @throws {403} If student doesn't have access to exam family
 * @throws {400} If examFamilyId is not provided
 */
const requireExamFamilyAccess = async (req, res, next) => {
  try {
    // Skip check for admin users
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    const studentId = req.user.userId;
    // Get examFamilyId from params or body
    const examFamilyId = req.params.examFamilyId || req.body.examFamily || req.params.familyId;

    if (!examFamilyId) {
      return res.status(400).json({
        success: false,
        message: 'Exam family ID is required'
      });
    }

    const enrollment = await Enrollment.hasAccessToExamFamily(studentId, examFamilyId);

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this exam family. Please enroll to access this content.',
        requiresEnrollment: true,
        examFamilyId,
        redirectTo: '/profile'
      });
    }

    // Check if enrollment is active
    if (enrollment.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your enrollment is not active. Please check your enrollment status.',
        enrollmentStatus: enrollment.status,
        enrollment: {
          id: enrollment._id,
          accessLevel: enrollment.accessLevel,
          status: enrollment.status
        },
        redirectTo: '/profile'
      });
    }

    // Add enrollment info to request
    req.currentEnrollment = enrollment;
    next();
  } catch (error) {
    console.error('Error in exam family access middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking exam family access'
    });
  }
};

/**
 * Check access to specific test series
 * 
 * @description Middleware that validates access to a specific test series based on
 * student's enrollment in the exam family associated with the test series.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.seriesId - Test series ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * 
 * @returns {void} Calls next() if user has access
 * @throws {404} If test series not found
 * @throws {403} If student doesn't have access
 */
const requireTestSeriesAccess = async (req, res, next) => {
  try {
    // Skip check for admin users
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    const studentId = req.user.userId;
    const seriesId = req.params.seriesId || req.params.testSeriesId;

    if (!seriesId) {
      return res.status(400).json({
        success: false,
        message: 'Test series ID is required'
      });
    }

    // Get test series with exam family
    const testSeries = await TestSeries.findById(seriesId).populate('family');

    if (!testSeries) {
      return res.status(404).json({
        success: false,
        message: 'Test series not found'
      });
    }

    // Check if student has access to the exam family
    const enrollment = await Enrollment.hasAccessToExamFamily(studentId, testSeries.family._id);

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: `You do not have access to ${testSeries.family.name} exams. Please enroll to access this content.`,
        requiresEnrollment: true,
        examFamily: {
          id: testSeries.family._id,
          name: testSeries.family.name
        },
        redirectTo: '/profile'
      });
    }

    // Check if enrollment is active
    if (enrollment.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your ${testSeries.family.name} enrollment is not active. Please check your enrollment status.`,
        enrollmentStatus: enrollment.status,
        enrollment: {
          id: enrollment._id,
          accessLevel: enrollment.accessLevel,
          status: enrollment.status
        },
        redirectTo: '/profile'
      });
    }

    // Add test series and enrollment info to request
    req.testSeries = testSeries;
    req.currentEnrollment = enrollment;
    next();
  } catch (error) {
    console.error('Error in test series access middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking test series access'
    });
  }
};

/**
 * Check premium access level
 * 
 * @description Middleware that checks if the student has premium access level
 * for advanced features and content.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.currentEnrollment - Current enrollment from previous middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * 
 * @returns {void} Calls next() if user has premium access
 * @throws {403} If student doesn't have premium access
 */
const requirePremiumAccess = async (req, res, next) => {
  try {
    // Skip check for admin users
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    const enrollment = req.currentEnrollment;

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'No enrollment found'
      });
    }

    if (enrollment.accessLevel !== 'premium' && enrollment.accessLevel !== 'full') {
      return res.status(403).json({
        success: false,
        message: 'Premium access required for this feature',
        currentAccessLevel: enrollment.accessLevel,
        upgradeRequired: true
      });
    }

    next();
  } catch (error) {
    console.error('Error in premium access middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking premium access'
    });
  }
};

/**
 * Enrollment statistics middleware
 * 
 * @description Adds enrollment statistics to the request object for dashboard
 * and profile components.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const addEnrollmentStats = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return next();
    }

    const studentId = req.user.userId;
    const enrollments = await Enrollment.find({
      student: studentId,
      status: 'active'
    }).populate('examFamily', 'name code');

    const stats = {
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollments.filter(e => e.status === 'active').length,
      basicEnrollments: enrollments.filter(e => e.accessLevel === 'basic').length,
      premiumEnrollments: enrollments.filter(e => e.accessLevel === 'premium').length,
      compulsoryEnrollments: enrollments.filter(e => e.isCompulsory).length
    };

    req.enrollmentStats = stats;
    next();
  } catch (error) {
    console.error('Error in enrollment stats middleware:', error);
    // Don't fail the request, just continue without stats
    next();
  }
};

module.exports = {
  requireEnrollment,
  requireExamFamilyAccess,
  requireTestSeriesAccess,
  requirePremiumAccess,
  addEnrollmentStats
};
