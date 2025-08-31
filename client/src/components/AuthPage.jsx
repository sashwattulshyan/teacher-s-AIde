// src/components/AuthPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import LoadingSpinner from './LoadingSpinner';
import './AuthPage.css';

const AuthPage = ({ initialMode = 'signin' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBackToLanding = () => {
    navigate('/');
  };
  
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  
  // Update isSignUp state based on current URL
  useEffect(() => {
    const isSignUpMode = location.pathname === '/signup';
    setIsSignUp(isSignUpMode);
  }, [location.pathname]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Handle Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Add user info to Firestore
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          role: role,
        });

        // Sign up successful - user is now authenticated
        setSuccess('Account created successfully! Redirecting...');
        
        // The user is automatically signed in after signup, so the auth state change
        // will trigger a redirect in the main App component
        // Add a small delay to ensure Firestore write is processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } else {
        // Handle Sign In
        await signInWithEmailAndPassword(auth, email, password);
        
        // Sign in successful - user is now authenticated
        setSuccess('Sign in successful! Redirecting...');
        
        // The authentication state change will trigger a redirect in the main App component
        // No need to manually navigate - let the auth state change handle it
      }
    } catch (err) {
      setError(err.message);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    if (isSignUp) {
      navigate('/signin');
    } else {
      navigate('/signup');
    }
    // Reset form fields when switching modes
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setRole('student');
    setError('');
    setSuccess('');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <button className="back-button" onClick={handleBackToLanding}>
          ← Back to Home
        </button>
        
        <div className="auth-card">
          <div className="auth-header">
            <h1>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
            <p>{isSignUp ? 'Join thousands of educators and students' : 'Sign in to your account'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignUp && (
              <>
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {isSignUp && (
              <div className="form-group">
                <label>I am a:</label>
                <div className="role-selector">
                  <label className="role-option">
                    <input
                      type="radio"
                      value="student"
                      checked={role === 'student'}
                      onChange={(e) => setRole(e.target.value)}
                    />
                    <span className="role-label">
                      <span className="role-icon">👨‍🎓</span>
                      Student
                    </span>
                  </label>
                  <label className="role-option">
                    <input
                      type="radio"
                      value="teacher"
                      checked={role === 'teacher'}
                      onChange={(e) => setRole(e.target.value)}
                    />
                    <span className="role-label">
                      <span className="role-icon">👨‍🏫</span>
                      Teacher
                    </span>
                  </label>
                </div>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {loading ? (
              <div className="auth-loading-overlay">
                <LoadingSpinner message="Signing you in..." />
                <p className="auth-loading-note">This may take a minute if this is your first time logging in after a while</p>
              </div>
            ) : (
              <button type="submit" className="submit-button">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            )}
          </form>

          <div className="auth-footer">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button type="button" className="toggle-button" onClick={toggleMode}>
                {isSignUp ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
