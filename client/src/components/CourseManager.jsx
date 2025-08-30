// src/components/CourseManager.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import './CourseManager.css';

const UnitManager = ({ classroom, onUnitSelect, onBack, onShowAnalytics }) => {
  const [units, setUnits] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [unitTitle, setUnitTitle] = useState('');
  const [unitDescription, setUnitDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch courses for this classroom in real-time
  useEffect(() => {
    if (!classroom?.id) return;

    const q = query(
      collection(db, "courses"), 
      where("classroomId", "==", classroom.id)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const unitsData = [];
      querySnapshot.forEach((doc) => {
        unitsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setUnits(unitsData);
    });

    return () => unsubscribe();
  }, [classroom?.id]);

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!unitTitle.trim()) {
      setError('Unit title cannot be empty.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create the unit
      const unitRef = await addDoc(collection(db, 'courses'), {
        title: unitTitle.trim(),
        description: unitDescription.trim(),
        classroomId: classroom.id,
        createdBy: auth.currentUser.uid,
        createdAt: new Date(),
        lessons: [],
        aiGenerated: false
      });

      // Update classroom to include the new unit ID
      await updateDoc(doc(db, 'classrooms', classroom.id), {
        courseIds: [...(classroom.courseIds || []), unitRef.id]
      });

      // Reset form
      setUnitTitle('');
      setUnitDescription('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating unit:', err);
      setError('Failed to create unit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="course-manager">
      {/* Header */}
      <div className="section-header">
        <div>
          <button className="btn-back" onClick={onBack}>
            ← Back to Classrooms
          </button>
          <h2>Units in {classroom.name}</h2>
        </div>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={() => onShowAnalytics(classroom)}
          >
            📊 Analytics
          </button>
          <button 
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + Create New Unit
          </button>
        </div>
      </div>

      {/* Create unit form */}
      {showCreateForm && (
        <div className="create-form-overlay">
          <div className="create-form">
            <h3>Create New Unit</h3>
            <form onSubmit={handleCreateUnit}>
              <div className="form-group">
                <label htmlFor="unitTitle">Unit Title</label>
                <input
                  type="text"
                  id="unitTitle"
                  value={unitTitle}
                  onChange={(e) => setUnitTitle(e.target.value)}
                  placeholder="Enter unit title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="unitDescription">Description</label>
                <textarea
                  id="unitDescription"
                  value={unitDescription}
                  onChange={(e) => setUnitDescription(e.target.value)}
                  placeholder="Enter unit description"
                  rows="4"
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setUnitTitle('');
                    setUnitDescription('');
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
                  {loading ? 'Creating...' : 'Create Unit'}
                </button>
              </div>
              
              {error && <p className="error">{error}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Units grid */}
      <div className="units-grid">
        {units.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>No Units Yet</h3>
            <p>Create your first unit to start building lessons and content.</p>
            <button 
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Unit
            </button>
          </div>
        ) : (
          units.map((unit) => (
            <div key={unit.id} className="unit-card">
              <div className="unit-header">
                <h3>{unit.title}</h3>
                <span className="unit-badge">
                  {unit.aiGenerated ? 'AI Generated' : 'Manual'}
                </span>
              </div>
              
              {unit.description && (
                <p className="unit-description">{unit.description}</p>
              )}
              
              <div className="unit-stats">
                <div className="stat">
                  <span className="stat-number">{unit.lessons?.length || 0}</span>
                  <span className="stat-label">Lessons</span>
                </div>
                <div className="stat">
                  <span className="stat-number">
                    {unit.lessons?.filter(lesson => lesson.type === 'quiz').length || 0}
                  </span>
                  <span className="stat-label">Quizzes</span>
                </div>
              </div>
              
              <div className="unit-actions">
                <button 
                  className="btn-primary"
                  onClick={() => onUnitSelect(unit)}
                >
                  Manage Lessons
                </button>
              </div>
            </div>
          ))
        )}
      </div>


    </div>
  );
};

export default UnitManager;
