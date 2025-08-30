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

async function debugGamification() {
  console.log('🔍 Starting Gamification System Debug...\n');

  try {
    // 1. Check if there are any users in the system
    console.log('1. Checking users collection...');
    const usersSnapshot = await db.collection('users').limit(5).get();
    console.log(`Found ${usersSnapshot.size} users in the system`);
    
    if (usersSnapshot.size === 0) {
      console.log('❌ No users found! This is the root cause.');
      return;
    }

    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    console.log('Users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));

    // 2. Check if there are any classrooms
    console.log('\n2. Checking classrooms collection...');
    const classroomsSnapshot = await db.collection('classrooms').limit(5).get();
    console.log(`Found ${classroomsSnapshot.size} classrooms in the system`);
    
    if (classroomsSnapshot.size === 0) {
      console.log('❌ No classrooms found! This is the root cause.');
      return;
    }

    const classrooms = [];
    classroomsSnapshot.forEach(doc => {
      classrooms.push({ id: doc.id, ...doc.data() });
    });
    console.log('Classrooms:', classrooms.map(c => ({ id: c.id, name: c.name, teacherId: c.teacherId, studentIds: c.studentIds?.length || 0 })));

    // 3. Check studentProgress collection
    console.log('\n3. Checking studentProgress collection...');
    const progressSnapshot = await db.collection('studentProgress').limit(10).get();
    console.log(`Found ${progressSnapshot.size} progress documents`);
    
    if (progressSnapshot.size === 0) {
      console.log('❌ No progress documents found! This explains why points/stats are not showing.');
    } else {
      console.log('Progress documents:');
      progressSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: points=${data.totalPoints || 0}, streak=${data.currentStreak || 0}, lessons=${data.lessonsCompleted || 0}`);
      });
    }

    // 4. Check pointTransactions collection
    console.log('\n4. Checking pointTransactions collection...');
    const transactionsSnapshot = await db.collection('pointTransactions').limit(10).get();
    console.log(`Found ${transactionsSnapshot.size} point transactions`);
    
    if (transactionsSnapshot.size === 0) {
      console.log('❌ No point transactions found! This explains why points are not being awarded.');
    } else {
      console.log('Recent transactions:');
      transactionsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.points} points for ${data.activityType} by ${data.userId}`);
      });
    }

    // 5. Test with a specific user and classroom
    if (users.length > 0 && classrooms.length > 0) {
      const testUser = users.find(u => u.role === 'student') || users[0];
      const testClassroom = classrooms.find(c => c.studentIds?.includes(testUser.id)) || classrooms[0];
      
      console.log(`\n5. Testing with user ${testUser.id} and classroom ${testClassroom.id}...`);
      
      // Check if user is in classroom
      const isInClassroom = testClassroom.studentIds?.includes(testUser.id);
      console.log(`User ${testUser.id} in classroom ${testClassroom.id}: ${isInClassroom}`);
      
      // Check specific progress document
      const progressDocId = `${testUser.id}_${testClassroom.id}`;
      const progressDoc = await db.collection('studentProgress').doc(progressDocId).get();
      
      if (progressDoc.exists) {
        const progressData = progressDoc.data();
        console.log(`Progress for ${progressDocId}:`, {
          totalPoints: progressData.totalPoints || 0,
          currentStreak: progressData.currentStreak || 0,
          lessonsCompleted: progressData.lessonsCompleted || 0,
          lastUpdated: progressData.lastUpdated
        });
      } else {
        console.log(`❌ No progress document found for ${progressDocId}`);
      }
    }

    // 6. Check for any courses/units
    console.log('\n6. Checking courses collection...');
    const coursesSnapshot = await db.collection('courses').limit(5).get();
    console.log(`Found ${coursesSnapshot.size} courses/units`);
    
    if (coursesSnapshot.size > 0) {
      coursesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.title} (${data.lessons?.length || 0} lessons)`);
      });
    }

    console.log('\n🔍 Debug Summary:');
    console.log(`- Users: ${usersSnapshot.size}`);
    console.log(`- Classrooms: ${classroomsSnapshot.size}`);
    console.log(`- Progress Documents: ${progressSnapshot.size}`);
    console.log(`- Point Transactions: ${transactionsSnapshot.size}`);
    console.log(`- Courses/Units: ${coursesSnapshot.size}`);

    if (progressSnapshot.size === 0) {
      console.log('\n❌ ISSUE IDENTIFIED: No progress documents exist!');
      console.log('This means:');
      console.log('1. Students have never completed lessons');
      console.log('2. The gamification system is not creating progress documents');
      console.log('3. Points and streaks cannot be tracked');
    }

    if (transactionsSnapshot.size === 0) {
      console.log('\n❌ ISSUE IDENTIFIED: No point transactions exist!');
      console.log('This means:');
      console.log('1. Points are not being awarded');
      console.log('2. The addPoints function is not working');
      console.log('3. Daily login points are not being given');
    }

  } catch (error) {
    console.error('Error during debug:', error);
  } finally {
    process.exit(0);
  }
}

debugGamification();
