// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://teachers-aide.onrender.com';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    // Auth
    AUTH: `${API_BASE_URL}/api/auth`,
    
    // Classrooms
    CLASSROOMS: `${API_BASE_URL}/api/classrooms`,
    
    // Courses
    COURSES: `${API_BASE_URL}/api/courses`,
    
    // Lessons
    LESSONS: `${API_BASE_URL}/api/lessons`,
    
    // Users
    USERS: `${API_BASE_URL}/api/users`,
    
    // Admin
    ADMIN: `${API_BASE_URL}/api/admin`,
    
    // AI
    AI: `${API_BASE_URL}/api/ai`,
    
    // Gamification
    GAMIFICATION: `${API_BASE_URL}/api/gamification`,
    
    // YouTube
    YOUTUBE: `${API_BASE_URL}/api/youtube`,
    
    // Video
    VIDEO: `${API_BASE_URL}/api/video`,
    
    // Grading
    GRADING: `${API_BASE_URL}/api/grading`,
    
    // Health check
    HEALTH: `${API_BASE_URL}/health`,
    
    // Test
    TEST: `${API_BASE_URL}/api/test`
  }
};

export default API_CONFIG;
