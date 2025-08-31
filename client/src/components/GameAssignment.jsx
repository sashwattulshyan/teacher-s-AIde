import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import './GameAssignment.css';

const GameAssignment = ({ assignment, classroomId, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('playing'); // 'playing', 'completed', 'failed'
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds per game
  const [user] = useAuthState(auth);

  const questions = assignment.questions || [];
  const totalQuestions = questions.length;

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('failed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState, timeLeft]);

  const handleAnswer = (selectedAnswer) => {
    const question = questions[currentQuestion];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    if (isCorrect) {
      setScore(prev => prev + 10);
    }

    if (currentQuestion + 1 < totalQuestions) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Game completed
      const finalScore = isCorrect ? score + 10 : score;
      const percentage = Math.round((finalScore / (totalQuestions * 10)) * 100);
      
      if (percentage >= 70) {
        setGameState('completed');
        setScore(finalScore);
        
        // Award points
        awardPoints(finalScore, percentage);
      } else {
        setGameState('failed');
      }
    }
  };

  const awardPoints = async (finalScore, percentage) => {
    try {
      const token = await user.getIdToken();
      
      await fetch(`${API_CONFIG.ENDPOINTS.GAMIFICATION}/assignment-completion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classroomId,
          assignmentId: assignment.id,
          score: percentage
        })
      });

      if (onComplete) {
        onComplete({ score: finalScore, percentage });
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const restartGame = () => {
    setCurrentQuestion(0);
    setScore(0);
    setGameState('playing');
    setTimeLeft(60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (gameState === 'completed') {
    return (
      <div className="game-assignment">
        <div className="game-completed">
          <div className="completion-icon">🎉</div>
          <h2>Congratulations!</h2>
          <p>You completed the game assignment!</p>
          <div className="final-score">
            <span className="score-value">{score}</span>
            <span className="score-label">points earned</span>
          </div>
          <div className="completion-actions">
            <button className="btn-primary" onClick={restartGame}>
              Play Again
            </button>
            <button className="btn-secondary" onClick={() => onComplete && onComplete({ score, percentage: Math.round((score / (totalQuestions * 10)) * 100) })}>
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'failed') {
    return (
      <div className="game-assignment">
        <div className="game-failed">
          <div className="failed-icon">😔</div>
          <h2>Time's Up!</h2>
          <p>You ran out of time. Try again to improve your score!</p>
          <div className="final-score">
            <span className="score-value">{score}</span>
            <span className="score-label">points earned</span>
          </div>
          <button className="btn-primary" onClick={restartGame}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="game-assignment">
        <div className="no-questions">
          <p>No questions available for this game assignment.</p>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  return (
    <div className="game-assignment">
      <div className="game-header">
        <div className="game-info">
          <h3>{assignment.title}</h3>
          <p>Answer questions quickly to earn points!</p>
        </div>
        <div className="game-stats">
          <div className="stat">
            <span className="stat-label">Time</span>
            <span className={`stat-value ${timeLeft <= 10 ? 'urgent' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Question</span>
            <span className="stat-value">{currentQuestion + 1}/{totalQuestions}</span>
          </div>
        </div>
      </div>

      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="question-container">
        <div className="question">
          <h4>{question.question}</h4>
        </div>

        <div className="answers-grid">
          {question.options.map((option, index) => (
            <button
              key={index}
              className="answer-button"
              onClick={() => handleAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="game-tips">
        <p>💡 Tip: Answer quickly to earn bonus points!</p>
      </div>
    </div>
  );
};

export default GameAssignment;
