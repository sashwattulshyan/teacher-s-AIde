// src/components/TeacherDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import ClassroomManager from './ClassroomManager';
import UnitManager from './CourseManager';
import LessonManager from './LessonManager';
import TeacherAnalytics from './TeacherAnalytics';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const { classroomId, unitId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch teacher's classrooms in real-time
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "classrooms"), 
      where("teacherId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const classroomsData = [];
      querySnapshot.forEach((doc) => {
        classroomsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setClassrooms(classroomsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

    // Handle URL-based navigation
  useEffect(() => {
    if (!loading && classrooms.length > 0) {
      if (classroomId) {
        const classroom = classrooms.find(c => c.id === classroomId);
        if (classroom) {
          setSelectedClassroom(classroom);
          
          // Check if we're on the analytics route
          if (location.pathname.includes('/analytics')) {
            setShowAnalytics(true);
            setSelectedUnit(null);
          } else if (unitId) {
            // Fetch the specific unit
            fetchUnit(unitId);
            setShowAnalytics(false);
          } else {
            setShowAnalytics(false);
            setSelectedUnit(null);
          }
        } else {
          // Classroom not found, redirect to teacher dashboard root
          navigate('/teacher');
        }
      } else {
        // No classroom selected, clear selections
        setSelectedClassroom(null);
        setSelectedUnit(null);
        setShowAnalytics(false);
      }
    }
  }, [classroomId, unitId, classrooms, loading, navigate, location.pathname]);

  const fetchUnit = async (unitId) => {
    try {
      const unitDoc = await getDoc(doc(db, 'courses', unitId));
      if (unitDoc.exists()) {
        setSelectedUnit({ id: unitDoc.id, ...unitDoc.data() });
      } else {
        // Unit not found, redirect to classroom
        navigate(`/teacher/classroom/${classroomId}`);
      }
    } catch (error) {
      console.error('Error fetching unit:', error);
      navigate(`/teacher/classroom/${classroomId}`);
    }
  };

  const handleClassroomSelect = (classroom) => {
    setSelectedClassroom(classroom);
    setSelectedUnit(null);
    setShowAnalytics(false);
    navigate(`/teacher/classroom/${classroom.id}`);
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    setShowAnalytics(false);
    navigate(`/teacher/classroom/${selectedClassroom.id}/unit/${unit.id}`);
  };

  const handleShowAnalytics = (classroom) => {
    setSelectedClassroom(classroom);
    setShowAnalytics(true);
    setSelectedUnit(null);
    navigate(`/teacher/classroom/${classroom.id}/analytics`);
  };

  const handleBackToClassrooms = () => {
    setSelectedClassroom(null);
    setSelectedUnit(null);
    setShowAnalytics(false);
    navigate('/teacher');
  };

  const handleBackToUnits = () => {
    setSelectedUnit(null);
    setShowAnalytics(false);
    navigate(`/teacher/classroom/${selectedClassroom.id}`);
  };

  const handleBackToAnalytics = () => {
    setShowAnalytics(false);
    setSelectedUnit(null);
    navigate(`/teacher/classroom/${selectedClassroom.id}/analytics`);
  };

  if (loading) {
    return <div className="loading">Loading your classrooms...</div>;
  }

  // Determine current view based on URL
  const getCurrentView = () => {
    if (showAnalytics && selectedClassroom) return 'analytics';
    if (unitId && selectedUnit) return 'lessons';
    if (classroomId && selectedClassroom) return 'units';
    return 'classrooms';
  };

  const currentView = getCurrentView();

  return (
    <div className="teacher-dashboard">
      {/* Header with navigation */}
      <div className="dashboard-header">
        <h1>Teacher Dashboard</h1>
        <div className="breadcrumb">
          <span 
            className={currentView === 'classrooms' ? 'active' : 'clickable'}
            onClick={handleBackToClassrooms}
          >
            Classrooms
          </span>
          {selectedClassroom && (
            <>
              <span className="separator">›</span>
              <span 
                className={currentView === 'units' ? 'active' : 'clickable'}
                onClick={handleBackToUnits}
              >
                {selectedClassroom.name}
              </span>
            </>
          )}
          {selectedUnit && !showAnalytics && (
            <>
              <span className="separator">›</span>
              <span className="active">{selectedUnit.title}</span>
            </>
          )}
          {showAnalytics && (
            <>
              <span className="separator">›</span>
              <span className="active">Analytics</span>
            </>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="dashboard-content">
        {currentView === 'classrooms' && (
          <ClassroomManager 
            classrooms={classrooms}
            onClassroomSelect={handleClassroomSelect}
            onShowAnalytics={handleShowAnalytics}
          />
        )}

        {currentView === 'units' && selectedClassroom && (
          <UnitManager 
            classroom={selectedClassroom}
            onUnitSelect={handleUnitSelect}
            onBack={handleBackToClassrooms}
            onShowAnalytics={handleShowAnalytics}
          />
        )}

        {currentView === 'analytics' && selectedClassroom && (
          <TeacherAnalytics 
            classroom={selectedClassroom}
            onBack={handleBackToAnalytics}
          />
        )}

        {currentView === 'lessons' && selectedUnit && selectedUnit.id && (
          <>
            {/* Debug logging */}
            {console.log('SelectedUnit in TeacherDashboard:', selectedUnit)}
            <LessonManager 
              course={selectedUnit}
              classroom={selectedClassroom}
              onBack={handleBackToUnits}
            />
          </>
        )}
        
        {currentView === 'lessons' && selectedUnit && !selectedUnit.id && (
          <div className="error">
            <h3>Error: Invalid Unit</h3>
            <p>The selected unit is missing an ID. Please try refreshing the page or selecting a different unit.</p>
            <button onClick={handleBackToUnits} className="btn-primary">
              Back to Units
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
