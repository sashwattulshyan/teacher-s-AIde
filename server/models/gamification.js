const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

class GamificationSystem {
  // Point values for different activities
  static POINT_VALUES = {
    COMPLETE_LESSON: 50,
    COMPLETE_ASSIGNMENT: 100,
    COMPLETE_QUIZ: 75,
    DAILY_LOGIN: 10,
    STREAK_BONUS: 5, // Bonus points per day in streak
    PERFECT_SCORE: 25, // Bonus for 100% on assignments/quizzes
    FIRST_TO_COMPLETE: 15, // Bonus for being first in class
    PARTICIPATE_DISCUSSION: 20,
    HELP_OTHERS: 30, // Bonus for helping classmates
    WEEKLY_GOAL: 100, // Bonus for meeting weekly goals
  };

  // Calculate points for completing a lesson
  static async awardLessonCompletion(userId, classroomId, lessonId, score = 100) {
    try {
      const basePoints = this.POINT_VALUES.COMPLETE_LESSON;
      const perfectScoreBonus = score === 100 ? this.POINT_VALUES.PERFECT_SCORE : 0;
      const totalPoints = basePoints + perfectScoreBonus;

      await this.addPoints(userId, classroomId, totalPoints, 'lesson_completion', {
        lessonId,
        score,
        perfectScore: score === 100
      });

      return totalPoints;
    } catch (error) {
      console.error('Error awarding lesson completion points:', error);
      throw error;
    }
  }

  // Calculate points for completing an assignment
  static async awardAssignmentCompletion(userId, classroomId, assignmentId, score = 100) {
    try {
      const basePoints = this.POINT_VALUES.COMPLETE_ASSIGNMENT;
      const perfectScoreBonus = score === 100 ? this.POINT_VALUES.PERFECT_SCORE : 0;
      const totalPoints = basePoints + perfectScoreBonus;

      await this.addPoints(userId, classroomId, totalPoints, 'assignment_completion', {
        assignmentId,
        score,
        perfectScore: score === 100
      });

      return totalPoints;
    } catch (error) {
      console.error('Error awarding assignment completion points:', error);
      throw error;
    }
  }

  // Calculate points for completing a quiz
  static async awardQuizCompletion(userId, classroomId, quizId, score = 100) {
    try {
      const basePoints = this.POINT_VALUES.COMPLETE_QUIZ;
      const perfectScoreBonus = score === 100 ? this.POINT_VALUES.PERFECT_SCORE : 0;
      const totalPoints = basePoints + perfectScoreBonus;

      await this.addPoints(userId, classroomId, totalPoints, 'quiz_completion', {
        quizId,
        score,
        perfectScore: score === 100
      });

      return totalPoints;
    } catch (error) {
      console.error('Error awarding quiz completion points:', error);
      throw error;
    }
  }

  // Award daily login points and update streak
  static async awardDailyLogin(userId, classroomId) {
    try {
      const userStats = await this.getUserStats(userId, classroomId);
      const today = new Date().toDateString();
      const lastLogin = userStats.lastLoginDate;

      // Check if this is a consecutive day
      const isConsecutive = lastLogin && 
        new Date(lastLogin).toDateString() === 
        new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      let newStreak = isConsecutive ? userStats.currentStreak + 1 : 1;
      const streakBonus = newStreak * this.POINT_VALUES.STREAK_BONUS;
      const totalPoints = this.POINT_VALUES.DAILY_LOGIN + streakBonus;

      await this.addPoints(userId, classroomId, totalPoints, 'daily_login', {
        streak: newStreak,
        streakBonus
      });

      // Update user stats
      await this.updateUserStats(userId, classroomId, {
        currentStreak: newStreak,
        longestStreak: Math.max(userStats.longestStreak, newStreak),
        lastLoginDate: today,
        totalLogins: userStats.totalLogins + 1
      });

      return { points: totalPoints, streak: newStreak };
    } catch (error) {
      console.error('Error awarding daily login points:', error);
      throw error;
    }
  }

  // Add points to user's total and log the transaction
  static async addPoints(userId, classroomId, points, activityType, metadata = {}) {
    try {
      const batch = db.batch();
      const timestamp = new Date();

      // Update user's total points in studentProgress
      const studentProgressRef = db.collection('studentProgress').doc(`${userId}_${classroomId}`);
      
      // Check if the document exists first
      const doc = await studentProgressRef.get();
      if (doc.exists) {
        batch.update(studentProgressRef, {
          totalPoints: FieldValue.increment(points),
          lastUpdated: timestamp
        });
      } else {
        // Create the document if it doesn't exist
        batch.set(studentProgressRef, {
          userId,
          classroomId,
          totalPoints: points,
        lastUpdated: timestamp
        });
      }

      // Log the point transaction
      const transactionRef = db.collection('pointTransactions').doc();
      batch.set(transactionRef, {
        userId,
        classroomId,
        points,
        activityType,
        metadata,
        timestamp
      });

      await batch.commit();
    } catch (error) {
      console.error('Error adding points:', error);
      throw error;
    }
  }

  // Get user's gamification stats (now from studentProgress)
  static async getUserStats(userId, classroomId) {
    try {
      const doc = await db.collection('studentProgress').doc(`${userId}_${classroomId}`).get();
      
      if (doc.exists) {
        const data = doc.data();
        return {
          userId: data.userId,
          classroomId: data.classroomId,
          totalPoints: data.totalPoints || 0,
          currentStreak: data.currentStreak || 0,
          longestStreak: data.longestStreak || 0,
          totalLogins: data.totalLogins || 0,
          lessonsCompleted: data.lessonsCompleted || 0,
          assignmentsCompleted: data.assignmentsCompleted || 0,
          quizzesCompleted: data.quizzesCompleted || 0,
          perfectScores: data.perfectScores || 0,
          lastLoginDate: data.lastLoginDate,
          lastUpdated: data.lastUpdated
        };
      } else {
        // Initialize default stats
        const defaultStats = {
          userId,
          classroomId,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalLogins: 0,
          lessonsCompleted: 0,
          assignmentsCompleted: 0,
          quizzesCompleted: 0,
          perfectScores: 0,
          lastLoginDate: null,
          lastUpdated: new Date()
        };

        await db.collection('studentProgress').doc(`${userId}_${classroomId}`).set(defaultStats);
        return defaultStats;
      }
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Update user stats (now in studentProgress)
  static async updateUserStats(userId, classroomId, updates) {
    try {
      const docRef = db.collection('studentProgress').doc(`${userId}_${classroomId}`);
      
      // Check if document exists
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.update({
          ...updates,
          lastUpdated: new Date()
        });
      } else {
        // Create document if it doesn't exist
        await docRef.set({
          userId,
          classroomId,
        ...updates,
        lastUpdated: new Date()
      });
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  // Get leaderboard for a classroom (now from studentProgress)
  static async getLeaderboard(classroomId, limit = 20) {
    try {
      
      // Get all progress documents for the classroom and sort in memory to avoid index issues
      const snapshot = await db.collection('studentProgress')
        .where('classroomId', '==', classroomId)
        .get();

      if (snapshot.empty) {
        return [];
      }

      // Sort by totalPoints in descending order and limit results
      const sortedDocs = snapshot.docs
        .map(doc => ({ id: doc.id, data: doc.data() }))
        .sort((a, b) => (b.data.totalPoints || 0) - (a.data.totalPoints || 0))
        .slice(0, limit);

      const leaderboard = [];
      let rank = 1;

      for (const { id, data } of sortedDocs) {
        
        // Try to get user details from the users collection
        let userName = 'Student';
        let userEmail = '';
        let userRole = 'student';
        
        try {
          const userDoc = await db.collection('users').doc(data.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userRole = userData.role || 'student';
            
            // Skip teachers in leaderboard
            if (userRole === 'teacher') {
              continue;
            }
            
            userName = userData.displayName || userData.firstName || userData.email?.split('@')[0] || 'Student';
            userEmail = userData.email || '';
          }
        } catch (userError) {
          console.warn('Could not fetch user details for:', data.userId, userError);
        }

        const entry = {
          rank,
          userId: data.userId,
          name: userName,
          email: userEmail,
          points: data.totalPoints || 0,
          streak: data.currentStreak || 0,
          lessonsCompleted: data.lessonsCompleted || 0,
          assignmentsCompleted: data.assignmentsCompleted || 0,
          quizzesCompleted: data.quizzesCompleted || 0
        };
        
        leaderboard.push(entry);
        rank++;
      }

      return leaderboard;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  // Get user's progress in a unit (now from studentProgress)
  static async getUserProgress(userId, unitId) {
    try {
      const progressRef = db.collection('studentProgress').doc(`${userId}_${unitId}`);
      const doc = await progressRef.get();

      if (!doc.exists) {
        return {
          courseId: unitId,
          completedLessons: [],
          lessonsCompleted: 0,
          assignmentsCompleted: 0,
          quizzesCompleted: 0,
          totalLessons: 0,
          totalAssignments: 0,
          totalQuizzes: 0,
          progressPercentage: 0,
          averageScore: 0
        };
      }

      const progress = doc.data();
      const totalItems = (progress.totalLessons || 0) + (progress.totalAssignments || 0) + (progress.totalQuizzes || 0);
      const completedItems = (progress.lessonsCompleted || 0) + (progress.assignmentsCompleted || 0) + (progress.quizzesCompleted || 0);
      
      return {
        courseId: unitId,
        completedLessons: progress.completedLessons || [],
        lessonsCompleted: progress.lessonsCompleted || 0,
        assignmentsCompleted: progress.assignmentsCompleted || 0,
        quizzesCompleted: progress.quizzesCompleted || 0,
        totalLessons: progress.totalLessons || 0,
        totalAssignments: progress.totalAssignments || 0,
        totalQuizzes: progress.totalQuizzes || 0,
        progressPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        averageScore: progress.averageScore || 0,
        quizScores: progress.quizScores || {},
        testScores: progress.testScores || {},
        quizAnswers: progress.quizAnswers || {},
        quizSubmitted: progress.quizSubmitted || {},
        assignmentSubmissions: progress.assignmentSubmissions || {},
        videoSubmissions: progress.videoSubmissions || {},
        discussionResponses: progress.discussionResponses || {},
        projectSubmissions: progress.projectSubmissions || {},
        workshopParticipation: progress.workshopParticipation || {},
        grades: progress.grades || {}
      };
    } catch (error) {
      console.error('Error getting user progress:', error);
      throw error;
    }
  }

  // Update user's progress in a unit (now in studentProgress)
  static async updateUserProgress(userId, unitId, updates) {
    try {
      const progressRef = db.collection('studentProgress').doc(`${userId}_${unitId}`);
      
      // Get current progress to merge with updates
      const currentDoc = await progressRef.get();
      let currentData = {};
      
      if (currentDoc.exists) {
        currentData = currentDoc.data();
      }
      
      // Merge updates with current data
      const updatedData = {
        userId,
        courseId: unitId,
        ...currentData,
        ...updates,
        lastUpdated: new Date()
      };
      
      await progressRef.set(updatedData);
    } catch (error) {
      console.error('Error updating user progress:', error);
      throw error;
    }
  }

  // Get weekly goals and achievements
  static async getWeeklyGoals(userId, classroomId) {
    try {
      const userStats = await this.getUserStats(userId, classroomId);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weeklySnapshot = await db.collection('pointTransactions')
        .where('userId', '==', userId)
        .where('classroomId', '==', classroomId)
        .where('timestamp', '>=', weekStart)
        .get();

      let weeklyPoints = 0;
      weeklySnapshot.forEach(doc => {
        weeklyPoints += doc.data().points;
      });

      const goals = [
        {
          id: 'weekly_points',
          title: 'Weekly Points Goal',
          target: 500,
          current: weeklyPoints,
          completed: weeklyPoints >= 500,
          reward: this.POINT_VALUES.WEEKLY_GOAL
        },
        {
          id: 'streak_7_days',
          title: '7-Day Streak',
          target: 7,
          current: userStats.currentStreak,
          completed: userStats.currentStreak >= 7,
          reward: 50
        },
        {
          id: 'complete_5_lessons',
          title: 'Complete 5 Lessons',
          target: 5,
          current: userStats.lessonsCompleted || 0,
          completed: (userStats.lessonsCompleted || 0) >= 5,
          reward: 100
        }
      ];

      return goals;
    } catch (error) {
      console.error('Error getting weekly goals:', error);
      throw error;
    }
  }
}

module.exports = GamificationSystem;
