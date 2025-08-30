const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Save grade for a submission
router.post('/grade',
  authenticateToken,
  requireRole(['teacher']),
  [
    body('submissionId').isString().notEmpty().withMessage('Submission ID is required'),
    body('grade').isInt({ min: 0, max: 100 }).withMessage('Grade must be between 0 and 100'),
    body('feedback').optional().isString().withMessage('Feedback must be a string'),
    body('lessonType').isString().notEmpty().withMessage('Lesson type is required'),
    body('lessonIndex').isInt({ min: 0 }).withMessage('Lesson index must be a non-negative integer'),
    body('studentId').isString().notEmpty().withMessage('Student ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { submissionId, grade, feedback, lessonType, lessonIndex, studentId, gradeScale } = req.body;
      const teacherId = req.user.uid;

      // Validate that the teacher has access to this student's work
      // In a real application, you'd check if the teacher teaches this student
      
      const { db } = require('../config/firebase');
      
      // Create or update the grade record
      const gradeData = {
        submissionId,
        studentId,
        teacherId,
        lessonType,
        lessonIndex,
        grade: parseInt(grade),
        gradeScale: parseInt(gradeScale) || 100,
        feedback: feedback || '',
        gradedAt: new Date(),
        updatedAt: new Date()
      };

      // Save to Firestore
      const gradeRef = db.collection('grades').doc(submissionId);
      await gradeRef.set(gradeData, { merge: true });

      // Also update the student's progress to include the grade
      const progressRef = db.collection('studentProgress').doc(`${studentId}_${req.body.unitId || 'unknown'}`);
      const progressDoc = await progressRef.get();
      
      if (progressDoc.exists) {
        const progressData = progressDoc.data();
        const grades = progressData.grades || {};
        grades[`${lessonType}_${lessonIndex}`] = {
          grade: parseInt(grade),
          gradeScale: parseInt(gradeScale) || 100,
          feedback: feedback || '',
          gradedAt: new Date(),
          teacherId
        };
        
        await progressRef.update({
          grades,
          lastUpdated: new Date()
        });
      }

      res.json({
        success: true,
        message: 'Grade saved successfully',
        grade: gradeData
      });

    } catch (error) {
      console.error('Error saving grade:', error);
      res.status(500).json({
        error: 'Failed to save grade',
        message: error.message || 'Internal server error'
      });
    }
  }
);

// Get grades for a student
router.get('/student/:studentId',
  authenticateToken,
  requireRole(['teacher']),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const { db } = require('../config/firebase');

      // Get all grades for this student
      const gradesQuery = await db.collection('grades')
        .where('studentId', '==', studentId)
        .orderBy('gradedAt', 'desc')
        .get();

      const grades = gradesQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json({
        success: true,
        grades
      });

    } catch (error) {
      console.error('Error fetching grades:', error);
      res.status(500).json({
        error: 'Failed to fetch grades',
        message: error.message || 'Internal server error'
      });
    }
  }
);

// Get grades for a specific lesson
router.get('/lesson/:unitId/:lessonIndex',
  authenticateToken,
  requireRole(['teacher']),
  async (req, res) => {
    try {
      const { unitId, lessonIndex } = req.params;
      const { db } = require('../config/firebase');

      // Get all student progress for this unit
      const progressQuery = await db.collection('studentProgress')
        .where('courseId', '==', unitId)
        .get();

      const lessonGrades = [];
      
      progressQuery.docs.forEach(doc => {
        const progressData = doc.data();
        const grades = progressData.grades || {};
        const lessonGrade = grades[`*_${lessonIndex}`]; // Match any lesson type
        
        if (lessonGrade) {
          lessonGrades.push({
            studentId: progressData.studentId,
            grade: lessonGrade.grade,
            feedback: lessonGrade.feedback,
            gradedAt: lessonGrade.gradedAt,
            teacherId: lessonGrade.teacherId
          });
        }
      });

      res.json({
        success: true,
        grades: lessonGrades
      });

    } catch (error) {
      console.error('Error fetching lesson grades:', error);
      res.status(500).json({
        error: 'Failed to fetch lesson grades',
        message: error.message || 'Internal server error'
      });
    }
  }
);

module.exports = router;
