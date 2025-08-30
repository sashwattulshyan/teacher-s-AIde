# 🤖 AI Unit Generation - Complete Implementation Guide

## 📋 Table of Contents
1. [Feature Overview](#feature-overview)
2. [Technical Architecture](#technical-architecture)
3. [Database Schema](#database-schema)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Implementation](#backend-implementation)
6. [AI Integration](#ai-integration)
7. [Implementation Phases](#implementation-phases)
8. [Technical Requirements](#technical-requirements)
9. [User Experience Flow](#user-experience-flow)
10. [Quality Assurance](#quality-assurance)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Feature Overview

### Current State
- ✅ AI lesson generation within existing units
- ✅ File upload system for individual lessons
- ✅ 10 lesson types supported (lecture, reading, quiz, test, assignment, video, interactive, discussion, project, workshop)
- ✅ Unit/course management structure

### New Feature: AI Unit Generation
- 🎯 **Complete Unit Creation** - Generate entire units from source materials
- 📁 **Source File Processing** - Textbook, PowerPoint, PDF analysis
- 📝 **Source Text Processing** - Direct text input with parameters
- ⚙️ **Comprehensive Parameters** - Detailed teacher specifications
- 🔄 **Intelligent Sequencing** - Logical lesson progression and flow

### Use Case Example: Calculus AB Unit
**Input:** Calculus textbook PDF + teacher parameters
**Output:** Complete 3-week unit with 15+ lessons including lectures, quizzes, tests, videos, discussions, and assignments

---

## 🏗️ Technical Architecture

### System Components
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                       │
├─────────────────────────────────────────────────────────┤
│ UnitGenerationModal → UnitGenerationForm → Progress    │
│ ↓                                                    │
│ CourseManager Integration                              │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                    Backend API Layer                    │
├─────────────────────────────────────────────────────────┤
│ /api/unit-generation/analyze-file                      │
│ /api/unit-generation/generate                          │
│ /api/unit-generation/status/:id                        │
│ /api/unit-generation/accept/:id                        │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                         │
├─────────────────────────────────────────────────────────┤
│ FileAnalysisService → UnitGenerationService → AI       │
│ ↓                                                    │
│ Database Integration                                   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Teacher Input** → Source file/text + parameters
2. **File Analysis** → Content extraction and structure analysis
3. **AI Processing** → Unit structure and lesson generation
4. **Content Creation** → Individual lessons with assessments
5. **Integration** → Database storage and classroom linking

---

## 🗄️ Database Schema

### Enhanced Collections

#### Updated `courses` Collection
```javascript
{
  // ... existing fields
  aiGenerated: boolean, // Track if unit was AI-generated
  generationMetadata: {
    sourceType: string, // 'file' | 'text'
    sourceFile: string, // File path/name
    parameters: {
      lessonTypes: object,
      lessonCounts: object,
      duration: string,
      mediaSources: string,
      additionalRequests: string
    },
    generatedAt: timestamp,
    version: string
  }
}
```

#### New `unitGenerations` Collection
```javascript
{
  id: string,
  teacherId: string,
  classroomId: string,
  courseId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  sourceType: string,
  sourceFile: string,
  parameters: object,
  result: {
    unit: object,
    lessons: array,
    metadata: object
  },
  createdAt: timestamp,
  completedAt: timestamp,
  error: string
}
```

### Database Indexes
```javascript
// Required indexes for performance
db.unitGenerations.createIndex({ teacherId: 1, createdAt: -1 });
db.unitGenerations.createIndex({ status: 1, createdAt: 1 });
db.courses.createIndex({ aiGenerated: 1, teacherId: 1 });
```

---

## 🎨 Frontend Implementation

### New Components

#### 1. UnitGenerationModal.jsx
```javascript
import React, { useState } from 'react';
import UnitGenerationForm from './UnitGenerationForm';
import UnitGenerationProgress from './UnitGenerationProgress';
import UnitGenerationResult from './UnitGenerationResult';

const UnitGenerationModal = ({ isOpen, onClose, classroom, onUnitCreated }) => {
  const [currentStep, setCurrentStep] = useState('form');
  const [generationId, setGenerationId] = useState(null);
  const [result, setResult] = useState(null);

  // Component logic here
};

export default UnitGenerationModal;
```

#### 2. UnitGenerationForm.jsx
```javascript
const UnitGenerationForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    sourceType: 'file',
    sourceFile: null,
    sourceText: '',
    fileInstructions: '',
    lessonTypes: {
      lecture: true,
      quiz: true,
      test: true,
      assignment: true,
      video: false,
      interactive: false,
      discussion: false,
      project: false,
      workshop: false
    },
    lessonCounts: {
      lectures: 3,
      quizzes: 2,
      tests: 1,
      assignments: 2
    },
    duration: '2 weeks',
    mediaSources: '',
    additionalRequests: ''
  });

  // Form validation and submission logic
};
```

#### 3. UnitGenerationProgress.jsx
```javascript
const UnitGenerationProgress = ({ generationId, onComplete }) => {
  const [progress, setProgress] = useState({
    status: 'processing',
    currentStep: 'Analyzing source material...',
    progress: 0
  });

  // Real-time progress tracking
};
```

#### 4. UnitGenerationResult.jsx
```javascript
const UnitGenerationResult = ({ result, onAccept, onModify, onReject }) => {
  // Display generated unit preview
  // Show lesson list and structure
  // Provide accept/modify/reject options
};
```

### Integration Points

#### CourseManager.jsx Updates
```javascript
// Add to existing CourseManager component
const [showUnitGeneration, setShowUnitGeneration] = useState(false);

// Add button to header
<button 
  className="btn-primary"
  onClick={() => setShowUnitGeneration(true)}
>
  🤖 Generate Unit with AI
</button>

// Add modal
{showUnitGeneration && (
  <UnitGenerationModal
    isOpen={showUnitGeneration}
    onClose={() => setShowUnitGeneration(false)}
    classroom={classroom}
    onUnitCreated={handleUnitCreated}
  />
)}
```

---

## ⚙️ Backend Implementation

### New API Routes

#### server/routes/unitGeneration.js
```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const UnitGenerationService = require('../services/unitGeneration');
const FileAnalysisService = require('../services/fileAnalysis');

// Analyze uploaded file
router.post('/analyze-file', 
  authenticateToken, 
  requireRole('teacher'),
  upload.single('file'),
  async (req, res) => {
    try {
      const analysis = await FileAnalysisService.analyzeFile(req.file);
      res.json({ success: true, analysis });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Generate unit
router.post('/generate',
  authenticateToken,
  requireRole('teacher'),
  async (req, res) => {
    try {
      const generationId = await UnitGenerationService.startGeneration(
        req.user.uid,
        req.body
      );
      res.json({ success: true, generationId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Check generation status
router.get('/status/:generationId',
  authenticateToken,
  requireRole('teacher'),
  async (req, res) => {
    try {
      const status = await UnitGenerationService.getStatus(req.params.generationId);
      res.json({ success: true, status });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Accept generated unit
router.post('/accept/:generationId',
  authenticateToken,
  requireRole('teacher'),
  async (req, res) => {
    try {
      const unit = await UnitGenerationService.acceptGeneration(
        req.params.generationId,
        req.user.uid
      );
      res.json({ success: true, unit });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
```

### Service Layer

#### server/services/fileAnalysis.js
```javascript
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');

class FileAnalysisService {
  async analyzeFile(file) {
    const fileType = this.getFileType(file.originalname);
    
    switch (fileType) {
      case 'pdf':
        return await this.analyzePDF(file);
      case 'docx':
        return await this.analyzeWord(file);
      case 'pptx':
        return await this.analyzePowerPoint(file);
      default:
        throw new Error('Unsupported file type');
    }
  }

  async analyzePDF(file) {
    const dataBuffer = file.buffer;
    const data = await pdfParse(dataBuffer);
    
    return {
      type: 'pdf',
      content: data.text,
      pages: data.numpages,
      info: data.info,
      structure: this.extractStructure(data.text),
      keyConcepts: this.extractKeyConcepts(data.text),
      learningObjectives: this.extractLearningObjectives(data.text)
    };
  }

  async analyzeWord(file) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    
    return {
      type: 'docx',
      content: result.value,
      structure: this.extractStructure(result.value),
      keyConcepts: this.extractKeyConcepts(result.value),
      learningObjectives: this.extractLearningObjectives(result.value)
    };
  }

  extractStructure(content) {
    // Extract chapters, sections, headings
    const lines = content.split('\n');
    const structure = [];
    
    lines.forEach((line, index) => {
      if (this.isHeading(line)) {
        structure.push({
          type: this.getHeadingLevel(line),
          title: line.trim(),
          lineNumber: index
        });
      }
    });
    
    return structure;
  }

  extractKeyConcepts(content) {
    // Use NLP to identify key concepts
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(content);
    
    // Implement concept extraction logic
    return this.identifyKeyConcepts(tokens);
  }

  extractLearningObjectives(content) {
    // Extract learning objectives using pattern matching
    const objectivePatterns = [
      /learning objective[s]?:/gi,
      /objective[s]?:/gi,
      /students will be able to/gi,
      /by the end of this/gi
    ];
    
    return this.findObjectives(content, objectivePatterns);
  }
}

module.exports = new FileAnalysisService();
```

#### server/services/unitGeneration.js
```javascript
const { db } = require('../config/firebase');
const FileAnalysisService = require('./fileAnalysis');
const AIService = require('./ai');

class UnitGenerationService {
  async startGeneration(teacherId, parameters) {
    // Create generation record
    const generationRef = db.collection('unitGenerations').doc();
    const generationId = generationRef.id;
    
    await generationRef.set({
      teacherId,
      status: 'pending',
      parameters,
      createdAt: new Date(),
      sourceType: parameters.sourceType,
      sourceFile: parameters.sourceFile || null
    });

    // Start async generation process
    this.processGeneration(generationId, parameters);
    
    return generationId;
  }

  async processGeneration(generationId, parameters) {
    try {
      // Update status to processing
      await this.updateStatus(generationId, 'processing', 'Analyzing source material...');

      // 1. Analyze source material
      let sourceAnalysis;
      if (parameters.sourceType === 'file') {
        sourceAnalysis = await FileAnalysisService.analyzeFile(parameters.sourceFile);
      } else {
        sourceAnalysis = await this.analyzeText(parameters.sourceText);
      }

      await this.updateStatus(generationId, 'processing', 'Generating unit structure...');

      // 2. Generate unit structure
      const unitStructure = await this.generateUnitStructure(sourceAnalysis, parameters);

      await this.updateStatus(generationId, 'processing', 'Creating lessons...');

      // 3. Generate lessons
      const lessons = await this.generateLessons(unitStructure, sourceAnalysis, parameters);

      await this.updateStatus(generationId, 'processing', 'Finalizing unit...');

      // 4. Create final result
      const result = {
        unit: unitStructure,
        lessons: lessons,
        metadata: {
          generatedAt: new Date(),
          sourceType: parameters.sourceType,
          parameters: parameters
        }
      };

      // 5. Save result
      await this.saveResult(generationId, result);
      await this.updateStatus(generationId, 'completed', 'Unit generation complete!');

    } catch (error) {
      await this.updateStatus(generationId, 'failed', error.message);
      console.error('Unit generation failed:', error);
    }
  }

  async generateUnitStructure(sourceAnalysis, parameters) {
    const prompt = this.buildUnitStructurePrompt(sourceAnalysis, parameters);
    const response = await AIService.generateContent(prompt);
    
    return this.parseUnitStructure(response);
  }

  async generateLessons(unitStructure, sourceAnalysis, parameters) {
    const lessons = [];
    
    for (const lessonPlan of unitStructure.lessons) {
      const lessonPrompt = this.buildLessonPrompt(lessonPlan, sourceAnalysis, parameters);
      const lessonContent = await AIService.generateContent(lessonPrompt);
      
      lessons.push(this.parseLesson(lessonContent, lessonPlan.type));
    }
    
    return lessons;
  }

  buildUnitStructurePrompt(sourceAnalysis, parameters) {
    return `
You are an expert curriculum designer. Create a comprehensive unit structure based on the provided source material and parameters.

SOURCE MATERIAL:
${JSON.stringify(sourceAnalysis, null, 2)}

PARAMETERS:
- Lesson Types: ${Object.keys(parameters.lessonTypes).filter(k => parameters.lessonTypes[k]).join(', ')}
- Lesson Counts: ${JSON.stringify(parameters.lessonCounts)}
- Duration: ${parameters.duration}
- Additional Requests: ${parameters.additionalRequests}

REQUIREMENTS:
1. Create a logical sequence of lessons
2. Ensure proper learning progression
3. Include appropriate assessments
4. Align with learning objectives
5. Consider the specified duration

Generate a structured unit plan with:
- Unit title and description
- Learning objectives
- Lesson sequence with types and titles
- Assessment strategy
- Timeline and pacing
`;
  }

  buildLessonPrompt(lessonPlan, sourceAnalysis, parameters) {
    return `
Generate a ${lessonPlan.type} lesson for the following context:

UNIT: ${lessonPlan.unitTitle}
LESSON: ${lessonPlan.title}
POSITION: ${lessonPlan.order} of ${lessonPlan.totalLessons}

SOURCE MATERIAL:
${JSON.stringify(sourceAnalysis, null, 2)}

REQUIREMENTS:
- Create engaging ${lessonPlan.type} content
- Include appropriate difficulty level
- Follow best practices for ${lessonPlan.type}
- Include assessment criteria if applicable
- Ensure alignment with unit objectives
`;
  }

  async updateStatus(generationId, status, message) {
    await db.collection('unitGenerations').doc(generationId).update({
      status,
      currentStep: message,
      updatedAt: new Date()
    });
  }

  async saveResult(generationId, result) {
    await db.collection('unitGenerations').doc(generationId).update({
      result,
      completedAt: new Date()
    });
  }

  async getStatus(generationId) {
    const doc = await db.collection('unitGenerations').doc(generationId).get();
    return doc.exists ? doc.data() : null;
  }

  async acceptGeneration(generationId, teacherId) {
    const generation = await this.getStatus(generationId);
    if (!generation || generation.status !== 'completed') {
      throw new Error('Generation not found or not completed');
    }

    // Create the unit in the database
    const unit = await this.createUnit(generation.result, teacherId);
    
    // Update generation status
    await db.collection('unitGenerations').doc(generationId).update({
      accepted: true,
      acceptedAt: new Date()
    });

    return unit;
  }

  async createUnit(result, teacherId) {
    // Create course/unit record
    const courseRef = db.collection('courses').doc();
    const courseId = courseRef.id;

    await courseRef.set({
      title: result.unit.title,
      description: result.unit.description,
      teacherId,
      lessons: result.lessons,
      aiGenerated: true,
      generationMetadata: result.metadata,
      createdAt: new Date()
    });

    return { courseId, ...result.unit };
  }
}

module.exports = new UnitGenerationService();
```

---

## 🤖 AI Integration

### Enhanced AI Prompts

#### Unit Structure Generation
```javascript
const unitStructurePrompt = `
You are an expert curriculum designer with deep knowledge of educational best practices. Your task is to create a comprehensive unit structure based on the provided source material and teacher specifications.

SOURCE MATERIAL ANALYSIS:
${sourceAnalysis}

TEACHER PARAMETERS:
- Duration: ${parameters.duration}
- Lesson Types: ${selectedLessonTypes.join(', ')}
- Lesson Counts: ${JSON.stringify(parameters.lessonCounts)}
- Additional Requirements: ${parameters.additionalRequests}

TASK:
Create a detailed unit plan that includes:

1. UNIT OVERVIEW
   - Compelling title
   - Clear description
   - Learning objectives (3-5 specific, measurable objectives)

2. LESSON SEQUENCE
   - Logical progression from basic to advanced concepts
   - Appropriate mix of lesson types
   - Clear connections between lessons
   - Estimated time for each lesson

3. ASSESSMENT STRATEGY
   - Formative assessments (quizzes, discussions)
   - Summative assessments (tests, projects)
   - Assessment timing and frequency

4. LEARNING ACTIVITIES
   - Engaging activities for each lesson type
   - Student interaction opportunities
   - Real-world applications where relevant

5. RESOURCES AND MATERIALS
   - Required materials
   - Suggested additional resources
   - Technology requirements

OUTPUT FORMAT:
Return a structured JSON object with the unit plan.
`;
```

#### Lesson Generation
```javascript
const lessonGenerationPrompt = `
Generate a high-quality ${lessonType} lesson for the following educational context:

UNIT CONTEXT:
- Unit Title: ${unitTitle}
- Unit Objectives: ${unitObjectives}
- Previous Lessons: ${previousLessons}
- Next Lessons: ${nextLessons}

LESSON SPECIFICATIONS:
- Lesson Type: ${lessonType}
- Lesson Title: ${lessonTitle}
- Position in Unit: ${lessonNumber} of ${totalLessons}
- Target Duration: ${targetDuration}

SOURCE MATERIAL:
${relevantSourceContent}

REQUIREMENTS:
1. Create engaging, age-appropriate content
2. Include clear learning objectives for this lesson
3. Provide step-by-step instructions or content
4. Include assessment criteria if applicable
5. Ensure alignment with unit objectives
6. Follow best practices for ${lessonType} lessons

OUTPUT FORMAT:
Return a structured lesson object with all necessary fields for the ${lessonType} lesson type.
`;
```

### Content Quality Assurance

#### Quality Checks
```javascript
class ContentQualityService {
  async validateUnit(unit) {
    const checks = [
      this.checkLearningObjectives(unit),
      this.checkLessonSequence(unit),
      this.checkAssessmentAlignment(unit),
      this.checkContentCompleteness(unit),
      this.checkDifficultyProgression(unit)
    ];

    const results = await Promise.all(checks);
    return results.every(result => result.valid);
  }

  async checkLearningObjectives(unit) {
    // Validate learning objectives are specific and measurable
    const objectives = unit.learningObjectives;
    const valid = objectives.length >= 3 && 
                  objectives.length <= 5 &&
                  objectives.every(obj => this.isSpecificAndMeasurable(obj));
    
    return { valid, issues: valid ? [] : ['Learning objectives need improvement'] };
  }

  async checkLessonSequence(unit) {
    // Validate logical lesson progression
    const lessons = unit.lessons;
    const valid = this.hasLogicalProgression(lessons);
    
    return { valid, issues: valid ? [] : ['Lesson sequence needs improvement'] };
  }
}
```

---

## 📅 Implementation Phases

### Phase 1: Foundation (Week 1)
**Tasks:**
- [ ] Update database schema
- [ ] Create basic UI components
- [ ] Set up new API routes
- [ ] Install required dependencies

**Deliverables:**
- Database schema updates
- Basic modal structure
- API endpoint skeletons

### Phase 2: Core Functionality (Week 2)
**Tasks:**
- [ ] Implement file processing
- [ ] Create parameter management
- [ ] Build form validation
- [ ] Add progress tracking

**Deliverables:**
- File upload and analysis
- Complete form functionality
- Progress tracking system

### Phase 3: AI Integration (Week 3)
**Tasks:**
- [ ] Enhance AI prompts
- [ ] Implement unit generation
- [ ] Add lesson generation
- [ ] Create assessment generation

**Deliverables:**
- Working AI generation pipeline
- Quality content generation
- Assessment creation

### Phase 4: Integration & Polish (Week 4)
**Tasks:**
- [ ] Frontend integration
- [ ] Result preview system
- [ ] Error handling
- [ ] Testing and optimization

**Deliverables:**
- Complete feature integration
- User experience refinement
- Production-ready feature

---

## 🔧 Technical Requirements

### New Dependencies
```json
{
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.6.0",
  "officegen": "^0.6.5",
  "natural": "^6.10.4",
  "compromise": "^14.10.0",
  "multer": "^1.4.5-lts.1"
}
```

### Environment Variables
```env
# AI Unit Generation
AI_UNIT_GENERATION_ENABLED=true
AI_UNIT_MAX_FILE_SIZE=52428800
AI_UNIT_GENERATION_TIMEOUT=300000
AI_UNIT_MAX_LESSONS_PER_UNIT=20
AI_UNIT_MAX_PROCESSING_TIME=300000
```

### File Processing Limits
```javascript
const FILE_LIMITS = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['pdf', 'docx', 'pptx', 'txt'],
  maxPages: 500,
  maxProcessingTime: 300000 // 5 minutes
};
```

### Performance Considerations
- **File Processing**: Implement streaming for large files
- **AI Generation**: Use background jobs for long-running processes
- **Database**: Optimize queries with proper indexing
- **Caching**: Cache analysis results for repeated processing

---

## 🎯 User Experience Flow

### Complete User Journey
1. **Teacher clicks "Generate Unit with AI"**
2. **Modal opens with source type selection**
3. **Teacher uploads file OR enters text**
4. **Teacher configures parameters**
5. **System analyzes source material**
6. **AI generates unit structure**
7. **AI generates individual lessons**
8. **Teacher reviews generated content**
9. **Teacher accepts/modifies/rejects**
10. **Unit is created and integrated**

### Error Handling Scenarios
- **File Processing Failures**: Clear error messages with suggestions
- **AI Generation Timeouts**: Progress indicators and retry options
- **Invalid Parameters**: Real-time validation with helpful hints
- **Content Quality Issues**: Quality check warnings
- **Integration Failures**: Rollback mechanisms and error recovery

### Success Metrics
- **Generation Success Rate**: Target >90%
- **User Acceptance Rate**: Target >80%
- **Generation Time**: Target <5 minutes
- **Content Quality Score**: Target >4.0/5.0

---

## ✅ Quality Assurance

### Content Quality Checks
- [ ] Learning objective alignment
- [ ] Content completeness
- [ ] Assessment validity
- [ ] Sequencing logic
- [ ] Difficulty progression
- [ ] Age appropriateness
- [ ] Educational standards compliance

### Performance Monitoring
- [ ] Generation time tracking
- [ ] Success rate monitoring
- [ ] User satisfaction metrics
- [ ] Error rate tracking
- [ ] Resource usage monitoring

### Testing Strategy
- [ ] Unit tests for all services
- [ ] Integration tests for API endpoints
- [ ] End-to-end user flow testing
- [ ] Performance testing with large files
- [ ] Error scenario testing

---

## 🔧 Troubleshooting

### Common Issues

#### File Processing Failures
**Problem**: File upload fails or processing errors
**Solutions**:
- Check file size limits
- Verify file format support
- Review server logs for specific errors
- Implement better error handling

#### AI Generation Timeouts
**Problem**: Generation process times out
**Solutions**:
- Increase timeout limits
- Implement background processing
- Add progress indicators
- Provide retry mechanisms

#### Content Quality Issues
**Problem**: Generated content is poor quality
**Solutions**:
- Enhance AI prompts
- Add quality validation
- Implement content review system
- Provide manual editing options

#### Performance Issues
**Problem**: Slow generation or processing
**Solutions**:
- Optimize file processing
- Implement caching
- Add progress indicators
- Consider async processing

### Debug Commands
```bash
# Check file processing
npm run test:file-processing

# Test AI generation
npm run test:ai-generation

# Monitor performance
npm run monitor:performance

# Check database health
npm run check:database
```

---

## 📚 Additional Resources

### Documentation Links
- [Firebase Setup Guide](./FIREBASE_SETUP.md)
- [AI Lesson Generation Guide](./AI_LESSON_GENERATION.md)
- [API Documentation](./API_DOCUMENTATION.md)

### External Resources
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [PDF Processing Best Practices](https://pdf-lib.js.org/)
- [Natural Language Processing Guide](https://naturalnode.github.io/natural/)

### Support
For technical support or questions about AI Unit Generation:
- Check the troubleshooting section above
- Review server logs for error details
- Contact the development team
- Submit issues through the project repository

---

*Last Updated: December 2024*
*Version: 1.0.0*
