// src/components/LessonManager.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import YouTubeSearch from './YouTubeSearch';
import MarkdownRenderer from './MarkdownRenderer';
import StudentViewModal from './StudentViewModal';
import GradingDashboard from './GradingDashboard';
import './LessonManager.css';

import API_CONFIG from '../config/api';

async function getAuthToken() {
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken();
}

const LessonManager = ({ course, classroom, onBack }) => {
  const [currentTab, setCurrentTab] = useState('edit'); // 'edit' or 'grading'
  const [lessons, setLessons] = useState(course.lessons || []);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Lesson form state
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState('lecture');
  const [lessonContent, setLessonContent] = useState('');

  // Quiz/Test specific state
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);

  // Reading specific state
  const [readingUrl, setReadingUrl] = useState('');
  const [readingDescription, setReadingDescription] = useState('');

  // Video specific state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTranscript, setVideoTranscript] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);

  // Interactive specific state
  const [interactiveActivities, setInteractiveActivities] = useState(['']);
  const [interactiveInstructions, setInteractiveInstructions] = useState('');

  // Discussion specific state
  const [discussionTopic, setDiscussionTopic] = useState('');
  const [discussionQuestions, setDiscussionQuestions] = useState(['']);

  // Project specific state
  const [projectObjectives, setProjectObjectives] = useState(['']);
  const [projectDeliverables, setProjectDeliverables] = useState(['']);
  const [projectTimeline, setProjectTimeline] = useState('');

  // Workshop specific state
  const [workshopMaterials, setWorkshopMaterials] = useState(['']);
  const [workshopGroupSize, setWorkshopGroupSize] = useState('');
  const [workshopDuration, setWorkshopDuration] = useState('');

  // Remove upload modal and stored uploads
  // const [showUploadModal, setShowUploadModal] = useState(false);
  // const [uploading, setUploading] = useState(false);
  // const [uploadFiles, setUploadFiles] = useState([]);
  // const [recentUploads, setRecentUploads] = useState([]);

  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLessonType, setAiLessonType] = useState('lecture');
  const [aiTitle, setAiTitle] = useState('');
  const [aiObjectivesText, setAiObjectivesText] = useState('');
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(10);
  const [aiQuestionTypesText, setAiQuestionTypesText] = useState('');
  const [aiNewFiles, setAiNewFiles] = useState([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [previewLesson, setPreviewLesson] = useState(null);
  const [autoSaveAfterGenerate, setAutoSaveAfterGenerate] = useState(false);
  
  // Video lesson AI generation state
  const [videoSource, setVideoSource] = useState('url');
  const [selectedVideoSource, setSelectedVideoSource] = useState('url');
  const [videoTitle, setVideoTitle] = useState('');
  const [showFullContent, setShowFullContent] = useState({});
  const [showStudentView, setShowStudentView] = useState(false);
  const [studentViewLesson, setStudentViewLesson] = useState(null);

  // Remove persisted uploads logic

  useEffect(() => {
    setLessons(course.lessons || []);
  }, [course]);

  // Remove persistRecentUploads

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!lessonTitle.trim()) {
      setError('Lesson title cannot be empty.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let newLesson = {
        title: lessonTitle.trim(),
        type: lessonType,
        createdAt: new Date(),
        order: lessons.length
      };

      // Add type-specific content
      switch (lessonType) {
        case 'lecture':
          newLesson.content = lessonContent.trim();
          break;
        case 'reading':
          newLesson.url = readingUrl.trim();
          newLesson.description = readingDescription.trim();
          break;
        case 'quiz':
        case 'test':
          newLesson.questions = questions.filter(q => q.question.trim() && q.options.some(opt => opt.trim()));
          break;
        case 'assignment':
          newLesson.description = lessonContent.trim();
          newLesson.dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
          break;
        case 'video':
          if (videoFile) {
            newLesson.videoFile = videoFile;
            newLesson.videoSource = 'upload';
          } else {
            newLesson.videoUrl = videoUrl.trim();
            newLesson.videoSource = 'url';
          }
          newLesson.transcript = videoTranscript.trim();
          newLesson.duration = parseInt(videoDuration) || 0;
          break;
        case 'interactive':
          newLesson.activities = interactiveActivities.filter(a => a.trim());
          newLesson.instructions = interactiveInstructions.trim();
          break;
        case 'discussion':
          newLesson.topic = discussionTopic.trim();
          newLesson.questions = discussionQuestions.filter(q => q.trim());
          break;
        case 'project':
          newLesson.objectives = projectObjectives.filter(o => o.trim());
          newLesson.deliverables = projectDeliverables.filter(d => d.trim());
          newLesson.timeline = projectTimeline.trim();
          break;
        case 'workshop':
          newLesson.materials = workshopMaterials.filter(m => m.trim());
          newLesson.groupSize = parseInt(workshopGroupSize) || 0;
          newLesson.duration = parseInt(workshopDuration) || 0;
          break;
        default:
          newLesson.content = lessonContent.trim();
      }

      const updatedLessons = [...lessons, newLesson];
      
      // Update the course in Firestore
      await updateDoc(doc(db, 'courses', course.id), {
        lessons: updatedLessons
      });

      setLessons(updatedLessons);
      
      // Reset form
      resetForm();
      setShowAddLesson(false);
    } catch (err) {
      console.error('Error adding lesson:', err);
      setError('Failed to add lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditLesson = async (index) => {
    setSelectedLessonIndex(index);
    const lesson = lessons[index];
    setLessonTitle(lesson.title);
    setLessonType(lesson.type);
    setLessonContent(lesson.content || lesson.description || '');
    setReadingUrl(lesson.url || '');
    setReadingDescription(lesson.description || '');
    setQuestions(lesson.questions || [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
    setVideoUrl(lesson.videoUrl || '');
    setVideoTranscript(lesson.transcript || '');
    setVideoDuration(lesson.duration || '');
    setVideoFile(lesson.videoFile || null);
    setVideoUploading(false);
    setSelectedVideoSource(lesson.videoSource || 'url');
    setInteractiveActivities(lesson.activities || ['']);
    setInteractiveInstructions(lesson.instructions || '');
    setDiscussionTopic(lesson.topic || '');
    setDiscussionQuestions(lesson.questions || ['']);
    setProjectObjectives(lesson.objectives || ['']);
    setProjectDeliverables(lesson.deliverables || ['']);
    setProjectTimeline(lesson.timeline || '');
    setWorkshopMaterials(lesson.materials || ['']);
    setWorkshopGroupSize(lesson.groupSize || '');
    setWorkshopDuration(lesson.duration || '');
    setShowAddLesson(true);
  };

  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    if (!lessonTitle.trim()) {
      setError('Lesson title cannot be empty.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let updatedLesson = {
        ...lessons[selectedLessonIndex],
        title: lessonTitle.trim(),
        type: lessonType,
        updatedAt: new Date()
      };

      // Update type-specific content
      switch (lessonType) {
        case 'lecture':
          updatedLesson.content = lessonContent.trim();
          break;
        case 'reading':
          updatedLesson.url = readingUrl.trim();
          updatedLesson.description = readingDescription.trim();
          break;
        case 'quiz':
        case 'test':
          updatedLesson.questions = questions.filter(q => q.question.trim() && q.options.some(opt => opt.trim()));
          break;
        case 'assignment':
          updatedLesson.description = lessonContent.trim();
          break;
        case 'video':
          if (videoFile) {
            updatedLesson.videoFile = videoFile;
            updatedLesson.videoSource = 'upload';
          } else {
            updatedLesson.videoUrl = videoUrl.trim();
            updatedLesson.videoSource = 'url';
          }
          updatedLesson.transcript = videoTranscript.trim();
          updatedLesson.duration = parseInt(videoDuration) || 0;
          break;
        case 'interactive':
          updatedLesson.activities = interactiveActivities.filter(a => a.trim());
          updatedLesson.instructions = interactiveInstructions.trim();
          break;
        case 'discussion':
          updatedLesson.topic = discussionTopic.trim();
          updatedLesson.questions = discussionQuestions.filter(q => q.trim());
          break;
        case 'project':
          updatedLesson.objectives = projectObjectives.filter(o => o.trim());
          updatedLesson.deliverables = projectDeliverables.filter(d => d.trim());
          updatedLesson.timeline = projectTimeline.trim();
          break;
        case 'workshop':
          updatedLesson.materials = workshopMaterials.filter(m => m.trim());
          updatedLesson.groupSize = parseInt(workshopGroupSize) || 0;
          updatedLesson.duration = parseInt(workshopDuration) || 0;
          break;
        default:
          updatedLesson.content = lessonContent.trim();
      }

      const updatedLessons = [...lessons];
      updatedLessons[selectedLessonIndex] = updatedLesson;
      
      await updateDoc(doc(db, 'courses', course.id), {
        lessons: updatedLessons
      });

      setLessons(updatedLessons);
      resetForm();
      setShowAddLesson(false);
      setSelectedLessonIndex(null);
    } catch (err) {
      console.error('Error updating lesson:', err);
      setError('Failed to update lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (index) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;

    try {
      const updatedLessons = lessons.filter((_, i) => i !== index);
      await updateDoc(doc(db, 'courses', course.id), {
        lessons: updatedLessons
      });
      setLessons(updatedLessons);
    } catch (err) {
      console.error('Error deleting lesson:', err);
      setError('Failed to delete lesson. Please try again.');
    }
  };

  const resetForm = () => {
    setLessonTitle('');
    setLessonType('lecture');
    setLessonContent('');
    setReadingUrl('');
    setReadingDescription('');
    setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
    setVideoUrl('');
    setVideoTranscript('');
    setVideoDuration('');
    setVideoFile(null);
    setVideoUploading(false);
    setUploadedVideo(null);
    setSelectedVideoSource('url');
    setInteractiveActivities(['']);
    setInteractiveInstructions('');
    setDiscussionTopic('');
    setDiscussionQuestions(['']);
    setProjectObjectives(['']);
    setProjectDeliverables(['']);
    setProjectTimeline('');
    setWorkshopMaterials(['']);
    setWorkshopGroupSize('');
    setWorkshopDuration('');
    setError('');
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Helper functions for array management
  const addArrayItem = (array, setArray) => {
    setArray([...array, '']);
  };

  const removeArrayItem = (array, setArray, index) => {
    setArray(array.filter((_, i) => i !== index));
  };

  const updateArrayItem = (array, setArray, index, value) => {
    const newArray = [...array];
    newArray[index] = value;
    setArray(newArray);
  };

  // Remove handleUploadMaterials

  // Remove toggleSelectExistingUpload

  const handleGenerateWithAI = async (e) => {
    e.preventDefault();
    setAiError('');
    setAiGenerating(true);
    setAiError(''); // Clear any previous errors
    
    // Show progress message for long-running requests
    const progressInterval = setInterval(() => {
      setAiError('AI is generating your lesson... This may take up to 5 minutes for complex content.');
    }, 30000); // Update every 30 seconds
    
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const formData = new FormData();
      
      // Debug logging
      if (!course?.id) {
        throw new Error('Course ID is missing. Please try refreshing the page.');
      }
      
      // Ensure unitId is a string
      const unitId = String(course.id);
      formData.append('unitId', unitId);
      formData.append('lessonType', String(aiLessonType || '').toLowerCase());
      if (aiTitle.trim()) formData.append('title', aiTitle.trim());
      if (aiSourceText.trim()) formData.append('sourceText', aiSourceText.trim());
      
      // Add reading URL for reading lessons
      if (aiLessonType === 'reading' && readingUrl.trim()) {
        formData.append('readingUrl', readingUrl.trim());
      }
      
      // Add video URL for video lessons
      if (aiLessonType === 'video' && videoUrl.trim()) {
        formData.append('videoUrl', videoUrl.trim());
      }
      
      // Add video file for video lessons
      if (aiLessonType === 'video' && videoFile) {
        formData.append('videoFile', videoFile);
      }
      
      const objectivesArray = aiObjectivesText.split('\n').map((s) => s.trim()).filter(Boolean);
      if (objectivesArray.length) formData.append('objectives', JSON.stringify(objectivesArray));

      const isQuizLike = aiLessonType === 'quiz' || aiLessonType === 'test';
      if (isQuizLike) {
        formData.append('numQuestions', String(aiNumQuestions));
        if (aiQuestionTypesText.trim()) {
          formData.append('questionTypes', aiQuestionTypesText.trim());
        }
      }

      // Attach files directly for generation (memory-only server)
      Array.from(aiNewFiles || []).forEach((file) => formData.append('files', file));

      const endpoint = isQuizLike ? 'generate-quiz' : 'generate-lesson';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
      
      // Debug: Log what's being sent
      console.log('AI Generation Request:', {
        endpoint: `${API_CONFIG.ENDPOINTS.AI}/${endpoint}`,
        lessonType: aiLessonType,
        isQuizLike,
        hasFiles: (aiNewFiles || []).length > 0
      });
      
      const res = await fetch(`${API_CONFIG.ENDPOINTS.AI}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('AI Generation Response:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        contentType: res.headers.get('content-type')
      });
      
      let data;
      try {
        data = await res.json();
        console.log('AI Generation Data:', data);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error(`Server response error: ${res.status} ${res.statusText}`);
      }
      
      if (!res.ok) {
        const friendly = (data && (data.message || data.error)) ||
          (Array.isArray(data?.errors) ? data.errors.map(e => e.msg || e.message || JSON.stringify(e)).join('; ') : null) ||
          `HTTP ${res.status}`;
        if (data?.debug?.rawModelText) {
          // Log model output for debugging in dev
          // eslint-disable-next-line no-console
          console.debug('AI raw model output:', data.debug.rawModelText);
        }
        throw new Error(friendly || 'AI generation failed');
      }

      setPreviewLesson(data.lesson);
      setShowAIModal(false);
      setReadingUrl(''); // Clear reading URL after successful generation
      setVideoUrl(''); // Clear video URL after successful generation
      setVideoFile(null); // Clear video file after successful generation
      setVideoSource('url'); // Reset video source
      setVideoTitle(''); // Clear video title

      if (autoSaveAfterGenerate && data.lesson) {
        await addPreviewLessonToCourse(data.lesson);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setAiError('Request timed out after 5 minutes. AI generation is taking longer than expected. Please try again with less content or simpler objectives.');
      } else {
        console.error('AI generation error:', err);
        setAiError(err.message || 'Failed to generate content');
      }
    } finally {
      clearInterval(progressInterval);
      setAiGenerating(false);
    }
  };

  const addPreviewLessonToCourse = async (lesson = previewLesson) => {
    if (!lesson) return;
    try {
      const updated = [...lessons, lesson];
      await updateDoc(doc(db, 'courses', course.id), { lessons: updated });
      setLessons(updated);
      setPreviewLesson(null);
    } catch (err) {
      console.error('Error saving generated lesson:', err);
      setError('Failed to save generated lesson.');
    }
  };

  const handleStudentView = (lesson) => {
    setStudentViewLesson(lesson);
    setShowStudentView(true);
  };

  const closeStudentView = () => {
    setShowStudentView(false);
    setStudentViewLesson(null);
  };

  const uploadVideoFile = async (file) => {
    if (!file) return;

    setVideoUploading(true);
    setUploadProgress(0);

    try {
      // Get auth token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('video', file);
      formData.append('lessonId', selectedLessonIndex?.toString() || '');
      formData.append('unitId', course.id);

      // Upload video
      const response = await fetch(`${API_CONFIG.ENDPOINTS.VIDEO}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setUploadedVideo(data.video);
      setVideoUrl(data.video.url); // Set the video URL for the lesson
      setError('');

    } catch (err) {
      console.error('Video upload error:', err);
      setError(err.message || 'Failed to upload video');
    } finally {
      setVideoUploading(false);
      setUploadProgress(0);
    }
  };

  const renderContentForm = () => {
    switch (lessonType) {
      case 'lecture':
        return (
          <div className="form-group">
            <label htmlFor="lessonContent">Lecture Content</label>
            <textarea
              id="lessonContent"
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
              placeholder="Enter your lecture content..."
              rows="8"
            />
          </div>
        );
      
      case 'reading':
        return (
          <>
            <div className="form-group">
              <label htmlFor="readingUrl">Reading URL</label>
              <input
                type="url"
                id="readingUrl"
                value={readingUrl}
                onChange={(e) => setReadingUrl(e.target.value)}
                placeholder="https://example.com/article"
              />
            </div>
            <div className="form-group">
              <label htmlFor="readingDescription">Reading Description</label>
              <textarea
                id="readingDescription"
                value={readingDescription}
                onChange={(e) => setReadingDescription(e.target.value)}
                placeholder="Describe what students should read and learn..."
                rows="4"
              />
            </div>
          </>
        );
      
      case 'quiz':
      case 'test':
        return (
          <div className="questions-section">
            <label>Questions</label>
            {questions.map((question, qIndex) => (
              <div key={qIndex} className="question-card">
                <div className="question-header">
                  <span className="question-number">Question {qIndex + 1}</span>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  value={question.question}
                  onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                  placeholder="Enter your question..."
                  className="question-input"
                />
                <div className="options-section">
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="option-row">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={question.correctAnswer === oIndex}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        className="option-input"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addQuestion}>
              + Add Question
            </button>
          </div>
        );
      
      case 'assignment':
        return (
          <div className="form-group">
            <label htmlFor="lessonContent">Assignment Description</label>
            <textarea
              id="lessonContent"
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
              placeholder="Describe the assignment requirements..."
              rows="6"
            />
          </div>
        );

      case 'video':
        return (
          <>
            <div className="form-group">
              <label>Video Source</label>
              <div className="video-source-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="videoSource"
                    value="url"
                    checked={selectedVideoSource === 'url'}
                    onChange={() => {
                      setSelectedVideoSource('url');
                      setVideoFile(null);
                      setUploadedVideo(null);
                    }}
                  />
                  <span>Video URL (YouTube, Vimeo, etc.)</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="videoSource"
                    value="upload"
                    checked={selectedVideoSource === 'upload'}
                    onChange={() => {
                      setSelectedVideoSource('upload');
                      setVideoUrl('');
                    }}
                  />
                  <span>Upload Video File</span>
                </label>
              </div>
            </div>
            
            {selectedVideoSource === 'url' ? (
              <div className="form-group">
                <label htmlFor="videoUrl">Video URL or Search YouTube</label>
                <div className="video-input-container">
                  <input
                    type="url"
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or search for videos"
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowYouTubeSearch(true)}
                  >
                    🔍 Search YouTube
                  </button>
                </div>
                {showYouTubeSearch && (
                  <YouTubeSearch
                    onSelectVideo={(video) => {
                      setVideoUrl(video.url);
                      setShowYouTubeSearch(false);
                    }}
                    onClose={() => setShowYouTubeSearch(false)}
                  />
                )}
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="videoFile">Upload Video</label>
                <input
                  type="file"
                  id="videoFile"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setVideoFile(file);
                    if (file) {
                      uploadVideoFile(file);
                    }
                  }}
                  className="file-input"
                  disabled={videoUploading}
                />
                {videoFile && (
                  <div className="file-info">
                    <span>Selected: {videoFile.name}</span>
                    <span>Size: {(videoFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    {videoUploading && (
                      <div className="upload-progress">
                        <span>Uploading...</span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {uploadedVideo && (
                      <div className="upload-success">
                        <span>✅ Uploaded successfully!</span>
                        <button
                          type="button"
                          className="btn-remove small"
                          onClick={() => {
                            setVideoFile(null);
                            setUploadedVideo(null);
                            setVideoUrl('');
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="videoDuration">Duration (minutes)</label>
              <input
                type="number"
                id="videoDuration"
                value={videoDuration}
                onChange={(e) => setVideoDuration(e.target.value)}
                placeholder="15"
                min="1"
              />
            </div>
            <div className="form-group">
              <label htmlFor="videoTranscript">Video Transcript/Notes</label>
              <textarea
                id="videoTranscript"
                value={videoTranscript}
                onChange={(e) => setVideoTranscript(e.target.value)}
                placeholder="Add transcript or key points from the video..."
                rows="6"
              />
            </div>
          </>
        );

      case 'interactive':
        return (
          <>
            <div className="form-group">
              <label htmlFor="interactiveInstructions">Instructions</label>
              <textarea
                id="interactiveInstructions"
                value={interactiveInstructions}
                onChange={(e) => setInteractiveInstructions(e.target.value)}
                placeholder="Describe the interactive activity..."
                rows="4"
              />
            </div>
            <div className="form-group">
              <label>Activities</label>
              {interactiveActivities.map((activity, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={activity}
                    onChange={(e) => updateArrayItem(interactiveActivities, setInteractiveActivities, index, e.target.value)}
                    placeholder={`Activity ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeArrayItem(interactiveActivities, setInteractiveActivities, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={() => addArrayItem(interactiveActivities, setInteractiveActivities)}>
                + Add Activity
              </button>
            </div>
          </>
        );

      case 'discussion':
        return (
          <>
            <div className="form-group">
              <label htmlFor="discussionTopic">Discussion Topic</label>
              <input
                type="text"
                id="discussionTopic"
                value={discussionTopic}
                onChange={(e) => setDiscussionTopic(e.target.value)}
                placeholder="Main discussion topic"
              />
            </div>
            <div className="form-group">
              <label>Discussion Questions</label>
              {discussionQuestions.map((question, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => updateArrayItem(discussionQuestions, setDiscussionQuestions, index, e.target.value)}
                    placeholder={`Question ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeArrayItem(discussionQuestions, setDiscussionQuestions, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={() => addArrayItem(discussionQuestions, setDiscussionQuestions)}>
                + Add Question
              </button>
            </div>
          </>
        );

      case 'project':
        return (
          <>
            <div className="form-group">
              <label>Project Objectives</label>
              {projectObjectives.map((objective, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => updateArrayItem(projectObjectives, setProjectObjectives, index, e.target.value)}
                    placeholder={`Objective ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeArrayItem(projectObjectives, setProjectObjectives, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={() => addArrayItem(projectObjectives, setProjectObjectives)}>
                + Add Objective
              </button>
            </div>
            <div className="form-group">
              <label>Deliverables</label>
              {projectDeliverables.map((deliverable, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={deliverable}
                    onChange={(e) => updateArrayItem(projectDeliverables, setProjectDeliverables, index, e.target.value)}
                    placeholder={`Deliverable ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeArrayItem(projectDeliverables, setProjectDeliverables, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={() => addArrayItem(projectDeliverables, setProjectDeliverables)}>
                + Add Deliverable
              </button>
            </div>
            <div className="form-group">
              <label htmlFor="projectTimeline">Timeline</label>
              <textarea
                id="projectTimeline"
                value={projectTimeline}
                onChange={(e) => setProjectTimeline(e.target.value)}
                placeholder="Project timeline and milestones..."
                rows="4"
              />
            </div>
          </>
        );

      case 'workshop':
        return (
          <>
            <div className="form-group">
              <label>Required Materials</label>
              {workshopMaterials.map((material, index) => (
                <div key={index} className="array-item">
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => updateArrayItem(workshopMaterials, setWorkshopMaterials, index, e.target.value)}
                    placeholder={`Material ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeArrayItem(workshopMaterials, setWorkshopMaterials, index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={() => addArrayItem(workshopMaterials, setWorkshopMaterials)}>
                + Add Material
              </button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="workshopGroupSize">Group Size</label>
                <input
                  type="number"
                  id="workshopGroupSize"
                  value={workshopGroupSize}
                  onChange={(e) => setWorkshopGroupSize(e.target.value)}
                  placeholder="4"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label htmlFor="workshopDuration">Duration (minutes)</label>
                <input
                  type="number"
                  id="workshopDuration"
                  value={workshopDuration}
                  onChange={(e) => setWorkshopDuration(e.target.value)}
                  placeholder="60"
                  min="15"
                />
              </div>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="lesson-manager">
      {/* Header */}
      <div className="section-header">
        <div>
          <button className="btn-back" onClick={onBack}>
            ← Back to Units
          </button>
          <h2>{course.title}</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="unit-tabs">
        <button 
          className={`tab-button ${currentTab === 'edit' ? 'active' : ''}`}
          onClick={() => setCurrentTab('edit')}
        >
          📝 Course Editing
        </button>
        <button 
          className={`tab-button ${currentTab === 'grading' ? 'active' : ''}`}
          onClick={() => setCurrentTab('grading')}
        >
          📊 Grading
        </button>
      </div>

      {/* Course Editing Tab */}
      {currentTab === 'edit' && (
        <>
          <div className="edit-header">
            <h3>Lessons in {course.title}</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className="btn-secondary"
                onClick={() => {
                  resetForm();
                  setSelectedLessonIndex(null);
                  setShowAddLesson(true);
                }}
              >
                + Add New Lesson
              </button>
              <button className="btn-primary" onClick={() => setShowAIModal(true)}>Generate with AI</button>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit lesson form */}
      {showAddLesson && (
        <div className="create-form-overlay">
          <div className="create-form large">
            <h3>{selectedLessonIndex !== null ? 'Edit Lesson' : 'Add New Lesson'}</h3>
            <form onSubmit={selectedLessonIndex !== null ? handleUpdateLesson : handleAddLesson}>
              <div className="form-group">
                <label htmlFor="lessonTitle">Lesson Title</label>
                <input
                  type="text"
                  id="lessonTitle"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Enter lesson title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lessonType">Lesson Type</label>
                <select
                  id="lessonType"
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value)}
                >
                  <option value="lecture">📚 Lecture - Traditional text-based lessons with key points</option>
                  <option value="reading">📖 Reading - External resources with discussion questions</option>
                  <option value="quiz">❓ Quiz - Shorter assessments</option>
                  <option value="test">📝 Test - Formal assessments with time limits</option>
                  <option value="assignment">📋 Assignment - Project-based learning with rubrics</option>
                  <option value="video">🎥 Video - Video lessons with transcripts and key points</option>
                  <option value="interactive">🎮 Interactive - Hands-on activities and instructions</option>
                  <option value="discussion">💬 Discussion - Collaborative learning with guidelines</option>
                  <option value="project">🏗️ Project - Long-term assignments with deliverables</option>
                  <option value="workshop">🔧 Workshop - Group activities with materials</option>
                </select>
              </div>
              
              {renderContentForm()}
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddLesson(false);
                    resetForm();
                    setSelectedLessonIndex(null);
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
                  {loading ? 'Saving...' : (selectedLessonIndex !== null ? 'Update Lesson' : 'Add Lesson')}
                </button>
              </div>
              
              {error && <p className="error">{error}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Generate with AI Modal */}
      {showAIModal && (
        <div className="create-form-overlay">
          <div className="create-form large">
            <h3>Generate Lesson with AI</h3>
            <form onSubmit={handleGenerateWithAI}>
              <div className="form-group">
                <label>Lesson Type</label>
                <select value={aiLessonType} onChange={(e) => {
                  setAiLessonType(e.target.value);
                  // Clear reading URL when lesson type changes
                  if (e.target.value !== 'reading') {
                    setReadingUrl('');
                  }
                  // Clear video data when lesson type changes
                  if (e.target.value !== 'video') {
                    setVideoUrl('');
                    setVideoFile(null);
                    setVideoSource('url');
                    setVideoTitle('');
                  }
                }}>
                  <option value="lecture">📚 Lecture - Traditional text-based lessons with key points</option>
                  <option value="reading">📖 Reading - External resources with discussion questions</option>
                  <option value="quiz">❓ Quiz - Shorter assessments</option>
                  <option value="test">📝 Test - Formal assessments with time limits</option>
                  <option value="assignment">📋 Assignment - Project-based learning with rubrics</option>
                  <option value="video">🎥 Video - Video lessons with transcripts and key points</option>
                  <option value="interactive">🎮 Interactive - Hands-on activities and instructions</option>
                  <option value="discussion">💬 Discussion - Collaborative learning with guidelines</option>
                  <option value="project">🏗️ Project - Long-term assignments with deliverables</option>
                  <option value="workshop">🔧 Workshop - Group activities with materials</option>
                </select>
              </div>
              <div className="form-group">
                <label>Title (optional)</label>
                <input type="text" value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} placeholder="Lesson title" />
              </div>
              <div className="form-group">
                <label>Objectives (optional)</label>
                <textarea value={aiObjectivesText} onChange={(e) => setAiObjectivesText(e.target.value)} placeholder="One per line" rows="3" />
              </div>
              <div className="form-group">
                <label>Source Text or Lesson Topic</label>
                <textarea value={aiSourceText} onChange={(e) => setAiSourceText(e.target.value)} placeholder="Paste any relevant material here or add any guidelines for generation (ie. focus on chapter one of the file, introduction to grammar concepts, etc.)" rows="6" />
              </div>

              {aiLessonType === 'reading' && (
                <div className="form-group">
                  <label>Reading URL (optional)</label>
                  <input 
                    type="url" 
                    value={readingUrl} 
                    onChange={(e) => setReadingUrl(e.target.value)} 
                    placeholder="https://example.com/article" 
                  />
                </div>
              )}

              {aiLessonType === 'video' && (
                <div className="form-group">
                  <label>Video Source</label>
                  <div className="video-source-options">
                    <div className="video-option">
                      <label>
                        <input 
                          type="radio" 
                          name="videoSource" 
                          value="url" 
                          checked={videoSource === 'url'} 
                          onChange={(e) => setVideoSource(e.target.value)} 
                        />
                        Video URL
                      </label>
                      {videoSource === 'url' && (
                        <input 
                          type="url" 
                          value={videoUrl} 
                          onChange={(e) => setVideoUrl(e.target.value)} 
                          placeholder="https://www.youtube.com/watch?v=..." 
                          style={{ marginTop: '8px' }}
                        />
                      )}
                    </div>
                    
                    <div className="video-option">
                      <label>
                        <input 
                          type="radio" 
                          name="videoSource" 
                          value="youtube" 
                          checked={videoSource === 'youtube'} 
                          onChange={(e) => setVideoSource(e.target.value)} 
                        />
                        YouTube Search
                      </label>
                      {videoSource === 'youtube' && (
                        <div style={{ marginTop: '8px' }}>
                          <YouTubeSearch 
                            onSelectVideo={(video) => {
                              setVideoUrl(video.url);
                              setVideoTitle(video.title);
                              setVideoSource('url');
                            }}
                            onClose={() => setVideoSource('url')}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="video-option">
                      <label>
                        <input 
                          type="radio" 
                          name="videoSource" 
                          value="upload" 
                          checked={videoSource === 'upload'} 
                          onChange={(e) => setVideoSource(e.target.value)} 
                        />
                        Upload Video File
                      </label>
                      {videoSource === 'upload' && (
                        <input 
                          type="file" 
                          accept="video/*" 
                          onChange={(e) => setVideoFile(e.target.files[0])} 
                          style={{ marginTop: '8px' }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(aiLessonType === 'quiz' || aiLessonType === 'test') && (
                <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Number of Questions</label>
                    <input type="number" min="1" max="100" value={aiNumQuestions} onChange={(e) => setAiNumQuestions(parseInt(e.target.value || '1'))} />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Question Types (comma-separated)</label>
                    <input type="text" value={aiQuestionTypesText} onChange={(e) => setAiQuestionTypesText(e.target.value)} placeholder="multiple choice, true/false, vocabulary" />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Attach Files (PDF, PPT/PPTX, TXT, MP4/MOV)</label>
                <input type="file" multiple accept=".pdf,.ppt,.pptx,.txt,.mp4,.mov" onChange={(e) => setAiNewFiles(e.target.files)} />
              </div>

              <div className="form-group">
                <label>
                  <input type="checkbox" checked={autoSaveAfterGenerate} onChange={(e) => setAutoSaveAfterGenerate(e.target.checked)} />
                  <span style={{ marginLeft: 8 }}>Automatically save to course after generation</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setShowAIModal(false);
                  setReadingUrl(''); // Clear reading URL when modal is closed
                  setVideoUrl(''); // Clear video URL when modal is closed
                  setVideoFile(null); // Clear video file when modal is closed
                  setVideoSource('url'); // Reset video source
                  setVideoTitle(''); // Clear video title
                }} disabled={aiGenerating}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={aiGenerating}>{aiGenerating ? 'Generating...' : 'Generate'}</button>
              </div>

              {aiError && <p className="error">{aiError}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Preview generated lesson */}
      {previewLesson && (
        <div className="lesson-card" style={{ border: '2px dashed #aaa' }}>
          <div className="lesson-header">
            <div className="lesson-info">
              <h3>Preview: {previewLesson.title}</h3>
              <span className={`lesson-type ${previewLesson.type}`}>{previewLesson.type}</span>
            </div>
            <div className="lesson-actions">
              <button className="btn-primary small" onClick={() => addPreviewLessonToCourse()}>Add to Course</button>
              <button 
                className="btn-secondary small" 
                onClick={() => {
                  if (window.confirm('Are you sure you want to discard this lesson? You can always edit the course after you add it.')) {
                    setPreviewLesson(null);
                  }
                }}
              >
                Discard
              </button>
            </div>
          </div>
          <div className="lesson-preview">
            {previewLesson.type === 'lecture' && (
              <MarkdownRenderer 
                content={previewLesson.content || ''} 
                maxLength={300}
                showStudentViewButton={true}
                onStudentView={() => handleStudentView(previewLesson)}
                className="lesson-content-preview"
              />
            )}
            {previewLesson.type === 'reading' && (
              <div>
                <p><strong>URL:</strong> {previewLesson.url}</p>
                <MarkdownRenderer 
                  content={previewLesson.description || ''} 
                  maxLength={300}
                  showStudentViewButton={true}
                  onStudentView={() => handleStudentView(previewLesson)}
                  className="lesson-content-preview"
                />
              </div>
            )}
            {(previewLesson.type === 'quiz' || previewLesson.type === 'test') && (
              <div>
                <p><strong>{previewLesson.questions?.length || 0} questions</strong></p>
                {previewLesson.questions?.slice(0, 2).map((q, index) => (
                  <div key={index} className="question-preview">
                    <MarkdownRenderer 
                      content={q.question} 
                      className="question-text"
                    />
                  </div>
                ))}
              </div>
            )}
            {previewLesson.type === 'assignment' && (
              <MarkdownRenderer 
                content={previewLesson.description || ''} 
                maxLength={300}
                showStudentViewButton={true}
                onStudentView={() => handleStudentView(previewLesson)}
                className="lesson-content-preview"
              />
            )}
            {previewLesson.type === 'video' && (
              <div>
                <p><strong>Video URL:</strong> {previewLesson.videoUrl}</p>
                <MarkdownRenderer 
                  content={previewLesson.description || ''} 
                  maxLength={300}
                  showStudentViewButton={true}
                  onStudentView={() => handleStudentView(previewLesson)}
                  className="lesson-content-preview"
                />
              </div>
            )}
            {previewLesson.type === 'interactive' && (
              <MarkdownRenderer 
                content={previewLesson.description || ''} 
                maxLength={300}
                showStudentViewButton={true}
                onStudentView={() => handleStudentView(previewLesson)}
                className="lesson-content-preview"
              />
            )}
            {previewLesson.type === 'discussion' && (
              <div>
                <p><strong>Topic:</strong> {previewLesson.topic}</p>
                <MarkdownRenderer 
                  content={previewLesson.guidelines || ''} 
                  maxLength={300}
                  showStudentViewButton={true}
                  onStudentView={() => handleStudentView(previewLesson)}
                  className="lesson-content-preview"
                />
              </div>
            )}
            {previewLesson.type === 'project' && (
              <MarkdownRenderer 
                content={previewLesson.description || ''} 
                maxLength={300}
                showStudentViewButton={true}
                onStudentView={() => handleStudentView(previewLesson)}
                className="lesson-content-preview"
              />
            )}
            {previewLesson.type === 'workshop' && (
              <MarkdownRenderer 
                content={previewLesson.description || ''} 
                maxLength={300}
                showStudentViewButton={true}
                onStudentView={() => handleStudentView(previewLesson)}
                className="lesson-content-preview"
              />
            )}
          </div>
        </div>
      )}

      {/* Course Editing Tab Content */}
      {currentTab === 'edit' && (
        <>
          {/* Lessons list */}
          <div className="lessons-list">
            {lessons.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No Lessons Yet</h3>
                <p>Add your first lesson to start building course content.</p>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    resetForm();
                    setSelectedLessonIndex(null);
                    setShowAddLesson(true);
                  }}
                >
                  Add Your First Lesson
                </button>
              </div>
            ) : (
              lessons.map((lesson, index) => (
            <div key={index} className="lesson-card">
              <div className="lesson-header">
                <div className="lesson-info">
                  <h3>{lesson.title}</h3>
                  <span className={`lesson-type ${lesson.type}`}>
                    {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)}
                  </span>
                </div>
                <div className="lesson-actions">
                  <button 
                    className="btn-secondary small"
                    onClick={() => handleEditLesson(index)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-danger small"
                    onClick={() => handleDeleteLesson(index)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="lesson-preview">
                {lesson.type === 'lecture' && (
                  <MarkdownRenderer 
                    content={lesson.content || ''} 
                    maxLength={150}
                    showStudentViewButton={true}
                    onStudentView={() => handleStudentView(lesson)}
                    className="lesson-content-preview"
                  />
                )}
                {lesson.type === 'reading' && (
                  <div>
                    <p><strong>URL:</strong> {lesson.url}</p>
                    <MarkdownRenderer 
                      content={lesson.description || ''} 
                      maxLength={100}
                      showStudentViewButton={true}
                      onStudentView={() => handleStudentView(lesson)}
                      className="lesson-content-preview"
                    />
                  </div>
                )}
                {lesson.type === 'quiz' && (
                  <p><strong>{lesson.questions?.length || 0} questions</strong></p>
                )}
                {lesson.type === 'test' && (
                  <p><strong>{lesson.questions?.length || 0} questions</strong></p>
                )}
                {lesson.type === 'assignment' && (
                  <MarkdownRenderer 
                    content={lesson.description || ''} 
                    maxLength={150}
                    showStudentViewButton={true}
                    onStudentView={() => handleStudentView(lesson)}
                    className="lesson-content-preview"
                  />
                )}
                {lesson.type === 'video' && (
                  <div>
                    <p><strong>Video:</strong> {lesson.videoUrl}</p>
                    <MarkdownRenderer 
                      content={lesson.description || ''} 
                      maxLength={100}
                      showStudentViewButton={true}
                      onStudentView={() => handleStudentView(lesson)}
                      className="lesson-content-preview"
                    />
                  </div>
                )}
                {lesson.type === 'interactive' && (
                  <MarkdownRenderer 
                    content={lesson.description || ''} 
                    maxLength={150}
                    showStudentViewButton={true}
                    onStudentView={() => handleStudentView(lesson)}
                    className="lesson-content-preview"
                  />
                )}
                {lesson.type === 'discussion' && (
                  <div>
                    <p><strong>Topic:</strong> {lesson.topic}</p>
                    <MarkdownRenderer 
                      content={lesson.guidelines || ''} 
                      maxLength={100}
                      showStudentViewButton={true}
                      onStudentView={() => handleStudentView(lesson)}
                      className="lesson-content-preview"
                    />
                  </div>
                )}
                {lesson.type === 'project' && (
                  <MarkdownRenderer 
                    content={lesson.description || ''} 
                    maxLength={150}
                    showStudentViewButton={true}
                    onStudentView={() => handleStudentView(lesson)}
                    className="lesson-content-preview"
                  />
                )}
                {lesson.type === 'workshop' && (
                  <MarkdownRenderer 
                    content={lesson.description || ''} 
                    maxLength={150}
                    showStudentViewButton={true}
                    onStudentView={() => handleStudentView(lesson)}
                    className="lesson-content-preview"
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}

      {/* Grading Tab */}
      {currentTab === 'grading' && (
        <GradingDashboard 
          unit={course}
          classroom={classroom}
          onBack={onBack}
        />
      )}

      {/* Student View Modal */}
      {showStudentView && (
        <StudentViewModal
          lesson={studentViewLesson}
          course={course}
          onClose={closeStudentView}
        />
      )}
    </div>
  );
};

export default LessonManager;
