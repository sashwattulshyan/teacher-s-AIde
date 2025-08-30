// src/components/GradingDashboard.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import './GradingDashboard.css';

const GradingDashboard = ({ unit, classroom, onBack }) => {
  const [students, setStudents] = useState([]);
  const [studentProgress, setStudentProgress] = useState({});
  const [grades, setGrades] = useState({});
  const [gradeScales, setGradeScales] = useState({});
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grading, setGrading] = useState({});
  const [savingGrade, setSavingGrade] = useState(false);
  const [savingScale, setSavingScale] = useState({});

  useEffect(() => {
    const fetchStudentsAndProgress = async () => {
      if (!classroom || !unit) return;

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

        // Fetch progress and grades for each student
        const progressPromises = classroomStudents.map(async (student) => {
          try {
            const progressRef = doc(db, 'studentProgress', `${student.id}_${unit.id}`);
            const progressSnap = await getDoc(progressRef);
            
            if (progressSnap.exists()) {
              return {
                studentId: student.id,
                progress: progressSnap.data()
              };
            } else {
              return {
                studentId: student.id,
                progress: {}
              };
            }
          } catch (err) {
            console.error(`Error fetching progress for student ${student.id}:`, err);
            return {
              studentId: student.id,
              progress: {}
            };
          }
        });

        const progressResults = await Promise.all(progressPromises);
        const progressMap = {};
        const gradesMap = {};
        
        progressResults.forEach(({ studentId, progress }) => {
          progressMap[studentId] = progress;
          
          // Extract grades from progress data
          if (progress.grades) {
            Object.entries(progress.grades).forEach(([key, gradeData]) => {
              gradesMap[`${studentId}_${key}`] = gradeData;
            });
          }
        });

        setStudentProgress(progressMap);
        setGrades(gradesMap);

        // Initialize grade scales from unit data or set defaults
        const initialScales = {};
        unit.lessons?.forEach((lesson, index) => {
          initialScales[index] = lesson.gradeScale || 100;
        });
        setGradeScales(initialScales);

      } catch (err) {
        console.error('Error fetching students and progress:', err);
        setError('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsAndProgress();
  }, [classroom, unit]);

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.displayName || student?.firstName || student?.email?.split('@')[0] || 'Student';
  };

  const getSubmissionStatus = (studentId, lessonIndex, lessonType) => {
    const progress = studentProgress[studentId];
    if (!progress) return 'not-started';

    switch (lessonType) {
      case 'assignment':
        return progress.assignmentSubmissions?.[lessonIndex] ? 'submitted' : 'not-started';
      case 'video':
        return progress.videoSubmissions?.[lessonIndex] ? 'submitted' : 'not-started';
      case 'discussion':
        return progress.discussionResponses?.[lessonIndex] ? 'submitted' : 'not-started';
      case 'quiz':
      case 'test':
        return progress.quizSubmitted?.[lessonIndex] ? 'submitted' : 'not-started';
      default:
        return progress.completedLessons?.includes(lessonIndex) ? 'completed' : 'not-started';
    }
  };

  const getSubmissionContent = (studentId, lessonIndex, lessonType) => {
    const progress = studentProgress[studentId];
    if (!progress) return null;

    switch (lessonType) {
      case 'assignment':
        return progress.assignmentSubmissions?.[lessonIndex];
      case 'video':
        return progress.videoSubmissions?.[lessonIndex];
      case 'discussion':
        return progress.discussionResponses?.[lessonIndex];
      case 'quiz':
      case 'test':
        return progress.quizAnswers?.[lessonIndex];
      default:
        return null;
    }
  };

  const getExistingGrade = (studentId, lessonIndex, lessonType) => {
    const gradeKey = `${studentId}_${lessonType}_${lessonIndex}`;
    return grades[gradeKey];
  };

  const handleSubmissionClick = (studentId, lessonIndex, lessonType) => {
    const content = getSubmissionContent(studentId, lessonIndex, lessonType);
    const status = getSubmissionStatus(studentId, lessonIndex, lessonType);
    const existingGrade = getExistingGrade(studentId, lessonIndex, lessonType);
    
    if (status === 'submitted' || status === 'completed') {
      setSelectedSubmission({
        studentId,
        studentName: getStudentName(studentId),
        lessonIndex,
        lessonType,
        lessonTitle: unit.lessons[lessonIndex]?.title || `Lesson ${lessonIndex + 1}`,
        content,
        status,
        existingGrade,
        gradeScale: gradeScales[lessonIndex] || 100
      });

      // Pre-fill the grade input if there's an existing grade
      if (existingGrade) {
        setGrading(prev => ({
          ...prev,
          [`${studentId}_${lessonIndex}`]: existingGrade.grade.toString()
        }));
      }
    }
  };

  const handleGradeScaleChange = (lessonIndex, value) => {
    setGradeScales(prev => ({
      ...prev,
      [lessonIndex]: parseInt(value) || 100
    }));
  };

  const saveGradeScale = async (lessonIndex) => {
    setSavingScale(prev => ({ ...prev, [lessonIndex]: true }));
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/courses/${unit.id}/lessons/${lessonIndex}/grade-scale`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gradeScale: gradeScales[lessonIndex]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save grade scale');
      }

    } catch (err) {
      console.error('Error saving grade scale:', err);
      setError('Failed to save grade scale');
    } finally {
      setSavingScale(prev => ({ ...prev, [lessonIndex]: false }));
    }
  };

  const getStatusColor = (status, hasGrade = false) => {
    if (hasGrade) return '#059669'; // Darker green for graded
    switch (status) {
      case 'submitted':
      case 'completed':
        return '#10b981'; // Green
      case 'not-started':
        return '#6b7280'; // Gray
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status, hasGrade = false) => {
    if (hasGrade) return 'Graded';
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'completed':
        return 'Completed';
      case 'not-started':
        return 'Not Started';
      default:
        return 'Unknown';
    }
  };

  const handleGradeChange = (submissionId, grade) => {
    setGrading(prev => ({
      ...prev,
      [submissionId]: grade
    }));
  };

  const saveGrade = async (submissionId, grade, feedback = '') => {
    setSavingGrade(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/grading/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submissionId,
          grade,
          feedback,
          lessonType: selectedSubmission.lessonType,
          lessonIndex: selectedSubmission.lessonIndex,
          studentId: selectedSubmission.studentId,
          unitId: unit.id,
          gradeScale: selectedSubmission.gradeScale
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save grade');
      }

      // Update local state
      setGrading(prev => ({
        ...prev,
        [submissionId]: grade
      }));

      // Update grades state
      const gradeKey = `${selectedSubmission.studentId}_${selectedSubmission.lessonType}_${selectedSubmission.lessonIndex}`;
      setGrades(prev => ({
        ...prev,
        [gradeKey]: {
          grade: parseInt(grade),
          feedback: feedback || '',
          gradedAt: new Date(),
          teacherId: auth.currentUser?.uid,
          gradeScale: selectedSubmission.gradeScale
        }
      }));

      // Close modal after successful save
      setSelectedSubmission(null);

    } catch (err) {
      console.error('Error saving grade:', err);
      setError(err.message || 'Failed to save grade');
    } finally {
      setSavingGrade(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading grading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="grading-dashboard">
      {/* Header */}
      <div className="grading-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to Units
        </button>
        <h2>Grading Dashboard - {unit.title}</h2>
      </div>

      {/* Main grading grid */}
      <div className="grading-container">
        {/* Students header row */}
        <div className="students-header">
          <div className="lesson-label">Lessons</div>
          {students.map(student => (
            <div key={student.id} className="student-header">
              <div className="student-name">{getStudentName(student.id)}</div>
              <div className="student-email">{student.email}</div>
            </div>
          ))}
        </div>

        {/* Lessons and submissions grid */}
        <div className="submissions-grid">
          {unit.lessons?.map((lesson, lessonIndex) => (
            <div key={lessonIndex} className="lesson-row">
              <div className="lesson-info">
                <div className="lesson-title">{lesson.title}</div>
                <div className="lesson-type">{lesson.type}</div>
                <div className="grade-scale-section">
                  <label htmlFor={`grade-scale-${lessonIndex}`}>Grade Scale:</label>
                  <div className="grade-scale-input">
                    <input
                      type="number"
                      id={`grade-scale-${lessonIndex}`}
                      min="1"
                      max="1000"
                      value={gradeScales[lessonIndex] || 100}
                      onChange={(e) => handleGradeScaleChange(lessonIndex, e.target.value)}
                      onBlur={() => saveGradeScale(lessonIndex)}
                    />
                    <span className="grade-scale-unit">points</span>
                    {savingScale[lessonIndex] && (
                      <span className="saving-indicator">Saving...</span>
                    )}
                  </div>
                </div>
              </div>
              {students.map(student => {
                const status = getSubmissionStatus(student.id, lessonIndex, lesson.type);
                const hasSubmission = status === 'submitted';
                const existingGrade = getExistingGrade(student.id, lessonIndex, lesson.type);
                const hasGrade = !!existingGrade;
                const displayStatus = hasGrade ? 'graded' : status;
                const gradeScale = gradeScales[lessonIndex] || 100;
                
                return (
                  <div
                    key={`${student.id}-${lessonIndex}`}
                    className={`submission-cell ${displayStatus}`}
                    style={{ 
                      backgroundColor: getStatusColor(displayStatus, hasGrade),
                      cursor: hasSubmission ? 'pointer' : 'default'
                    }}
                  >
                    <div className="status-text">{getStatusText(displayStatus, hasGrade)}</div>
                    {hasGrade && (
                      <div className="grade-display">
                        {existingGrade.grade}/{gradeScale}
                      </div>
                    )}
                    {hasSubmission && (
                      <button
                        className="grade-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubmissionClick(student.id, lessonIndex, lesson.type);
                        }}
                        title={hasGrade ? "Regrade submission" : "Grade submission"}
                      >
                        {hasGrade ? '📝 Regrade' : '📝 Grade'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Submission & Grading Modal */}
      {selectedSubmission && (
        <div className="grading-modal-overlay" onClick={() => setSelectedSubmission(null)}>
          <div className="grading-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedSubmission.existingGrade ? 'Regrade' : 'Grade'} Submission</h3>
              <button className="btn-close" onClick={() => setSelectedSubmission(null)}>×</button>
            </div>
            <div className="modal-content">
              <div className="submission-info">
                <p><strong>Student:</strong> {selectedSubmission.studentName}</p>
                <p><strong>Lesson:</strong> {selectedSubmission.lessonTitle}</p>
                <p><strong>Type:</strong> {selectedSubmission.lessonType}</p>
                <p><strong>Status:</strong> {selectedSubmission.status}</p>
                <p><strong>Grade Scale:</strong> {selectedSubmission.gradeScale} points</p>
                {selectedSubmission.existingGrade && (
                  <div className="existing-grade">
                    <p><strong>Current Grade:</strong> {selectedSubmission.existingGrade.grade}/{selectedSubmission.gradeScale} points</p>
                    {selectedSubmission.existingGrade.feedback && (
                      <p><strong>Previous Feedback:</strong> {selectedSubmission.existingGrade.feedback}</p>
                    )}
                    <p><strong>Graded on:</strong> {new Date(selectedSubmission.existingGrade.gradedAt.toDate()).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              <div className="submission-content">
                <h4>Submission:</h4>
                {selectedSubmission.content ? (
                  <div className="content-display">
                    {selectedSubmission.lessonType === 'quiz' || selectedSubmission.lessonType === 'test' ? (
                      <div className="quiz-answers">
                        {Object.entries(selectedSubmission.content).map(([questionIndex, answer]) => (
                          <div key={questionIndex} className="quiz-answer">
                            <strong>Question {parseInt(questionIndex.split('_')[1]) + 1}:</strong>
                            <span>Answer {answer + 1}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-content">
                        {selectedSubmission.content}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="no-content">No submission content available.</p>
                )}
              </div>

              <div className="grading-section">
                <h4>Grade & Feedback</h4>
                <div className="grade-input">
                  <label htmlFor="grade">Grade (0-{selectedSubmission.gradeScale}):</label>
                  <input
                    type="number"
                    id="grade"
                    min="0"
                    max={selectedSubmission.gradeScale}
                    value={grading[`${selectedSubmission.studentId}_${selectedSubmission.lessonIndex}`] || ''}
                    onChange={(e) => handleGradeChange(`${selectedSubmission.studentId}_${selectedSubmission.lessonIndex}`, e.target.value)}
                    placeholder={`Enter grade (0-${selectedSubmission.gradeScale})`}
                  />
                </div>
                <div className="feedback-input">
                  <label htmlFor="feedback">Feedback (optional):</label>
                  <textarea
                    id="feedback"
                    rows="4"
                    placeholder="Provide feedback for the student..."
                    defaultValue={selectedSubmission.existingGrade?.feedback || ''}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setSelectedSubmission(null)}>
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    const grade = grading[`${selectedSubmission.studentId}_${selectedSubmission.lessonIndex}`];
                    const feedback = document.getElementById('feedback').value;
                    if (grade) {
                      saveGrade(`${selectedSubmission.studentId}_${selectedSubmission.lessonIndex}`, grade, feedback);
                    }
                  }}
                  disabled={savingGrade || !grading[`${selectedSubmission.studentId}_${selectedSubmission.lessonIndex}`]}
                >
                  {savingGrade ? 'Saving...' : (selectedSubmission.existingGrade ? 'Update Grade' : 'Save Grade')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradingDashboard;
