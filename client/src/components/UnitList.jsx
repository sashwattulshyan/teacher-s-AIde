// src/components/UnitList.jsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "./UnitList.css";

const UnitList = ({ classroomId, onSelectUnit, onBack }) => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUnits = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "courses"),
          where("classroomId", "==", classroomId)
        );

        const querySnapshot = await getDocs(q);
        const unitList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setUnits(unitList);
      } catch (error) {
        console.error("Error fetching units:", error);
      } finally {
        setLoading(false);
      }
    };

    if (classroomId) {
      fetchUnits();
    }
  }, [classroomId]);

  if (loading) {
    return (
      <div className="unit-list">
        <div className="loading">Loading units...</div>
      </div>
    );
  }

  return (
    <div className="unit-list">
      <div className="unit-list-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to Classrooms
        </button>
        <h3>Available Units</h3>
      </div>
      
      {units.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>No Units Available</h3>
          <p>This classroom doesn't have any units yet.</p>
        </div>
      ) : (
        <div className="units-grid">
          {units.map((unit) => (
            <div key={unit.id} className="unit-card">
              <div className="unit-header">
                <h4>{unit.title}</h4>
                <span className="unit-lesson-count">
                  {unit.lessons?.length || 0} lessons
                </span>
              </div>
              
              {unit.description && (
                <p className="unit-description">{unit.description}</p>
              )}
              
              <div className="unit-actions">
                <button 
                  className="btn-primary"
                  onClick={() => onSelectUnit(unit)}
                >
                  Start Unit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnitList;
