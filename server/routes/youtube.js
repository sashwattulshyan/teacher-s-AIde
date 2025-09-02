const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { query, validationResult } = require('express-validator');

const router = express.Router();

// YouTube Data API v3 endpoint
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Basic route to test if router is loading
router.get('/', (req, res) => {
  res.json({
    message: 'YouTube API router is working',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify routing
router.get('/test', (req, res) => {
  res.json({
    message: 'YouTube API route is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple test endpoint without authentication
router.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    message: 'YouTube API ping successful',
    timestamp: new Date().toISOString()
  });
});

// Test search endpoint without authentication
router.get('/search-test', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    message: 'Search endpoint accessible',
    query: req.query.q,
    timestamp: new Date().toISOString()
  });
});

// Search YouTube videos
router.get('/search', 
  authenticateToken, 
  requireRole(['teacher']),
  [
    query('q').isString().notEmpty().withMessage('Search query is required'),
    query('maxResults').optional().isInt({ min: 1, max: 50 }).withMessage('maxResults must be between 1 and 50')
  ],
  async (req, res) => {
    // Ensure we always return JSON
    res.setHeader('Content-Type', 'application/json');
    console.log('YouTube search request received:', {
      query: req.query.q,
      user: req.user?.uid,
      userRole: req.userRole,
      timestamp: new Date().toISOString()
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { q: searchQuery, maxResults = 10 } = req.query;
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!apiKey) {
        console.error('YouTube API key not configured');
        return res.status(500).json({
          error: 'YouTube API not configured',
          message: 'YouTube API key is not set. Please configure YOUTUBE_API_KEY in your environment variables.'
        });
      }

      // Search for videos
      const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${maxResults}&key=${apiKey}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchResponse.ok) {
        console.error('YouTube API error:', searchData);
        return res.status(500).json({
          error: 'YouTube API error',
          message: 'Failed to search YouTube videos'
        });
      }

      if (!searchData.items || searchData.items.length === 0) {
        return res.json({ videos: [] });
      }

      // Get video IDs for detailed information
      const videoIds = searchData.items.map(item => item.id.videoId).join(',');
      
      // Get detailed video information including duration
      const detailsUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${apiKey}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (!detailsResponse.ok) {
        console.error('YouTube API details error:', detailsData);
        return res.status(500).json({
          error: 'YouTube API error',
          message: 'Failed to get video details'
        });
      }

      // Combine search results with detailed information
      const videos = detailsData.items.map(video => ({
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        publishedAt: video.snippet.publishedAt,
        duration: video.contentDetails?.duration || 'PT0S',
        viewCount: video.statistics?.viewCount || '0',
        likeCount: video.statistics?.likeCount || '0'
      }));

      res.json({ videos });

    } catch (error) {
      console.error('YouTube search error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search YouTube videos',
        details: error.message
      });
    }
  }
);

// Error handler for this router
router.use((error, req, res, next) => {
  console.error('YouTube router error:', error);
  res.setHeader('Content-Type', 'application/json');
  res.status(500).json({
    error: 'YouTube API error',
    message: 'An error occurred in the YouTube API',
    details: error.message
  });
});

// Get video details by ID
router.get('/video/:videoId',
  authenticateToken,
  requireRole(['teacher']),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error: 'YouTube API not configured',
          message: 'YouTube API key is not set'
        });
      }

      const url = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        console.error('YouTube API error:', data);
        return res.status(500).json({
          error: 'YouTube API error',
          message: 'Failed to get video details'
        });
      }

      if (!data.items || data.items.length === 0) {
        return res.status(404).json({
          error: 'Video not found',
          message: 'The requested video could not be found'
        });
      }

      const video = data.items[0];
      const videoDetails = {
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        publishedAt: video.snippet.publishedAt,
        duration: video.contentDetails?.duration || 'PT0S',
        viewCount: video.statistics?.viewCount || '0',
        likeCount: video.statistics?.likeCount || '0'
      };

      res.json({ video: videoDetails });

    } catch (error) {
      console.error('YouTube video details error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get video details'
      });
    }
  }
);

module.exports = router;
