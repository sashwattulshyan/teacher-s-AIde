const admin = require('firebase-admin');

// Initialize both projects
const oldProject = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'eduspark-app-c1c19'
}, 'old-project');

const newProject = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'teachers-aide-app'
}, 'new-project');

const oldDb = admin.firestore(oldProject);
const newDb = admin.firestore(newProject);

async function migrateCollection(collectionName) {
  console.log(`Migrating collection: ${collectionName}`);
  
  try {
    const snapshot = await oldDb.collection(collectionName).get();
    const batch = newDb.batch();
    let count = 0;
    
    snapshot.forEach((doc) => {
      const newDocRef = newDb.collection(collectionName).doc(doc.id);
      batch.set(newDocRef, doc.data());
      count++;
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Migrated ${count} documents from ${collectionName}`);
    } else {
      console.log(`ℹ️  No documents found in ${collectionName}`);
    }
  } catch (error) {
    console.error(`❌ Error migrating ${collectionName}:`, error.message);
  }
}

async function migrateAllData() {
  console.log('🚀 Starting data migration...');
  
  // List of collections to migrate
  const collections = [
    'users',
    'classrooms', 
    'courses',
    'studentProgress',
    'grades',
    'lessons',
    'units'
  ];
  
  for (const collection of collections) {
    await migrateCollection(collection);
  }
  
  console.log('✅ Data migration completed!');
  process.exit(0);
}

migrateAllData().catch(console.error);
