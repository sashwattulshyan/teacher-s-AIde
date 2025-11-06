// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Validate Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase config is missing or invalid
const missingConfig = Object.entries(firebaseConfig).filter(([key, value]) => !value || value === 'undefined');
if (missingConfig.length > 0) {
  const missingKeys = missingConfig.map(([key]) => key).join(', ');
  console.error('❌ Firebase configuration error: Missing environment variables:', missingKeys);
  console.error('Please ensure the following environment variables are set during build:');
  console.error('  - VITE_FIREBASE_API_KEY');
  console.error('  - VITE_FIREBASE_AUTH_DOMAIN');
  console.error('  - VITE_FIREBASE_PROJECT_ID');
  console.error('  - VITE_FIREBASE_STORAGE_BUCKET');
  console.error('  - VITE_FIREBASE_MESSAGING_SENDER_ID');
  console.error('  - VITE_FIREBASE_APP_ID');
  throw new Error(`Firebase configuration incomplete. Missing: ${missingKeys}`);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enhanced auth configuration for better error handling
auth.settings.appVerificationDisabledForTesting = false;

// Add error handling for auth state changes
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('🔐 User authenticated:', {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName
    });
  } else {
    console.log('🔐 User signed out');
  }
}, (error) => {
  console.error('🔐 Auth state change error:', error);
});

// Connect to emulators in development (if needed)
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('🔧 Connected to Firebase emulators');
  } catch (error) {
    console.log('🔧 Emulators not available, using production Firebase');
  }
}

export { auth, db };