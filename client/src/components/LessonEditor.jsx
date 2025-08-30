import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import './LessonEditor.css';

const LessonEditor = ({ lesson, onSave, onCancel, onDelete }) => {
  const [editedLesson, setEditedLesson] = useState(lesson);
  const [activeTab, setActiveTab] = useState('content');
  const [user] = useAuthState(auth);

  useEffect(() => {
    setEditedLesson(lesson);
  }, [lesson]);

  const handleFieldChange = (field, value) => {
    setEditedLesson(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field, index, value) => {
    setEditedLesson(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setEditedLesson(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setEditedLesson(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setEditedLesson(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const addQuestion = () => {
    setEditedLesson(prev => ({
      ...prev,
      questions: [...(prev.questions || []), {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      }]
    }));
  };

  const removeQuestion = (index) => {
    setEditedLesson(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(editedLesson);
  };

  const getLessonTypeIcon = (type) => {
    const icons = {
      lecture: '📚',
      reading: '📖',
      quiz: '❓',
      test: '📝',
      assignment: '📋',
      video: '🎥',
      interactive: '🎮',
      discussion: '💬',
      project: '🏗️',
      workshop: '🔧'
    };
    return icons[type] || '📄';
  };

  const renderContentTab = () => {
    switch (editedLesson.type) {
      case 'lecture':
        return (
          <div className="content-section">
            <div className="form-group">
              <label>Content</label>
              <textarea
                value={editedLesson.content || ''}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                placeholder="Enter lecture content..."
                rows={10}
              />
            </div>
            <div className="form-group">
              <label>Key Points</label>
              {(editedLesson.keyPoints || []).map((point, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => handleArrayFieldChange('keyPoints', index, e.target.value)}
                    placeholder="Enter key point..."
                  />
                  <button 
                    className="btn-remove"
                    onClick={() => removeArrayItem('keyPoints', index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button 
                className="btn-add"
                onClick={() => addArrayItem('keyPoints')}
              >
                + Add Key Point
              </button>
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={editedLesson.duration || 30}
                onChange={(e) => handleFieldChange('duration', parseInt(e.target.value))}
                min="1"
                max="180"
              />
            </div>
          </div>
        );

      case 'reading':
        return (
          <div className="content-section">
            <div className="form-group">
              <label>URL</label>
              <input
                type="url"
                value={editedLesson.url || ''}
                onChange={(e) => handleFieldChange('url', e.target.value)}
                placeholder="Enter reading URL..."
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editedLesson.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Enter reading description..."
                rows={5}
              />
            </div>
            <div className="form-group">
              <label>Discussion Questions</label>
              {(editedLesson.discussionQuestions || []).map((question, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => handleArrayFieldChange('discussionQuestions', index, e.target.value)}
                    placeholder="Enter discussion question..."
                  />
                  <button 
                    className="btn-remove"
                    onClick={() => removeArrayItem('discussionQuestions', index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button 
                className="btn-add"
                onClick={() => addArrayItem('discussionQuestions')}
              >
                + Add Question
              </button>
            </div>
            <div className="form-group">
              <label>Estimated Time (minutes)</label>
              <input
                type="number"
                value={editedLesson.estimatedTime || 15}
                onChange={(e) => handleFieldChange('estimatedTime', parseInt(e.target.value))}
                min="1"
                max="120"
              />
            </div>
          </div>
        );

      case 'quiz':
      case 'test':
        return (
          <div className="content-section">
            <div className="form-group">
              <label>Time Limit (minutes)</label>
              <input
                type="number"
                value={editedLesson.timeLimit || 30}
                onChange={(e) => handleFieldChange('timeLimit', parseInt(e.target.value))}
                min="1"
                max="180"
              />
            </div>
            <div className="questions-section">
              <label>Questions</label>
              {(editedLesson.questions || []).map((question, qIndex) => (
                <div key={qIndex} className="question-item">
                  <div className="question-header">
                    <span className="question-number">Question {qIndex + 1}</span>
                    <button 
                      className="btn-remove"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      value={question.question}
                      onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                      placeholder="Enter question..."
                    />
                  </div>
                  <div className="options-section">
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="option-item">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={question.correctAnswer === oIndex}
                          onChange={() => handleQuestionChange(qIndex, 'correctAnswer', oIndex)}
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleQuestionChange(qIndex, 'options', 
                            question.options.map((opt, i) => i === oIndex ? e.target.value : opt)
                          )}
                          placeholder={`Option ${oIndex + 1}`}
                          className={question.correctAnswer === oIndex ? 'correct-answer' : ''}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button 
                className="btn-add"
                onClick={addQuestion}
              >
                + Add Question
              </button>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="content-section">
            <div className="form-group">
              <label>Video URL</label>
              <input
                type="url"
                value={editedLesson.videoUrl || ''}
                onChange={(e) => handleFieldChange('videoUrl', e.target.value)}
                placeholder="Enter video URL..."
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editedLesson.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Enter video description..."
                rows={5}
              />
            </div>
            <div className="form-group">
              <label>Transcript</label>
              <textarea
                value={editedLesson.transcript || ''}
                onChange={(e) => handleFieldChange('transcript', e.target.value)}
                placeholder="Enter video transcript..."
                rows={8}
              />
            </div>
            <div className="form-group">
              <label>Key Points</label>
              {(editedLesson.keyPoints || []).map((point, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => handleArrayFieldChange('keyPoints', index, e.target.value)}
                    placeholder="Enter key point..."
                  />
                  <button 
                    className="btn-remove"
                    onClick={() => removeArrayItem('keyPoints', index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button 
                className="btn-add"
                onClick={() => addArrayItem('keyPoints')}
              >
                + Add Key Point
              </button>
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={editedLesson.duration || 15}
                onChange={(e) => handleFieldChange('duration', parseInt(e.target.value))}
                min="1"
                max="180"
              />
            </div>
          </div>
        );

      case 'interactive':
        return (
          <div className="content-section">
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editedLesson.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Enter interactive lesson description..."
                rows={5}
              />
            </div>
            <div className="form-group">
              <label>Instructions</label>
              <textarea
                value={editedLesson.instructions || ''}
                onChange={(e) => handleFieldChange('instructions', e.target.value)}
                placeholder="Enter instructions for students..."
                rows={5}
              />
            </div>
            <div className="form-group">
              <label>Activities</label>
              {(editedLesson.activities || []).map((activity, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={activity}
                    onChange={(e) => handleArrayFieldChange('activities', index, e.target.value)}
                    placeholder="Enter activity..."
                  />
                  <button 
                    className="btn-remove"
                    onClick={() => removeArrayItem('activities', index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button 
                className="btn-add"
                onClick={() => addArrayItem('activities')}
              >
                + Add Activity
              </button>
            </div>
            <div className="form-group">
              <label>Estimated Time (minutes)</label>
              <input
                type="number"
                value={editedLesson.estimatedTime || 45}
                onChange={(e) => handleFieldChange('estimatedTime', parseInt(e.target.value))}
                min="1"
                max="180"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="content-section">
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editedLesson.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Enter lesson description..."
                rows={8}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="lesson-editor">
      <div className="editor-header">
        <div className="lesson-info">
          <span className="lesson-icon">{getLessonTypeIcon(editedLesson.type)}</span>
          <div className="lesson-details">
            <input
              type="text"
              value={editedLesson.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="lesson-title-input"
              placeholder="Enter lesson title..."
            />
            <span className="lesson-type">{editedLesson.type}</span>
          </div>
        </div>
        <div className="editor-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          {onDelete && (
            <button className="btn-danger" onClick={() => onDelete(editedLesson)}>
              Delete
            </button>
          )}
          <button className="btn-primary" onClick={handleSave}>
            Save Lesson
          </button>
        </div>
      </div>

      <div className="editor-tabs">
        <button 
          className={`tab-button ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          Content
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      <div className="editor-content">
        {activeTab === 'content' && renderContentTab()}
        
        {activeTab === 'settings' && (
          <div className="settings-section">
            <div className="form-group">
              <label>Lesson Type</label>
              <select
                value={editedLesson.type}
                onChange={(e) => handleFieldChange('type', e.target.value)}
              >
                <option value="lecture">📚 Lecture</option>
                <option value="reading">📖 Reading</option>
                <option value="quiz">❓ Quiz</option>
                <option value="test">📝 Test</option>
                <option value="assignment">📋 Assignment</option>
                <option value="video">🎥 Video</option>
                <option value="interactive">🎮 Interactive</option>
                <option value="discussion">💬 Discussion</option>
                <option value="project">🏗️ Project</option>
                <option value="workshop">🔧 Workshop</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Estimated Duration (minutes)</label>
              <input
                type="number"
                value={editedLesson.duration || editedLesson.estimatedTime || 30}
                onChange={(e) => handleFieldChange('duration', parseInt(e.target.value))}
                min="1"
                max="180"
              />
            </div>

            <div className="form-group">
              <label>Points</label>
              <input
                type="number"
                value={editedLesson.points || 100}
                onChange={(e) => handleFieldChange('points', parseInt(e.target.value))}
                min="0"
                max="1000"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonEditor;
