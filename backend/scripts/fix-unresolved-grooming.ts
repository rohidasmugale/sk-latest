import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import Grooming from '../src/models/Grooming';
import Employee from '../src/models/Employee';

async function fix() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not set in .env');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    const unresolved = await Grooming.find({ siteId: { $exists: false } });
    console.log(`📋 Found ${unresolved.length} grooming records without siteId`);

    let fixed = 0;
    let skipped = 0;

    for (const doc of unresolved) {
      // ✅ CORRECT: doc.employeeId is the Employee's _id (Mongo ObjectId)
      const employee = await Employee.findById(doc.employeeId);
      if (employee) {
        if (employee.siteId) {
          doc.siteId = employee.siteId;
          doc.site = employee.siteName || employee.site || 'Unknown';
          await doc.save({ validateBeforeSave: false });
          fixed++;
          if (fixed % 5 === 0) console.log(`   Fixed ${fixed} records...`);
        } else {
          console.warn(`⚠️ Employee ${doc.employeeId} has no siteId – skipping`);
          skipped++;
        }
      } else {
        console.warn(`⚠️ Employee not found for grooming ID ${doc._id} (employeeId: ${doc.employeeId}) – skipping`);
        skipped++;
      }
    }

    console.log(`✅ Fixed ${fixed} records. Skipped ${skipped}.`);
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error: any) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fix();