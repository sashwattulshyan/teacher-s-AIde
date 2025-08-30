// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDIZom56bXvzj49NCVriDGZ_W4ZeJAdSx8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "eduspark-app-c1c19.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "eduspark-app-c1c19",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "eduspark-app-c1c19.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1003531388648",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1003531388648:web:f74d4b4adcb0402054ab5d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-7F1SE9B3NH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };