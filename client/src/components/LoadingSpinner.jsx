import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p className="loading-message">{message}</p>
      <p className="loading-subtitle">This may take a few seconds on first load</p>
    </div>
  );
};

export default LoadingSpinner;
