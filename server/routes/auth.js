const express = require('express');
const { db, auth } = require('../config/firebase');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile does not exist'
      });
    }

    const userData = userDoc.data();
    res.json({
      uid: req.user.uid,
      email: req.user.email,
      ...userData
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, role, preferences } = req.body;
    
    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (role !== undefined) updateData.role = role;
    if (preferences !== undefined) updateData.preferences = preferences;
    
    await db.collection('users').doc(req.user.uid).update(updateData);
    
    res.json({
      message: 'Profile updated successfully',
      uid: req.user.uid
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error updating user profile'
    });
  }
});

// Create user profile (called after Firebase Auth registration)
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, role, preferences } = req.body;
    
    const userData = {
      email: req.user.email,
      displayName: displayName || req.user.displayName || req.user.email,
      role: role || 'student',
      preferences: preferences || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('users').doc(req.user.uid).set(userData);
    
    res.status(201).json({
      message: 'User profile created successfully',
      uid: req.user.uid,
      ...userData
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error creating user profile'
    });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    // Delete user data from Firestore
    await db.collection('users').doc(req.user.uid).delete();
    
    // Delete user from Firebase Auth
    await auth.deleteUser(req.user.uid);
    
    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error deleting user account'
    });
  }
});

// Register a new user
router.post('/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['student', 'teacher']).withMessage('Role must be student or teacher')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, role } = req.body;
    try {
      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        emailVerified: false,
        disabled: false
      });
      // Create user profile in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email,
        role: role || 'student',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      // Optionally, send verification email (handled on frontend usually)
      res.status(201).json({
        message: 'User registered successfully',
        uid: userRecord.uid,
        email,
        role: role || 'student'
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'Error registering user'
      });
    }
  }
);

// Login user (email/password)
router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
      // Firebase Admin SDK does not support password login directly
      // This should be handled on the frontend with Firebase JS SDK
      // Here, we return an error or a message to use frontend login
      return res.status(400).json({
        error: 'Not supported',
        message: 'Login with email/password should be handled on the frontend using Firebase JS SDK.'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'Error logging in'
      });
    }
  }
);

// Password reset (send email)
router.post('/password-reset',
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;
    try {
      // Firebase Admin SDK does not send password reset emails
      // This should be handled on the frontend with Firebase JS SDK
      return res.status(400).json({
        error: 'Not supported',
        message: 'Password reset should be handled on the frontend using Firebase JS SDK.'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'Error sending password reset email'
      });
    }
  }
);

// Email verification (send email)
router.post('/email-verification',
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email } = req.body;
    try {
      // Firebase Admin SDK does not send verification emails
      // This should be handled on the frontend with Firebase JS SDK
      return res.status(400).json({
        error: 'Not supported',
        message: 'Email verification should be handled on the frontend using Firebase JS SDK.'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'Error sending verification email'
      });
    }
  }
);

// Token refresh (not supported by Admin SDK)
router.post('/token-refresh', async (req, res) => {
  // Firebase Admin SDK does not support token refresh
  // This should be handled on the frontend with Firebase JS SDK
  return res.status(400).json({
    error: 'Not supported',
    message: 'Token refresh should be handled on the frontend using Firebase JS SDK.'
  });
});

module.exports = router;
