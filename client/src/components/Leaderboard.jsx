import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import './Leaderboard.css';

const Leaderboard = ({ classroomId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (classroomId && user) {
      fetchLeaderboard();
    }
  }, [classroomId, user]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/leaderboard/${classroomId}?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankClass = (rank) => {
    switch (rank) {
      case 1: return 'rank-gold';
      case 2: return 'rank-silver';
      case 3: return 'rank-bronze';
      default: return '';
    }
  };

  const formatPoints = (points) => {
    return points.toLocaleString();
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h3>🏆 Classroom Leaderboard</h3>
        </div>
        <div className="loading">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h3>🏆 Classroom Leaderboard</h3>
        </div>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h3>🏆 Classroom Leaderboard</h3>
        <button 
          className="btn-refresh"
          onClick={fetchLeaderboard}
          title="Refresh leaderboard"
        >
          🔄
        </button>
      </div>

      {leaderboard.length === 0 ? (
        <div className="empty-leaderboard">
          <div className="empty-icon">📊</div>
          <p>No activity yet. Be the first to earn points!</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <div 
              key={entry.userId} 
              className={`leaderboard-entry ${getRankClass(entry.rank)} ${
                entry.userId === user?.uid ? 'current-user' : ''
              }`}
            >
              <div className="rank-section">
                <span className="rank-icon">{getRankIcon(entry.rank)}</span>
                <span className="rank-number">{entry.rank}</span>
              </div>
              
              <div className="user-info">
                <div className="user-name">
                  {entry.userId === user?.uid ? 'You' : `Student ${entry.rank}`}
                  {entry.userId === user?.uid && <span className="you-badge">You</span>}
                </div>
                <div className="user-stats">
                  <span className="stat">
                    <span className="stat-icon">🔥</span>
                    {entry.currentStreak} day streak
                  </span>
                  <span className="stat">
                    <span className="stat-icon">📚</span>
                    {entry.lessonsCompleted} lessons
                  </span>
                  <span className="stat">
                    <span className="stat-icon">📝</span>
                    {entry.assignmentsCompleted} assignments
                  </span>
                </div>
              </div>
              
              <div className="points-section">
                <div className="points-display">
                  <span className="points-number">{formatPoints(entry.totalPoints)}</span>
                  <span className="points-label">points</span>
                </div>
                <div className="streak-badge">
                  <span className="streak-icon">🔥</span>
                  {entry.longestStreak}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="leaderboard-footer">
        <p>Points are earned by completing lessons, assignments, and maintaining daily streaks!</p>
      </div>
    </div>
  );
};

export default Leaderboard;
