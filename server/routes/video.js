const express = require('express');
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Configure multer for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per video file
    files: 1 // Max 1 video per request
  },
  fileFilter: (req, file, cb) => {
    // Check file extension and MIME type
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    const allowedMimes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm'
    ];
    
    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported video format: ${file.originalname} (${file.mimetype}). Supported formats: MP4, MOV, AVI, MKV, WEBM`));
    }
  }
});

// Upload video file
router.post('/upload',
  authenticateToken,
  requireRole(['teacher']),
  upload.single('video'),
  [
    body('lessonId').optional().isString().withMessage('Lesson ID must be a string'),
    body('unitId').optional().isString().withMessage('Unit ID must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No video file provided',
          message: 'Please select a video file to upload'
        });
      }

      const { lessonId, unitId } = req.body;
      const { originalname, mimetype, size, buffer } = req.file;

      // Validate file size (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (size > maxSize) {
        return res.status(400).json({
          error: 'File too large',
          message: `Video file size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds the 100MB limit`
        });
      }

      // For now, we'll store the video data in memory and return metadata
      // In a production environment, you'd want to upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
      const videoData = {
        id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalName: originalname,
        mimeType: mimetype,
        size: size,
        uploadedAt: new Date(),
        uploadedBy: req.user.uid,
        lessonId: lessonId,
        unitId: unitId,
        // In production, this would be a cloud storage URL
        url: `data:${mimetype};base64,${buffer.toString('base64')}`,
        // For now, we'll store a reference to the file
        fileReference: {
          buffer: buffer,
          originalname: originalname,
          mimetype: mimetype
        }
      };

      // Store video metadata in Firestore (in production, you'd store the actual file in cloud storage)
      const { db } = require('../config/firebase');
      const videoRef = db.collection('videoUploads').doc(videoData.id);
      await videoRef.set({
        ...videoData,
        fileReference: null // Don't store buffer in Firestore
      });

      // Return success response with video metadata
      res.json({
        success: true,
        video: {
          id: videoData.id,
          originalName: videoData.originalName,
          mimeType: videoData.mimeType,
          size: videoData.size,
          uploadedAt: videoData.uploadedAt,
          url: videoData.url,
          duration: null // Would be extracted in production
        },
        message: 'Video uploaded successfully'
      });

    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message || 'Failed to upload video'
      });
    }
  }
);

// Get video by ID
router.get('/:videoId',
  authenticateToken,
  requireRole(['teacher', 'student']),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const { db } = require('../config/firebase');
      
      const videoDoc = await db.collection('videoUploads').doc(videoId).get();
      
      if (!videoDoc.exists) {
        return res.status(404).json({
          error: 'Video not found',
          message: 'The requested video does not exist'
        });
      }

      const videoData = videoDoc.data();
      
      // Check if user has access to this video
      if (videoData.uploadedBy !== req.user.uid && req.userRole !== 'teacher') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access this video'
        });
      }

      res.json({
        success: true,
        video: {
          id: videoData.id,
          originalName: videoData.originalName,
          mimeType: videoData.mimeType,
          size: videoData.size,
          uploadedAt: videoData.uploadedAt,
          url: videoData.url
        }
      });

    } catch (error) {
      console.error('Video retrieval error:', error);
      res.status(500).json({
        error: 'Retrieval failed',
        message: 'Failed to retrieve video'
      });
    }
  }
);

// Delete video
router.delete('/:videoId',
  authenticateToken,
  requireRole(['teacher']),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const { db } = require('../config/firebase');
      
      const videoDoc = await db.collection('videoUploads').doc(videoId).get();
      
      if (!videoDoc.exists) {
        return res.status(404).json({
          error: 'Video not found',
          message: 'The requested video does not exist'
        });
      }

      const videoData = videoDoc.data();
      
      // Check if user owns this video
      if (videoData.uploadedBy !== req.user.uid) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete videos you uploaded'
        });
      }

      // Delete from Firestore
      await db.collection('videoUploads').doc(videoId).delete();

      res.json({
        success: true,
        message: 'Video deleted successfully'
      });

    } catch (error) {
      console.error('Video deletion error:', error);
      res.status(500).json({
        error: 'Deletion failed',
        message: 'Failed to delete video'
      });
    }
  }
);

module.exports = router;
