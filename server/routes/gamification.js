const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const GamificationSystem = require('../models/gamification');
const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const router = express.Router();

// Test endpoint to verify gamification system is working
router.get('/test', authenticateToken, async (req, res) => {
  try {
    res.json({
      message: 'Gamification system is working',
      user: req.user.uid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error in test endpoint'
    });
  }
});

// Initialize user stats for a classroom
router.post('/init-stats/:classroomId', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user.uid;

    console.log('Initializing stats for user:', userId, 'in classroom:', classroomId);

    const stats = await GamificationSystem.getUserStats(userId, classroomId);
    
    res.json({
      message: 'User stats initialized',
      stats
    });
  } catch (error) {
    console.error('Error initializing user stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error initializing user stats'
    });
  }
});

// Get user's gamification stats for a classroom
router.get('/stats/:classroomId', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { userId } = req.query;
    const targetUserId = userId || req.user.uid; // Use query param if provided, otherwise use authenticated user

    const stats = await GamificationSystem.getUserStats(targetUserId, classroomId);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching user stats'
    });
  }
});

// Get leaderboard for a classroom
router.get('/leaderboard/:classroomId', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const leaderboard = await GamificationSystem.getLeaderboard(classroomId, limit);
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching leaderboard'
    });
  }
});

// Award daily login points
router.post('/daily-login/:classroomId', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user.uid;

    const result = await GamificationSystem.awardDailyLogin(userId, classroomId);
    
    res.json({
      message: 'Daily login points awarded',
      points: result.points,
      streak: result.streak
    });
  } catch (error) {
    console.error('Error awarding daily login points:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error awarding daily login points'
    });
  }
});

// Award lesson completion points
router.post('/lesson-completion', 
  authenticateToken, 
  requireRole(['student']),
  [
    body('classroomId').isString().notEmpty(),
    body('lessonId').isString().notEmpty(),
    body('score').optional().isInt({ min: 0, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { classroomId, lessonId, score = 100 } = req.body;
      const userId = req.user.uid;

      const points = await GamificationSystem.awardLessonCompletion(userId, classroomId, lessonId, score);
      
      // Update user stats
      await GamificationSystem.updateUserStats(userId, classroomId, {
        lessonsCompleted: FieldValue.increment(1),
        perfectScores: score === 100 ? FieldValue.increment(1) : FieldValue.increment(0)
      });

      res.json({
        message: 'Lesson completion points awarded',
        points,
        score,
        perfectScore: score === 100
      });
    } catch (error) {
      console.error('Error awarding lesson completion points:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error awarding lesson completion points'
      });
    }
  }
);

// Award assignment completion points
router.post('/assignment-completion',
  authenticateToken,
  requireRole(['student']),
  [
    body('classroomId').isString().notEmpty(),
    body('assignmentId').isString().notEmpty(),
    body('score').optional().isInt({ min: 0, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { classroomId, assignmentId, score = 100 } = req.body;
      const userId = req.user.uid;

      const points = await GamificationSystem.awardAssignmentCompletion(userId, classroomId, assignmentId, score);
      
      // Update user stats
      await GamificationSystem.updateUserStats(userId, classroomId, {
        assignmentsCompleted: FieldValue.increment(1),
        perfectScores: score === 100 ? FieldValue.increment(1) : FieldValue.increment(0)
      });

      res.json({
        message: 'Assignment completion points awarded',
        points,
        score,
        perfectScore: score === 100
      });
    } catch (error) {
      console.error('Error awarding assignment completion points:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error awarding assignment completion points'
      });
    }
  }
);

// Award quiz completion points
router.post('/quiz-completion',
  authenticateToken,
  requireRole(['student']),
  [
    body('classroomId').isString().notEmpty(),
    body('quizId').isString().notEmpty(),
    body('score').optional().isInt({ min: 0, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { classroomId, quizId, score = 100 } = req.body;
      const userId = req.user.uid;

      const points = await GamificationSystem.awardQuizCompletion(userId, classroomId, quizId, score);
      
      // Update user stats
      await GamificationSystem.updateUserStats(userId, classroomId, {
        quizzesCompleted: FieldValue.increment(1),
        perfectScores: score === 100 ? FieldValue.increment(1) : FieldValue.increment(0)
      });

      res.json({
        message: 'Quiz completion points awarded',
        points,
        score,
        perfectScore: score === 100
      });
    } catch (error) {
      console.error('Error awarding quiz completion points:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error awarding quiz completion points'
      });
    }
  }
);

// Get user's progress in a unit
router.get('/progress/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.query;
    const targetUserId = userId || req.user.uid; // Use query param if provided, otherwise use authenticated user

    const progress = await GamificationSystem.getUserProgress(targetUserId, courseId);
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching user progress'
    });
  }
});

// Update user's progress in a unit
router.put('/progress/:courseId',
  authenticateToken,
  requireRole(['student']),
  [
    body('lessonsCompleted').optional().isInt({ min: 0 }),
    body('assignmentsCompleted').optional().isInt({ min: 0 }),
    body('quizzesCompleted').optional().isInt({ min: 0 }),
    body('totalLessons').optional().isInt({ min: 0 }),
    body('totalAssignments').optional().isInt({ min: 0 }),
    body('totalQuizzes').optional().isInt({ min: 0 }),
    body('averageScore').optional().isFloat({ min: 0, max: 100 }),
    body('completedLessons').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { courseId } = req.params;
      const userId = req.user.uid;
      const updates = req.body;

      await GamificationSystem.updateUserProgress(userId, courseId, updates);
      
      res.json({
        message: 'Progress updated successfully'
      });
    } catch (error) {
      console.error('Error updating user progress:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error updating user progress'
      });
    }
  }
);

// Mark lesson as complete
router.post('/complete-lesson',
  authenticateToken,
  requireRole(['student']),
  [
    body('unitId').isString().notEmpty(),
    body('lessonIndex').isInt({ min: 0 }),
    body('classroomId').isString().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { unitId, lessonIndex, classroomId } = req.body;
      const userId = req.user.uid;

      console.log('Complete lesson request:', { unitId, lessonIndex, classroomId, userId });

      // Step 1: Get current progress
      console.log('Step 1: Getting current progress...');
      const currentProgress = await GamificationSystem.getUserProgress(userId, unitId);
      console.log('Current progress:', currentProgress);
      
      // Step 2: Update completed lessons
      const completedLessons = currentProgress.completedLessons || [];
      if (!completedLessons.includes(lessonIndex)) {
        completedLessons.push(lessonIndex);
      }
      console.log('Updated completed lessons:', completedLessons);

      // Step 3: Update progress
      console.log('Step 2: Updating progress...');
      await GamificationSystem.updateUserProgress(userId, unitId, {
        completedLessons,
        lessonsCompleted: completedLessons.length
      });
      console.log('Progress updated successfully');

      // Step 4: Award points and update stats
      console.log('Step 3: Awarding points and updating stats...');
      try {
        const points = await GamificationSystem.awardLessonCompletion(userId, classroomId, `${unitId}_${lessonIndex}`, 100);
        console.log('Points awarded:', points);
        
        // Update user stats
        await GamificationSystem.updateUserStats(userId, classroomId, {
          lessonsCompleted: FieldValue.increment(1)
        });
        console.log('User stats updated successfully');
      } catch (pointsError) {
        console.error('Error awarding points or updating stats (continuing anyway):', pointsError);
      }

      res.json({
        message: 'Lesson marked as complete',
        completedLessons,
        lessonsCompleted: completedLessons.length
      });
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error marking lesson complete',
        details: error.message
      });
    }
  }
);

// Get weekly goals and achievements
router.get('/weekly-goals/:classroomId', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user.uid;

    const goals = await GamificationSystem.getWeeklyGoals(userId, classroomId);
    
    res.json(goals);
  } catch (error) {
    console.error('Error fetching weekly goals:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching weekly goals'
    });
  }
});

// Get point transaction history
router.get('/transactions/:classroomId', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 50;

    const snapshot = await db.collection('pointTransactions')
      .where('userId', '==', userId)
      .where('classroomId', '==', classroomId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const transactions = [];
    snapshot.forEach(doc => {
      transactions.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      });
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching point transactions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching point transactions'
    });
  }
});

// Get classroom achievements and badges
router.get('/achievements/:classroomId', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user.uid;

    const userStats = await GamificationSystem.getUserStats(userId, classroomId);
    
    // Define achievements based on user stats
    const achievements = [
      {
        id: 'first_lesson',
        title: 'First Steps',
        description: 'Complete your first lesson',
        icon: '🎯',
        unlocked: userStats.lessonsCompleted > 0,
        unlockedAt: userStats.lessonsCompleted > 0 ? userStats.lastUpdated : null
      },
      {
        id: 'streak_7',
        title: 'Week Warrior',
        description: 'Maintain a 7-day login streak',
        icon: '🔥',
        unlocked: userStats.currentStreak >= 7,
        unlockedAt: userStats.currentStreak >= 7 ? userStats.lastUpdated : null
      },
      {
        id: 'streak_30',
        title: 'Monthly Master',
        description: 'Maintain a 30-day login streak',
        icon: '👑',
        unlocked: userStats.longestStreak >= 30,
        unlockedAt: userStats.longestStreak >= 30 ? userStats.lastUpdated : null
      },
      {
        id: 'perfect_score',
        title: 'Perfectionist',
        description: 'Get a perfect score on any assignment or quiz',
        icon: '⭐',
        unlocked: userStats.perfectScores > 0,
        unlockedAt: userStats.perfectScores > 0 ? userStats.lastUpdated : null
      },
      {
        id: 'points_1000',
        title: 'Point Collector',
        description: 'Earn 1,000 total points',
        icon: '💎',
        unlocked: userStats.totalPoints >= 1000,
        unlockedAt: userStats.totalPoints >= 1000 ? userStats.lastUpdated : null
      },
      {
        id: 'points_5000',
        title: 'Point Master',
        description: 'Earn 5,000 total points',
        icon: '🏆',
        unlocked: userStats.totalPoints >= 5000,
        unlockedAt: userStats.totalPoints >= 5000 ? userStats.lastUpdated : null
      }
    ];

    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error fetching achievements'
    });
  }
});

// Award points to a student
router.post('/award-points', authenticateToken, requireRole(['student', 'teacher']), [
  body('classroomId').isString().notEmpty().withMessage('Classroom ID is required'),
  body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer'),
  body('reason').isString().notEmpty().withMessage('Reason is required'),
  body('description').optional().isString().withMessage('Description must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { classroomId, points, reason, description } = req.body;
    const userId = req.user.uid;

    // Award points to the user
    await GamificationSystem.addPoints(classroomId, userId, points, reason, description);

    res.json({ 
      message: 'Points awarded successfully',
      points,
      reason,
      description
    });
  } catch (error) {
    console.error('Error awarding points:', error);
    res.status(500).json({ error: 'Failed to award points' });
  }
});

// Initialize user stats for a classroom (if they don't exist)
router.post('/init-stats/:classroomId', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user.uid;

    // This will create default stats if they don't exist
    const stats = await GamificationSystem.getUserStats(userId, classroomId);
    
    res.json({
      message: 'User stats initialized successfully',
      stats
    });
  } catch (error) {
    console.error('Error initializing user stats:', error);
    res.status(500).json({ error: 'Failed to initialize user stats' });
  }
});

module.exports = router;
