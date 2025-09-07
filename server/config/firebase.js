const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let adminApp = null;
let db = null;
let auth = null;

// Try to initialize Firebase Admin with service account
try {
  // First try to use service account file
  const serviceAccountPath = path.join(__dirname, '../../teachers-aide-service-account.json');
  
  if (!admin.apps.length) {
    const appConfig = {
      credential: admin.credential.cert(serviceAccountPath),
      projectId: 'teachers-aide-app'
    };
    
    adminApp = admin.initializeApp(appConfig);
  }

  db = admin.firestore();
  auth = admin.auth();
  
  console.log('✅ Firebase Admin initialized successfully with service account');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  
  // Fallback: try environment variable
  const hasFirebaseCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  if (hasFirebaseCredentials) {
    try {
      const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      
      if (!admin.apps.length) {
        const appConfig = {
          credential: admin.credential.cert(serviceAccount)
        };
        
        adminApp = admin.initializeApp(appConfig);
      }

      db = admin.firestore();
      auth = admin.auth();
      
      console.log('✅ Firebase Admin initialized with environment credentials');
    } catch (envError) {
      console.error('❌ Error with environment credentials:', envError.message);
    }
  }
}

// If Firebase initialization failed or credentials not found, use development mode
if (!db || !auth) {
  // Running in development mode without Firebase
  
  // Create mock objects for development
  db = {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
        set: async () => {},
        update: async () => {},
        delete: async () => {}
      }),
      where: () => ({
        get: async () => ({ forEach: () => {} })
      }),
      add: async () => ({ id: 'mock-id' }),
      limit: () => ({
        offset: () => ({
          get: async () => ({ forEach: () => {} })
        })
      })
    })
  };
  
  auth = {
    verifyIdToken: async () => ({ uid: 'mock-uid', email: 'mock@example.com' }),
    deleteUser: async () => {}
  };
}

module.exports = { admin: adminApp, db, auth };
