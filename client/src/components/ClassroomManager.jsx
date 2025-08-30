// src/components/ClassroomManager.jsx
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import './ClassroomManager.css';

const ClassroomManager = ({ classrooms, onClassroomSelect, onShowAnalytics }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [classroomName, setClassroomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingCodes, setGeneratingCodes] = useState(new Set());

  // Generate a random 6-character join code
  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Generate and update join code for existing classroom
  const generateAndUpdateJoinCode = async (classroomId) => {
    try {
      setGeneratingCodes(prev => new Set(prev).add(classroomId));
      const newJoinCode = generateJoinCode();
      await updateDoc(doc(db, 'classrooms', classroomId), {
        joinCode: newJoinCode
      });
      return newJoinCode;
    } catch (error) {
      console.error('Error updating join code:', error);
      throw error;
    } finally {
      setGeneratingCodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(classroomId);
        return newSet;
      });
    }
  };

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    if (!classroomName.trim()) {
      setError('Classroom name cannot be empty.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const joinCode = generateJoinCode();
      
      await addDoc(collection(db, 'classrooms'), {
        name: classroomName.trim(),
        teacherId: auth.currentUser.uid,
        joinCode: joinCode,
        createdAt: serverTimestamp(),
        studentIds: [],
        courseIds: []
      });

      // Reset form
      setClassroomName('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating classroom:', err);
      setError('Failed to create classroom. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="classroom-manager">
      {/* Header with create button */}
      <div className="section-header">
        <h2>Your Classrooms</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + Create New Classroom
        </button>
      </div>

      {/* Create classroom form */}
      {showCreateForm && (
        <div className="create-form-overlay">
          <div className="create-form">
            <h3>Create New Classroom</h3>
            <form onSubmit={handleCreateClassroom}>
              <div className="form-group">
                <label htmlFor="classroomName">Classroom Name</label>
                <input
                  type="text"
                  id="classroomName"
                  value={classroomName}
                  onChange={(e) => setClassroomName(e.target.value)}
                  placeholder="Enter classroom name"
                  required
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setClassroomName('');
                    setError('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Classroom'}
                </button>
              </div>
              
              {error && <p className="error">{error}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Classrooms grid */}
      <div className="classrooms-grid">
        {classrooms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏫</div>
            <h3>No Classrooms Yet</h3>
            <p>Create your first classroom to get started with unit management.</p>
            <button 
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Classroom
            </button>
          </div>
        ) : (
          classrooms.map((classroom) => (
            <div key={classroom.id} className="classroom-card">
              <div className="classroom-header">
                <h3>{classroom.name}</h3>
                <div className="join-code-section">
                  <span className="join-code">Code: {classroom.joinCode || 'N/A'}</span>
                  {!classroom.joinCode && (
                    <button 
                      className="btn-secondary small"
                      onClick={async () => {
                        try {
                          await generateAndUpdateJoinCode(classroom.id);
                        } catch (error) {
                          console.error('Failed to generate join code:', error);
                        }
                      }}
                      disabled={generatingCodes.has(classroom.id)}
                    >
                      {generatingCodes.has(classroom.id) ? 'Generating...' : 'Generate Code'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="classroom-stats">
                <div className="stat">
                  <span className="stat-number">{classroom.studentIds?.length || 0}</span>
                  <span className="stat-label">Students</span>
                </div>
                <div className="stat">
                          <span className="stat-number">{classroom.courseIds?.length || 0}</span>
        <span className="stat-label">Units</span>
                </div>
              </div>
              
              <div className="classroom-actions">
                <button 
                  className="btn-primary"
                  onClick={() => onClassroomSelect(classroom)}
                >
                  Manage Units
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => onShowAnalytics(classroom)}
                >
                  📊 Analytics
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClassroomManager;
