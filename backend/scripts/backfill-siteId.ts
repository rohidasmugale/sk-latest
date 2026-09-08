// scripts/backfill-siteId.ts
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

import Site from '../src/models/Site';
import Employee from '../src/models/Employee';
import AssignTask from '../src/models/AssignTask';
import Incident from '../src/models/Incident';
import CleaningPhoto from '../src/models/CleaningPhoto';
import Grooming from '../src/models/Grooming';
import Machine from '../src/models/machineModel';
import SiteShiftDeployment from '../src/models/SiteShiftDeployment';
import StaffBriefing from '../src/models/StaffBriefing';
import TrainingSession from '../src/models/TrainingSession';

const collections = [
  { model: Employee, name: 'Employee', siteField: 'siteName' },
  { model: AssignTask, name: 'AssignTask', siteField: 'siteName' },
  { model: Incident, name: 'Incident', siteField: 'site' },
  { model: CleaningPhoto, name: 'CleaningPhoto', siteField: 'site' },
  { model: Grooming, name: 'Grooming', siteField: 'site' },
  { model: Machine, name: 'Machine', siteField: 'location' },
  { model: SiteShiftDeployment, name: 'SiteShiftDeployment', siteField: 'site' },
  { model: StaffBriefing, name: 'StaffBriefing', siteField: 'site' },
  { model: TrainingSession, name: 'TrainingSession', siteField: 'site' },
];

function normalize(s: any): string {
  if (!s) return '';
  return s.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

async function run() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not set in .env');
      process.exit(1);
    }
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    const sites = await Site.find({});
    console.log(`📋 Found ${sites.length} sites in database`);

    if (sites.length === 0) {
      console.log('⚠️ No sites found!');
      await mongoose.disconnect();
      return;
    }

    const byNormalizedName = new Map();
    sites.forEach(s => byNormalizedName.set(normalize(s.name), s));

    const siteList = sites.map(s => ({
      id: s._id,
      name: s.name,
      normalized: normalize(s.name)
    }));

    const unresolved: any[] = [];
    let totalUpdated = 0;

    for (const { model, name, siteField } of collections) {
      console.log(`\n📂 Processing ${name}...`);

      // Find documents that are missing siteId or have it as an empty string or null
      const docs = await model.find({
        $or: [
          { siteId: { $exists: false } },
          { siteId: null },
          { siteId: { $type: 2 } } // BSON type 2 = string (includes empty strings)
        ]
      });

      // Filter out documents that already have a valid ObjectId stored as a string
      const validDocs = docs.filter(doc => {
        if (typeof doc.siteId === 'string' && mongoose.Types.ObjectId.isValid(doc.siteId)) {
          return false;
        }
        return true;
      });

      console.log(`   Found ${validDocs.length} documents without a valid siteId`);

      let collectionUpdated = 0;
      for (const doc of validDocs) {
        const rawSiteName = doc[siteField] || doc.siteName || doc.name || doc.location || '';
        const norm = normalize(rawSiteName);
        let match = byNormalizedName.get(norm);

        if (!match && norm) {
          // Partial match fallback
          match = siteList.find(s => {
            const sn = s.normalized;
            return sn.includes(norm) || norm.includes(sn);
          });
        }

        // If doc already has a siteId string that is a valid ObjectId, use it
        if (!match && doc.siteId && typeof doc.siteId === 'string' && mongoose.Types.ObjectId.isValid(doc.siteId)) {
          match = sites.find(s => s._id.toString() === doc.siteId);
        }

        if (match) {
          // Set the siteId and always set the siteName to the canonical name
          doc.siteId = match.id || match._id;
          doc.siteName = match.name; // overwrite to ensure consistency
          // Save with validation bypassed – this is a migration script
          await doc.save({ validateBeforeSave: false });
          collectionUpdated++;
          totalUpdated++;
          if (totalUpdated % 50 === 0) console.log(`   Updated ${totalUpdated} documents...`);
        } else {
          unresolved.push({
            collection: name,
            id: doc._id,
            siteName: rawSiteName || 'NULL',
            currentSiteId: doc.siteId || 'NULL'
          });
        }
      }
      console.log(`   Updated ${collectionUpdated} documents in ${name}`);
    }

    console.log(`\n✅ Backfill complete! Updated ${totalUpdated} documents.`);

    if (unresolved.length > 0) {
      const outputPath = path.join(__dirname, 'unresolved-sites.json');
      fs.writeFileSync(outputPath, JSON.stringify(unresolved, null, 2));
      console.log(`⚠️ ${unresolved.length} unresolved – see ${outputPath}`);
      console.log('\n📋 Sample of unresolved:');
      unresolved.slice(0, 10).forEach(u => {
        console.log(`   - ${u.collection}: ${u.id} (siteName: "${u.siteName}")`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error: any) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

run();