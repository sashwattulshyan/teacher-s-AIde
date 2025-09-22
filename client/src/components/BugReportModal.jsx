import React, { useState, useEffect } from 'react';
import './BugReportModal.css';

const BugReportModal = ({ isOpen, onClose, userRole, userName, userEmail }) => {
  const [formData, setFormData] = useState({
    description: '',
    steps: '',
    expectedBehavior: '',
    actualBehavior: '',
    additionalInfo: '',
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  });
  const [consoleErrors, setConsoleErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  // Capture console errors
  useEffect(() => {
    if (isOpen) {
      // Store original console methods
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // Capture errors
      const errors = [];
      const warnings = [];
      
      console.error = (...args) => {
        errors.push({
          type: 'error',
          message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
          timestamp: new Date().toISOString()
        });
        originalError.apply(console, args);
      };
      
      console.warn = (...args) => {
        warnings.push({
          type: 'warning',
          message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
          timestamp: new Date().toISOString()
        });
        originalWarn.apply(console, args);
      };
      
      // Capture existing errors from window.onerror
      const existingErrors = window.consoleErrors || [];
      setConsoleErrors([...existingErrors, ...errors, ...warnings]);
      
      // Cleanup function
      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, [isOpen]);

  // Capture unhandled errors
  useEffect(() => {
    const handleError = (event) => {
      setConsoleErrors(prev => [...prev, {
        type: 'unhandled',
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack || '',
        timestamp: new Date().toISOString()
      }]);
    };

    const handleUnhandledRejection = (event) => {
      setConsoleErrors(prev => [...prev, {
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || '',
        timestamp: new Date().toISOString()
      }]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      const bugReport = {
        ...formData,
        userRole,
        userName,
        userEmail,
        consoleErrors,
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        },
        screenInfo: {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight,
          colorDepth: window.screen.colorDepth,
          pixelDepth: window.screen.pixelDepth
        },
        windowInfo: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight
        }
      };

      const response = await fetch('/api/bug-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bugReport)
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          description: '',
          steps: '',
          expectedBehavior: '',
          actualBehavior: '',
          additionalInfo: '',
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        });
        setConsoleErrors([]);
        setTimeout(() => {
          onClose();
          setSubmitStatus('');
        }, 2000);
      } else {
        throw new Error('Failed to submit bug report');
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bug-report-overlay">
      <div className="bug-report-modal">
        <div className="bug-report-header">
          <h3>🐛 Report a Bug</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="bug-report-form">
          <div className="form-group">
            <label htmlFor="description">What went wrong? *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the bug or issue you encountered..."
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="steps">Steps to reproduce *</label>
            <textarea
              id="steps"
              name="steps"
              value={formData.steps}
              onChange={handleInputChange}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="expectedBehavior">What did you expect to happen?</label>
            <textarea
              id="expectedBehavior"
              name="expectedBehavior"
              value={formData.expectedBehavior}
              onChange={handleInputChange}
              placeholder="Describe what you expected to see or happen..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="actualBehavior">What actually happened?</label>
            <textarea
              id="actualBehavior"
              name="actualBehavior"
              value={formData.actualBehavior}
              onChange={handleInputChange}
              placeholder="Describe what actually happened instead..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="additionalInfo">Additional Information</label>
            <textarea
              id="additionalInfo"
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleInputChange}
              placeholder="Any other details that might help us understand the issue..."
              rows="3"
            />
          </div>

          {consoleErrors.length > 0 && (
            <div className="form-group">
              <label>Console Errors Captured ({consoleErrors.length})</label>
              <div className="console-errors">
                {consoleErrors.slice(-5).map((error, index) => (
                  <div key={index} className={`console-error ${error.type}`}>
                    <span className="error-type">{error.type.toUpperCase()}</span>
                    <span className="error-message">{error.message}</span>
                    <span className="error-time">{new Date(error.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
                {consoleErrors.length > 5 && (
                  <div className="more-errors">... and {consoleErrors.length - 5} more errors</div>
                )}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || !formData.description.trim() || !formData.steps.trim()}>
              {isSubmitting ? 'Sending...' : 'Send Bug Report'}
            </button>
          </div>

          {submitStatus === 'success' && (
            <div className="success-message">
              ✅ Bug report sent successfully! Thank you for helping us improve the app.
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="error-message">
              ❌ Failed to send bug report. Please try again or contact support directly.
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default BugReportModal;
