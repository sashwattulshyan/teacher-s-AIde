import React from 'react';
import LessonViewer from './LessonViewer';
import './StudentViewModal.css';

const StudentViewModal = ({ lesson, course, onClose }) => {
  if (!lesson || !course) {
    return null;
  }

  // Create a mock course with just the selected lesson
  const mockCourse = {
    ...course,
    lessons: [lesson]
  };

  // Mock lesson complete callback (doesn't actually save for teachers)
  const handleLessonComplete = (lessonIndex) => {
    console.log('Lesson completed:', lessonIndex);
  };

  return (
    <div className="student-view-modal-overlay">
      <div className="student-view-modal">
        <div className="modal-header">
          <h3>👁️ Student View - {lesson.title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="preview-notice">
            <p>🎓 This is how students will see this lesson. All interactions are simulated for preview purposes.</p>
          </div>
          
          <LessonViewer
            course={mockCourse}
            onBack={() => {}} // No back functionality in preview
            onLessonComplete={handleLessonComplete}
            initialLessonIndex={0}
          />
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentViewModal;
