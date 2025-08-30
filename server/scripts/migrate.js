#!/usr/bin/env node

const { migrateCollections, verifyMigration } = require('../utils/migrateCollections');

console.log('🚀 Starting database schema migration...');
console.log('This will consolidate userStats, userProgress, and studentProgress into a single studentProgress collection.\n');

migrateCollections()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    return verifyMigration();
  })
  .then(() => {
    console.log('\n🎉 All done! Your database schema has been updated.');
    console.log('\n📝 Summary:');
    console.log('- userStats, userProgress, and studentProgress collections have been consolidated');
    console.log('- All data has been migrated to the new studentProgress collection');
    console.log('- All API endpoints have been updated to use the new schema');
    console.log('\n⚠️  Note: The old collections still exist. You can delete them manually if needed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    console.log('\nPlease check the error above and try again.');
    process.exit(1);
  });
