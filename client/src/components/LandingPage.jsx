// src/components/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/signup');
  };

  const handleSignIn = () => {
    navigate('/signin');
  };
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to
            <span className="highlight"> Teachers AIde</span>
          </h1>
          <p className="hero-subtitle">
            Your AI-powered teaching assistant that helps you create engaging courses, track student progress, 
            and deliver personalized learning experiences. Access your courses from any computer, anywhere.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={handleGetStarted}>
              Get Started
            </button>
            <button className="btn-secondary" onClick={handleSignIn}>
              Sign In
            </button>
          </div>
        </div>
        <div className="hero-image">
          <div className="ai-illustration">
            <div className="brain-icon">🧠</div>
            <div className="connection-lines">
              <div className="line"></div>
              <div className="line"></div>
              <div className="line"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2 className="section-title">Why Choose Teachers AIde?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Smart Course Creation</h3>
            <p>Upload your materials and let AI generate structured, engaging courses automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Real-time Analytics</h3>
            <p>Track student progress, identify learning gaps, and optimize your teaching approach.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Feedback</h3>
            <p>Students receive immediate feedback on assignments and quizzes for faster learning.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎓</div>
            <h3>Personalized Learning</h3>
            <p>AI adapts content difficulty and pace to each student's learning style and progress.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💻</div>
            <h3>Desktop Optimized</h3>
            <p>Built for desktop and laptop computers with full-screen layouts and powerful features.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Reliable</h3>
            <p>Enterprise-grade security with 99.9% uptime to ensure your data is always safe.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Upload Materials</h3>
            <p>Upload your syllabus, PowerPoints, textbooks, or any educational content from your computer.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>AI Generates Course</h3>
            <p>Our AI analyzes your materials and creates structured lessons with quizzes and assignments.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Review & Customize</h3>
            <p>Review the AI-generated content and customize it to match your teaching style.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Launch & Monitor</h3>
            <p>Share with students and monitor their progress in real-time with detailed analytics.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Teaching?</h2>
          <p>Join thousands of educators who are already using Teachers AIde to create better learning experiences on desktop.</p>
          <div className="cta-buttons">
            <button className="btn-primary large" onClick={handleGetStarted}>
              Get Started
            </button>
            <button className="btn-secondary large" onClick={handleSignIn}>
              Sign In to Your Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
