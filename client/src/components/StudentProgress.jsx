// src/components/StudentProgress.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import './StudentProgress.css';

import API_CONFIG from '../config/api';

async function getAuthToken() {
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken();
}

const StudentProgress = ({ classroom, onBack }) => {
  const [units, setUnits] = useState([]);
  const [studentProgress, setStudentProgress] = useState({});
  const [studentStats, setStudentStats] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [view, setView] = useState('overview'); // overview, unit-detail, lesson-detail
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { classroomId, unitId, lessonId } = useParams();

  useEffect(() => {
    const targetClassroom = classroom || { id: classroomId };
    if (!targetClassroom.id) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch units for this classroom
        const unitsQuery = query(
          collection(db, 'courses'),
          where('classroomId', '==', targetClassroom.id)
        );
        
        const unitsSnapshot = await getDocs(unitsQuery);
        const unitsData = unitsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUnits(unitsData);

        // Fetch student progress and stats
        await fetchStudentData(targetClassroom.id);
        
      } catch (err) {
        console.error('Error fetching progress data:', err);
        setError('Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classroom, classroomId]);

  const fetchStudentData = async (classroomId) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      // Fetch student stats
      const statsResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/stats/${classroomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setStudentStats(stats);
      } else if (statsResponse.status === 404) {
        // Initialize stats if they don't exist
        console.log('Initializing user stats for classroom:', classroomId);
        const initResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/init-stats/${classroomId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (initResponse.ok) {
          const initStats = await initResponse.json();
          setStudentStats(initStats.stats);
        } else {
          console.warn('Failed to initialize stats:', initResponse.status, initResponse.statusText);
        }
      } else {
        console.warn('Failed to fetch stats:', statsResponse.status, statsResponse.statusText);
      }

      // Fetch leaderboard
              const leaderboardResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/leaderboard/${classroomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        setLeaderboard(leaderboardData);
      } else {
        console.warn('Failed to fetch leaderboard:', leaderboardResponse.status, leaderboardResponse.statusText);
        const errorData = await leaderboardResponse.text();
        console.error('Leaderboard error details:', errorData);
      }

      // Award daily login points to initialize streak
      try {
        const dailyLoginResponse = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/daily-login/${classroomId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (dailyLoginResponse.ok) {
          console.log('Daily login points awarded');
        }
      } catch (dailyLoginError) {
        console.warn('Failed to award daily login points:', dailyLoginError);
      }

      // Initialize progress tracking for each unit
      const progressMap = {};
      units.forEach(unit => {
        progressMap[unit.id] = {
          completed: false,
          lessonsCompleted: 0,
          totalLessons: unit.lessons?.length || 0,
          progressPercentage: 0,
          lastAccessed: null,
          completedLessons: []
        };
      });
      setStudentProgress(progressMap);

    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('Failed to load student analytics');
    }
  };

  // Helper functions
  const getLessonIcon = (type) => {
    switch (type) {
      case 'lecture': return '📚';
      case 'reading': return '📖';
      case 'quiz': return '❓';
      case 'test': return '📝';
      case 'assignment': return '📋';
      case 'video': return '🎥';
      case 'interactive': return '🎮';
      case 'discussion': return '💬';
      case 'project': return '🏗️';
      case 'workshop': return '🔧';
      default: return '📄';
    }
  };

  const getLessonPoints = (lesson) => {
    switch (lesson.type) {
      case 'lecture': return 10;
      case 'reading': return 15;
      case 'quiz': return 25;
      case 'test': return 50;
      case 'assignment': return 40;
      case 'video': return 20;
      case 'interactive': return 30;
      case 'discussion': return 20;
      case 'project': return 100;
      case 'workshop': return 35;
      default: return 10;
    }
  };

  const markLessonComplete = async (unitId, lessonIndex) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      // Update local state
      const updatedProgress = { ...studentProgress };
      if (!updatedProgress[unitId].completedLessons.includes(lessonIndex)) {
        updatedProgress[unitId].completedLessons.push(lessonIndex);
        updatedProgress[unitId].lessonsCompleted = updatedProgress[unitId].completedLessons.length;
        updatedProgress[unitId].progressPercentage = Math.round(
          (updatedProgress[unitId].lessonsCompleted / updatedProgress[unitId].totalLessons) * 100
        );
        
        // Check if unit is complete
        if (updatedProgress[unitId].lessonsCompleted === updatedProgress[unitId].totalLessons) {
          updatedProgress[unitId].completed = true;
        }
        
        setStudentProgress(updatedProgress);
      }

      // Award points for lesson completion
      const lesson = units.find(u => u.id === unitId)?.lessons[lessonIndex];
      if (lesson) {
        const points = getLessonPoints(lesson);
        await awardPoints(points, 'lesson-completion', lesson.title);
      }

    } catch (err) {
      console.error('Error marking lesson complete:', err);
      setError('Failed to update progress');
    }
  };

  const awardPoints = async (points, reason, description) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

              const response = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/award-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          classroomId: classroom.id,
          points,
          reason,
          description
        })
      });

      if (response.ok) {
        // Refresh stats
        await fetchStudentData(classroom.id);
      }
    } catch (err) {
      console.error('Error awarding points:', err);
    }
  };

  const getStudentRank = () => {
    const currentUserId = auth.currentUser?.uid;
    const rank = leaderboard.findIndex(entry => entry.userId === currentUserId);
    return rank >= 0 ? rank + 1 : 'Unranked';
  };

  const getStudentPoints = () => {
    const currentUserId = auth.currentUser?.uid;
    const entry = leaderboard.find(entry => entry.userId === currentUserId);
    return entry?.points || 0;
  };

  const getStudentStreak = () => {
    const currentUserId = auth.currentUser?.uid;
    const entry = leaderboard.find(entry => entry.userId === currentUserId);
    return entry?.streak || 0;
  };

  const isLessonCompleted = (unitId, lessonIndex) => {
    return studentProgress[unitId]?.completedLessons?.includes(lessonIndex) || false;
  };

  const getUnitProgress = (unitId) => {
    return studentProgress[unitId] || {
      completed: false,
      lessonsCompleted: 0,
      totalLessons: 0,
      progressPercentage: 0,
      completedLessons: []
    };
  };

  const navigateToLesson = (unitId, lessonIndex) => {
    setSelectedUnit(units.find(u => u.id === unitId));
    setSelectedLesson(lessonIndex);
    setView('lesson-detail');
    navigate(`/student/classroom/${classroomId || classroom?.id}/unit/${unitId}/lesson/${lessonIndex}`);
  };

  if (loading) {
    return <div className="loading">Loading your progress...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="student-progress">
      {/* Header */}
      <div className="progress-header">
        <div>
          <button className="btn-back" onClick={() => navigate(`/student/classroom/${classroomId || classroom?.id}`)}>
            ← Back to Classroom
          </button>
          <h2>My Progress - {classroom?.name || 'Classroom'}</h2>
        </div>
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
      </div>

      {/* Overview Tab */}
      {view === 'overview' && (
        <div className="progress-content">
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
                      onClick={() => {
                        setSelectedUnit(unit);
                        setView('unit-detail');
                      }}
                    >
                      Continue Learning
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Unit Detail Tab */}
      {view === 'unit-detail' && (
        <div className="progress-content">
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
                    onClick={() => {
                      setSelectedUnit(null);
                      setView('overview');
                    }}
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
                        onClick={() => navigateToLesson(selectedUnit.id, index)}
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
                              navigateToLesson(selectedUnit.id, index);
                            }}
                          >
                            {isCompleted ? 'Review' : 'Start'}
                          </button>
                          {!isCompleted && (
                            <button 
                              className="btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                markLessonComplete(selectedUnit.id, index);
                              }}
                            >
                              Mark Complete
                            </button>
                          )}
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
                    onClick={() => setSelectedUnit(unit)}
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

export default StudentProgress;
