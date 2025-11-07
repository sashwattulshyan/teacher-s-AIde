const express = require('express');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');

// Rate limiting for AI endpoints (more restrictive)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 AI requests per 15 minutes
  message: {
    error: 'Too many AI requests',
    message: 'Please wait before making another AI request'
  }
});

const router = express.Router();

// Memory-only storage (no files written to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10 // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Check file extension
    const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.txt', '.mp4', '.mov'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    const allowedMimes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'video/mp4',
      'video/quicktime',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.originalname} (${file.mimetype})`));
    }
  }
});

// Helper: extract text from in-memory files (PDF, TXT). Others are referenced only
async function extractTextFromFiles(files) {
  let textParts = [];
  for (const file of files || []) {
    const { originalname, mimetype, buffer } = file;
    if (mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      textParts.push(`PDF(${originalname}):\n${data.text}`);
    } else if (mimetype === 'text/plain') {
      const data = buffer.toString('utf8');
      textParts.push(`TEXT(${originalname}):\n${data}`);
    } else {
      textParts.push(`FILE(${originalname}) included in request (binary) - content not parsed`);
    }
  }
  return textParts.join('\n\n---\n\n');
}

// Helper: Gemini client
function getGeminiModelOrThrow() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('AI not configured: missing GEMINI_API_KEY in server/.env');
    err.status = 500;
    throw err;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash as default (fast and stable)
    // Alternative models: gemini-2.5-pro (better quality), gemini-flash-latest, gemini-pro-latest
    // Available models depend on your API key permissions
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    return genAI.getGenerativeModel({ model: modelName });
  } catch (error) {
    console.error('Error initializing Gemini model:', error);
    throw new Error(`Failed to initialize AI model: ${error.message}`);
  }
}

async function geminiJsonGenerate(prompt) {
  try {
    const model = getGeminiModelOrThrow();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: 'application/json',
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });
    
    if (!result || !result.response) {
      throw new Error('AI model returned empty response');
    }
    
    const text = result.response.text() || '';
    
    if (!text || text.trim() === '') {
      throw new Error('AI model returned empty text response');
    }
    
    // Try parse as-is first
    let json = {};
    try { 
      json = JSON.parse(text); 
    } catch (parseError) {
      // Fallback: extract JSON block via regex
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { 
          json = JSON.parse(match[0]); 
        } catch (innerError) {
          console.error('Failed to parse AI response as JSON:', {
            text: text.substring(0, 500),
            parseError: innerError.message
          });
          throw new Error('AI model returned invalid JSON format. Please try again.');
        }
      } else {
        console.error('No JSON found in AI response:', text.substring(0, 500));
        throw new Error('AI model did not return valid JSON. Please try again.');
      }
    }
    
    return { rawText: text, json };
  } catch (error) {
    console.error('Gemini JSON generation error:', error);
    // Provide more helpful error messages
    if (error.message.includes('API key')) {
      throw new Error('AI service authentication failed. Please check API key configuration.');
    } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
      throw new Error('AI service rate limit exceeded. Please wait a moment and try again.');
    } else if (error.message.includes('safety')) {
      throw new Error('Content was blocked by AI safety filters. Please try with different content.');
    } else {
      throw new Error(`AI generation failed: ${error.message}. Please try again.`);
    }
  }
}

// Dev helper: check if Firebase Admin is configured
function isFirebaseConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

router.post(
  '/generate-lesson',
  aiLimiter,
  authenticateToken,
  requireRole(['teacher']),
  [
    body('unitId').optional().isString().withMessage('Unit ID must be a string'),
    body('lessonType').optional().trim().toLowerCase().isIn(['lecture', 'reading', 'quiz', 'test', 'assignment', 'video', 'interactive', 'discussion', 'project', 'workshop']).withMessage('Invalid lesson type'),
    body('title').optional().isString().isLength({ max: 200 }).withMessage('Title must be a string with max 200 characters'),
    body('objectives').optional().isString().isLength({ max: 2000 }).withMessage('Objectives must be a string with max 2000 characters'),
    body('sourceText').optional().isString().isLength({ max: 10000 }).withMessage('Source text must be a string with max 10000 characters'),
    body('readingUrl').optional().isURL().withMessage('Reading URL must be a valid URL'),
    body('videoUrl').optional().isURL().withMessage('Video URL must be a valid URL'),
    body('numQuestions').optional().isString().custom((value) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || num > 100) {
        throw new Error('Number of questions must be between 1 and 100');
      }
      return true;
    }).withMessage('Number of questions must be between 1 and 100'),
    body('questionTypes').optional().custom((value, { req }) => {
      const lessonType = req.body.lessonType;
      // Only require questionTypes for quiz and test lesson types
      if ((lessonType === 'quiz' || lessonType === 'test') && (!value || (typeof value === 'string' && value.trim() === ''))) {
        throw new Error('Question types are required for quiz and test generation');
      }
      // Only validate length if value is provided and is a string
      if (value && typeof value === 'string' && value.length > 500) {
        throw new Error('Question types must be 500 characters or less');
      }
      return true;
    }),
    body('save').optional().isString().custom((value) => {
      if (value === 'true' || value === 'false' || value === '') {
        return true;
      }
      throw new Error('Save must be true, false, or empty');
    }).withMessage('Save must be true, false, or empty')
  ],
  upload.array('files', 10),
  async (req, res) => {
    console.log('AI generate-lesson request received:', {
      lessonType: req.body.lessonType,
      hasFiles: req.files?.length > 0,
      user: req.user?.uid,
      timestamp: new Date().toISOString()
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const list = errors.array();
      console.warn('AI generate-lesson validation errors:', list);
      console.warn('Request body:', req.body);
      return res.status(400).json({
        error: 'Validation failed',
        message: list.map(e => `${e.path}: ${e.msg}`).join('; '),
        errors: list,
        details: 'Please check your input and try again. Make sure all required fields are filled correctly.',
        debug: {
          body: req.body,
          validationErrors: list
        }
      });
    }

    const parseMaybeArray = (val) => {
      if (val == null) return [];
      if (Array.isArray(val)) return val;
      try { const j = JSON.parse(val); return Array.isArray(j) ? j : String(val).split(',').map(s => s.trim()).filter(Boolean); } catch { return String(val).split(',').map(s => s.trim()).filter(Boolean); }
    };

    const unitId = req.body.unitId;
    const lessonTypeRaw = String(req.body.lessonType || '').toLowerCase();
    const lessonType = ['lecture','reading','quiz','test','assignment','video','interactive','discussion','project','workshop'].includes(lessonTypeRaw) ? lessonTypeRaw : 'lecture';
    const title = req.body.title || '';
    const sourceText = req.body.sourceText || '';
    const readingUrl = req.body.readingUrl || '';
    const videoUrl = req.body.videoUrl || '';
    const objectives = parseMaybeArray(req.body.objectives);
    const questionTypes = parseMaybeArray(req.body.questionTypes);
    const numQuestions = req.body.numQuestions ? parseInt(req.body.numQuestions, 10) : 10;
    const save = String(req.body.save) === 'true' || req.body.save === true;

    try {
      // Access checks (dev fallback when Firebase not configured)
      let unitData = { lessons: [] };
      let classroomData = { teacherId: req.user?.uid };
      if (save && isFirebaseConfigured()) {
        if (!unitId) return res.status(400).json({ error: 'Validation failed', message: 'unitId is required when save=true' });
      }
      if (isFirebaseConfigured() && unitId) {
        const unitDoc = await db.collection('courses').doc(unitId).get();
        if (!unitDoc.exists) return res.status(404).json({ error: 'Unit not found' });
        unitData = unitDoc.data();
        const classroomDoc = await db.collection('classrooms').doc(unitData.classroomId).get();
        if (!classroomDoc.exists) return res.status(404).json({ error: 'Classroom not found' });
        classroomData = classroomDoc.data();
      }
      if (classroomData.teacherId !== req.user.uid) return res.status(403).json({ error: 'Access denied' });

      const fileText = await extractTextFromFiles(req.files);
      const combinedText = [sourceText, fileText].filter(Boolean).join('\n\n');

      const schema = {
        lecture: { title: title || 'Auto-generated Lecture', type: 'lecture', content: 'string', keyPoints: ['string'], duration: 'number' },
        reading: { title: title || 'Auto-generated Reading', type: 'reading', url: 'string', description: 'string', discussionQuestions: ['string'], estimatedTime: 'number' },
        quiz: { title: title || 'Auto-generated Quiz', type: 'quiz', questions: [{ question: 'string', options: ['string','string','string','string'], correctAnswer: 0 }], timeLimit: 'number' },
        test: { title: title || 'Auto-generated Test', type: 'test', questions: [{ question: 'string', options: ['string','string','string','string'], correctAnswer: 0 }], timeLimit: 'number' },
        assignment: { title: title || 'Auto-generated Assignment', type: 'assignment', description: 'string', rubric: ['string'], dueDate: 'string', points: 'number' },
        video: { title: title || 'Auto-generated Video Lesson', type: 'video', description: 'string', videoUrl: 'string', transcript: 'string', keyPoints: ['string'], duration: 'number' },
        interactive: { title: title || 'Auto-generated Interactive Lesson', type: 'interactive', description: 'string', activities: ['string'], instructions: 'string', estimatedTime: 'number' },
        discussion: { title: title || 'Auto-generated Discussion', type: 'discussion', topic: 'string', questions: ['string'], guidelines: 'string', duration: 'number' },
        project: { title: title || 'Auto-generated Project', type: 'project', description: 'string', objectives: ['string'], deliverables: ['string'], timeline: 'string', rubric: ['string'] },
        workshop: { title: title || 'Auto-generated Workshop', type: 'workshop', description: 'string', activities: ['string'], materials: ['string'], duration: 'number', groupSize: 'number' }
      };

      const lessonDescriptions = {
        lecture: 'Traditional text-based lessons with key points and structured content',
        reading: 'External resources with discussion questions and reading comprehension',
        quiz: 'Shorter assessments with multiple choice questions',
        test: 'Formal assessments with time limits and comprehensive questions',
        assignment: 'Project-based learning with detailed rubrics and clear deliverables',
        video: 'Video lessons with transcripts, key points, and supplementary materials',
        interactive: 'Hands-on activities and step-by-step instructions',
        discussion: 'Collaborative learning with discussion guidelines and prompts',
        project: 'Long-term assignments with specific deliverables and timelines',
        workshop: 'Group activities with required materials and structured format'
      };

      const prompt = [
        'You are an expert instructional designer. Create a ' + lessonType + ' lesson from the provided source material.',
        'Lesson Type Description: ' + lessonDescriptions[lessonType],
        'Respond ONLY as strict JSON matching the shape shown. Do not include code fences or extra text.',
        'Objectives: ' + JSON.stringify(objectives),
        (lessonType === 'reading' && readingUrl ? 'Reading URL provided: ' + readingUrl + '. Use this URL and create content based on it.' : ''),
        (lessonType === 'video' && videoUrl ? 'Video URL provided: ' + videoUrl + '. Use this URL and create content based on it.' : ''),
        // Only include question-related instructions for quiz/test types
        ((lessonType === 'quiz' || lessonType === 'test') ? `Generate exactly ${numQuestions} questions with 4 options each. Use question types: ${JSON.stringify(questionTypes)}.` : ''),
        ((lessonType === 'quiz' || lessonType === 'test') ? 'For tests, ensure timeLimit is set (typically 30-60 minutes). For quizzes, use 15-30 minutes.' : ''),
        (lessonType === 'video' ? 'For videos, include a detailed transcript and key points.' : ''),
        (lessonType === 'assignment' ? 'For assignments, include a comprehensive rubric.' : ''),
        (lessonType === 'project' ? 'For projects, include specific deliverables and timeline.' : ''),
        (lessonType === 'workshop' ? 'For workshops, include required materials and group size.' : ''),
        'JSON shape example (values may be placeholders): ' + JSON.stringify(schema[lessonType]),
        'Source material:\n' + combinedText.substring(0, 8000)
      ].filter(Boolean).join('\n\n');

      const { json, rawText } = await geminiJsonGenerate(prompt);
      const contentJson = json || {};

      // Add debugging for quiz/test generation
      if (lessonType === 'quiz' || lessonType === 'test') {
        // Quiz/test generation logic handled below
      }

      // Validate AI response structure
      if (!contentJson.title && !title) {
        throw new Error('AI failed to generate lesson title');
      }

      const newLesson = { 
        title: contentJson.title || (title || 'Generated Lesson'), 
        type: lessonType, 
        createdAt: new Date() 
      };
      
      switch (lessonType) {
        case 'lecture': 
          newLesson.content = contentJson.content || 'Content generation failed. Please try again.'; 
          newLesson.keyPoints = contentJson.keyPoints || [];
          newLesson.duration = contentJson.duration || 30;
          break;
        case 'reading': 
          newLesson.url = readingUrl || contentJson.url || ''; 
          newLesson.description = contentJson.description || 'Reading description generation failed.'; 
          newLesson.discussionQuestions = contentJson.discussionQuestions || [];
          newLesson.estimatedTime = contentJson.estimatedTime || 15;
          break;
        case 'quiz':
        case 'test': 
          // Ensure we have valid questions array
          let questions = [];
          if (Array.isArray(contentJson.questions)) {
            questions = contentJson.questions.map((q, index) => ({ 
              question: q.question || `Question ${index + 1}`, 
              options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D'], 
              correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4 ? q.correctAnswer : 0 
            }));
          }
          
          // If no questions were generated, create a default one
          if (questions.length === 0) {
            questions = [{ 
              question: 'Sample question - please edit this question', 
              options: ['Option A', 'Option B', 'Option C', 'Option D'], 
              correctAnswer: 0 
            }];
          }
          
          newLesson.questions = questions;
          newLesson.timeLimit = contentJson.timeLimit || (lessonType === 'test' ? 60 : 30);
          break;
        case 'assignment': 
          newLesson.description = contentJson.description || 'Assignment description generation failed.'; 
          newLesson.rubric = contentJson.rubric || ['Content Quality (25%)', 'Creativity (25%)', 'Technical Skills (25%)', 'Presentation (25%)'];
          newLesson.dueDate = contentJson.dueDate || '';
          newLesson.points = contentJson.points || 100;
          break;
        case 'video':
          newLesson.description = contentJson.description || 'Video lesson description generation failed.';
          newLesson.videoUrl = videoUrl || contentJson.videoUrl || '';
          newLesson.transcript = contentJson.transcript || 'Video transcript will be added when video is uploaded or URL is provided.';
          newLesson.keyPoints = contentJson.keyPoints || [];
          newLesson.duration = contentJson.duration || 15;
          newLesson.videoSource = videoUrl ? 'url' : 'ai_generated';
          break;
        case 'interactive':
          newLesson.description = contentJson.description || 'Interactive lesson description generation failed.';
          newLesson.activities = contentJson.activities || [];
          newLesson.instructions = contentJson.instructions || '';
          newLesson.estimatedTime = contentJson.estimatedTime || 45;
          break;
        case 'discussion':
          newLesson.topic = contentJson.topic || 'Discussion topic generation failed.';
          newLesson.questions = contentJson.questions || [];
          newLesson.guidelines = contentJson.guidelines || '';
          newLesson.duration = contentJson.duration || 30;
          break;
        case 'project':
          newLesson.description = contentJson.description || 'Project description generation failed.';
          newLesson.objectives = contentJson.objectives || ['Demonstrate understanding of key concepts', 'Apply learned skills to real-world scenarios'];
          newLesson.deliverables = contentJson.deliverables || ['Final project report', 'Presentation materials', 'Source code or documentation'];
          newLesson.timeline = contentJson.timeline || '2-3 weeks with weekly check-ins';
          newLesson.rubric = contentJson.rubric || ['Project Scope (30%)', 'Technical Implementation (30%)', 'Documentation (20%)', 'Presentation (20%)'];
          break;
        case 'workshop':
          newLesson.description = contentJson.description || 'Workshop description generation failed.';
          newLesson.activities = contentJson.activities || ['Introduction and setup', 'Hands-on practice', 'Group discussion', 'Wrap-up and reflection'];
          newLesson.materials = contentJson.materials || ['Computer/laptop', 'Required software', 'Handouts or worksheets', 'Writing materials'];
          newLesson.duration = contentJson.duration || 60;
          newLesson.groupSize = contentJson.groupSize || 4;
          break;
      }

      let saved = false;
      if (save && isFirebaseConfigured() && unitId) {
        const current = (unitData.lessons || []);
        const updated = [...current, newLesson];
        await db.collection('courses').doc(unitId).update({ lessons: updated, updatedAt: new Date() });
        saved = true;
      }

      res.json({ message: 'Lesson generated', lesson: newLesson, saved, note: !isFirebaseConfigured() && save ? 'Not saved (Firebase not configured)' : undefined, debug: process.env.NODE_ENV === 'development' ? { rawModelText: rawText?.slice(0, 5000) } : undefined });
    } catch (error) {
      console.error('AI generate lesson error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('Validation failed')) {
        errorMessage = 'Please check your input and try again. Make sure all required fields are filled correctly.';
      } else if (error.message.includes('AI failed')) {
        errorMessage = 'AI generation failed. Please try again with different content or check your source material.';
      }
      
      res.status(error.status || 500).json({ 
        error: 'AI generation failed', 
        message: errorMessage,
        details: 'If the problem persists, try providing more source material or different lesson objectives.'
      });
    }
  }
);

router.post(
  '/generate-quiz',
  aiLimiter,
  authenticateToken,
  requireRole(['teacher']),
  upload.array('files', 10),
  [
    body('unitId').isString().notEmpty().withMessage('Unit ID is required'),
    body('numQuestions').optional().isString().custom((value) => {
      if (!value) return true; // Optional field
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || num > 100) {
        throw new Error('Number of questions must be between 1 and 100');
      }
      return true;
    }).withMessage('Number of questions must be between 1 and 100'),
    body('questionTypes').isString().notEmpty().isLength({ max: 500 }).withMessage('Question types are required and must be 500 characters or less'),
    body('sourceText').optional().isString().isLength({ max: 10000 }).withMessage('Source text must be a string with max 10000 characters'),
    body('save').optional().isString().custom((value) => {
      if (value === 'true' || value === 'false' || value === '' || !value) {
        return true;
      }
      throw new Error('Save must be true, false, or empty');
    }).withMessage('Save must be true, false, or empty')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    
    // Debug logging for generate-quiz
    if (!errors.isEmpty()) {
      const list = errors.array();
      console.warn('AI generate-quiz validation errors:', list);
      console.warn('Request body:', req.body);
      console.warn('Validation error details:');
      list.forEach(error => {
        console.warn(`  ${error.path}: ${error.msg} (value: ${error.value}, type: ${typeof error.value})`);
      });
      return res.status(400).json({
        error: 'Validation failed',
        message: list.map(e => `${e.path}: ${e.msg}`).join('; '),
        errors: list,
        details: 'Please check your input and try again. Make sure all required fields are filled correctly.',
        debug: {
          body: req.body,
          validationErrors: list
        }
      });
    }

    const parseMaybeArray = (val) => {
      if (val == null) return [];
      if (Array.isArray(val)) return val;
      try { const j = JSON.parse(val); return Array.isArray(j) ? j : String(val).split(',').map(s => s.trim()).filter(Boolean); } catch { return String(val).split(',').map(s => s.trim()).filter(Boolean); }
    };

    const unitId = req.body.unitId;
    const numQuestions = req.body.numQuestions ? parseInt(req.body.numQuestions, 10) : 10;
    const questionTypes = parseMaybeArray(req.body.questionTypes);
    const sourceText = req.body.sourceText || '';
    const save = String(req.body.save) === 'true' || req.body.save === true;

    try {
      // Access checks (dev fallback when Firebase not configured)
      let unitData = { lessons: [] };
      let classroomData = { teacherId: req.user?.uid };
      if (isFirebaseConfigured()) {
        const unitDoc = await db.collection('courses').doc(unitId).get();
        if (!unitDoc.exists) return res.status(404).json({ error: 'Unit not found' });
        unitData = unitDoc.data();
        const classroomDoc = await db.collection('classrooms').doc(unitData.classroomId).get();
        if (!classroomDoc.exists) return res.status(404).json({ error: 'Classroom not found' });
        classroomData = classroomDoc.data();
      }
      if (classroomData.teacherId !== req.user.uid) return res.status(403).json({ error: 'Access denied' });

      const fileText = await extractTextFromFiles(req.files);
      const combinedText = [sourceText, fileText].filter(Boolean).join('\n\n');

      const prompt = [
        'You are an expert test generator. Create multiple-choice questions from the provided source material. Respond ONLY as JSON with {"title": string, "questions": [{"question": string, "options": [string], "correctAnswer": number}]}',
        'numQuestions=' + numQuestions + ', questionTypes=' + JSON.stringify(questionTypes),
        'source material:\n' + combinedText.substring(0, 8000)
      ].join('\n\n');

      const { json, rawText } = await geminiJsonGenerate(prompt);
      const contentJson = json || {};
      const questions = (contentJson.questions || []).map((q) => ({
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
      }));

      const newLesson = { title: contentJson.title || 'Auto-generated Quiz', type: 'quiz', questions, createdAt: new Date() };
      let saved = false;
      if (save && isFirebaseConfigured()) {
        const current = (unitData.lessons || []);
        const updated = [...current, newLesson];
        await db.collection('courses').doc(unitId).update({ lessons: updated, updatedAt: new Date() });
        saved = true;
      }
      res.json({ message: 'Quiz generated', lesson: newLesson, saved, note: !isFirebaseConfigured() && save ? 'Not saved (Firebase not configured)' : undefined, debug: process.env.NODE_ENV === 'development' ? { rawModelText: rawText?.slice(0, 5000) } : undefined });
    } catch (error) {
      console.error('AI generate quiz error:', error);
      res.status(error.status || 500).json({ error: 'AI generation failed', message: error.message });
    }
  }
);

module.exports = router;
