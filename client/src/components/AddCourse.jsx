// src/components/AddCourse.jsx
import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./AddCourse.css";

const AddCourse = ({ classroomId, onCourseAdded }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lessons, setLessons] = useState([{ title: "", text: "" }]);

  const handleLessonChange = (index, field, value) => {
    const updatedLessons = [...lessons];
    updatedLessons[index][field] = value;
    setLessons(updatedLessons);
  };

  const addLesson = () => {
    setLessons([...lessons, { title: "", text: "" }]);
  };

  const removeLesson = (index) => {
    if (lessons.length > 1) {
      const updatedLessons = lessons.filter((_, i) => i !== index);
      setLessons(updatedLessons);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await addDoc(collection(db, "classrooms", classroomId, "courses"), {
        title,
        description,
        content: lessons,
      });

      // Reset form and notify parent
      setTitle("");
      setDescription("");
      setLessons([{ title: "", text: "" }]);
      if (onCourseAdded) onCourseAdded();
    } catch (error) {
      console.error("Error adding course:", error);
    }
  };

  return (
    <div className="add-course">
      <h3>Add a New Course</h3>
      <form className="course-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Course Title</label>
          <input
            type="text"
            placeholder="Enter course title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Course Description</label>
          <textarea
            placeholder="Enter course description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        
        <h4>Lessons</h4>
        {lessons.map((lesson, index) => (
          <div key={index} className="lesson-section">
            <div className="lesson-header">
              <span className="lesson-number">Lesson {index + 1}</span>
              {lessons.length > 1 && (
                <button
                  type="button"
                  className="btn-remove-lesson"
                  onClick={() => removeLesson(index)}
                >
                  ×
                </button>
              )}
            </div>
            
            <div className="form-group">
              <label>Lesson Title</label>
              <input
                type="text"
                placeholder="Enter lesson title"
                value={lesson.title}
                onChange={(e) =>
                  handleLessonChange(index, "title", e.target.value)
                }
                required
              />
            </div>
            
            <div className="form-group">
              <label>Lesson Content</label>
              <textarea
                placeholder="Enter lesson content"
                value={lesson.text}
                onChange={(e) =>
                  handleLessonChange(index, "text", e.target.value)
                }
                required
              />
            </div>
          </div>
        ))}
        
        <div className="form-actions">
          <button type="button" className="btn-add-lesson" onClick={addLesson}>
            Add Another Lesson
          </button>
          <button type="submit" className="btn-submit">
            Create Course
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCourse;
