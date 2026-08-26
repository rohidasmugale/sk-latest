import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../src/models/Site';
import Employee from '../src/models/Employee';
import Task from '../src/models/Task';
import AttendanceRecord from '../src/models/attendance';

dotenv.config(); // Load .env variables

async function migrateCollection(Model: any, siteNameField: string = 'siteName') {
  // Count total documents in the collection
  const totalDocs = await Model.countDocuments();
  console.log(`📊 ${Model.modelName} total documents: ${totalDocs}`);

  // Find documents that either don't have siteId or have it null/empty
  const docs = await Model.find({
    $or: [
      { siteId: { $exists: false } },
      { siteId: null },
      { siteId: '' }
    ]
  });
  console.log(`🔍 ${Model.modelName} documents needing siteId: ${docs.length}`);

  if (docs.length === 0) {
    console.log(`✅ All ${Model.modelName} already have siteId.`);
    return;
  }

  const sites = await Site.find({});
  const nameToId = new Map(sites.map(s => [s.name.trim().toLowerCase(), s._id.toString()]));

  let matched = 0, unmatched = 0;

  for (const doc of docs) {
    const key = (doc[siteNameField] || '').trim().toLowerCase();
    const siteId = nameToId.get(key);
    if (siteId) {
      doc.siteId = siteId;
      await doc.save();
      matched++;
    } else {
      unmatched++;
      console.warn(`⚠️ No site match for ${Model.modelName} ${doc._id}: "${doc[siteNameField]}"`);
    }
  }
  console.log(`${Model.modelName}: matched ${matched}, unmatched ${unmatched}`);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase');
    console.log(`✅ Connected to database: ${mongoose.connection.db.databaseName}`);

    await migrateCollection(Employee);
    await migrateCollection(Task);
    await migrateCollection(AttendanceRecord);
    // ... other models

    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
})();