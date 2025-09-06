// src/components/TeacherAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import './TeacherAnalytics.css';

import API_CONFIG from '../config/api';

async function getAuthToken() {
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken();
}

const TeacherAnalytics = ({ classroom, onBack }) => {
  const [students, setStudents] = useState([]);
  const [units, setUnits] = useState([]);
  const [studentProgress, setStudentProgress] = useState({});
  const [studentStats, setStudentStats] = useState({});
  const [studentEngagement, setStudentEngagement] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentPage, setCurrentPage] = useState('unit-progress'); // unit-progress, student-details, performance
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('week'); // week, month, semester
  const [filterBy, setFilterBy] = useState('all'); // all, active, struggling, excelling

  useEffect(() => {
    if (!classroom) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch students in this classroom
        const studentsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'student')
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        const allStudents = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter students who are in this classroom
        const classroomStudents = allStudents.filter(student => 
          classroom.studentIds?.includes(student.id)
        );
        
        setStudents(classroomStudents);

        // Fetch units for this classroom
        const unitsQuery = query(
          collection(db, 'courses'),
          where('classroomId', '==', classroom.id)
        );
        
        const unitsSnapshot = await getDocs(unitsQuery);
        const unitsData = unitsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUnits(unitsData);

        // Fetch comprehensive student data
        await fetchComprehensiveStudentData(classroomStudents, classroom.id, unitsData);
        
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classroom]);

  const fetchComprehensiveStudentData = async (studentList, classroomId, unitsList) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      // Fetch leaderboard
      const leaderboardResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/leaderboard/${classroomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        setLeaderboard(leaderboardData);
      }

      // Fetch comprehensive data for each student
      const studentDataPromises = studentList.map(async (student) => {
        try {
          // Fetch student stats for this specific student
          const statsResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/stats/${classroomId}?userId=${student.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          let stats = null;
          if (statsResponse.ok) {
            stats = await statsResponse.json();
            } else {
            console.error(`Failed to fetch stats for student ${student.id}:`, statsResponse.status, statsResponse.statusText);
            // Try to get response text for debugging
            try {
              const errorText = await statsResponse.text();
              console.error(`Stats error response:`, errorText);
            } catch (e) {
              console.error(`Could not read error response`);
            }
          }

          // Fetch progress for each unit for this specific student
          const unitProgressPromises = unitsList.map(async (unit) => {
            try {
              const progressResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/progress/${unit.id}?userId=${student.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (progressResponse.ok) {
                const progress = await progressResponse.json();
                return { unitId: unit.id, progress };
              } else {
                console.error(`Failed to fetch progress for student ${student.id} in unit ${unit.id}:`, progressResponse.status);
                return { unitId: unit.id, progress: null };
              }
            } catch (err) {
              console.error(`Error fetching progress for unit ${unit.id}:`, err);
              return { unitId: unit.id, progress: null };
            }
          });

          const unitProgressResults = await Promise.all(unitProgressPromises);
          const unitProgressMap = {};
          unitProgressResults.forEach(({ unitId, progress }) => {
            unitProgressMap[unitId] = progress;
          });

          // Calculate engagement metrics
          const engagement = calculateEngagementMetrics(stats, unitProgressMap, unitsList);

          return {
            studentId: student.id,
            stats,
            unitProgress: unitProgressMap,
            engagement
          };
        } catch (err) {
          console.error(`Error fetching data for student ${student.id}:`, err);
          return {
            studentId: student.id,
            stats: null,
            unitProgress: {},
            engagement: { level: 'Low', score: 0, lastActive: null }
          };
        }
      });

      const studentDataResults = await Promise.all(studentDataPromises);
      
      // Organize data by student
      const statsMap = {};
      const progressMap = {};
      const engagementMap = {};
      
      studentDataResults.forEach(({ studentId, stats, unitProgress, engagement }) => {
        statsMap[studentId] = stats;
        progressMap[studentId] = unitProgress;
        engagementMap[studentId] = engagement;
      });

      setStudentStats(statsMap);
      setStudentProgress(progressMap);
      setStudentEngagement(engagementMap);

    } catch (err) {
      console.error('Error fetching comprehensive student data:', err);
      setError('Failed to load comprehensive student data');
    }
  };

  const calculateEngagementMetrics = (stats, unitProgress, units) => {
    if (!stats) return { level: 'Low', score: 0, lastActive: null };

    let engagementScore = 0;

    // Lesson completion engagement (90% weight) - primary focus
    const totalLessons = units.reduce((total, unit) => total + (unit.lessons?.length || 0), 0);
    
    // Calculate actual completed lessons by checking against current unit structure
    let actualCompletedLessons = 0;
    units.forEach(unit => {
      const progress = unitProgress[unit.id];
      if (progress && progress.completedLessons) {
        // Only count lessons that still exist in the current unit structure
        const validCompletedLessons = progress.completedLessons.filter(lessonIndex => 
          lessonIndex < (unit.lessons?.length || 0)
        );
        actualCompletedLessons += validCompletedLessons.length;
      }
    });
    
    // Use the smaller of stats.lessonsCompleted or actualCompletedLessons to prevent over-counting
    const completedLessons = Math.min(stats.lessonsCompleted || 0, actualCompletedLessons);
    const lessonRatio = totalLessons > 0 ? Math.min(completedLessons / totalLessons, 1) : 0;
    engagementScore += lessonRatio * 90;
    
    // Debug logging for engagement calculation
    console.log('Engagement Debug:', {
      statsLessonsCompleted: stats.lessonsCompleted,
      actualCompletedLessons,
      completedLessons,
      totalLessons,
      lessonRatio: lessonRatio * 100,
      engagementScore: engagementScore
    });

    // Quiz performance engagement (10% weight) - small factor for scores
    let quizPerformanceRatio = 0;
    if (stats.quizzesCompleted > 0) {
      // Calculate average quiz score if available, otherwise use completion rate
      const quizScores = [];
      const testScores = [];
      
      Object.values(unitProgress).forEach(progress => {
        if (progress?.quizScores) {
          Object.values(progress.quizScores).forEach(score => {
            quizScores.push(score);
          });
        }
        if (progress?.testScores) {
          Object.values(progress.testScores).forEach(score => {
            testScores.push(score);
          });
        }
      });
      
      const allScores = [...quizScores, ...testScores];
      
      if (allScores.length > 0) {
        const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
        quizPerformanceRatio = avgScore / 100; // Normalize to 100%
        console.log('Quiz Performance Debug:', {
          quizScores,
          testScores,
          allScores,
          avgScore,
          quizPerformanceRatio: quizPerformanceRatio * 100
        });
      } else {
        // Fallback to quiz completion rate if no scores available
        const totalQuizzesAndTests = units.reduce((total, unit) => {
          return total + (unit.lessons?.filter(lesson => 
            lesson.type === 'quiz' || lesson.type === 'test'
          ).length || 0);
        }, 0);
        quizPerformanceRatio = Math.min(stats.quizzesCompleted / Math.max(totalQuizzesAndTests, 1), 1);
        console.log('Quiz Performance Fallback Debug:', {
          statsQuizzesCompleted: stats.quizzesCompleted,
          totalQuizzesAndTests,
          quizPerformanceRatio: quizPerformanceRatio * 100,
          unitProgress: Object.keys(unitProgress).length
        });
      }
    }
    engagementScore += quizPerformanceRatio * 10;

    // Determine engagement level
    let level = 'Low';
    if (engagementScore >= 70) level = 'High';
    else if (engagementScore >= 40) level = 'Medium';

    return {
      level,
      score: Math.min(Math.round(engagementScore), 100), // Cap at 100%
      lastActive: stats.lastUpdated || stats.lastLoginDate,
      totalActivities: completedLessons,
      totalPossibleActivities: totalLessons,
      lessonRatio: Math.round(lessonRatio * 100),
      quizPerformanceRatio: Math.round(quizPerformanceRatio * 100)
    };
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.displayName || student?.firstName || student?.email?.split('@')[0] || 'Student';
  };

  const getStudentEmail = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.email || '';
  };

  const getClassAverage = (metric) => {
    const values = Object.values(studentStats).map(stats => stats?.[metric] || 0);
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  };

  const getEngagementLevelColor = (level) => {
    switch (level) {
      case 'High': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getFilteredStudents = () => {
    if (filterBy === 'all') return students;
    
    return students.filter(student => {
      const engagement = studentEngagement[student.id];
      if (!engagement) return false;
      
      switch (filterBy) {
        case 'active':
          return engagement.level === 'High';
        case 'struggling':
          return engagement.level === 'Low';
        case 'excelling':
          return engagement.score >= 80;
        default:
          return true;
      }
    });
  };

  const getStudentRank = (studentId) => {
    const rank = leaderboard.findIndex(entry => entry.userId === studentId);
    return rank >= 0 ? rank + 1 : 'Unranked';
  };

  const getAverageLessonsCompleted = () => {
    const totalLessons = Object.values(studentStats).reduce((sum, stats) => sum + (stats?.lessonsCompleted || 0), 0);
    return students.length > 0 ? Math.round(totalLessons / students.length) : 0;
  };

  const formatLastActiveDate = (dateValue) => {
    if (!dateValue) return 'Never';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Never';
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Never';
    }
  };

  const getLastActiveDate = (studentId) => {
    const stats = studentStats[studentId];
    if (!stats) return 'Never';
    
    // Try different possible date fields
    const possibleDateFields = ['lastUpdated', 'lastLoginDate', 'lastActive', 'lastLogin', 'updatedAt'];
    
    for (const field of possibleDateFields) {
      if (stats[field]) {
        const formatted = formatLastActiveDate(stats[field]);
        if (formatted !== 'Never') {
          return formatted;
        }
      }
    }
    
    // If no valid date found, return "Never"
    return 'Never';
  };

  if (loading) {
    return <div className="loading">Loading comprehensive analytics...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="teacher-analytics">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <button className="btn-back" onClick={onBack}>
            ← Back to Units
          </button>
          <h2>Analytics - {classroom.name}</h2>
        </div>
        <div className="analytics-controls">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="semester">This Semester</option>
          </select>
          <select 
            value={filterBy} 
            onChange={(e) => setFilterBy(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Students</option>
            <option value="active">Highly Engaged</option>
            <option value="struggling">Struggling</option>
            <option value="excelling">Excelling</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="analytics-tabs">
        <button 
          className={`tab-button ${currentPage === 'unit-progress' ? 'active' : ''}`}
          onClick={() => setCurrentPage('unit-progress')}
        >
          📚 Unit Progress
        </button>
        <button 
          className={`tab-button ${currentPage === 'student-details' ? 'active' : ''}`}
          onClick={() => setCurrentPage('student-details')}
        >
          👥 Student Details
        </button>
        <button 
          className={`tab-button ${currentPage === 'performance' ? 'active' : ''}`}
          onClick={() => setCurrentPage('performance')}
        >
          📈 Performance
        </button>
      </div>

      {/* Unit Progress Page */}
      {currentPage === 'unit-progress' && (
        <div className="analytics-content">
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <h3>👥 Total Students</h3>
              <div className="summary-value">{students.length}</div>
              <div className="summary-detail">Active in classroom</div>
            </div>
            <div className="summary-card">
              <h3>📚 Total Units</h3>
              <div className="summary-value">{units.length}</div>
              <div className="summary-detail">Available for learning</div>
            </div>
            <div className="summary-card">
              <h3>🔥 Avg Engagement</h3>
              <div className="summary-value">
                {Math.round(
                  Object.values(studentEngagement).reduce((sum, eng) => sum + eng.score, 0) / 
                  Object.keys(studentEngagement).length
                )}%
              </div>
              <div className="summary-detail">Class average</div>
            </div>
            <div className="summary-card">
              <h3>⭐ Avg Points</h3>
              <div className="summary-value">{getClassAverage('totalPoints')}</div>
              <div className="summary-detail">Per student</div>
            </div>
          </div>

          {/* Unit Progress Overview */}
          <div className="unit-progress-section">
            <h3>📚 Unit Progress Overview</h3>
            <div className="units-grid">
              {units.map(unit => {
                // Calculate progress for each student manually
                const studentProgressData = students.map(student => {
                  const progress = studentProgress[student.id]?.[unit.id];
                  const completedLessons = progress?.completedLessons?.length || 0;
                  const totalLessons = unit.lessons?.length || 0;
                  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                  
                  return {
                    studentId: student.id,
                    studentName: getStudentName(student.id),
                    completedLessons,
                    totalLessons,
                    progressPercentage
                  };
                });
                
                // Calculate average progress
                const validProgressData = studentProgressData.filter(data => data.totalLessons > 0);
                const avgProgress = validProgressData.length > 0 ? 
                  Math.round(validProgressData.reduce((sum, data) => sum + data.progressPercentage, 0) / validProgressData.length) : 0;
                
                return (
                  <div key={unit.id} className="unit-progress-card">
                    <div className="unit-header">
                      <h4>{unit.title}</h4>
                      <div className="unit-stats">
                        <span>{unit.lessons?.length || 0} lessons</span>
                        <span>{avgProgress}% avg completion</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${avgProgress}%` }}
                      ></div>
                    </div>
                    <div className="unit-student-breakdown">
                      {studentProgressData.slice(0, 5).map(data => (
                        <div key={data.studentId} className="student-progress-item">
                          <span className="student-name">{data.studentName}</span>
                          <span className="progress-percentage">{data.progressPercentage}%</span>
                        </div>
                      ))}
                      {students.length > 5 && (
                        <div className="more-students">+{students.length - 5} more students</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Student Details Page */}
      {currentPage === 'student-details' && (
        <div className="analytics-content">
          {/* Student Selection */}
          <div className="student-selection">
            <h3>👥 Student Details</h3>
            <div className="student-dropdown-container">
              <select 
                value={selectedStudent?.id || ''} 
                onChange={(e) => {
                  const student = students.find(s => s.id === e.target.value);
                  setSelectedStudent(student);
                }}
                className="student-dropdown"
              >
                <option value="">Select a student...</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {getStudentName(student.id)} ({getStudentEmail(student.id)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Student Details */}
          {selectedStudent && (
            <div className="selected-student-details">
              <div className="student-header">
                <h4>{getStudentName(selectedStudent.id)}</h4>
                <p>{getStudentEmail(selectedStudent.id)}</p>
                <div className="student-rank">Rank: #{getStudentRank(selectedStudent.id)}</div>
              </div>

              {/* Student Stats */}
              <div className="student-stats-grid">
                <div className="stat-card">
                  <h5>Points</h5>
                  <div className="stat-value">{studentStats[selectedStudent.id]?.totalPoints || 0}</div>
                </div>
                <div className="stat-card">
                  <h5>Streak</h5>
                  <div className="stat-value">{studentStats[selectedStudent.id]?.currentStreak || 0} days</div>
                </div>
                <div className="stat-card">
                  <h5>Engagement</h5>
                  <div 
                    className="engagement-badge"
                    style={{ backgroundColor: getEngagementLevelColor(studentEngagement[selectedStudent.id]?.level || 'Low') }}
                  >
                    {studentEngagement[selectedStudent.id]?.level || 'Low'} ({studentEngagement[selectedStudent.id]?.score || 0}%)
                  </div>
                </div>
                <div className="stat-card">
                  <h5>Lessons Completed</h5>
                  <div className="stat-value">{studentStats[selectedStudent.id]?.lessonsCompleted || 0}</div>
                </div>
              </div>

              {/* Unit Breakdown */}
              <div className="unit-breakdown">
                <h5>Unit Progress Breakdown</h5>
                <div className="unit-progress-list">
                  {units.map(unit => {
                    const progress = studentProgress[selectedStudent.id]?.[unit.id];
                    const completedLessons = progress?.completedLessons?.length || 0;
                    const totalLessons = unit.lessons?.length || 0;
                    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                    
                    return (
                      <div key={unit.id} className="unit-progress-item">
                        <div className="unit-info">
                          <h6>{unit.title}</h6>
                          <span>{completedLessons}/{totalLessons} lessons completed</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                        <div className="progress-percentage">{progressPercentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Test and Quiz Scores */}
              <div className="assessment-scores">
                <h5>Test and Quiz Scores</h5>
                <div className="scores-list">
                  {units.map(unit => {
                    const progress = studentProgress[selectedStudent.id]?.[unit.id];
                    const quizScores = progress?.quizScores || {};
                    const testScores = progress?.testScores || {};
                    
                    const hasScores = Object.keys(quizScores).length > 0 || Object.keys(testScores).length > 0;
                    
                    if (!hasScores) return null;
                    
                    return (
                      <div key={unit.id} className="unit-scores">
                        <h6>{unit.title}</h6>
                        <div className="score-items">
                          {Object.entries(quizScores).map(([lessonIndex, score]) => (
                            <div key={`quiz-${lessonIndex}`} className="score-item">
                              <span>Quiz {parseInt(lessonIndex) + 1}:</span>
                              <span className="score">{score}%</span>
                            </div>
                          ))}
                          {Object.entries(testScores).map(([lessonIndex, score]) => (
                            <div key={`test-${lessonIndex}`} className="score-item">
                              <span>Test {parseInt(lessonIndex) + 1}:</span>
                              <span className="score">{score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Engagement Details */}
              <div className="engagement-details">
                <h5>Engagement Details</h5>
                <div className="engagement-breakdown">
                  {(() => {
                    const engagement = studentEngagement[selectedStudent.id];
                    if (!engagement) return <p>No engagement data available</p>;
                    
                    return (
                      <>
                        <div className="engagement-score">
                          <div className="score-circle" style={{ 
                            background: `conic-gradient(${getEngagementLevelColor(engagement.level)} ${engagement.score * 3.6}deg, #374151 ${engagement.score * 3.6}deg)` 
                          }}>
                            <span>{engagement.score}%</span>
                          </div>
                        </div>
                        <div className="engagement-breakdown-items">
                          <div className="breakdown-item">
                            <span>Lessons: {engagement.lessonRatio}%</span>
                            <div className="breakdown-bar">
                              <div 
                                className="breakdown-fill"
                                style={{ width: `${engagement.lessonRatio}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="breakdown-item">
                            <span>Quiz Performance: {engagement.quizPerformanceRatio}%</span>
                            <div className="breakdown-bar">
                              <div 
                                className="breakdown-fill"
                                style={{ width: `${engagement.quizPerformanceRatio}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div className="engagement-info">
                          <p>Activities: {engagement.totalActivities}/{engagement.totalPossibleActivities}</p>
                          <p>Last Active: {getLastActiveDate(selectedStudent.id)}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Page */}
      {currentPage === 'performance' && (
        <div className="analytics-content">
          {/* Performance Summary */}
          <div className="performance-summary">
            <h3>📈 Performance Analytics</h3>
            <div className="performance-stats-grid">
              <div className="performance-stat-card">
                <h5>Average Points</h5>
                <div className="stat-value">{getClassAverage('totalPoints')}</div>
              </div>
              <div className="performance-stat-card">
                <h5>Average Streak</h5>
                <div className="stat-value">{getClassAverage('currentStreak')} days</div>
              </div>
              <div className="performance-stat-card">
                <h5>Average Engagement</h5>
                <div className="stat-value">
                  {Math.round(
                    Object.values(studentEngagement).reduce((sum, eng) => sum + eng.score, 0) / 
                    Object.keys(studentEngagement).length
                  )}%
                </div>
              </div>
              <div className="performance-stat-card">
                <h5>Average Lessons Completed</h5>
                <div className="stat-value">{getAverageLessonsCompleted()}</div>
              </div>
            </div>
          </div>

          {/* Live Leaderboard */}
          <div className="leaderboard-section">
            <h3>🏆 Live Leaderboard</h3>
            <div className="leaderboard">
              {leaderboard.slice(0, 10).map((entry, index) => (
                <div key={entry.userId} className="leaderboard-entry">
                  <div className="rank">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div className="student-info">
                    <div className="student-name">{entry.name || getStudentName(entry.userId)}</div>
                    <div className="student-email">{entry.email || getStudentEmail(entry.userId)}</div>
                  </div>
                  <div className="points">{entry.points} pts</div>
                  <div className="streak">🔥 {entry.streak}</div>
                  <div className="engagement-badge" style={{ 
                    backgroundColor: getEngagementLevelColor(studentEngagement[entry.userId]?.level || 'Low') 
                  }}>
                    {studentEngagement[entry.userId]?.level || 'Low'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Distribution */}
          <div className="engagement-distribution">
            <h3>🔥 Engagement Distribution</h3>
            <div className="engagement-chart">
              {['High', 'Medium', 'Low'].map(level => {
                const count = Object.values(studentEngagement).filter(eng => eng.level === level).length;
                const percentage = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
                return (
                  <div key={level} className="engagement-bar">
                    <div className="engagement-label">{level}</div>
                    <div className="engagement-bar-container">
                      <div 
                        className="engagement-bar-fill"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: getEngagementLevelColor(level)
                        }}
                      ></div>
                    </div>
                    <div className="engagement-count">{count} students ({percentage}%)</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default TeacherAnalytics;
