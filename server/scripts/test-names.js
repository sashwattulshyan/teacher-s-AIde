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

const db = admin.firestore();

async function testNames() {
  console.log('🧪 Testing Name Functionality...\n');

  try {
    // Check existing users
    console.log('1. Checking existing users...');
    const usersSnapshot = await db.collection('users').get();
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      console.log(`User ${doc.id}:`);
      console.log(`  - Email: ${userData.email}`);
      console.log(`  - Role: ${userData.role}`);
      console.log(`  - First Name: ${userData.firstName || 'Not set'}`);
      console.log(`  - Last Name: ${userData.lastName || 'Not set'}`);
      console.log(`  - Display Name: ${userData.displayName || 'Not set'}`);
      console.log('');
    });

    // Test creating a new user with names
    console.log('2. Testing name creation...');
    const testUserData = {
      email: 'test.names@example.com',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      role: 'student'
    };

    console.log('Creating test user with names:', testUserData);
    
    // Note: In a real scenario, this would be done through the signup process
    // This is just to test the data structure
    const testUserId = 'test-names-user';
    await db.collection('users').doc(testUserId).set(testUserData);
    
    console.log('✅ Test user created successfully');

    // Verify the user was created
    const testUserDoc = await db.collection('users').doc(testUserId).get();
    if (testUserDoc.exists) {
      const createdUser = testUserDoc.data();
      console.log('✅ User retrieved successfully:');
      console.log(`  - Display Name: ${createdUser.displayName}`);
      console.log(`  - First Name: ${createdUser.firstName}`);
      console.log(`  - Last Name: ${createdUser.lastName}`);
    }

    // Clean up test user
    await db.collection('users').doc(testUserId).delete();
    console.log('✅ Test user cleaned up');

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    process.exit(0);
  }
}

testNames();
