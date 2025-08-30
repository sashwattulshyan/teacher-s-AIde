const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    })
  });
}

async function cleanupAuthUser(email) {
  console.log('🧹 Cleaning up Firebase Auth user...\n');

  try {
    // Get user by email
    console.log(`1. Looking for user with email: ${email}`);
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('✅ Found user:', userRecord.uid);

    // Delete the user
    console.log('2. Deleting Firebase Auth user...');
    await admin.auth().deleteUser(userRecord.uid);
    console.log('✅ Firebase Auth user deleted successfully');

    console.log('🎉 Cleanup completed! You can now sign up with this email again.');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log('✅ User not found in Firebase Auth - no cleanup needed');
    } else {
      console.error('❌ Error during cleanup:', error.message);
    }
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node cleanup-auth-user.js <email>');
  console.log('Example: node cleanup-auth-user.js test@example.com');
  process.exit(1);
}

cleanupAuthUser(email);
