const admin = require('firebase-admin');
require('dotenv').config();

let adminApp = null;
let db = null;
let auth = null;

// Check if Firebase credentials are available
const hasFirebaseCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

if (hasFirebaseCredentials) {
  try {
    // Parse the JSON credentials from environment variable
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

    // Initialize the app
    if (!admin.apps.length) {
      const appConfig = {
        credential: admin.credential.cert(serviceAccount)
      };
      
      adminApp = admin.initializeApp(appConfig);
    }

    db = admin.firestore();
    auth = admin.auth();
    
    // Firebase Admin initialized successfully
  } catch (error) {
    console.error('❌ Error parsing Firebase credentials:', error.message);
    // Falling back to development mode
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
