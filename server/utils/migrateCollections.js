require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
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

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Migration utility to consolidate userStats, userProgress, and studentProgress
 * into a single studentProgress collection
 */
async function migrateCollections() {
  console.log('Starting collection migration...');
  
  try {
    // Get all userStats documents
    const userStatsSnapshot = await db.collection('userStats').get();
    console.log(`Found ${userStatsSnapshot.docs.length} userStats documents`);
    
    // Get all userProgress documents
    const userProgressSnapshot = await db.collection('userProgress').get();
    console.log(`Found ${userProgressSnapshot.docs.length} userProgress documents`);
    
    // Get all existing studentProgress documents
    const studentProgressSnapshot = await db.collection('studentProgress').get();
    console.log(`Found ${studentProgressSnapshot.docs.length} existing studentProgress documents`);
    
    const batch = db.batch();
    let migratedCount = 0;
    
    // Migrate userStats documents
    for (const doc of userStatsSnapshot.docs) {
      const data = doc.data();
      const docId = doc.id; // This should be userId_classroomId format
      
      // Create or update studentProgress document
      const studentProgressRef = db.collection('studentProgress').doc(docId);
      batch.set(studentProgressRef, {
        userId: data.userId,
        classroomId: data.classroomId,
        totalPoints: data.totalPoints || 0,
        currentStreak: data.currentStreak || 0,
        longestStreak: data.longestStreak || 0,
        totalLogins: data.totalLogins || 0,
        lessonsCompleted: data.lessonsCompleted || 0,
        assignmentsCompleted: data.assignmentsCompleted || 0,
        quizzesCompleted: data.quizzesCompleted || 0,
        perfectScores: data.perfectScores || 0,
        lastLoginDate: data.lastLoginDate,
        lastUpdated: data.lastUpdated || new Date()
      }, { merge: true });
      
      migratedCount++;
    }
    
    // Migrate userProgress documents
    for (const doc of userProgressSnapshot.docs) {
      const data = doc.data();
      const docId = doc.id; // This should be userId_unitId format
      
      // Create or update studentProgress document
      const studentProgressRef = db.collection('studentProgress').doc(docId);
      batch.set(studentProgressRef, {
        userId: data.userId,
        courseId: data.courseId,
        lessonsCompleted: data.lessonsCompleted || 0,
        assignmentsCompleted: data.assignmentsCompleted || 0,
        quizzesCompleted: data.quizzesCompleted || 0,
        totalLessons: data.totalLessons || 0,
        totalAssignments: data.totalAssignments || 0,
        totalQuizzes: data.totalQuizzes || 0,
        progressPercentage: data.progressPercentage || 0,
        averageScore: data.averageScore || 0,
        lastUpdated: data.lastUpdated || new Date()
      }, { merge: true });
      
      migratedCount++;
    }
    
    // Commit the batch
    await batch.commit();
    console.log(`Successfully migrated ${migratedCount} documents to studentProgress collection`);
    
    // Optional: Delete old collections (uncomment if you want to remove old data)
    // console.log('Deleting old collections...');
    // await deleteOldCollections();
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Delete old collections after migration (optional)
 */
async function deleteOldCollections() {
  try {
    // Delete userStats collection
    const userStatsSnapshot = await db.collection('userStats').get();
    const userStatsBatch = db.batch();
    userStatsSnapshot.docs.forEach(doc => {
      userStatsBatch.delete(doc.ref);
    });
    await userStatsBatch.commit();
    console.log('Deleted userStats collection');
    
    // Delete userProgress collection
    const userProgressSnapshot = await db.collection('userProgress').get();
    const userProgressBatch = db.batch();
    userProgressSnapshot.docs.forEach(doc => {
      userProgressBatch.delete(doc.ref);
    });
    await userProgressBatch.commit();
    console.log('Deleted userProgress collection');
    
  } catch (error) {
    console.error('Error deleting old collections:', error);
    throw error;
  }
}

/**
 * Verify migration by checking data integrity
 */
async function verifyMigration() {
  console.log('Verifying migration...');
  
  try {
    const studentProgressSnapshot = await db.collection('studentProgress').get();
    console.log(`Total documents in studentProgress: ${studentProgressSnapshot.docs.length}`);
    
    let statsCount = 0;
    let progressCount = 0;
    
    for (const doc of studentProgressSnapshot.docs) {
      const data = doc.data();
      if (data.classroomId) {
        statsCount++;
      }
      if (data.courseId) {
        progressCount++;
      }
    }
    
    console.log(`Documents with classroomId (stats): ${statsCount}`);
    console.log(`Documents with courseId (progress): ${progressCount}`);
    
    console.log('Migration verification completed!');
    
  } catch (error) {
    console.error('Verification failed:', error);
    throw error;
  }
}

// Export functions for use in other files
module.exports = {
  migrateCollections,
  deleteOldCollections,
  verifyMigration
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrateCollections()
    .then(() => verifyMigration())
    .then(() => {
      console.log('All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
