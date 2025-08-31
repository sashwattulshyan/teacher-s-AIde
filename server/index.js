const express = require('express');
const admin = require('firebase-admin');

// Only import firebase-functions if available (for Cloud Functions)
let functions;
try {
  functions = require('firebase-functions');
} catch (error) {
  // firebase-functions not available (local development)
  functions = null;
}
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const expressStatic = express.static;

// Import Firebase configuration (this will handle initialization)
const { admin: adminApp, db, auth } = require('./config/firebase');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Your Edu App API',
    version: '1.0.0',
    description: 'API documentation for Your Edu App',
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Local server' }
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Updated for production
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'https://eduspark-app-c1c19.web.app',
    'https://eduspark-app-c1c19.firebaseapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running 🚀',
    timestamp: new Date().toISOString()
  });
});

// Test API endpoints
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    endpoints: {
      health: '/health',
      test: '/api/test',
      auth: '/api/auth/*',
      classrooms: '/api/classrooms/*',
      courses: '/api/courses/*',
      lessons: '/api/lessons/*',
      users: '/api/users/*'
    }
  });
});

// Firebase test endpoint
app.get('/api/test-firebase', async (req, res) => {
  try {
    // Test if Firebase is properly initialized
    const testDoc = await db.collection('test').doc('test').get();
    
    res.json({
      message: 'Firebase is working!',
      firebaseInitialized: true,
      dbWorking: !!db,
      authWorking: !!auth,
      testDocExists: testDoc.exists
    });
  } catch (error) {
    console.error('Firebase test error:', error);
    res.status(500).json({
      message: 'Firebase test failed',
      error: error.message,
      firebaseInitialized: false
    });
  }
});

// Simple auth endpoint for testing
app.post('/api/auth/test', (req, res) => {
  res.json({
    message: 'Auth endpoint working',
    user: {
      uid: 'test-user-id',
      email: 'test@example.com',
      role: 'teacher'
    }
  });
});

// Simple classroom endpoint for testing
app.get('/api/classrooms/test', (req, res) => {
  res.json({
    message: 'Classrooms endpoint working',
    classrooms: [
      {
        id: 'classroom-1',
        name: 'Test Classroom',
        description: 'A test classroom',
        joinCode: 'TEST123'
      }
    ]
  });
});

// Swagger UI endpoint
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount main API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classrooms', require('./routes/classrooms'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/youtube', require('./routes/youtube'));
app.use('/api/video', require('./routes/video'));
app.use('/api/grading', require('./routes/grading'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /health',
      'GET /api/test',
      'POST /api/auth/test',
      'GET /api/classrooms/test'
    ]
  });
});

// Global error handler (should be after all routes)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: err.message || 'Something went wrong'
  });
});

// For Railway deployment
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  });

// Export for Cloud Functions (if needed later)
if (typeof functions !== 'undefined') {
  exports.api = functions.https.onRequest(app);
}
