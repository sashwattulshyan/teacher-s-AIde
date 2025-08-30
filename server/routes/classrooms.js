const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all classrooms for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userRole } = req;
    
    let query;
    if (userRole === 'teacher') {
      // Teachers see classrooms they created
      query = db.collection('classrooms').where('teacherId', '==', req.user.uid);
    } else {
      // Students see classrooms they joined
      query = db.collection('classrooms').where('studentIds', 'array-contains', req.user.uid);
    }
    
    const snapshot = await query.get();
    const classrooms = [];
    
    snapshot.forEach(doc => {
      classrooms.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(classrooms);
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching classrooms'
    });
  }
});

// Get a specific classroom by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const classroomDoc = await db.collection('classrooms').doc(req.params.id).get();
    
    if (!classroomDoc.exists) {
      return res.status(404).json({
        error: 'Classroom not found',
        message: 'Classroom does not exist'
      });
    }
    
    const classroomData = classroomDoc.data();
    
    // Check if user has access to this classroom
    const hasAccess = classroomData.teacherId === req.user.uid || 
                     classroomData.studentIds?.includes(req.user.uid);
    
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this classroom'
      });
    }
    
    res.json({
      id: classroomDoc.id,
      ...classroomData
    });
  } catch (error) {
    console.error('Error fetching classroom:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching classroom'
    });
  }
});

// Create a new classroom (teachers only)
router.post('/',
  authenticateToken,
  requireRole(['teacher']),
  [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('description').isString().notEmpty().withMessage('Description is required'),
    body('subject').optional().isString(),
    body('gradeLevel').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { name, description, subject, gradeLevel } = req.body;
    
    // Generate a unique join code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const classroomData = {
      name,
      description,
      subject: subject || '',
      gradeLevel: gradeLevel || '',
      joinCode,
      teacherId: req.user.uid,
      studentIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('classrooms').add(classroomData);
    
    res.status(201).json({
      id: docRef.id,
      ...classroomData
    });
  } catch (error) {
    console.error('Error creating classroom:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error creating classroom'
    });
  }
  }
);

// Update a classroom (teachers only)
router.put('/:id',
  authenticateToken,
  requireRole(['teacher']),
  [
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('subject').optional().isString(),
    body('gradeLevel').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { name, description, subject, gradeLevel } = req.body;
    
    const classroomDoc = await db.collection('classrooms').doc(req.params.id).get();
    
    if (!classroomDoc.exists) {
      return res.status(404).json({
        error: 'Classroom not found',
        message: 'Classroom does not exist'
      });
    }
    
    const classroomData = classroomDoc.data();
    
    // Check if the user is the teacher of this classroom
    if (classroomData.teacherId !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the classroom teacher can update this classroom'
      });
    }
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (subject !== undefined) updateData.subject = subject;
    if (gradeLevel !== undefined) updateData.gradeLevel = gradeLevel;
    
    await db.collection('classrooms').doc(req.params.id).update(updateData);
    
    res.json({
      message: 'Classroom updated successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error updating classroom:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error updating classroom'
    });
  }
  }
);

// Delete a classroom (teachers only)
router.delete('/:id', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const classroomDoc = await db.collection('classrooms').doc(req.params.id).get();
    
    if (!classroomDoc.exists) {
      return res.status(404).json({
        error: 'Classroom not found',
        message: 'Classroom does not exist'
      });
    }
    
    const classroomData = classroomDoc.data();
    
    // Check if the user is the teacher of this classroom
    if (classroomData.teacherId !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the classroom teacher can delete this classroom'
      });
    }
    
    // Delete the classroom and all its subcollections
    await db.collection('classrooms').doc(req.params.id).delete();
    
    res.json({
      message: 'Classroom deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting classroom:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error deleting classroom'
    });
  }
});

// Join a classroom using class code (students only)
router.post('/join',
  authenticateToken,
  requireRole(['student']),
  [body('joinCode').isString().notEmpty().withMessage('Join code is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { joinCode } = req.body;
    
    // Find classroom by join code
    const snapshot = await db.collection('classrooms')
      .where('joinCode', '==', joinCode)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({
        error: 'Classroom not found',
        message: 'Invalid class code'
      });
    }
    
    const classroomDoc = snapshot.docs[0];
    const classroomData = classroomDoc.data();
    
    // Check if student is already in the classroom
    if (classroomData.studentIds?.includes(req.user.uid)) {
      return res.status(400).json({
        error: 'Already joined',
        message: 'You are already a member of this classroom'
      });
    }
    
    // Add student to classroom
    const updatedStudentIds = [...(classroomData.studentIds || []), req.user.uid];
    
    // Initialize user stats for this classroom
    const { GamificationSystem } = require('../models/gamification');
    await GamificationSystem.getUserStats(req.user.uid, classroomDoc.id);
    
    await db.collection('classrooms').doc(classroomDoc.id).update({
      studentIds: updatedStudentIds,
      updatedAt: new Date()
    });
    
    res.json({
      message: 'Successfully joined classroom',
      classroomId: classroomDoc.id,
      classroomName: classroomData.name
    });
  } catch (error) {
    console.error('Error joining classroom:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error joining classroom'
    });
  }
  }
);

// Leave a classroom (students only)
router.post('/:id/leave', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const classroomDoc = await db.collection('classrooms').doc(req.params.id).get();
    
    if (!classroomDoc.exists) {
      return res.status(404).json({
        error: 'Classroom not found',
        message: 'Classroom does not exist'
      });
    }
    
    const classroomData = classroomDoc.data();
    
    // Check if student is in the classroom
    if (!classroomData.studentIds?.includes(req.user.uid)) {
      return res.status(400).json({
        error: 'Not a member',
        message: 'You are not a member of this classroom'
      });
    }
    
    // Remove student from classroom
    const updatedStudentIds = classroomData.studentIds.filter(id => id !== req.user.uid);
    
    await db.collection('classrooms').doc(req.params.id).update({
      studentIds: updatedStudentIds,
      updatedAt: new Date()
    });
    
    res.json({
      message: 'Successfully left classroom'
    });
  } catch (error) {
    console.error('Error leaving classroom:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error leaving classroom'
    });
  }
});

module.exports = router;
