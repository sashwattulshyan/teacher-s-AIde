const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all courses for a classroom
router.get('/classroom/:classroomId', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;
    
    // Check if user has access to this classroom
    const classroomDoc = await db.collection('classrooms').doc(classroomId).get();
    
    if (!classroomDoc.exists) {
      return res.status(404).json({
        error: 'Classroom not found',
        message: 'Classroom does not exist'
      });
    }
    
    const classroomData = classroomDoc.data();
    const hasAccess = classroomData.teacherId === req.user.uid || 
                     classroomData.studentIds?.includes(req.user.uid);
    
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this classroom'
      });
    }
    
    // Get courses for this classroom
    const coursesSnapshot = await db.collection('courses')
      .where('classroomId', '==', classroomId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const courses = [];
    coursesSnapshot.forEach(doc => {
      courses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching courses'
    });
  }
});

// Get a specific course by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const courseDoc = await db.collection('courses').doc(req.params.id).get();
    
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
    
    res.json({
      id: courseDoc.id,
      ...courseData
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching course'
    });
  }
});

// Create a new course (teachers only)
router.post('/',
  authenticateToken,
  requireRole(['teacher']),
  [
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('description').isString().notEmpty().withMessage('Description is required'),
    body('classroomId').isString().notEmpty().withMessage('ClassroomId is required'),
    body('content').optional().isArray(),
    body('objectives').optional().isArray(),
    body('prerequisites').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { title, description, classroomId, content, objectives, prerequisites } = req.body;
    
    if (!title || !description || !classroomId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Title, description, and classroomId are required'
      });
    }
    
    // Check if user is the teacher of this classroom
    const classroomDoc = await db.collection('classrooms').doc(classroomId).get();
    
    if (!classroomDoc.exists) {
      return res.status(404).json({
        error: 'Classroom not found',
        message: 'Classroom does not exist'
      });
    }
    
    const classroomData = classroomDoc.data();
    
    if (classroomData.teacherId !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the classroom teacher can create courses'
      });
    }
    
    const courseData = {
      title,
      description,
      classroomId,
      content: content || [],
      objectives: objectives || [],
      prerequisites: prerequisites || [],
      teacherId: req.user.uid,
      aiGenerated: false, // Track if unit was AI-generated
      generationMetadata: null, // Will contain AI generation details
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('courses').add(courseData);
    
    res.status(201).json({
      id: docRef.id,
      ...courseData
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error creating course'
    });
  }
  }
);

// Update a course (teachers only)
router.put('/:id',
  authenticateToken,
  requireRole(['teacher']),
  [
    body('title').optional().isString(),
    body('description').optional().isString(),
    body('content').optional().isArray(),
    body('objectives').optional().isArray(),
    body('prerequisites').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { title, description, content, objectives, prerequisites } = req.body;
    
    const courseDoc = await db.collection('courses').doc(req.params.id).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'Course does not exist'
      });
    }
    
    const courseData = courseDoc.data();
    
    // Check if the user is the teacher of this course
    if (courseData.teacherId !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the course teacher can update this course'
      });
    }
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (objectives !== undefined) updateData.objectives = objectives;
    if (prerequisites !== undefined) updateData.prerequisites = prerequisites;
    
    await db.collection('courses').doc(req.params.id).update(updateData);
    
    res.json({
      message: 'Course updated successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error updating course'
    });
  }
  }
);

// Delete a course (teachers only)
router.delete('/:id', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const courseDoc = await db.collection('courses').doc(req.params.id).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'Course does not exist'
      });
    }
    
    const courseData = courseDoc.data();
    
    // Check if the user is the teacher of this course
    if (courseData.teacherId !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the course teacher can delete this course'
      });
    }
    
    // Delete the course
    await db.collection('courses').doc(req.params.id).delete();
    
    res.json({
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error deleting course'
    });
  }
});

// Get course analytics (teachers only)
router.get('/:id/analytics', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const courseDoc = await db.collection('courses').doc(req.params.id).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'Course does not exist'
      });
    }
    
    const courseData = courseDoc.data();
    
    // Check if the user is the teacher of this course
    if (courseData.teacherId !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the course teacher can view analytics'
      });
    }
    
    // Get student progress for this course
    const progressSnapshot = await db.collection('studentProgress')
      .where('courseId', '==', req.params.id)
      .get();
    
    const analytics = {
      totalStudents: 0,
      completedStudents: 0,
      averageProgress: 0,
      studentProgress: []
    };
    
    let totalProgress = 0;
    const students = [];
    
    progressSnapshot.forEach(doc => {
      const progressData = doc.data();
      const progress = progressData.completedLessons?.length || 0;
      const totalLessons = courseData.content?.length || 0;
      const percentage = totalLessons > 0 ? (progress / totalLessons) * 100 : 0;
      
      students.push({
        studentId: progressData.userId,
        progress: percentage,
        completedLessons: progressData.completedLessons || []
      });
      
      totalProgress += percentage;
      
      if (percentage === 100) {
        analytics.completedStudents++;
      }
    });
    
    analytics.totalStudents = students.length;
    analytics.averageProgress = students.length > 0 ? totalProgress / students.length : 0;
    analytics.studentProgress = students;
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching course analytics'
    });
  }
});

// Update grade scale for a specific lesson
router.put('/:courseId/lessons/:lessonIndex/grade-scale',
  authenticateToken,
  requireRole(['teacher']),
  [
    body('gradeScale').isInt({ min: 1, max: 1000 }).withMessage('Grade scale must be between 1 and 1000')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { courseId, lessonIndex } = req.params;
      const { gradeScale } = req.body;
      const teacherId = req.user.uid;

      // Get the course
      const courseDoc = await db.collection('courses').doc(courseId).get();
      
      if (!courseDoc.exists) {
        return res.status(404).json({
          error: 'Course not found',
          message: 'Course does not exist'
        });
      }

      const courseData = courseDoc.data();
      
      // Check if user is the teacher of this course's classroom
      const classroomDoc = await db.collection('classrooms').doc(courseData.classroomId).get();
      
      if (!classroomDoc.exists) {
        return res.status(404).json({
          error: 'Classroom not found',
          message: 'Course classroom does not exist'
        });
      }

      const classroomData = classroomDoc.data();
      if (classroomData.teacherId !== teacherId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only the classroom teacher can update grade scales'
        });
      }

      // Update the lesson's grade scale
      const lessons = courseData.lessons || [];
      const lessonIndexNum = parseInt(lessonIndex);
      
      if (lessonIndexNum < 0 || lessonIndexNum >= lessons.length) {
        return res.status(400).json({
          error: 'Invalid lesson index',
          message: 'Lesson index is out of range'
        });
      }

      lessons[lessonIndexNum].gradeScale = parseInt(gradeScale);

      // Update the course
      await db.collection('courses').doc(courseId).update({
        lessons: lessons,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Grade scale updated successfully',
        gradeScale: parseInt(gradeScale)
      });

    } catch (error) {
      console.error('Error updating grade scale:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error updating grade scale'
      });
    }
  }
);

module.exports = router;
