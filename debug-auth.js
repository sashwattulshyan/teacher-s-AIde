#!/usr/bin/env node

/**
 * Firebase Authentication Debug Script
 * 
 * This script helps debug and fix Firebase authentication issues.
 * Run this script to clear auth data and reset the authentication state.
 * 
 * Usage:
 *   node debug-auth.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Firebase Authentication Debug Script');
console.log('=====================================\n');

// Check if we're in the right directory
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: Please run this script from the project root directory');
  process.exit(1);
}

console.log('✅ Project directory found');

// Check Firebase configuration
console.log('\n📋 Checking Firebase Configuration...');

const clientFirebasePath = path.join(__dirname, 'client/src/firebase.js');
if (fs.existsSync(clientFirebasePath)) {
  console.log('✅ Client Firebase config found');
} else {
  console.log('❌ Client Firebase config not found');
}

const serverFirebasePath = path.join(__dirname, 'server/config/firebase.js');
if (fs.existsSync(serverFirebasePath)) {
  console.log('✅ Server Firebase config found');
} else {
  console.log('❌ Server Firebase config not found');
}

// Check environment variables
console.log('\n🔑 Checking Environment Variables...');

const envFiles = [
  path.join(__dirname, '.env'),
  path.join(__dirname, 'client/.env'),
  path.join(__dirname, 'server/.env')
];

let envFound = false;
envFiles.forEach(envFile => {
  if (fs.existsSync(envFile)) {
    console.log(`✅ Environment file found: ${envFile}`);
    envFound = true;
  }
});

if (!envFound) {
  console.log('⚠️  No environment files found');
  console.log('   Make sure your Firebase configuration is set up correctly');
}

// Check for common auth issues
console.log('\n🔍 Checking for Common Auth Issues...');

// Check if there are any cached auth files
const cacheFiles = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'node_modules/.cache'),
  path.join(__dirname, 'client/node_modules/.cache')
];

cacheFiles.forEach(cacheDir => {
  if (fs.existsSync(cacheDir)) {
    console.log(`✅ Cache directory found: ${cacheDir}`);
  }
});

// Provide solutions
console.log('\n🛠️  Solutions for Firebase Auth Errors:');
console.log('=====================================\n');

console.log('1. 🔄 Clear Browser Data:');
console.log('   - Open browser developer tools (F12)');
console.log('   - Go to Application/Storage tab');
console.log('   - Clear Local Storage and Session Storage');
console.log('   - Or run: localStorage.clear(); sessionStorage.clear();\n');

console.log('2. 🔐 Check Firebase Console:');
console.log('   - Go to: https://console.firebase.google.com/project/teachers-aide-app');
console.log('   - Check Authentication → Users');
console.log('   - Verify user accounts exist and are not disabled\n');

console.log('3. 🌐 Check Authorized Domains:');
console.log('   - Firebase Console → Authentication → Settings → Authorized domains');
console.log('   - Add your domain: teachers-aide-app.web.app');
console.log('   - Add localhost for development\n');

console.log('4. 📧 Check Email Verification Settings:');
console.log('   - Firebase Console → Authentication → Templates');
console.log('   - Verify email verification template is configured');
console.log('   - Check action URL is set correctly\n');

console.log('5. 🔧 Rebuild and Redeploy:');
console.log('   - Run: npm run build (in client directory)');
console.log('   - Run: npx firebase deploy --only hosting\n');

console.log('6. 🧪 Test Authentication:');
console.log('   - Try creating a new account');
console.log('   - Check if verification email is sent');
console.log('   - Test sign in with verified account\n');

console.log('7. 📱 Check Network and CORS:');
console.log('   - Verify internet connection');
console.log('   - Check browser console for CORS errors');
console.log('   - Try in incognito/private browsing mode\n');

// Generate a test script
const testScript = `
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
`;

fs.writeFileSync(path.join(__dirname, 'test-auth.js'), testScript);
console.log('✅ Test script created: test-auth.js');

console.log('\n🎯 Quick Fix Commands:');
console.log('=====================');
console.log('1. Clear browser data and refresh');
console.log('2. Check Firebase Console settings');
console.log('3. Rebuild and redeploy if needed');
console.log('4. Test with a new account');

console.log('\n📞 If issues persist:');
console.log('- Check Firebase Console for errors');
console.log('- Verify environment variables');
console.log('- Test in incognito mode');
console.log('- Check network connectivity');

console.log('\n✅ Debug script completed!');
