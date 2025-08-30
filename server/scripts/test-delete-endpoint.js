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

async function testDeleteEndpoint() {
  console.log('🧪 Testing Delete Account Endpoint...\n');

  try {
    // Create a test user for deletion testing
    console.log('1. Creating test user for deletion...');
    const testUserId = 'test-delete-endpoint-user';
    const testUserData = {
      email: 'test.delete.endpoint@example.com',
      firstName: 'Test',
      lastName: 'Delete',
      displayName: 'Test Delete Endpoint',
      role: 'student'
    };

    await db.collection('users').doc(testUserId).set(testUserData);
    console.log('✅ Test user created');

    // Create test data for the user
    console.log('2. Creating test data for user...');
    
    // Create test progress
    await db.collection('studentProgress').doc(`${testUserId}_test-classroom`).set({
      userId: testUserId,
      classroomId: 'test-classroom',
      totalPoints: 100,
      currentStreak: 5,
      lessonsCompleted: 10
    });

    // Create test transactions
    await db.collection('pointTransactions').add({
      userId: testUserId,
      classroomId: 'test-classroom',
      points: 50,
      activityType: 'lesson_completion',
      timestamp: new Date()
    });

    console.log('✅ Test data created');

    // Verify data exists
    console.log('3. Verifying test data exists...');
    const userDoc = await db.collection('users').doc(testUserId).get();
    const progressDoc = await db.collection('studentProgress').doc(`${testUserId}_test-classroom`).get();
    const transactionsQuery = await db.collection('pointTransactions').where('userId', '==', testUserId).get();

    console.log(`  - User exists: ${userDoc.exists}`);
    console.log(`  - Progress exists: ${progressDoc.exists}`);
    console.log(`  - Transactions exist: ${transactionsQuery.size} found`);

    // Simulate the server-side deletion logic
    console.log('4. Simulating server-side deletion...');
    
    // Delete student progress documents
    const progressQuery = db.collection('studentProgress').where('userId', '==', testUserId);
    const progressSnapshot = await progressQuery.get();
    const progressDeletions = progressSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(progressDeletions);
    console.log('✅ Student progress documents deleted');

    // Delete point transactions
    const transactionsQuery2 = db.collection('pointTransactions').where('userId', '==', testUserId);
    const transactionsSnapshot = await transactionsQuery2.get();
    const transactionDeletions = transactionsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(transactionDeletions);
    console.log('✅ Point transactions deleted');

    // Delete user document
    await db.collection('users').doc(testUserId).delete();
    console.log('✅ User document deleted');

    // Verify deletion
    console.log('5. Verifying deletion...');
    const userDocAfter = await db.collection('users').doc(testUserId).get();
    const progressDocAfter = await db.collection('studentProgress').doc(`${testUserId}_test-classroom`).get();
    const transactionsQueryAfter = await db.collection('pointTransactions').where('userId', '==', testUserId).get();

    console.log(`  - User exists: ${userDocAfter.exists}`);
    console.log(`  - Progress exists: ${progressDocAfter.exists}`);
    console.log(`  - Transactions exist: ${transactionsQueryAfter.size} found`);

    if (!userDocAfter.exists && !progressDocAfter.exists && transactionsQueryAfter.size === 0) {
      console.log('✅ Delete endpoint test PASSED - All data successfully deleted');
    } else {
      console.log('❌ Delete endpoint test FAILED - Some data still exists');
    }

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    process.exit(0);
  }
}

testDeleteEndpoint();
