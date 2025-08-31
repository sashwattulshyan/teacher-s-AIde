import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import './YouTubeSearch.css';

import API_CONFIG from '../config/api';

const YouTubeSearch = ({ onSelectVideo, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Check if user is authenticated
  if (!auth.currentUser) {
    return (
      <div className="youtube-search-modal">
        <div className="youtube-search-content">
          <div className="youtube-search-header">
            <h3>🔍 Search YouTube Videos</h3>
            <button 
              type="button"
              className="btn-close" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
            >×</button>
          </div>
          <div className="error-message">
            Please sign in to search for videos.
          </div>
        </div>
      </div>
    );
  }

  const searchVideos = useCallback(async (query) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setHasSearched(true);
    
    try {
      // Get the auth token from Firebase
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        setError('Authentication required. Please sign in again.');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setVideos(data.videos || []);
        console.log('YouTube search results:', data.videos);
      } else {
        console.error('YouTube search error response:', data);
        setError(data.message || 'Failed to search videos');
      }
    } catch (err) {
      console.error('YouTube search error:', err);
      setError('Failed to search videos. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    searchVideos(searchQuery);
  };

  // Manual search function
  const handleManualSearch = () => {
    if (searchQuery.trim()) {
      searchVideos(searchQuery);
    }
  };

  // Search on Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      e.stopPropagation();
      searchVideos(searchQuery);
    }
  };

  const handleVideoSelect = (video) => {
    onSelectVideo({
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail,
      duration: video.duration,
      channel: video.channelTitle
    });
  };

  const formatDuration = (duration) => {
    // Convert YouTube duration format (PT4M13S) to readable format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="youtube-search-inline"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="youtube-search-content">
        <div className="youtube-search-header">
          <h3>🔍 Search YouTube</h3>
          <button 
            type="button"
            className="btn-close" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          >×</button>
        </div>
        
        <div 
          className="youtube-search-form"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div 
            className="search-input-container"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                console.log('Search input changed:', e.target.value);
                setSearchQuery(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onClick={(e) => {
                // Prevent event bubbling
                e.stopPropagation();
              }}
              placeholder="Search for educational videos..."
              className="search-input"
              disabled={loading}
            />
            <button
              type="button"
              className="search-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleManualSearch();
              }}
              disabled={loading || !searchQuery.trim()}
            >
              {loading ? '🔍' : 'Search'}
            </button>
          </div>
          {searchQuery && !loading && !hasSearched && (
            <div className="search-status">
              <small>Type your search and click "Search" or press Enter</small>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-message">
            Searching for videos...
          </div>
        )}

        {videos.length > 0 && (
          <div className="videos-list">
            {videos.map((video) => (
              <div 
                key={video.videoId} 
                className="video-item" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleVideoSelect(video);
                }}
              >
                <div className="video-thumbnail">
                  <img src={video.thumbnail} alt={video.title} />
                  <div className="video-duration">
                    {formatDuration(video.duration)}
                  </div>
                </div>
                <div className="video-info">
                  <h4 className="video-title">{video.title}</h4>
                  <p className="video-channel">{video.channelTitle}</p>
                  <p className="video-description">
                    {video.description.length > 100 
                      ? `${video.description.substring(0, 100)}...` 
                      : video.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && videos.length === 0 && hasSearched && (
          <div className="no-results">
            <p>No videos found for "{searchQuery}".</p>
            <p>Try a different search term or check your spelling.</p>
          </div>
        )}

        {!loading && !error && !hasSearched && (
          <div className="search-instructions">
            <p>🔍 Type your search term and click "Search" to find educational videos</p>
            <p>Examples: "math tutorial", "science experiment", "history lesson"</p>
            <div className="test-search">
              <button 
                type="button"
                className="btn-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchQuery('math tutorial');
                }}
              >
                Try: "math tutorial"
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeSearch;
