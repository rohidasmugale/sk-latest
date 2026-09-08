import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import Grooming from '../src/models/Grooming';
import Employee from '../src/models/Employee';

async function deleteOrphans() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not set in .env');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find all grooming records without siteId (they are unresolved)
    const unresolved = await Grooming.find({ siteId: { $exists: false } });
    console.log(`📋 Found ${unresolved.length} grooming records without siteId`);

    let deleted = 0;
    for (const doc of unresolved) {
      // Try to find the employee by _id (MongoDB ObjectId)
      let employee = await Employee.findById(doc.employeeId);
      // If not found, try by business employeeId
      if (!employee) {
        employee = await Employee.findOne({ employeeId: doc.employeeId });
      }
      if (!employee) {
        // Orphaned – delete it
        await doc.deleteOne();
        deleted++;
        console.log(`🗑️ Deleted orphaned grooming record ${doc._id} (employeeId: ${doc.employeeId})`);
      } else {
        // If employee exists but has no siteId, we could still set it but we skip
        console.warn(`⚠️ Employee found for ${doc._id} but no siteId – keeping record for manual review`);
      }
    }

    console.log(`✅ Deleted ${deleted} orphaned grooming records.`);
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error: any) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

deleteOrphans();