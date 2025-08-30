#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get Railway URL from command line argument
const railwayUrl = process.argv[2];

if (!railwayUrl) {
  console.log('❌ Please provide your Railway URL');
  console.log('Usage: node update-frontend.js https://your-app.railway.app');
  process.exit(1);
}

console.log('🚀 Updating frontend with Railway backend URL...');

// Update the API configuration
const apiConfigPath = path.join(__dirname, 'client', 'src', 'config', 'api.js');
const apiConfigContent = `// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '${railwayUrl}';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    // Auth
    AUTH: \`\${API_BASE_URL}/api/auth\`,
    
    // Classrooms
    CLASSROOMS: \`\${API_BASE_URL}/api/classrooms\`,
    
    // Courses
    COURSES: \`\${API_BASE_URL}/api/courses\`,
    
    // Lessons
    LESSONS: \`\${API_BASE_URL}/api/lessons\`,
    
    // Users
    USERS: \`\${API_BASE_URL}/api/users\`,
    
    // Admin
    ADMIN: \`\${API_BASE_URL}/api/admin\`,
    
    // AI
    AI: \`\${API_BASE_URL}/api/ai\`,
    
    // Gamification
    GAMIFICATION: \`\${API_BASE_URL}/api/gamification\`,
    
    // YouTube
    YOUTUBE: \`\${API_BASE_URL}/api/youtube\`,
    
    // Video
    VIDEO: \`\${API_BASE_URL}/api/video\`,
    
    // Grading
    GRADING: \`\${API_BASE_URL}/api/grading\`,
    
    // Health check
    HEALTH: \`\${API_BASE_URL}/health\`,
    
    // Test
    TEST: \`\${API_BASE_URL}/api/test\`
  }
};

export default API_CONFIG;
`;

try {
  fs.writeFileSync(apiConfigPath, apiConfigContent);
  console.log('✅ Updated API configuration');
  
  console.log('\n📝 Next steps:');
  console.log('1. Build the frontend: cd client && npm run build');
  console.log('2. Deploy to Firebase: npx firebase deploy --only hosting');
  console.log('3. Test your complete app!');
  
} catch (error) {
  console.error('❌ Error updating frontend:', error.message);
  process.exit(1);
}
