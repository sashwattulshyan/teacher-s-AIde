// src/components/StudentDashboard.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import LessonViewer from "./LessonViewer";
import API_CONFIG from "../config/api";
import "./StudentDashboard.css";

async function getAuthToken() {
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken();
}

const StudentDashboard = () => {
  const { classroomId, unitId, lessonId } = useParams();
  const navigate = useNavigate();
  
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [units, setUnits] = useState([]);
  const [studentProgress, setStudentProgress] = useState({});
  const [studentStats, setStudentStats] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview'); // overview, unit-detail, lesson-detail
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [error, setError] = useState('');
  const [user] = useAuthState(auth);

  useEffect(() => {
    const fetchClassrooms = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const q = query(
          collection(db, "classrooms"),
          where("studentIds", "array-contains", user.uid)
        );

        const querySnapshot = await getDocs(q);
        const classroomsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch teacher names for each classroom
        const classroomsWithTeacherNames = await Promise.all(
          classroomsData.map(async (classroom) => {
            try {
              const teacherDoc = await getDoc(doc(db, 'users', classroom.teacherId));
              if (teacherDoc.exists()) {
                const teacherData = teacherDoc.data();
                const teacherName = teacherData.displayName || teacherData.firstName || teacherData.email?.split('@')[0] || 'Unknown Teacher';
                return {
                  ...classroom,
                  teacherName
                };
              } else {
                return {
                  ...classroom,
                  teacherName: 'Unknown Teacher'
                };
              }
            } catch (error) {
              console.error('Error fetching teacher name for classroom:', classroom.id, error);
              return {
                ...classroom,
                teacherName: 'Unknown Teacher'
              };
            }
          })
        );

        setClassrooms(classroomsWithTeacherNames);
      } catch (error) {
        console.error("Error fetching classrooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassrooms();
  }, [user]);

  // Handle URL-based navigation
  useEffect(() => {
    const handleNavigation = async () => {
    if (!loading && classrooms.length > 0) {
      if (classroomId) {
        const classroom = classrooms.find(c => c.id === classroomId);
        if (classroom) {
          setSelectedClassroom(classroom);
          
            // Check if we're on a lesson route
            if (lessonId && unitId) {
              console.log(`Navigating to lesson ${lessonId} in unit ${unitId}`);
              await fetchUnit(unitId);
              setSelectedLesson(parseInt(lessonId));
              setView('lesson-detail');
            } else if (unitId) {
          // Fetch the specific unit
              console.log(`Navigating to unit ${unitId}`);
              await fetchUnit(unitId);
              setView('unit-detail');
            } else {
              setView('overview');
        }
        } else {
            // Classroom not found, redirect to student dashboard
            navigate('/student');
        }
              } else {
          // No classroom selected, clear selections
          setSelectedClassroom(null);
          setSelectedUnit(null);
          setView('overview');
        }
      }
    };

    handleNavigation();
  }, [classroomId, unitId, lessonId, classrooms, loading, navigate]);

  useEffect(() => {
    if (selectedClassroom) {
      fetchUnitsAndProgress();
    }
  }, [selectedClassroom]);

  // Initialize user stats when entering a classroom
  useEffect(() => {
    const initializeUserStats = async () => {
      if (selectedClassroom && !studentStats) {
        try {
          const token = await getAuthToken();
          if (!token) return;

          console.log('Initializing user stats for classroom:', selectedClassroom.id);
          const initResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/init-stats/${selectedClassroom.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (initResponse.ok) {
            const initData = await initResponse.json();
            setStudentStats(initData.stats);
            console.log('User stats initialized:', initData.stats);
          }
        } catch (error) {
          console.error('Error initializing user stats:', error);
        }
      }
    };

    initializeUserStats();
  }, [selectedClassroom, studentStats]);

  // Award daily login points when entering a classroom
  useEffect(() => {
    const awardDailyLogin = async () => {
      if (selectedClassroom) {
        try {
          const token = await getAuthToken();
          if (!token) return;

          console.log('Awarding daily login points for classroom:', selectedClassroom.id);
          const loginResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/daily-login/${selectedClassroom.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('Daily login points awarded:', loginData);
            // Refresh stats to show updated streak and points
            await refreshStats();
          }
        } catch (error) {
          console.error('Error awarding daily login points:', error);
        }
      }
    };

    awardDailyLogin();
  }, [selectedClassroom]);

  // Ensure data is loaded when component mounts or when units change
  useEffect(() => {
    if (selectedClassroom && units.length > 0 && Object.keys(studentProgress).length === 0) {
      console.log('Reloading student data due to missing progress data');
      fetchStudentData();
    }
  }, [selectedClassroom, units, studentProgress]);

  const fetchUnitsAndProgress = async () => {
    if (!selectedClassroom) return;
    
    try {
      console.log('Fetching units for classroom:', selectedClassroom.id);
      
      // Fetch units for this classroom
      const unitsQuery = query(
        collection(db, 'courses'),
        where('classroomId', '==', selectedClassroom.id)
      );
      
      const unitsSnapshot = await getDocs(unitsQuery);
      const unitsData = unitsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Found units:', unitsData);
      setUnits(unitsData);

      // Fetch student progress and stats
      await fetchStudentData();
      
    } catch (err) {
      console.error('Error fetching units and progress:', err);
      setError('Failed to load data');
    }
  };

  const fetchStudentData = async () => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      console.log('Fetching student data for classroom:', selectedClassroom.id);

      // Fetch student stats
      const statsResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/stats/${selectedClassroom.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setStudentStats(stats);
        console.log('Student stats loaded:', stats);
      } else if (statsResponse.status === 404) {
        // Initialize stats if they don't exist
        console.log('Initializing user stats for classroom:', selectedClassroom.id);
        const initResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/init-stats/${selectedClassroom.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (initResponse.ok) {
          const initStats = await initResponse.json();
          setStudentStats(initStats.stats);
          console.log('Student stats initialized:', initStats.stats);
        } else {
          console.error('Failed to initialize stats:', initResponse.status);
        }
      } else {
        console.error('Failed to fetch stats:', statsResponse.status);
      }

      // Fetch leaderboard
      const leaderboardResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/leaderboard/${selectedClassroom.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        setLeaderboard(leaderboardData);
        console.log('Leaderboard loaded:', leaderboardData);
      } else {
        console.error('Failed to fetch leaderboard:', leaderboardResponse.status);
      }

      // Fetch student progress for each unit
      const progressPromises = units.map(async (unit) => {
        try {
          console.log(`Fetching progress for unit ${unit.id}`);
          const progressResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/progress/${unit.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            console.log(`Progress for unit ${unit.id}:`, progressData);
            
            // Ensure the progress data has the expected structure
            const normalizedProgress = {
              courseId: unit.id,
              completedLessons: progressData.completedLessons || [],
              lessonsCompleted: progressData.lessonsCompleted || 0,
              assignmentsCompleted: progressData.assignmentsCompleted || 0,
              quizzesCompleted: progressData.quizzesCompleted || 0,
              totalLessons: progressData.totalLessons || 0,
              totalAssignments: progressData.totalAssignments || 0,
              totalQuizzes: progressData.totalQuizzes || 0,
              progressPercentage: progressData.progressPercentage || 0,
              averageScore: progressData.averageScore || 0
            };
            
            console.log(`Normalized progress for unit ${unit.id}:`, normalizedProgress);
            return { unitId: unit.id, progress: normalizedProgress };
          } else {
            console.error(`Failed to fetch progress for unit ${unit.id}:`, progressResponse.status);
            return { unitId: unit.id, progress: { completedLessons: [] } };
          }
        } catch (err) {
          console.error(`Error fetching progress for unit ${unit.id}:`, err);
          return { unitId: unit.id, progress: { completedLessons: [] } };
        }
      });

      const progressResults = await Promise.all(progressPromises);
      const progressMap = {};
      progressResults.forEach(({ unitId, progress }) => {
        progressMap[unitId] = progress;
        console.log(`Progress for unit ${unitId}:`, progress);
      });
      setStudentProgress(progressMap);
      console.log('Final student progress map:', progressMap);

    } catch (err) {
      console.error('Error fetching student data:', err);
    }
  };

  const fetchUnit = async (unitId) => {
    try {
      const unitDoc = await getDoc(doc(db, 'courses', unitId));
      if (unitDoc.exists()) {
        setSelectedUnit({ id: unitDoc.id, ...unitDoc.data() });
      } else {
        // Unit not found, redirect to classroom
        navigate(`/student/classroom/${classroomId}`);
      }
    } catch (error) {
      console.error('Error fetching unit:', error);
      navigate(`/student/classroom/${classroomId}`);
    }
  };

  const handleBackToClassrooms = () => {
    setSelectedClassroom(null);
    setSelectedUnit(null);
    setView('overview');
    navigate('/student');
  };

  const handleBackToUnits = () => {
    setSelectedUnit(null);
    setSelectedLesson(null);
    setView('overview');
    navigate(`/student/classroom/${selectedClassroom.id}`);
  };

  const handleSelectClassroom = (classroom) => {
    setSelectedClassroom(classroom);
    setSelectedUnit(null);
    setSelectedLesson(null);
    setView('overview');
    navigate(`/student/classroom/${classroom.id}`);
  };

  const handleSelectUnit = (unit) => {
    setSelectedUnit(unit);
    setSelectedLesson(null);
    setView('unit-detail');
    navigate(`/student/classroom/${selectedClassroom.id}/unit/${unit.id}`);
  };

  const handleSelectLesson = (unitId, lessonIndex) => {
    setSelectedUnit(units.find(u => u.id === unitId));
    setSelectedLesson(lessonIndex);
    setView('lesson-detail');
    navigate(`/student/classroom/${selectedClassroom.id}/unit/${unitId}/lesson/${lessonIndex}`);
  };

  const markLessonComplete = async (unitId, lessonIndex) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      console.log(`Marking lesson ${lessonIndex} complete for unit ${unitId} in classroom ${selectedClassroom.id}`);

      // Use the new complete-lesson endpoint
      const response = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/complete-lesson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          unitId,
          lessonIndex,
          classroomId: selectedClassroom.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Lesson ${lessonIndex} completed for unit ${unitId}:`, data);
        
        // Update local progress state immediately
        setStudentProgress(prevProgress => {
          const currentProgress = prevProgress[unitId] || { completedLessons: [] };
          const updatedCompletedLessons = [...currentProgress.completedLessons];
          if (!updatedCompletedLessons.includes(lessonIndex)) {
            updatedCompletedLessons.push(lessonIndex);
          }
          
          const updatedProgress = {
            ...prevProgress,
            [unitId]: {
              ...currentProgress,
              completedLessons: updatedCompletedLessons,
              lessonsCompleted: updatedCompletedLessons.length
            }
          };
          
          console.log('Updated local progress:', updatedProgress);
          return updatedProgress;
        });
        
        // Update stats immediately for instant feedback
        setStudentStats(prevStats => ({
          ...prevStats,
          totalPoints: (prevStats?.totalPoints || 0) + 50, // Add points for lesson completion
          lessonsCompleted: (prevStats?.lessonsCompleted || 0) + 1
        }));
        
        // Refresh stats and leaderboard from server
        await refreshStats();
        console.log(`Lesson ${lessonIndex} marked as complete for unit ${unitId}`);
      } else {
        const errorData = await response.text();
        console.error('Failed to mark lesson complete:', response.status, errorData);
        setError('Failed to mark lesson as complete');
      }
    } catch (err) {
      console.error('Error marking lesson complete:', err);
      setError('Failed to update progress');
    }
  };

  const getStudentRank = () => {
    const currentUserId = auth.currentUser?.uid;
    const rank = leaderboard.findIndex(entry => entry.userId === currentUserId);
    return rank >= 0 ? rank + 1 : 'Unranked';
  };

  const getStudentPoints = () => {
    const points = studentStats?.totalPoints || 0;
    console.log('Getting student points:', points, 'from stats:', studentStats);
    return points;
  };

  const getStudentStreak = () => {
    const streak = studentStats?.currentStreak || 0;
    console.log('Getting student streak:', streak, 'from stats:', studentStats);
    return streak;
  };

  const isLessonCompleted = (unitId, lessonIndex) => {
    const progress = studentProgress[unitId];
    console.log(`Checking if lesson ${lessonIndex} is completed in unit ${unitId}:`, progress);
    if (!progress || !progress.completedLessons) {
      console.log(`No progress data for unit ${unitId}`);
      return false;
    }
    const isCompleted = progress.completedLessons.includes(lessonIndex);
    console.log(`Lesson ${lessonIndex} completed: ${isCompleted}`);
    return isCompleted;
  };

  const getUnitProgress = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    const progress = studentProgress[unitId] || { completedLessons: [] };
    const totalLessons = unit?.lessons?.length || 0;
    const lessonsCompleted = progress.completedLessons?.length || 0;
    const progressPercentage = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;
    
    return {
      completed: lessonsCompleted === totalLessons && totalLessons > 0,
      lessonsCompleted,
      totalLessons,
      progressPercentage,
      completedLessons: progress.completedLessons || []
    };
  };

  const getLessonPoints = (lesson) => {
    switch (lesson.type) {
      case 'lecture':
      case 'reading':
      case 'video':
      case 'interactive':
      case 'discussion':
      case 'project':
      case 'workshop':
        return 50;
      case 'quiz':
        return 75;
      case 'test':
        return 100;
      case 'assignment':
        return 100;
      default:
        return 50;
    }
  };

  const getLessonIcon = (lessonType) => {
    switch (lessonType) {
      case 'lecture': return '📝';
      case 'reading': return '📖';
      case 'quiz': return '❓';
      case 'test': return '📋';
      case 'assignment': return '📝';
      case 'video': return '🎥';
      case 'interactive': return '🎮';
      case 'discussion': return '💬';
      case 'project': return '🏗️';
      case 'workshop': return '🔧';
      default: return '📚';
    }
  };

  const refreshAllData = async () => {
    if (selectedClassroom) {
      console.log('Force refreshing all data');
      await fetchUnitsAndProgress();
    }
  };

  const refreshStats = async () => {
    if (!selectedClassroom) return;
    
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      console.log('Refreshing stats for classroom:', selectedClassroom.id);

      // Fetch updated student stats
      const statsResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/stats/${selectedClassroom.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setStudentStats(stats);
        console.log('Stats refreshed:', stats);
      } else {
        console.error('Failed to refresh stats:', statsResponse.status);
      }

      // Fetch updated leaderboard
      const leaderboardResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/leaderboard/${selectedClassroom.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        setLeaderboard(leaderboardData);
        console.log('Leaderboard refreshed:', leaderboardData);
      } else {
        console.error('Failed to refresh leaderboard:', leaderboardResponse.status);
      }
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading your classrooms...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Show lesson viewer if we're in lesson detail view
  if (view === 'lesson-detail' && selectedUnit && selectedLesson !== null) {
    return (
      <LessonViewer 
        course={selectedUnit} 
        initialLessonIndex={selectedLesson}
        onBack={() => {
          setView('unit-detail');
          setSelectedLesson(null);
          navigate(`/student/classroom/${selectedClassroom.id}/unit/${selectedUnit.id}`);
        }}
        onLessonComplete={(lessonIndex) => {
          console.log('LessonViewer called onLessonComplete with index:', lessonIndex);
          markLessonComplete(selectedUnit.id, lessonIndex);
        }}
      />
    );
  }

  return (
    <div className="student-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          {selectedClassroom && (
            <button className="btn-back" onClick={handleBackToClassrooms}>
              ← Back to Classrooms
            </button>
          )}
          <h2>{selectedClassroom ? selectedClassroom.name : 'Student Dashboard'}</h2>
      </div>
        {selectedClassroom && (
          <div className="view-tabs">
        <button 
              className={`tab-button ${view === 'overview' ? 'active' : ''}`}
              onClick={() => setView('overview')}
        >
              📊 Overview
        </button>
        <button 
              className={`tab-button ${view === 'unit-detail' ? 'active' : ''}`}
              onClick={() => setView('unit-detail')}
        >
              📚 Units
        </button>
          </div>
        )}
      </div>

      {/* Overview Tab */}
      {view === 'overview' && (
        <div className="dashboard-content">
          {selectedClassroom ? (
            <>
              {/* Student Stats */}
              <div className="stats-cards">
                <div className="stat-card">
                  <h3>🏆 Rank</h3>
                  <div className="stat-value">#{getStudentRank()}</div>
                  <div className="stat-detail">in class</div>
                </div>
                <div className="stat-card">
                  <h3>⭐ Points</h3>
                  <div className="stat-value">{getStudentPoints()}</div>
                  <div className="stat-detail">total earned</div>
                </div>
                <div className="stat-card">
                  <h3>🔥 Streak</h3>
                  <div className="stat-value">{getStudentStreak()}</div>
                  <div className="stat-detail">days active</div>
                </div>
                <div className="stat-card">
                  <h3>📚 Units</h3>
                  <div className="stat-value">
                    {units.filter(u => getUnitProgress(u.id).completed).length}/{units.length}
                  </div>
                  <div className="stat-detail">completed</div>
                </div>
                  </div>
                  
              {/* Live Leaderboard */}
              <div className="leaderboard-section">
                <h3>🏆 Live Leaderboard</h3>
                {leaderboard.length > 0 ? (
                  <div className="leaderboard">
                    {leaderboard.slice(0, 10).map((entry, index) => {
                      const isCurrentUser = entry.userId === auth.currentUser?.uid;
                      return (
                        <div key={entry.userId} className={`leaderboard-entry ${isCurrentUser ? 'current-user' : ''}`}>
                          <div className="rank">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                          <div className="student-info">
                            <div className="student-name">
                              {entry.name || 'Student'} {isCurrentUser && '(You)'}
                            </div>
                            <div className="student-email">{entry.email || ''}</div>
                          </div>
                          <div className="points">{entry.points} pts</div>
                          <div className="streak">🔥 {entry.streak}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-leaderboard">
                    <p>No students have earned points yet. Be the first to start earning points!</p>
                  </div>
                )}
                  </div>
                  
              {/* Unit Progress Overview */}
              <div className="units-overview">
                <h3>📚 My Units</h3>
                <div className="units-grid">
                  {units.map(unit => {
                    const progress = getUnitProgress(unit.id);
                    return (
                      <div key={unit.id} className="unit-progress-card">
                        <div className="unit-header">
                          <h4>{unit.title}</h4>
                          <div className={`completion-badge ${progress.completed ? 'completed' : 'in-progress'}`}>
                            {progress.completed ? '✅ Complete' : `${progress.progressPercentage}%`}
                          </div>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${progress.progressPercentage}%` }}
                          ></div>
                        </div>
                        <div className="unit-stats">
                          <span>{progress.lessonsCompleted}/{progress.totalLessons} lessons</span>
                          <span>{progress.completedLessons.length > 0 ? '🔥 Active' : '⏸️ Not started'}</span>
                        </div>
                    <button 
                      className="btn-primary"
                          onClick={() => handleSelectUnit(unit)}
                        >
                          Continue Learning
                    </button>
                  </div>
                    );
                  })}
                </div>
            </div>
            </>
          ) : (
            <div className="classrooms-selection">
              <h3>🏫 My Classrooms</h3>
              <div className="classrooms-grid">
                {classrooms.map(classroom => (
                  <div 
                    key={classroom.id} 
                    className="classroom-card"
                    onClick={() => handleSelectClassroom(classroom)}
                  >
                    <div className="classroom-header">
                      <h4>{classroom.name}</h4>
                      <div className="classroom-teacher">
                        Teacher: {classroom.teacherName || 'Unknown'}
                      </div>
                    </div>
                    <div className="classroom-description">
                      {classroom.description || 'No description available'}
                    </div>
                    <div className="classroom-stats">
                      <span>{classroom.studentIds?.length || 0} students</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unit Detail Tab */}
      {view === 'unit-detail' && (
        <div className="dashboard-content">
          {selectedUnit ? (
            <div className="unit-detail">
              <div className="unit-header">
                <h3>{selectedUnit.title}</h3>
                <div className="unit-progress-info">
                  <span className="progress-text">
                    {getUnitProgress(selectedUnit.id).lessonsCompleted}/{getUnitProgress(selectedUnit.id).totalLessons} lessons completed
                  </span>
                <button 
                    className="btn-secondary"
                    onClick={handleBackToUnits}
                >
                    ← Back to Overview
                </button>
            </div>
            </div>

              <div className="lessons-navigation">
                <h4>📖 Lessons</h4>
                <div className="lessons-grid">
                  {selectedUnit.lessons?.map((lesson, index) => {
                    const isCompleted = isLessonCompleted(selectedUnit.id, index);
                    const points = getLessonPoints(lesson);
                    
                    return (
                      <div 
                        key={index} 
                        className={`lesson-card ${isCompleted ? 'completed' : ''}`}
                        onClick={() => handleSelectLesson(selectedUnit.id, index)}
                      >
                        <div className="lesson-header">
                          <div className="lesson-icon">
                            {getLessonIcon(lesson.type)}
                          </div>
                          <div className="lesson-info">
                            <h5>{lesson.title}</h5>
                            <span className="lesson-type">{lesson.type}</span>
                          </div>
                          <div className="lesson-status">
                            {isCompleted ? (
                              <span className="completed-badge">✅</span>
                            ) : (
                              <span className="points-badge">{points} pts</span>
          )}
        </div>
                        </div>
                        <div className="lesson-preview">
                          {lesson.description || lesson.content || 'No description available'}
                        </div>
                        <div className="lesson-actions">
                <button 
                            className="btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectLesson(selectedUnit.id, index);
                            }}
                          >
                            {isCompleted ? 'Review' : 'Start'}
                </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="unit-selection">
              <h3>📚 Select a Unit</h3>
              <div className="units-grid">
                {units.map(unit => (
                  <div 
                    key={unit.id} 
                    className="unit-card"
                    onClick={() => handleSelectUnit(unit)}
                  >
                    <div className="unit-header">
                      <h4>{unit.title}</h4>
                      <div className={`completion-badge ${getUnitProgress(unit.id).completed ? 'completed' : 'in-progress'}`}>
                        {getUnitProgress(unit.id).completed ? '✅ Complete' : `${getUnitProgress(unit.id).progressPercentage}%`}
                      </div>
                    </div>
                    <div className="unit-description">
                      {unit.description || 'No description available'}
                    </div>
                    <div className="unit-stats">
                      <span>{getUnitProgress(unit.id).lessonsCompleted}/{getUnitProgress(unit.id).totalLessons} lessons</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
