// src/components/LessonViewer.jsx
import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import MarkdownRenderer from "./MarkdownRenderer";
import "./LessonViewer.css";

const LessonViewer = ({ course, onBack, onLessonComplete, initialLessonIndex = 0 }) => {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(initialLessonIndex);
  
  const [completedLessons, setCompletedLessons] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState({});
  const [discussionResponses, setDiscussionResponses] = useState({});
  const [projectSubmissions, setProjectSubmissions] = useState({});
  const [workshopParticipation, setWorkshopParticipation] = useState({});
  const [assignmentSubmissions, setAssignmentSubmissions] = useState({});
  const [videoSubmissions, setVideoSubmissions] = useState({});
  const [user] = useAuthState(auth);

  const lessons = course.lessons || [];
  const currentLesson = lessons[currentLessonIndex];

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;

      const progressRef = doc(db, "studentProgress", `${user.uid}_${course.id}`);
      const progressSnap = await getDoc(progressRef);

      if (progressSnap.exists()) {
        setCompletedLessons(progressSnap.data().completedLessons || []);
        setQuizAnswers(progressSnap.data().quizAnswers || {});
        setQuizSubmitted(progressSnap.data().quizSubmitted || {});
        setDiscussionResponses(progressSnap.data().discussionResponses || {});
        setProjectSubmissions(progressSnap.data().projectSubmissions || {});
        setWorkshopParticipation(progressSnap.data().workshopParticipation || {});
        setAssignmentSubmissions(progressSnap.data().assignmentSubmissions || {});
        setVideoSubmissions(progressSnap.data().videoSubmissions || {});
      }
    };

    fetchProgress();
  }, [user, course.id]);

  const saveProgress = async (updates = {}) => {
    if (!user) return;

    const progressRef = doc(db, "studentProgress", `${user.uid}_${course.id}`);
    await setDoc(progressRef, {
      studentId: user.uid,
      courseId: course.id,
      completedLessons,
      quizAnswers,
      quizSubmitted,
      quizzesCompleted: Object.keys(quizSubmitted).length,
      discussionResponses,
      projectSubmissions,
      workshopParticipation,
      assignmentSubmissions,
      videoSubmissions,
      lastUpdated: new Date(),
      ...updates
    }, { merge: true });
  };

  // Check if lesson requires submission
  const requiresSubmission = (lessonType) => {
    return ['quiz', 'test', 'assignment', 'video', 'discussion'].includes(lessonType);
  };

  // Check if lesson has been submitted
  const isLessonSubmitted = (lessonIndex, lessonType) => {
    switch (lessonType) {
      case 'quiz':
      case 'test':
        return quizSubmitted[lessonIndex] || false;
      case 'assignment':
        return assignmentSubmissions[lessonIndex] || false;
      case 'video':
        return videoSubmissions[lessonIndex] || false;
      case 'discussion':
        return discussionResponses[lessonIndex] || false;
      default:
        return true; // Other lesson types don't require submission
    }
  };

  const markLessonComplete = async () => {
    // Check if lesson requires submission
    if (requiresSubmission(currentLesson.type) && !isLessonSubmitted(currentLessonIndex, currentLesson.type)) {
      return;
    }
    
    const updated = [...new Set([...completedLessons, currentLessonIndex])];
    setCompletedLessons(updated);
    await saveProgress({ completedLessons: updated });
    
    // Call the onLessonComplete callback if provided
    if (onLessonComplete) {
      onLessonComplete(currentLessonIndex);
    } else {
      console.warn('onLessonComplete callback not provided');
    }
    
    };

  const handleQuizAnswer = (questionIndex, answerIndex) => {
    setQuizAnswers(prev => ({
      ...prev,
      [`${currentLessonIndex}_${questionIndex}`]: answerIndex
    }));
  };

  const submitQuiz = async () => {
    // Calculate quiz score
    const questions = currentLesson?.questions || [];
    let correct = 0;
    questions.forEach((question, qIndex) => {
      const studentAnswer = quizAnswers[`${currentLessonIndex}_${qIndex}`];
      if (studentAnswer === question.correctAnswer) {
        correct++;
      }
    });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    
    // Store quiz submission and score
    setQuizSubmitted(prev => ({
      ...prev,
      [currentLessonIndex]: true
    }));
    
    // Store quiz score in the appropriate field based on lesson type
    const scoreField = currentLesson.type === 'test' ? 'testScores' : 'quizScores';
    const currentScores = {};
    // Get existing scores from progress
    const progressRef = doc(db, "studentProgress", `${user.uid}_${course.id}`);
    const progressSnap = await getDoc(progressRef);
    if (progressSnap.exists()) {
      const existingScores = progressSnap.data()[scoreField] || {};
      Object.assign(currentScores, existingScores);
    }
    currentScores[currentLessonIndex] = score;
    
    console.log('Quiz Score Calculated:', {
      lessonIndex: currentLessonIndex,
      lessonType: currentLesson.type,
      score,
      correct,
      totalQuestions: questions.length,
      scoreField
    });
    
    // Update quizzes completed counter
    const currentQuizSubmitted = { ...quizSubmitted, [currentLessonIndex]: true };
    const quizzesCompletedCount = Object.keys(currentQuizSubmitted).length;
    
    await saveProgress({ 
      quizSubmitted: currentQuizSubmitted,
      [scoreField]: currentScores,
      quizzesCompleted: quizzesCompletedCount
    });
    markLessonComplete();
  };

  const handleDiscussionResponse = (response) => {
    setDiscussionResponses(prev => ({
      ...prev,
      [currentLessonIndex]: response
    }));
  };

  const submitDiscussion = async () => {
    await saveProgress({ discussionResponses });
    markLessonComplete();
  };

  const handleAssignmentSubmission = (value) => {
    setAssignmentSubmissions(prev => ({
      ...prev,
      [currentLessonIndex]: value
    }));
  };

  const submitAssignment = async () => {
    if (!assignmentSubmissions[currentLessonIndex]?.trim()) return;
    
    await saveProgress({ assignmentSubmissions });
    markLessonComplete();
  };

  const handleVideoSubmission = (value) => {
    setVideoSubmissions(prev => ({
      ...prev,
      [currentLessonIndex]: value
    }));
  };

  const submitVideo = async () => {
    if (!videoSubmissions[currentLessonIndex]?.trim()) return;
    
    await saveProgress({ videoSubmissions });
    markLessonComplete();
  };

  const handleProjectSubmission = (submission) => {
    setProjectSubmissions(prev => ({
      ...prev,
      [currentLessonIndex]: submission
    }));
  };

  const submitProject = async () => {
    await saveProgress({ projectSubmissions });
    markLessonComplete();
  };

  const handleWorkshopParticipation = (participation) => {
    setWorkshopParticipation(prev => ({
      ...prev,
      [currentLessonIndex]: participation
    }));
  };

  const submitWorkshop = async () => {
    await saveProgress({ workshopParticipation });
    markLessonComplete();
  };

  // Helper function to convert YouTube URLs to embed URLs
  const getVideoEmbedUrl = (url) => {
    if (!url) return null;
    
    // Handle YouTube URLs
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      
      // Extract video ID from various YouTube URL formats
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0];
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // Handle Vimeo URLs
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }
    
    // For other video URLs, return as is (they might work directly)
    return url;
  };

  const nextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const previousLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const renderLessonContent = () => {
    if (!currentLesson) return <p>No lesson content available.</p>;

    switch (currentLesson.type) {
      case 'lecture':
        return (
          <div className="lesson-content lecture">
            <div className="lecture-content">
              <h4>Lecture Content</h4>
              <MarkdownRenderer 
                content={currentLesson.content || ''} 
                className="lecture-markdown"
              />
              {currentLesson.keyPoints && (
                <div className="key-points">
                  <h5>Key Points:</h5>
                  <ul>
                    {currentLesson.keyPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      case 'reading':
        return (
          <div className="lesson-content reading">
            <div className="reading-info">
              <h4>Reading Assignment</h4>
              {currentLesson.url && (
                <a href={currentLesson.url} target="_blank" rel="noopener noreferrer" className="reading-link">
                  📖 Read Article
                </a>
              )}
            </div>
            <div className="reading-description">
              <MarkdownRenderer 
                content={currentLesson.description || ''} 
                className="reading-markdown"
              />
            </div>
            {currentLesson.discussionQuestions && (
              <div className="discussion-questions">
                <h5>Discussion Questions:</h5>
                <ul>
                  {currentLesson.discussionQuestions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="lesson-content video">
            <div className="video-info">
              <h4>Video Lesson</h4>
              {currentLesson.videoUrl && (
                <div className="video-container">
                  <iframe
                    src={getVideoEmbedUrl(currentLesson.videoUrl)}
                    title={currentLesson.title}
                    frameBorder="0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    className="video-frame"
                    onError={(e) => {
                      console.error('Video embed failed:', e);
                    }}
                  />
                  <div className="video-fallback">
                    <p>If the video doesn't load, you can watch it here:</p>
                    <a 
                      href={currentLesson.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="video-link"
                    >
                      Open Video in New Tab
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="video-description">
              <MarkdownRenderer 
                content={currentLesson.description || ''} 
                className="video-markdown"
              />
            </div>
            {currentLesson.transcript && (
              <div className="video-transcript">
                <h5>Transcript:</h5>
                <MarkdownRenderer 
                  content={currentLesson.transcript} 
                  className="transcript-markdown"
                />
              </div>
            )}
            {currentLesson.keyPoints && (
              <div className="key-points">
                <h5>Key Points:</h5>
                <ul>
                  {currentLesson.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="video-reflection">
              <h5>Video Reflection:</h5>
              <p>Please provide a brief reflection on what you learned from this video:</p>
              <textarea
                placeholder="Share your thoughts and key takeaways from this video..."
                value={videoSubmissions[currentLessonIndex] || ''}
                onChange={(e) => handleVideoSubmission(e.target.value)}
                rows="6"
                className="video-reflection-textarea"
              />
              <button 
                className="btn-primary"
                onClick={submitVideo}
                disabled={!videoSubmissions[currentLessonIndex]?.trim()}
              >
                Submit Reflection
              </button>
            </div>
          </div>
        );

      case 'interactive':
        return (
          <div className="lesson-content interactive">
            <div className="interactive-info">
              <h4>Interactive Lesson</h4>
              <p className="interactive-description">{currentLesson.description}</p>
            </div>
            {currentLesson.instructions && (
              <div className="interactive-instructions">
                <h5>Instructions:</h5>
                <p>{currentLesson.instructions}</p>
              </div>
            )}
            {currentLesson.activities && (
              <div className="interactive-activities">
                <h5>Activities:</h5>
                <ol>
                  {currentLesson.activities.map((activity, index) => (
                    <li key={index}>{activity}</li>
                  ))}
                </ol>
              </div>
            )}
            <div className="interactive-completion">
              <p>Complete the activities above, then mark this lesson as complete.</p>
            </div>
          </div>
        );

      case 'discussion':
        return (
          <div className="lesson-content discussion">
            <div className="discussion-info">
              <h4>Discussion: {currentLesson.topic}</h4>
              <p className="discussion-description">{currentLesson.description}</p>
            </div>
            {currentLesson.guidelines && (
              <div className="discussion-guidelines">
                <h5>Discussion Guidelines:</h5>
                <p>{currentLesson.guidelines}</p>
              </div>
            )}
            {currentLesson.questions && (
              <div className="discussion-questions">
                <h5>Discussion Questions:</h5>
                <ul>
                  {currentLesson.questions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="discussion-response">
              <h5>Your Response:</h5>
              <textarea
                placeholder="Share your thoughts on the discussion topic..."
                value={discussionResponses[currentLessonIndex] || ''}
                onChange={(e) => handleDiscussionResponse(e.target.value)}
                rows="6"
                className="discussion-textarea"
              />
              <button 
                className="btn-primary"
                onClick={submitDiscussion}
                disabled={!discussionResponses[currentLessonIndex]?.trim()}
              >
                Submit Response
              </button>
            </div>
          </div>
        );

      case 'project':
        return (
          <div className="lesson-content project">
            <div className="project-info">
              <h4>Project: {currentLesson.title}</h4>
              <p className="project-description">{currentLesson.description}</p>
            </div>
            {currentLesson.objectives && (
              <div className="project-objectives">
                <h5>Project Objectives:</h5>
                <ul>
                  {currentLesson.objectives.map((objective, index) => (
                    <li key={index}>{objective}</li>
                  ))}
                </ul>
              </div>
            )}
            {currentLesson.deliverables && (
              <div className="project-deliverables">
                <h5>Deliverables:</h5>
                <ul>
                  {currentLesson.deliverables.map((deliverable, index) => (
                    <li key={index}>{deliverable}</li>
                  ))}
                </ul>
              </div>
            )}
            {currentLesson.timeline && (
              <div className="project-timeline">
                <h5>Timeline:</h5>
                <p>{currentLesson.timeline}</p>
              </div>
            )}
            {currentLesson.rubric && (
              <div className="project-rubric">
                <h5>Rubric:</h5>
                <ul>
                  {currentLesson.rubric.map((criterion, index) => (
                    <li key={index}>{criterion}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="project-submission">
              <h5>Project Submission:</h5>
              <textarea
                placeholder="Describe your project work and findings..."
                value={projectSubmissions[currentLessonIndex] || ''}
                onChange={(e) => handleProjectSubmission(e.target.value)}
                rows="8"
                className="project-textarea"
              />
              <button 
                className="btn-primary"
                onClick={submitProject}
                disabled={!projectSubmissions[currentLessonIndex]?.trim()}
              >
                Submit Project
              </button>
            </div>
          </div>
        );

      case 'workshop':
        return (
          <div className="lesson-content workshop">
            <div className="workshop-info">
              <h4>Workshop: {currentLesson.title}</h4>
              <p className="workshop-description">{currentLesson.description}</p>
            </div>
            {currentLesson.activities && (
              <div className="workshop-activities">
                <h5>Workshop Activities:</h5>
                <ol>
                  {currentLesson.activities.map((activity, index) => (
                    <li key={index}>{activity}</li>
                  ))}
                </ol>
              </div>
            )}
            {currentLesson.materials && (
              <div className="workshop-materials">
                <h5>Required Materials:</h5>
                <ul>
                  {currentLesson.materials.map((material, index) => (
                    <li key={index}>{material}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="workshop-details">
              <p><strong>Duration:</strong> {currentLesson.duration || 'Not specified'} minutes</p>
              <p><strong>Group Size:</strong> {currentLesson.groupSize || 'Individual'} students</p>
            </div>
            <div className="workshop-participation">
              <h5>Workshop Participation:</h5>
              <textarea
                placeholder="Describe your participation in the workshop activities..."
                value={workshopParticipation[currentLessonIndex] || ''}
                onChange={(e) => handleWorkshopParticipation(e.target.value)}
                rows="6"
                className="workshop-textarea"
              />
              <button 
                className="btn-primary"
                onClick={submitWorkshop}
                disabled={!workshopParticipation[currentLessonIndex]?.trim()}
              >
                Submit Participation
              </button>
            </div>
          </div>
        );

      case 'quiz':
      case 'test':
        const questions = currentLesson.questions || [];
        const isSubmitted = quizSubmitted[currentLessonIndex];
        
        return (
          <div className="lesson-content quiz">
            <div className="quiz-header">
              <h4>{currentLesson.type === 'quiz' ? 'Quiz' : 'Test'}</h4>
              {isSubmitted && (
                <div className="quiz-score">
                  Score: {calculateQuizScore()}%
                </div>
              )}
            </div>
            
            {questions.map((question, qIndex) => (
              <div key={qIndex} className="question-card">
                <h5>Question {qIndex + 1}</h5>
                <p className="question-text">{question.question}</p>
                
                <div className="options-list">
                  {question.options.map((option, oIndex) => (
                    <label key={oIndex} className={`option-item ${isSubmitted ? 'submitted' : ''}`}>
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        value={oIndex}
                        checked={quizAnswers[`${currentLessonIndex}_${qIndex}`] === oIndex}
                        onChange={() => handleQuizAnswer(qIndex, oIndex)}
                        disabled={isSubmitted}
                      />
                      <span className="option-text">{option}</span>
                      {isSubmitted && (
                        <span className={`answer-indicator ${oIndex === question.correctAnswer ? 'correct' : 'incorrect'}`}>
                          {oIndex === question.correctAnswer ? '✓' : '✗'}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                
                {isSubmitted && (
                  <div className="question-feedback">
                    {quizAnswers[`${currentLessonIndex}_${qIndex}`] === question.correctAnswer ? 
                      <span className="correct-feedback">Correct!</span> : 
                      <span className="incorrect-feedback">Incorrect. The correct answer is: {question.options[question.correctAnswer]}</span>
                    }
                  </div>
                )}
              </div>
            ))}
            
            {!isSubmitted && (
              <button 
                className="btn-primary submit-quiz"
                onClick={submitQuiz}
                disabled={!Object.keys(quizAnswers).some(key => key.startsWith(`${currentLessonIndex}_`))}
              >
                Submit {currentLesson.type === 'quiz' ? 'Quiz' : 'Test'}
              </button>
            )}
          </div>
        );

      case 'assignment':
        return (
          <div className="lesson-content assignment">
            <div className="assignment-info">
              <h4>Assignment</h4>
              <p className="assignment-description">{currentLesson.description}</p>
              {currentLesson.dueDate && (
                <p className="due-date">
                  Due: {new Date(currentLesson.dueDate).toLocaleDateString()}
                </p>
              )}
              {currentLesson.points && (
                <p className="assignment-points">
                  Points: {currentLesson.points}
                </p>
              )}
            </div>
            {currentLesson.rubric && (
              <div className="assignment-rubric">
                <h5>Rubric:</h5>
                <ul>
                  {currentLesson.rubric.map((criterion, index) => (
                    <li key={index}>{criterion}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="assignment-submission">
              <h5>Assignment Submission:</h5>
              <textarea 
                placeholder="Enter your assignment submission here..."
                className="assignment-textarea"
                rows="8"
                value={assignmentSubmissions[currentLessonIndex] || ''}
                onChange={(e) => handleAssignmentSubmission(e.target.value)}
              />
              <button 
                className="btn-primary" 
                onClick={submitAssignment}
                disabled={!assignmentSubmissions[currentLessonIndex]?.trim()}
              >
                Submit Assignment
              </button>
            </div>
          </div>
        );

      default:
        return <p>Unsupported lesson type: {currentLesson.type}</p>;
    }
  };

  const calculateQuizScore = () => {
    const questions = currentLesson?.questions || [];
    if (questions.length === 0) return 0;
    
    let correct = 0;
    questions.forEach((question, qIndex) => {
      const studentAnswer = quizAnswers[`${currentLessonIndex}_${qIndex}`];
      if (studentAnswer === question.correctAnswer) {
        correct++;
      }
    });
    
    return Math.round((correct / questions.length) * 100);
  };

  const getProgressPercentage = () => {
    return lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0;
  };

  // Auto-complete lessons for certain types when viewed
  useEffect(() => {
    if (currentLesson && !completedLessons.includes(currentLessonIndex)) {
      // Auto-complete for lecture, reading, interactive, discussion, project, and workshop lessons
      // Exclude quiz, test, assignment, and video lessons as they require submission
      if (['lecture', 'reading', 'interactive', 'discussion', 'project', 'workshop'].includes(currentLesson.type)) {
        // Add a small delay to ensure the content is loaded
        const timer = setTimeout(() => {
          markLessonComplete();
        }, 3000); // Auto-complete after 3 seconds of viewing

        return () => clearTimeout(timer);
      }
    }
  }, [currentLessonIndex, currentLesson, completedLessons]);

  if (lessons.length === 0) {
    return (
      <div className="lesson-viewer">
        <div className="course-header">
          <button className="btn-back" onClick={onBack}>
            ← Back to Units
          </button>
          <h2>{course.title}</h2>
        </div>
        <div className="empty-course">
          <div className="empty-icon">📚</div>
          <h3>No Lessons Available</h3>
          <p>This unit doesn't have any lessons yet.</p>
        </div>
      </div>
    );
  }

  if (currentLessonIndex >= lessons.length) {
    return (
      <div className="lesson-viewer">
        <div className="course-header">
          <button className="btn-back" onClick={onBack}>
            ← Back to Units
          </button>
          <h2>{course.title}</h2>
        </div>
        <div className="course-complete">
          <div className="completion-icon">🎉</div>
          <h3>Unit Complete!</h3>
          <p>Congratulations! You've completed all lessons in this unit.</p>
          <div className="completion-stats">
            <p>Final Score: {getProgressPercentage()}%</p>
            <p>Lessons Completed: {completedLessons.length} of {lessons.length}</p>
          </div>
          <button className="btn-primary" onClick={() => setCurrentLessonIndex(0)}>
            Review Unit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-viewer">
      <div className="course-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to Units
        </button>
        <h2>{course.title}</h2>
      </div>

      <div className="lesson-progress-bar">
        <div className="progress-fill" style={{ width: `${getProgressPercentage()}%` }}></div>
        <span className="progress-text">{getProgressPercentage()}% Complete</span>
      </div>

      <div className="lesson-navigation-header">
        <div className="lesson-info">
          <h3>
            {currentLesson.title}
            {completedLessons.includes(currentLessonIndex) && (
              <span className="completion-badge">✅ Completed</span>
            )}
          </h3>
          <span className="lesson-type-badge">{currentLesson.type}</span>
        </div>
        
        <div className="lesson-counter">
          Lesson {currentLessonIndex + 1} of {lessons.length}
        </div>
      </div>
      
      {renderLessonContent()}

      {/* Manual completion button for lessons that don't require submission */}
      {!completedLessons.includes(currentLessonIndex) && 
       !requiresSubmission(currentLesson.type) && (
        <div className="manual-completion">
          <button 
            className="btn-secondary"
            onClick={markLessonComplete}
          >
            Mark as Complete
          </button>
        </div>
      )}

      <div className="lesson-navigation">
        <div className="nav-buttons">
          {currentLessonIndex > 0 && (
            <button className="btn-secondary" onClick={previousLesson}>
              ← Previous Lesson
            </button>
          )}
          
          {currentLessonIndex < lessons.length - 1 ? (
            <button 
              className="btn-primary" 
              onClick={() => {
                if (!completedLessons.includes(currentLessonIndex)) {
                  markLessonComplete();
                }
                nextLesson();
              }}
            >
              Next Lesson →
            </button>
          ) : (
            <button 
              className="btn-primary" 
              onClick={() => {
                if (!completedLessons.includes(currentLessonIndex)) {
                  markLessonComplete();
                }
                setCurrentLessonIndex(lessons.length); // Show completion screen
              }}
            >
              Complete Unit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonViewer;
