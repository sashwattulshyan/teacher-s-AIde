const admin = require('firebase-admin');
require('dotenv').config();

let adminApp = null;
let db = null;
let auth = null;

// Check if Firebase credentials are available
const hasFirebaseCredentials = process.env.FIREBASE_PROJECT_ID && 
                              process.env.FIREBASE_PRIVATE_KEY && 
                              process.env.FIREBASE_CLIENT_EMAIL;

if (hasFirebaseCredentials) {
  // Initialize Firebase Admin with credentials
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  };

  // Initialize the app
  if (!admin.apps.length) {
    const appConfig = {
      credential: admin.credential.cert(serviceAccount)
    };
    
    // Only add databaseURL if it's provided (optional for Firestore)
    if (process.env.FIREBASE_DATABASE_URL) {
      appConfig.databaseURL = process.env.FIREBASE_DATABASE_URL;
    }
    
    adminApp = admin.initializeApp(appConfig);
  }

  db = admin.firestore();
  auth = admin.auth();
  
  console.log('✅ Firebase Admin initialized successfully');
} else {
  console.log('⚠️  Firebase credentials not found. Running in development mode without Firebase.');
  console.log('   To enable Firebase features, set up your .env file with Firebase credentials.');
  
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
