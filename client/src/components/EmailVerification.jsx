import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { sendEmailVerification, onAuthStateChanged } from 'firebase/auth';
import LoadingSpinner from './LoadingSpinner';
import './EmailVerification.css';

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get email from navigation state or from current user
    if (location.state?.email) {
      setEmail(location.state.email);
      setMessage(location.state.message);
    }

    // Listen for auth state changes to check if user is verified
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.emailVerified) {
        setMessage('Email verified successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, [navigate, location.state]);

  const handleResendVerification = async () => {
    if (!user) {
      setError('Please sign in to resend verification email.');
      return;
    }

    setResendLoading(true);
    setError('');
    setMessage('');

    try {
      await sendEmailVerification(user);
      setMessage('Verification email sent! Please check your inbox.');
      setResendCooldown(60); // 60 second cooldown
      
      // Start countdown
      const countdown = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Error sending verification email:', err);
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignIn = () => {
    navigate('/signin');
  };

  const handleBackToLanding = () => {
    navigate('/');
  };

  const handleManualVerificationCheck = async () => {
    if (!user) {
      setError('Please sign in to check verification status.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Reload the user to get the latest verification status
      await user.reload();
      const currentUser = auth.currentUser;
      
      if (currentUser && currentUser.emailVerified) {
        setMessage('Email verified successfully! Reloading app...');
        // Reload the entire app
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError('Email is not yet verified. Please check your email and click the verification link.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking verification status:', err);
      setError('Error checking verification status. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="email-verification-page">
      <div className="email-verification-container">
        <div className="email-verification-header">
          <h1>📧 Verify Your Email</h1>
          <p>We've sent a verification link to your email address</p>
        </div>

        <div className="email-verification-content">
          {email && (
            <div className="email-display">
              <strong>Email:</strong> {email}
            </div>
          )}

          {message && (
            <div className={`message ${error ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="verification-steps">
            <h3>Next Steps:</h3>
            <ol>
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>Return to this page or sign in</li>
            </ol>
          </div>

          <div className="verification-actions">
            <button 
              onClick={handleManualVerificationCheck}
              disabled={loading}
              className="check-verification-button"
            >
              {loading ? 'Checking...' : 'I\'ve Verified My Email'}
            </button>
            
            {user ? (
              <button 
                onClick={handleResendVerification}
                disabled={resendLoading || resendCooldown > 0}
                className="resend-button"
              >
                {resendLoading ? (
                  'Sending...'
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  'Resend Verification Email'
                )}
              </button>
            ) : (
              <button 
                onClick={handleSignIn}
                className="signin-button"
              >
                Sign In to Resend
              </button>
            )}

            <button 
              onClick={handleBackToLanding}
              className="back-button"
            >
              Back to Home
            </button>
          </div>

          <div className="verification-help">
            <h4>Need Help?</h4>
            <ul>
              <li>Check your spam/junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
              <li>Contact support if you continue to have issues</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
