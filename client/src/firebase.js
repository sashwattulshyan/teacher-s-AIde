// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAWIOlNqFxPKam4lXzEzcQEgqewvYy6f_Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "teachers-aide-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "teachers-aide-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "teachers-aide-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1053365795172",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1053365795172:web:50c101ade1bf3e2e1a6271"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };