import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import './ProgressTracker.css';

const ProgressTracker = ({ classroomId, unitId }) => {
  const [userStats, setUserStats] = useState(null);
  const [courseProgress, setCourseProgress] = useState(null);
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (classroomId && user) {
      fetchUserData();
    }
  }, [classroomId, unitId, user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      // Fetch all data in parallel
      const [statsRes, progressRes, goalsRes, achievementsRes] = await Promise.all([
        fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/stats/${classroomId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        unitId ? fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/progress/${unitId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }) : Promise.resolve({ ok: false }),
        fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/weekly-goals/${classroomId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/achievements/${classroomId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setUserStats(stats);
      }

      if (progressRes.ok) {
        const progress = await progressRes.json();
        setCourseProgress(progress);
      }

      if (goalsRes.ok) {
        const goals = await goalsRes.json();
        setWeeklyGoals(goals);
      }

      if (achievementsRes.ok) {
        const achievements = await achievementsRes.json();
        setAchievements(achievements);
      }

    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    if (percentage >= 40) return '#f97316';
    return '#ef4444';
  };

  const getStreakEmoji = (streak) => {
    if (streak >= 30) return '👑';
    if (streak >= 14) return '🔥';
    if (streak >= 7) return '⚡';
    if (streak >= 3) return '💪';
    return '🌟';
  };

  if (loading) {
    return (
      <div className="progress-tracker">
        <div className="loading">Loading your progress...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-tracker">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="progress-tracker">
      {/* User Stats Overview */}
      {userStats && (
        <div className="stats-overview">
          <h3>📊 Your Stats</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💎</div>
              <div className="stat-value">{userStats.totalPoints?.toLocaleString() || 0}</div>
              <div className="stat-label">Total Points</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">{getStreakEmoji(userStats.currentStreak || 0)}</div>
              <div className="stat-value">{userStats.currentStreak || 0}</div>
              <div className="stat-label">Day Streak</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📚</div>
              <div className="stat-value">{userStats.lessonsCompleted || 0}</div>
              <div className="stat-label">Lessons</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-value">{userStats.assignmentsCompleted || 0}</div>
              <div className="stat-label">Assignments</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🧠</div>
              <div className="stat-value">{userStats.quizzesCompleted || 0}</div>
              <div className="stat-label">Quizzes</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-value">{userStats.perfectScores || 0}</div>
              <div className="stat-label">Perfect Scores</div>
            </div>
          </div>
        </div>
      )}

      {/* Course Progress */}
      {courseProgress && (
        <div className="course-progress">
          <h3>📈 Course Progress</h3>
          <div className="progress-overview">
            <div className="progress-circle">
              <div 
                className="progress-ring"
                style={{
                  '--progress': `${courseProgress.progressPercentage}%`,
                  '--color': getProgressColor(courseProgress.progressPercentage)
                }}
              >
                <div className="progress-text">
                  <span className="progress-percentage">{courseProgress.progressPercentage}%</span>
                  <span className="progress-label">Complete</span>
                </div>
              </div>
            </div>
            
            <div className="progress-details">
              <div className="progress-item">
                <span className="progress-label">Lessons</span>
                <span className="progress-value">
                  {courseProgress.lessonsCompleted} / {courseProgress.totalLessons}
                </span>
              </div>
              <div className="progress-item">
                <span className="progress-label">Assignments</span>
                <span className="progress-value">
                  {courseProgress.assignmentsCompleted} / {courseProgress.totalAssignments}
                </span>
              </div>
              <div className="progress-item">
                <span className="progress-label">Quizzes</span>
                <span className="progress-value">
                  {courseProgress.quizzesCompleted} / {courseProgress.totalQuizzes}
                </span>
              </div>
              <div className="progress-item">
                <span className="progress-label">Average Score</span>
                <span className="progress-value">
                  {courseProgress.averageScore?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Goals */}
      {weeklyGoals.length > 0 && (
        <div className="weekly-goals">
          <h3>🎯 Weekly Goals</h3>
          <div className="goals-grid">
            {weeklyGoals.map((goal) => (
              <div 
                key={goal.id} 
                className={`goal-card ${goal.completed ? 'completed' : ''}`}
              >
                <div className="goal-header">
                  <div className="goal-icon">
                    {goal.completed ? '✅' : '🎯'}
                  </div>
                  <div className="goal-reward">+{goal.reward} pts</div>
                </div>
                <div className="goal-content">
                  <h4>{goal.title}</h4>
                  <p>{goal.description}</p>
                  <div className="goal-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${Math.min((goal.current / goal.target) * 100, 100)}%`,
                          backgroundColor: goal.completed ? '#10b981' : '#3b82f6'
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {goal.current} / {goal.target}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="achievements">
          <h3>🏆 Achievements</h3>
          <div className="achievements-grid">
            {achievements.map((achievement) => (
              <div 
                key={achievement.id} 
                className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="achievement-icon">
                  {achievement.icon}
                </div>
                <div className="achievement-content">
                  <h4>{achievement.title}</h4>
                  <p>{achievement.description}</p>
                  {achievement.unlocked && (
                    <div className="unlocked-badge">
                      <span>✅ Unlocked</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
