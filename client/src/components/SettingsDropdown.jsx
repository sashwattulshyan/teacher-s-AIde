import React, { useState, useRef, useEffect } from 'react';
import { auth, db } from '../firebase';
import { deleteUser, signOut } from 'firebase/auth';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import API_CONFIG from '../config/api';
import './SettingsDropdown.css';

const SettingsDropdown = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDeleteAccount = async () => {
    if (!currentUser) {
      setError('No user logged in');
      return;
    }

    setIsDeleting(true);
    setError(null);
    let hasError = false;
    
    try {
      const userId = currentUser.uid;
      // 1. Call server endpoint to delete all user data
      const token = await currentUser.getIdToken();
      
      let response;
      try {
        response = await fetch(`${API_CONFIG.ENDPOINTS.USERS}/delete-account`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        throw new Error(`Network error: ${fetchError.message}. Make sure the server is running on port 3001.`);
      }

      const responseText = await response.text();
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText };
        }
        throw new Error(errorData.message || 'Failed to delete account data');
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { message: 'Account deleted successfully' };
      }
      // 2. Delete Firebase Auth user
      let authDeletionSuccess = false;
      try {
        await deleteUser(currentUser);
        authDeletionSuccess = true;
      } catch (authError) {
        console.error('Firebase Auth deletion error:', authError);
        if (authError.code === 'auth/requires-recent-login') {
          // Try to re-authenticate the user
          try {
            // Force a token refresh to re-authenticate
            await currentUser.getIdToken(true);
            await deleteUser(currentUser);
            authDeletionSuccess = true;
          } catch (reAuthError) {
            try {
              await signOut(auth);
            } catch (signOutError) {
              console.error('Sign out error:', signOutError.message);
            }
            authDeletionSuccess = true;
          }
        } else {
          try {
            await signOut(auth);
          } catch (signOutError) {
            console.error('Sign out error:', signOutError.message);
          }
          authDeletionSuccess = true;
        }
      }

      // 3. Redirect to landing page
      if (authDeletionSuccess) {
        navigate('/');
      } else {
        throw new Error('Failed to delete account completely');
      }
      
    } catch (error) {
      console.error('Error deleting account:', error);
      hasError = true;
      setError(error.message);
      
      // Handle specific error cases
      if (error.code === 'auth/requires-recent-login') {
        setError('For security reasons, please sign out and sign back in before deleting your account.');
      }
    } finally {
      setIsDeleting(false);
      if (!hasError) {
        setShowDeleteConfirm(false);
        setIsOpen(false);
      }
    }
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(true);
    setIsOpen(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setError(null);
  };

  // Don't render if no authenticated user
  if (!currentUser) {
    return null;
  }

  return (
    <>
      <div className="settings-dropdown" ref={dropdownRef}>
        <button 
          className="settings-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Settings"
        >
          ⚙️
        </button>
        
        {isOpen && (
          <div className="settings-menu">
            <button 
              className="settings-item delete-account"
              onClick={confirmDelete}
            >
              🗑️ Delete Account
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-header">
              <h3>⚠️ Delete Account</h3>
            </div>
            
            <div className="delete-modal-content">
              {error && (
                <div className="error-message" style={{ color: '#ef4444', marginBottom: '16px' }}>
                  {error}
                </div>
              )}
              <p><strong>Are you sure you want to delete your account?</strong></p>
              <p>This action will:</p>
              <ul>
                <li>Permanently delete your account</li>
                <li>Remove all your data from the system</li>
                <li>Delete your progress, points, and achievements</li>
                <li>Remove you from all classrooms</li>
              </ul>
              <p><strong>This action cannot be undone.</strong></p>
            </div>
            
            <div className="delete-modal-actions">
              <button 
                className="btn-secondary"
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsDropdown;
