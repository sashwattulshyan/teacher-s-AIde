import React, { useState, useEffect } from 'react';
import './BugReportModal.css';

const BugReportModal = ({ isOpen, onClose, userRole, userName, userEmail }) => {
  console.log('🐛 BugReportModal: Component initialized', {
    isOpen,
    userRole,
    userName,
    userEmail,
    timestamp: new Date().toISOString()
  });

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
    console.log('🐛 BugReportModal: useEffect for console error capture triggered', { isOpen });
    
    if (isOpen) {
      console.log('🐛 BugReportModal: Setting up console error capture');
      
      // Store original console methods
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // Capture errors
      const errors = [];
      const warnings = [];
      
      console.error = (...args) => {
        const errorData = {
          type: 'error',
          message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
          timestamp: new Date().toISOString()
        };
        console.log('🐛 BugReportModal: Console error captured', errorData);
        errors.push(errorData);
        originalError.apply(console, args);
      };
      
      console.warn = (...args) => {
        const warningData = {
          type: 'warning',
          message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
          timestamp: new Date().toISOString()
        };
        console.log('🐛 BugReportModal: Console warning captured', warningData);
        warnings.push(warningData);
        originalWarn.apply(console, args);
      };
      
      // Capture existing errors from window.onerror
      const existingErrors = window.consoleErrors || [];
      console.log('🐛 BugReportModal: Existing console errors found', { count: existingErrors.length, errors: existingErrors });
      
      const allErrors = [...existingErrors, ...errors, ...warnings];
      console.log('🐛 BugReportModal: Setting console errors state', { totalErrors: allErrors.length });
      setConsoleErrors(allErrors);
      
      // Cleanup function
      return () => {
        console.log('🐛 BugReportModal: Cleaning up console error capture');
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, [isOpen]);

  // Capture unhandled errors
  useEffect(() => {
    console.log('🐛 BugReportModal: Setting up unhandled error listeners');
    
    const handleError = (event) => {
      const errorData = {
        type: 'unhandled',
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack || '',
        timestamp: new Date().toISOString()
      };
      console.log('🐛 BugReportModal: Unhandled error captured', errorData);
      setConsoleErrors(prev => {
        const newErrors = [...prev, errorData];
        console.log('🐛 BugReportModal: Updated console errors with unhandled error', { totalErrors: newErrors.length });
        return newErrors;
      });
    };

    const handleUnhandledRejection = (event) => {
      const rejectionData = {
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || '',
        timestamp: new Date().toISOString()
      };
      console.log('🐛 BugReportModal: Unhandled promise rejection captured', rejectionData);
      setConsoleErrors(prev => {
        const newErrors = [...prev, rejectionData];
        console.log('🐛 BugReportModal: Updated console errors with promise rejection', { totalErrors: newErrors.length });
        return newErrors;
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.log('🐛 BugReportModal: Removing unhandled error listeners');
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('🐛 BugReportModal: Input changed', { name, value: value.substring(0, 100) + (value.length > 100 ? '...' : '') });
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      console.log('🐛 BugReportModal: Form data updated', { field: name, newData });
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    console.log('🐛 BugReportModal: Form submission started');
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      console.log('🐛 BugReportModal: Building bug report data', {
        formData: {
          description: formData.description?.substring(0, 50) + '...',
          steps: formData.steps?.substring(0, 50) + '...',
          hasExpectedBehavior: !!formData.expectedBehavior,
          hasActualBehavior: !!formData.actualBehavior,
          hasAdditionalInfo: !!formData.additionalInfo
        },
        userRole,
        userName,
        userEmail,
        consoleErrorsCount: consoleErrors.length
      });

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

      console.log('🐛 BugReportModal: Bug report data prepared', {
        totalSize: JSON.stringify(bugReport).length,
        consoleErrorsCount: bugReport.consoleErrors.length,
        browserInfo: bugReport.browserInfo,
        screenInfo: bugReport.screenInfo,
        windowInfo: bugReport.windowInfo
      });

      console.log('🐛 BugReportModal: Sending request to /api/bug-report', {
        url: '/api/bug-report',
        method: 'POST',
        bodySize: JSON.stringify(bugReport).length,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        currentUrl: window.location.href
      });
      
      const response = await fetch('/api/bug-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bugReport)
      });

      console.log('🐛 BugReportModal: Response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        console.log('🐛 BugReportModal: Bug report submitted successfully');
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
        console.log('🐛 BugReportModal: Form reset and closing in 2 seconds');
        setTimeout(() => {
          console.log('🐛 BugReportModal: Closing modal after successful submission');
          onClose();
          setSubmitStatus('');
        }, 2000);
      } else {
        const errorText = await response.text();
        console.error('🐛 BugReportModal: Server error response', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString()
        });
        
        // Try to parse error response as JSON
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('🐛 BugReportModal: Parsed error response', errorData);
        } catch (parseError) {
          console.error('🐛 BugReportModal: Could not parse error response as JSON', parseError);
        }
        
        throw new Error(`Failed to submit bug report: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('🐛 BugReportModal: Error submitting bug report', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        currentUrl: window.location.href,
        networkStatus: navigator.onLine ? 'online' : 'offline'
      });
      
      // Check if it's a network error
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('🐛 BugReportModal: Network error detected', {
          message: 'Failed to connect to server',
          possibleCauses: [
            'Server is down',
            'Network connectivity issues',
            'CORS configuration problems',
            'API endpoint not available'
          ]
        });
      }
      
      setSubmitStatus('error');
    } finally {
      console.log('🐛 BugReportModal: Form submission completed', { 
        isSubmitting: false,
        submitStatus,
        timestamp: new Date().toISOString()
      });
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    console.log('🐛 BugReportModal: Modal is closed, not rendering');
    return null;
  }

  console.log('🐛 BugReportModal: Rendering modal', {
    isSubmitting,
    submitStatus,
    consoleErrorsCount: consoleErrors.length,
    formDataKeys: Object.keys(formData)
  });

  return (
    <div className="bug-report-overlay">
      <div className="bug-report-modal">
        <div className="bug-report-header">
          <h3>🐛 Report a Bug</h3>
          <button 
            className="close-button" 
            onClick={() => {
              console.log('🐛 BugReportModal: Close button clicked');
              onClose();
            }}
          >
            &times;
          </button>
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