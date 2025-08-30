const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Site-wide stats: total users, classrooms, courses, lessons
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    const classroomsSnap = await db.collection('classrooms').get();
    const coursesSnap = await db.collection('courses').get();
    let totalLessons = 0;
    coursesSnap.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data.content)) totalLessons += data.content.length;
    });
    res.json({
      totalUsers: usersSnap.size,
      totalClassrooms: classroomsSnap.size,
      totalCourses: coursesSnap.size,
      totalLessons
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Most popular courses (by number of students)
router.get('/popular-courses', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const coursesSnap = await db.collection('courses').get();
    const classroomsSnap = await db.collection('classrooms').get();
    // Map classroomId to studentIds
    const classroomMap = {};
    classroomsSnap.forEach(doc => {
      const data = doc.data();
      classroomMap[doc.id] = data.studentIds || [];
    });
    // Count students per course
    const courseStats = [];
    coursesSnap.forEach(doc => {
      const data = doc.data();
      const classroomStudents = classroomMap[data.classroomId] || [];
      courseStats.push({
        id: doc.id,
        title: data.title,
        classroomId: data.classroomId,
        studentCount: classroomStudents.length
      });
    });
    // Sort by studentCount desc
    courseStats.sort((a, b) => b.studentCount - a.studentCount);
    res.json({ popularCourses: courseStats.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;
