const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all lessons for a course
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Get the course to check access
    const courseDoc = await db.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'Course does not exist'
      });
    }
    
    const courseData = courseDoc.data();
    
    // Check if user has access to this course's classroom
    const classroomDoc = await db.collection('classrooms').doc(courseData.classroomId).get();
    
    if (!classroomDoc.exists) {
      return res.status(404).json({
        error: 'Classroom not found',
        message: 'Course classroom does not exist'
      });
    }
    
    const classroomData = classroomDoc.data();
    const hasAccess = classroomData.teacherId === req.user.uid || 
                     classroomData.studentIds?.includes(req.user.uid);
    
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this course'
      });
    }
    
    // Return the course content as lessons
    const lessons = courseData.content?.map((lesson, index) => ({
      id: index,
      courseId,
      ...lesson
    })) || [];
    
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching lessons'
    });
  }
});

// Get student progress for a course
router.get('/:courseId/progress', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Get the course
    const courseDoc = await db.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'Course does not exist'
      });
    }
    
    const courseData = courseDoc.data();
    
    // Check if user has access to this course's classroom
    const classroomDoc = await db.collection('classrooms').doc(courseData.classroomId).get();
    
    if (!classroomDoc.exists) {
      return res.status(404).json({
        error: 'Classroom not found',
        message: 'Course classroom does not exist'
      });
    }
    
    const classroomData = classroomDoc.data();
    const hasAccess = classroomData.studentIds?.includes(req.user.uid);
    
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this course'
      });
    }
    
    // Get student progress
    const progressDocId = `${req.user.uid}_${courseId}`;
    const progressDoc = await db.collection('studentProgress').doc(progressDocId).get();
    
    const completedLessons = progressDoc.exists ? progressDoc.data().completedLessons || [] : [];
    const totalLessons = courseData.content?.length || 0;
    const progress = totalLessons > 0 ? (completedLessons.length / totalLessons) * 100 : 0;
    
    res.json({
      courseId,
      studentId: req.user.uid,
      completedLessons,
      totalLessons,
      progress,
      lastUpdated: progressDoc.exists ? progressDoc.data().lastUpdated : null
    });
  } catch (error) {
    console.error('Error fetching lesson progress:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching lesson progress'
    });
  }
});

// Get a specific lesson by ID
router.get('/:courseId/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    
    // Get the course
    const courseDoc = await db.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'Course does not exist'
      });
    }
    
    const courseData = courseDoc.data();
    
    // Check if user has access to this course's classroom
    const classroomDoc = await db.collection('classrooms').doc(courseData.classroomId).get();
    
    if (!classroomDoc.exists) {
      return res.status(404).json({
        error: 'Classroom not found',
        message: 'Course classroom does not exist'
      });
    }
    
    const classroomData = classroomDoc.data();
    const hasAccess = classroomData.teacherId === req.user.uid || 
                     classroomData.studentIds?.includes(req.user.uid);
    
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this course'
      });
    }
    
    // Get the specific lesson
    const lessonIndex = parseInt(lessonId);
    const lesson = courseData.content?.[lessonIndex];
    
    if (!lesson) {
      return res.status(404).json({
        error: 'Lesson not found',
        message: 'Lesson does not exist'
      });
    }
    
    res.json({
      id: lessonIndex,
      courseId,
      ...lesson
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching lesson'
    });
  }
});

// Update student progress for a lesson
router.post('/:courseId/:lessonId/progress',
  authenticateToken,
  requireRole(['student']),
  [body('completed').isBoolean().withMessage('Completed must be a boolean')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { courseId, lessonId } = req.params;
      const { completed } = req.body;
      
      // Get the course
      const courseDoc = await db.collection('courses').doc(courseId).get();
      
      if (!courseDoc.exists) {
        return res.status(404).json({
          error: 'Course not found',
          message: 'Course does not exist'
        });
      }
      
      const courseData = courseDoc.data();
      
      // Check if user has access to this course's classroom
      const classroomDoc = await db.collection('classrooms').doc(courseData.classroomId).get();
      
      if (!classroomDoc.exists) {
        return res.status(404).json({
          error: 'Classroom not found',
          message: 'Course classroom does not exist'
        });
      }
      
      const classroomData = classroomDoc.data();
      const hasAccess = classroomData.studentIds?.includes(req.user.uid);
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this course'
        });
      }
      
      // Update or create student progress
      const progressDocId = `${req.user.uid}_${courseId}`;
      const progressDoc = await db.collection('studentProgress').doc(progressDocId).get();
      
      let completedLessons = [];
      if (progressDoc.exists) {
        completedLessons = progressDoc.data().completedLessons || [];
      }
      
      const lessonIndex = parseInt(lessonId);
      
      if (completed && !completedLessons.includes(lessonIndex)) {
        completedLessons.push(lessonIndex);
      } else if (!completed && completedLessons.includes(lessonIndex)) {
        completedLessons = completedLessons.filter(id => id !== lessonIndex);
      }
      
      await db.collection('studentProgress').doc(progressDocId).set({
        userId: req.user.uid,
        courseId,
        completedLessons,
        lastUpdated: new Date()
      }, { merge: true });
      
      res.json({
        message: 'Progress updated successfully',
        completedLessons
      });
    } catch (error) {
      console.error('Error updating lesson progress:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error updating lesson progress'
      });
    }
  }
);

// Clean up invalid lesson completions when lessons are deleted
router.post('/:courseId/cleanup-progress',
  authenticateToken,
  requireRole(['teacher']),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      
      // Get the course to check current lesson structure
      const courseDoc = await db.collection('courses').doc(courseId).get();
      
      if (!courseDoc.exists) {
        return res.status(404).json({
          error: 'Course not found',
          message: 'Course does not exist'
        });
      }
      
      const courseData = courseDoc.data();
      const currentLessons = courseData.lessons || [];
      const maxLessonIndex = currentLessons.length - 1;
      
      // Get all student progress for this course
      const progressQuery = db.collection('studentProgress').where('courseId', '==', courseId);
      const progressSnapshot = await progressQuery.get();
      
      let cleanedCount = 0;
      const cleanupPromises = progressSnapshot.docs.map(async (progressDoc) => {
        const progressData = progressDoc.data();
        const completedLessons = progressData.completedLessons || [];
        
        // Filter out lesson indices that no longer exist
        const validCompletedLessons = completedLessons.filter(lessonIndex => 
          lessonIndex <= maxLessonIndex
        );
        
        // Only update if there were invalid completions
        if (validCompletedLessons.length !== completedLessons.length) {
          await progressDoc.ref.update({
            completedLessons: validCompletedLessons,
            lessonsCompleted: validCompletedLessons.length,
            lastUpdated: new Date()
          });
          cleanedCount++;
        }
      });
      
      await Promise.all(cleanupPromises);
      
      res.json({
        message: 'Student progress cleaned up successfully',
        cleanedProgressCount: cleanedCount,
        currentLessonCount: currentLessons.length
      });
    } catch (error) {
      console.error('Error cleaning up student progress:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error cleaning up student progress'
      });
    }
  }
);

module.exports = router;
