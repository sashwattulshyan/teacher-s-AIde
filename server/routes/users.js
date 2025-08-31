const express = require('express');
const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Delete user account and all associated data
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get user data to determine role
    const userDoc = await db.collection('users').doc(userId).get();
    let userRole = 'student'; // Default role
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      userRole = userData.role;
    } else {
      // User document not found, proceeding with cleanup anyway
    }

    // Deleting account for user role

    // Initialize variables for tracking deletions
    let teacherClassroomsDeleted = 0;
    let studentClassroomsUpdated = 0;

    // Delete user-related data based on role
    if (userRole === 'teacher') {
      // For teachers: delete classrooms they created
      const classroomsQuery = db.collection('classrooms').where('teacherId', '==', userId);
      const classroomsSnapshot = await classroomsQuery.get();
      teacherClassroomsDeleted = classroomsSnapshot.size;
      
      const classroomDeletions = classroomsSnapshot.docs.map(async (classroomDoc) => {
        const classroomId = classroomDoc.id;
        
        // Delete courses/units in this classroom
        const coursesQuery = db.collection('courses').where('classroomId', '==', classroomId);
        const coursesSnapshot = await coursesQuery.get();
        
        const courseDeletions = coursesSnapshot.docs.map(courseDoc => courseDoc.ref.delete());
        await Promise.all(courseDeletions);
        
        // Delete classroom
        return classroomDoc.ref.delete();
      });
      
      await Promise.all(classroomDeletions);
    }

    // For all users: delete student progress and transactions
    const progressQuery = db.collection('studentProgress').where('userId', '==', userId);
    const progressSnapshot = await progressQuery.get();
    const progressDeletions = progressSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(progressDeletions);

    const transactionsQuery = db.collection('pointTransactions').where('userId', '==', userId);
    const transactionsSnapshot = await transactionsQuery.get();
    const transactionDeletions = transactionsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(transactionDeletions);

    // Remove user from classrooms they're enrolled in (for students)
    if (userRole === 'student') {
      const classroomsQuery = db.collection('classrooms').where('studentIds', 'array-contains', userId);
      const classroomsSnapshot = await classroomsQuery.get();
      studentClassroomsUpdated = classroomsSnapshot.size;
      
      const classroomUpdates = classroomsSnapshot.docs.map(async (classroomDoc) => {
        const studentIds = classroomDoc.data().studentIds.filter(id => id !== userId);
        return classroomDoc.ref.update({ studentIds });
      });
      
      await Promise.all(classroomUpdates);
    }

    // Finally, delete the user document (if it exists)
    if (userDoc.exists) {
      await db.collection('users').doc(userId).delete();
    } else {
      // User document already deleted or never existed
    }

    // Try to delete the Firebase Auth user from server side as well
    try {
      await admin.auth().deleteUser(userId);
    } catch (authError) {
      // Server-side Firebase Auth deletion failed - this is okay, client will handle it
    }

    res.json({
      message: 'Account deleted successfully',
      deletedData: {
        userDocument: userDoc.exists,
        studentProgress: progressSnapshot.size,
        pointTransactions: transactionsSnapshot.size,
        teacherClassroomsDeleted,
        studentClassroomsUpdated
      }
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete account',
      details: error.message
    });
  }
});

// Get all users (teachers only)
router.get('/', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = db.collection('users');
    
    // Filter by role if specified
    if (role) {
      query = query.where('role', '==', role);
    }
    
    const snapshot = await query.limit(parseInt(limit)).offset(offset).get();
    const users = [];
    
    snapshot.forEach(doc => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        createdAt: userData.createdAt
      });
    });
    
    // If search is provided, filter results
    let filteredUsers = users;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = users.filter(user => 
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({
      users: filteredUsers,
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredUsers.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching users'
    });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }
    
    const userData = userDoc.data();
    
    // Only allow users to view their own profile or teachers to view any profile
    if (req.params.id !== req.user.uid && req.userRole !== 'teacher') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own profile'
      });
    }
    
    res.json({
      id: userDoc.id,
      uid: userDoc.id,
      ...userData
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching user'
    });
  }
});

// Get user analytics (teachers only)
router.get('/:id/analytics', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }
    
    const userData = userDoc.data();
    
    // Get user's progress across all courses
    const progressSnapshot = await db.collection('studentProgress')
      .where('userId', '==', req.params.id)
      .get();
    
    const analytics = {
      userId: req.params.id,
      displayName: userData.displayName,
      email: userData.email,
      role: userData.role,
      totalCourses: 0,
      completedCourses: 0,
      averageProgress: 0,
      courseProgress: []
    };
    
    let totalProgress = 0;
    const courses = [];
    
    for (const progressDoc of progressSnapshot.docs) {
      const progressData = progressDoc.data();
      
      // Get course details
      const courseDoc = await db.collection('courses').doc(progressData.courseId).get();
      
      if (courseDoc.exists) {
        const courseData = courseDoc.data();
        const completedLessons = progressData.completedLessons?.length || 0;
        const totalLessons = courseData.content?.length || 0;
        const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
        
        courses.push({
          courseId: progressData.courseId,
          courseTitle: courseData.title,
          progress,
          completedLessons,
          totalLessons,
          lastUpdated: progressData.lastUpdated
        });
        
        totalProgress += progress;
        
        if (progress === 100) {
          analytics.completedCourses++;
        }
      }
    }
    
    analytics.totalCourses = courses.length;
    analytics.averageProgress = courses.length > 0 ? totalProgress / courses.length : 0;
    analytics.courseProgress = courses;
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching user analytics'
    });
  }
});

// Update user role (teachers only)
router.put('/:id/role',
  authenticateToken,
  requireRole(['teacher']),
  [body('role').isIn(['student', 'teacher']).withMessage('Role must be either student or teacher')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { role } = req.body;
      
      const userDoc = await db.collection('users').doc(req.params.id).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User does not exist'
        });
      }
      
      await db.collection('users').doc(req.params.id).update({
        role,
        updatedAt: new Date()
      });
      
      res.json({
        message: 'User role updated successfully',
        userId: req.params.id,
        role
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error updating user role'
      });
    }
});

// Update user profile
router.put('/profile',
  authenticateToken,
  [
    body('displayName').optional().isString(),
    body('role').optional().isIn(['student', 'teacher']),
    body('preferences').optional().isObject()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { displayName, role, preferences } = req.body;
      
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User does not exist'
        });
      }
      
      const updatedData = {};
      if (displayName) {
        updatedData.displayName = displayName;
      }
      if (role) {
        updatedData.role = role;
      }
      if (preferences) {
        updatedData.preferences = preferences;
      }
      updatedData.updatedAt = new Date();
      
      await db.collection('users').doc(req.user.uid).update(updatedData);
      
      res.json({
        message: 'User profile updated successfully',
        userId: req.user.uid,
        ...updatedData
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error updating user profile'
      });
    }
});

// Get user's enrolled classrooms
router.get('/:id/classrooms', authenticateToken, async (req, res) => {
  try {
    // Only allow users to view their own classrooms or teachers to view any user's classrooms
    if (req.params.id !== req.user.uid && req.userRole !== 'teacher') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own classrooms'
      });
    }
    
    const userDoc = await db.collection('users').doc(req.params.id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }
    
    const userData = userDoc.data();
    
    let query;
    if (userData.role === 'teacher') {
      // Teachers see classrooms they created
      query = db.collection('classrooms').where('teacherId', '==', req.params.id);
    } else {
      // Students see classrooms they joined
      query = db.collection('classrooms').where('studentIds', 'array-contains', req.params.id);
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
    console.error('Error fetching user classrooms:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching user classrooms'
    });
  }
});

module.exports = router;
