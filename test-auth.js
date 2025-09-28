
// Test Firebase Authentication
// Run this in browser console to test auth

console.log('🧪 Testing Firebase Authentication...');

// Check if Firebase is loaded
if (typeof firebase !== 'undefined') {
  console.log('✅ Firebase is loaded');
} else {
  console.log('❌ Firebase not loaded');
}

// Check auth state
import { auth } from './firebase.js';
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('✅ User is authenticated:', user.email);
  } else {
    console.log('ℹ️  No user authenticated');
  }
});

// Test sign out
try {
  await auth.signOut();
  console.log('✅ Sign out successful');
} catch (error) {
  console.error('❌ Sign out failed:', error);
}
