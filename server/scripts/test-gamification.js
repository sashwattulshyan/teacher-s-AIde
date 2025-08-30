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
const GamificationSystem = require('../models/gamification');

async function testGamification() {
  console.log('🧪 Testing Gamification System...\n');

  try {
    // Get test user and classroom
    const usersSnapshot = await db.collection('users').where('role', '==', 'student').limit(1).get();
    const classroomsSnapshot = await db.collection('classrooms').limit(1).get();
    
    if (usersSnapshot.empty || classroomsSnapshot.empty) {
      console.log('❌ No test users or classrooms found');
      return;
    }

    const testUser = usersSnapshot.docs[0];
    const testClassroom = classroomsSnapshot.docs[0];
    
    const userId = testUser.id;
    const classroomId = testClassroom.id;
    
    console.log(`Testing with user: ${userId} (${testUser.data().email})`);
    console.log(`Testing with classroom: ${classroomId} (${testClassroom.data().name})`);

    // Test 1: Award daily login points
    console.log('\n1. Testing daily login points...');
    try {
      const result = await GamificationSystem.awardDailyLogin(userId, classroomId);
      console.log('✅ Daily login result:', result);
    } catch (error) {
      console.log('❌ Daily login error:', error.message);
    }

    // Test 2: Award lesson completion points
    console.log('\n2. Testing lesson completion points...');
    try {
      const result = await GamificationSystem.awardLessonCompletion(userId, classroomId, 'test_lesson_1', 100);
      console.log('✅ Lesson completion result:', result);
    } catch (error) {
      console.log('❌ Lesson completion error:', error.message);
    }

    // Test 3: Check updated stats
    console.log('\n3. Checking updated stats...');
    try {
      const stats = await GamificationSystem.getUserStats(userId, classroomId);
      console.log('✅ Updated stats:', stats);
    } catch (error) {
      console.log('❌ Stats error:', error.message);
    }

    // Test 4: Check point transactions
    console.log('\n4. Checking point transactions...');
    try {
      const transactionsSnapshot = await db.collection('pointTransactions')
        .where('userId', '==', userId)
        .where('classroomId', '==', classroomId)
        .get();
      
      console.log(`Found ${transactionsSnapshot.size} transactions`);
      transactionsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.activityType}: ${data.points} points at ${data.timestamp}`);
      });
    } catch (error) {
      console.log('❌ Transactions error:', error.message);
    }

    // Test 5: Check leaderboard
    console.log('\n5. Checking leaderboard...');
    try {
      const leaderboard = await GamificationSystem.getLeaderboard(classroomId);
      console.log(`Leaderboard has ${leaderboard.length} entries`);
      leaderboard.forEach(entry => {
        console.log(`  - ${entry.name}: ${entry.points} points (streak: ${entry.streak})`);
      });
    } catch (error) {
      console.log('❌ Leaderboard error:', error.message);
    }

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    process.exit(0);
  }
}

testGamification();
