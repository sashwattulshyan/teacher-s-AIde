import React, { useState } from 'react';
import './BugReportModal.css';

const BugReportModal = ({ isOpen, onClose, userRole, userName, userEmail }) => {
  const [formData, setFormData] = useState({
    description: '',
    steps: '',
    expectedBehavior: '',
    actualBehavior: '',
    additionalInfo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

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
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
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
          additionalInfo: ''
        });
        setTimeout(() => {
          onClose();
          setSubmitStatus('');
        }, 2000);
      } else {
        throw new Error(`Failed to submit bug report: ${response.status}`);
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="bug-report-overlay">
      <div className="bug-report-modal">
        <div className="bug-report-header">
          <h3>🐛 Report a Bug</h3>
          <button 
            className="close-button" 
            onClick={onClose}
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