import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/Employee';
import Site from '../models/Site';

dotenv.config();

async function migrateEmployeeIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('📊 Connected to MongoDB');

    // Get all sites
    const sites = await Site.find();
    console.log(`📍 Found ${sites.length} sites`);

    let totalUpdated = 0;

    for (const site of sites) {
      console.log(`\n📋 Processing site: ${site.name}`);
      
      // Get all employees at this site, sorted by creation date
      const employees = await Employee.find({ 
        siteName: site.name 
      }).sort({ createdAt: 1 });
      
      if (employees.length === 0) {
        console.log(`   No employees found for this site`);
        continue;
      }
      
      console.log(`   Found ${employees.length} employees`);
      
      // Update each employee with sequential ID
      let counter = 1;
      for (const employee of employees) {
        const newId = counter.toString();
        
        await Employee.findByIdAndUpdate(
          employee._id,
          { $set: { employeeId: newId } }
        );
        
        console.log(`   ${employee.name} (old: ${employee.employeeId}) → new: ${newId}`);
        counter++;
        totalUpdated++;
      }
      
      // Update site counter
      await Site.findByIdAndUpdate(
        site._id,
        { $set: { employeeCounter: employees.length } }
      );
      
      console.log(`   ✅ Site counter set to: ${employees.length}`);
    }
    
    console.log(`\n✅ Migration completed!`);
    console.log(`📊 Total employees updated: ${totalUpdated}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateEmployeeIds();