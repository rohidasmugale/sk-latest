import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site';
import Employee from '../models/Employee';

dotenv.config();

async function migrateAllEmployeeIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('📊 Connected to MongoDB');
    
    // ✅ STEP 1: Get all sites
    const sites = await Site.find();
    console.log(`📍 Found ${sites.length} sites`);
    
    let totalUpdated = 0;
    
    for (const site of sites) {
      console.log(`\n📋 Processing site: ${site.name}`);
      
      // ✅ STEP 2: Get all employees at this site (active and inactive)
      const employees = await Employee.find({ 
        siteName: site.name 
      }).sort({ createdAt: 1 }); // Sort by creation date (oldest first)
      
      if (employees.length === 0) {
        console.log(`   No employees found for this site`);
        continue;
      }
      
      console.log(`   Found ${employees.length} employees`);
      
      // ✅ STEP 3: Update each employee with serial number
      let counter = 1;
      for (const employee of employees) {
        const newId = counter.toString();
        
        // Update employee with new simple ID
        await Employee.findByIdAndUpdate(
          employee._id,
          { $set: { employeeId: newId } }
        );
        
        console.log(`   ${employee.name} (old: ${employee.employeeId}) → new: ${newId}`);
        counter++;
        totalUpdated++;
      }
      
      // ✅ STEP 4: Update site counter to the last assigned number
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

migrateAllEmployeeIds();