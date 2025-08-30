#!/usr/bin/env node

const { db } = require('../config/firebase');

console.log('🧪 Testing Firebase configuration...\n');

async function testFirebase() {
  try {
    // Test basic Firestore operations
    console.log('1. Testing Firestore connection...');
    
    // Try to read from a collection
    const testSnapshot = await db.collection('test').limit(1).get();
    console.log('✅ Firestore connection successful');
    
    // Test if we can write to a test document
    console.log('2. Testing write operations...');
    const testDoc = db.collection('test').doc('migration-test');
    await testDoc.set({
      test: true,
      timestamp: new Date(),
      message: 'Firebase configuration test'
    });
    console.log('✅ Write operation successful');
    
    // Test if we can read the document back
    console.log('3. Testing read operations...');
    const readDoc = await testDoc.get();
    if (readDoc.exists) {
      console.log('✅ Read operation successful');
    } else {
      console.log('❌ Read operation failed');
    }
    
    // Clean up test document
    console.log('4. Cleaning up test data...');
    await testDoc.delete();
    console.log('✅ Cleanup successful');
    
    console.log('\n🎉 Firebase configuration is working correctly!');
    console.log('You can now run the migration script.');
    
  } catch (error) {
    console.error('\n❌ Firebase test failed:', error.message);
    console.log('\nPlease check your Firebase configuration:');
    console.log('1. Verify all environment variables are set in .env');
    console.log('2. Check that your service account has proper permissions');
    console.log('3. Ensure your project ID is correct');
    console.log('\nSee FIREBASE_SETUP.md for detailed instructions.');
  }
}

testFirebase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
