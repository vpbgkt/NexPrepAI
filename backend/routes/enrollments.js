/**
 * @fileoverview Student Enrollment Routes
 * 
 * This module defines all routes related to student enrollments in the NexPrep platform.
 * It handles enrollment management, access control, and enrollment-related operations.
 * 
 * @module routes/enrollments
 * @requires express
 * @requires ../controllers/enrollmentController
 * @requires ../middleware/verifyToken
 * @author NexPrep Development Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { verifyToken } = require('../middleware/verifyToken');

/**
 * @swagger
 * components:
 *   schemas:
 *     Enrollment:
 *       type: object
 *       required:
 *         - student
 *         - examFamily
 *         - examLevels
 *         - branches
 *       properties:
 *         student:
 *           type: string
 *           description: Student's user ID
 *         examFamily:
 *           type: string
 *           description: Exam family ID
 *         examLevels:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of exam level IDs
 *         branches:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of branch IDs
 *         enrollmentType:
 *           type: string
 *           enum: [self, admin, compulsory, trial]
 *           description: Type of enrollment
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended, expired]
 *           description: Enrollment status
 *         accessLevel:
 *           type: string
 *           enum: [basic, premium, full]
 *           description: Access level
 *         isTrialEnrollment:
 *           type: boolean
 *           description: Whether this is a trial enrollment
 *         trialExpiresAt:
 *           type: string
 *           format: date-time
 *           description: Trial expiration date
 *         preferences:
 *           type: object
 *           properties:
 *             receiveNotifications:
 *               type: boolean
 *             difficultyLevel:
 *               type: string
 *               enum: [beginner, intermediate, advanced, mixed]
 *             preferredLanguage:
 *               type: string
 *               enum: [english, hindi, mixed]
 * 
 *     EnrollmentRequest:
 *       type: object
 *       required:
 *         - examFamily
 *         - examLevels
 *         - branches
 *       properties:
 *         examFamily:
 *           type: string
 *           description: Exam family ID
 *         examLevels:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of exam level IDs
 *         branches:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of branch IDs
 *         accessLevel:
 *           type: string
 *           enum: [basic, premium]
 *           default: basic
 *           description: Desired access level
 *         preferences:
 *           type: object
 *           properties:
 *             receiveNotifications:
 *               type: boolean
 *               default: true
 *             difficultyLevel:
 *               type: string
 *               enum: [beginner, intermediate, advanced, mixed]
 *               default: mixed
 *             preferredLanguage:
 *               type: string
 *               enum: [english, hindi, mixed]
 *               default: english
 */

/**
 * @swagger
 * /api/enrollments/my-enrollments:
 *   get:
 *     summary: Get student's enrollments
 *     description: Retrieve all active enrollments for the authenticated student
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enrollments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Enrollment'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/my-enrollments', verifyToken, enrollmentController.getMyEnrollments);

/**
 * @swagger
 * /api/enrollments/enrollment-options:
 *   get:
 *     summary: Get enrollment options
 *     description: Retrieve available exam families, levels, and branches for enrollment
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enrollment options retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     examFamilies:
 *                       type: array
 *                       items:
 *                         type: object
 *                     examLevels:
 *                       type: object
 *                     branches:
 *                       type: array
 *                       items:
 *                         type: object
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/enrollment-options', verifyToken, enrollmentController.getEnrollmentOptions);

/**
 * @swagger
 * /api/enrollments/enroll:
 *   post:
 *     summary: Create new enrollment
 *     description: Allow student to enroll in exam family with selected levels and branches
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EnrollmentRequest'
 *     responses:
 *       201:
 *         description: Enrollment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Enrollment'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or duplicate enrollment
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/enroll', verifyToken, enrollmentController.createEnrollment);

/**
 * @swagger
 * /api/enrollments/{enrollmentId}:
 *   put:
 *     summary: Update enrollment
 *     description: Update student's enrollment preferences, levels, and branches
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Enrollment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               examLevels:
 *                 type: array
 *                 items:
 *                   type: string
 *               branches:
 *                 type: array
 *                 items:
 *                   type: string
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Enrollment updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Server error
 */
router.put('/:enrollmentId', verifyToken, enrollmentController.updateEnrollment);

/**
 * @swagger
 * /api/enrollments/{enrollmentId}:
 *   delete:
 *     summary: Delete enrollment
 *     description: Deactivate student's enrollment (soft delete)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Enrollment ID
 *     responses:
 *       200:
 *         description: Enrollment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cannot delete compulsory enrollment
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Server error
 */
router.delete('/:enrollmentId', verifyToken, enrollmentController.deleteEnrollment);

/**
 * @swagger
 * /api/enrollments/check-access/{examFamilyId}:
 *   get:
 *     summary: Check access to exam family
 *     description: Check if student has active enrollment and access to specific exam family
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examFamilyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam family ID
 *     responses:
 *       200:
 *         description: Access check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 hasAccess:
 *                   type: boolean
 *                 enrollment:
 *                   type: object
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/check-access/:examFamilyId', verifyToken, enrollmentController.checkAccess);

/**
 * @swagger
 * /api/enrollments/stats:
 *   get:
 *     summary: Get enrollment statistics
 *     description: Retrieve enrollment statistics for student dashboard
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalEnrollments:
 *                       type: number
 *                     activeEnrollments:
 *                       type: number
 *                     trialEnrollments:
 *                       type: number
 *                     premiumEnrollments:
 *                       type: number
 *                     compulsoryEnrollments:
 *                       type: number
 *                     expiringTrials:
 *                       type: number
 *                     examFamilies:
 *                       type: array
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/stats', verifyToken, enrollmentController.getEnrollmentStats);

// Admin routes
/**
 * @swagger
 * /api/enrollments/admin/create-compulsory:
 *   post:
 *     summary: Create compulsory enrollment (Admin)
 *     description: Create compulsory enrollments for all or specific students
 *     tags: [Enrollments - Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - examFamily
 *               - examLevels
 *               - branches
 *               - compulsoryReason
 *             properties:
 *               examFamily:
 *                 type: string
 *               examLevels:
 *                 type: array
 *                 items:
 *                   type: string
 *               branches:
 *                 type: array
 *                 items:
 *                   type: string
 *               compulsoryReason:
 *                 type: string
 *               targetStudents:
 *                 oneOf:
 *                   - type: string
 *                     enum: [all]
 *                   - type: array
 *                     items:
 *                       type: string
 *     responses:
 *       201:
 *         description: Compulsory enrollments created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.post('/admin/create-compulsory', verifyToken, enrollmentController.createCompulsoryEnrollment);

/**
 * @swagger
 * /api/enrollments/filtered-branches:
 *   post:
 *     summary: Get filtered branches
 *     description: Get branches filtered by exam family and exam levels
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               examFamily:
 *                 type: string
 *                 description: Exam family ID
 *               examLevels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of exam level IDs
 *     responses:
 *       200:
 *         description: Filtered branches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Branch'
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/filtered-branches', verifyToken, enrollmentController.getFilteredBranches);

// Admin routes (require admin access)
/**
 * @swagger
 * /api/enrollments/admin/all-enrollments:
 *   get:
 *     summary: Get all enrollments (Admin only)
 *     tags: [Admin Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All enrollments retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/admin/all-enrollments', verifyToken, enrollmentController.getAllEnrollments);

/**
 * @swagger
 * /api/enrollments/admin/stats:
 *   get:
 *     summary: Get enrollment statistics (Admin only)
 *     tags: [Admin Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enrollment statistics retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/admin/stats', verifyToken, enrollmentController.getAdminEnrollmentStats);

/**
 * @swagger
 * /api/enrollments/admin/{enrollmentId}/deactivate:
 *   patch:
 *     summary: Deactivate enrollment (Admin only)
 *     tags: [Admin Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Enrollment ID to deactivate
 *     responses:
 *       200:
 *         description: Enrollment deactivated successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Enrollment not found
 */
router.patch('/admin/:enrollmentId/deactivate', verifyToken, enrollmentController.adminDeactivateEnrollment);

module.exports = router;
