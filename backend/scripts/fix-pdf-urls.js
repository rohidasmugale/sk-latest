const dns = require('dns');
// Force Node to use Google + Cloudflare DNS for SRV lookups
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const mongoose = require('mongoose');
// ...rest of your script

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI not set');
  process.exit(1);
}

const isBrokenPdfUrl = (url) =>
  typeof url === 'string' &&
  url.includes('res.cloudinary.com') &&
  url.includes('/image/upload/') &&
  /\.pdf($|\?)/i.test(url);

const fixUrl = (url) => url.replace('/image/upload/', '/raw/upload/');

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const employees = db.collection('employees');

  // Find employees that have at least one broken PDF in kycDocuments
  const cursor = employees.find({
    'kycDocuments.fileUrl': { $regex: '/image/upload/', $options: 'i' }
  });

  let scanned = 0;
  let patched = 0;

  while (await cursor.hasNext()) {
    const emp = await cursor.next();
    scanned++;

    let changed = false;
    const updatedDocs = (emp.kycDocuments || []).map((doc) => {
      if (isBrokenPdfUrl(doc.fileUrl)) {
        const newUrl = fixUrl(doc.fileUrl);
        console.log(`  • ${emp.name} (${emp.employeeId}):`);
        console.log(`    ${doc.fileUrl}`);
        console.log(` →  ${newUrl}`);
        changed = true;
        return { ...doc, fileUrl: newUrl };
      }
      return doc;
    });

    if (changed) {
      await employees.updateOne(
        { _id: emp._id },
        { $set: { kycDocuments: updatedDocs } }
      );
      patched++;
    }
  }

  console.log(`\n✅ Done. Scanned ${scanned} employees, patched ${patched}.`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});