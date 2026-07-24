import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Employee, { IEmployee } from '../models/Employee';
import { 
  uploadImageToCloudinary, 
  uploadSignatureToCloudinary,
  uploadDocumentToCloudinary,
  deleteFromCloudinary 
} from '../utils/CloudinaryUtils';
import Task from '../models/Task';
;
const router = express.Router();

// ==================== MULTER CONFIGURATIONS ====================

const imageStorage = multer.memoryStorage();
const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const documentStorage = multer.memoryStorage();
const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/rtf'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only document files (PDF, Word, Excel, PowerPoint, Text, Image) are allowed!'));
      }
    }
  }
});

const excelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/excel';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'employee-import-' + uniqueSuffix + path.extname(file.originalname));
  }
});
// Get employees for the logged-in supervisor (filtered by their assigned sites)
router.get('/supervisor', async (req: Request, res: Response) => {
  try {
    const supervisorId = (req as any).user?._id;
    if (!supervisorId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tasks = await Task.find({ 'assignedSupervisors.userId': supervisorId }).select('siteName');
    const siteNames = [...new Set(tasks.map((t: any) => t.siteName).filter(Boolean))];
    
    if (siteNames.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    const employees = await Employee.find({ siteName: { $in: siteNames }, status: 'active' });
    res.json({ success: true, data: employees });
  } catch (error: any) {
    console.error('Error fetching supervisor employees:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
const excelUpload = multer({ 
  storage: excelStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Only Excel/CSV files (.xlsx, .xls, .csv) are allowed!'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// Helper function to update site history
const updateSiteHistory = (employee: IEmployee, newSiteName: string): IEmployee => {
  const today = new Date();
  const siteHistory = employee.siteHistory || [];
  
  if (employee.siteName && employee.siteName !== newSiteName && employee.siteName !== "") {
    const lastEntryIndex = siteHistory.findIndex(entry => !entry.leftDate);
    if (lastEntryIndex !== -1) {
      const lastEntry = siteHistory[lastEntryIndex];
      const daysWorked = Math.floor((today.getTime() - new Date(lastEntry.assignedDate).getTime()) / (1000 * 60 * 60 * 24));
      siteHistory[lastEntryIndex] = {
        ...lastEntry,
        leftDate: today,
        daysWorked: daysWorked
      };
    }
  }
  
  siteHistory.push({
    siteName: newSiteName,
    assignedDate: today
  });
  
  employee.siteHistory = siteHistory;
  return employee;
};

// ==================== BULK OPERATIONS ROUTES ====================

router.patch('/bulk/site', async (req: any, res: any) => {
  try {
    const { employeeIds, siteName } = req.body;
    
    console.log('Bulk site assignment request:', { employeeIds, siteName });
    
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of employee IDs' 
      });
    }
    
    if (!siteName || siteName === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid site name' 
      });
    }
    
    const employees = await Employee.find({ _id: { $in: employeeIds } });
    
    if (employees.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No employees found with the provided IDs' 
      });
    }
    
    const updatePromises = employees.map(async (employee) => {
      if (employee.siteName !== siteName) {
        const today = new Date();
        const siteHistory = employee.siteHistory || [];
        
        if (employee.siteName && employee.siteName !== '') {
          const lastEntryIndex = siteHistory.findIndex(entry => !entry.leftDate);
          if (lastEntryIndex !== -1) {
            const lastEntry = siteHistory[lastEntryIndex];
            const daysWorked = Math.floor((today.getTime() - new Date(lastEntry.assignedDate).getTime()) / (1000 * 60 * 60 * 24));
            siteHistory[lastEntryIndex] = {
              ...lastEntry,
              leftDate: today,
              daysWorked: daysWorked > 0 ? daysWorked : 0
            };
          }
        }
        
        siteHistory.push({
          siteName: siteName,
          assignedDate: today
        });
        
        return await Employee.findByIdAndUpdate(
          employee._id,
          { 
            $set: { 
              siteName: siteName,
              siteHistory: siteHistory 
            } 
          },
          { new: true, runValidators: false }
        );
      }
      return employee;
    });
    
    const updatedEmployees = await Promise.all(updatePromises);
    const updatedCount = updatedEmployees.filter(emp => emp && emp.siteName === siteName).length;
    
    res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedCount} employees to site: ${siteName}`,
      data: {
        modifiedCount: updatedCount,
        employees: updatedEmployees
      }
    });
  } catch (error: any) {
    console.error('Error in bulk site assignment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating employees: ' + error.message,
      error: error.message 
    });
  }
});

router.delete('/bulk', async (req: any, res: any) => {
  try {
    const { employeeIds } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of employee IDs' 
      });
    }
    
    const result = await Employee.deleteMany({ _id: { $in: employeeIds } });
    
    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} employees`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error: any) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting employees',
      error: error.message 
    });
  }
});

router.patch('/bulk/status', async (req: any, res: any) => {
  try {
    const { employeeIds, status } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of employee IDs' 
      });
    }
    
    if (!status || !['active', 'inactive', 'left'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid status (active, inactive, or left)' 
      });
    }
    
    const updateData: any = { status };
    
    if (status === 'left') {
      updateData.dateOfExit = new Date();
    }
    
    const result = await Employee.updateMany(
      { _id: { $in: employeeIds } },
      { $set: updateData },
      { runValidators: false }
    );
    
    res.status(200).json({
      success: true,
      message: `Successfully updated status for ${result.modifiedCount} employees`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (error: any) {
    console.error('Error in bulk status update:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating employees status',
      error: error.message 
    });
  }
});

router.post('/bulk/get', async (req: any, res: any) => {
  try {
    const { employeeIds } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of employee IDs' 
      });
    }
    
    const employees = await Employee.find({ _id: { $in: employeeIds } })
      .select('employeeId name department siteName status siteHistory kycDocuments');
    
    res.status(200).json({
      success: true,
      data: employees
    });
  } catch (error: any) {
    console.error('Error fetching bulk employees:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching employees',
      error: error.message 
    });
  }
});

// ==================== STATISTICS ROUTES ====================

router.get('/stats', async (req: any, res: any) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'active' });
    const inactiveEmployees = await Employee.countDocuments({ status: 'inactive' });
    const leftEmployees = await Employee.countDocuments({ status: 'left' });
    
    const departmentStats = await Employee.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const siteStats = await Employee.aggregate([
      {
        $match: { siteName: { $exists: true, $ne: '' } }
      },
      {
        $group: {
          _id: '$siteName',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const kycStats = await Employee.aggregate([
      {
        $project: {
          totalDocs: { $size: { $ifNull: ['$kycDocuments', []] } },
          verifiedDocs: {
            $size: {
              $filter: {
                input: { $ifNull: ['$kycDocuments', []] },
                cond: { $eq: ['$$this.verified', true] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          employeesWithDocs: { $sum: { $cond: [{ $gt: ['$totalDocs', 0] }, 1, 0] } },
          totalDocuments: { $sum: '$totalDocs' },
          totalVerified: { $sum: '$verifiedDocs' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
        left: leftEmployees,
        departments: departmentStats,
        sites: siteStats,
        kyc: kycStats[0] || {
          totalEmployees: 0,
          employeesWithDocs: 0,
          totalDocuments: 0,
          totalVerified: 0
        }
      }
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching statistics',
      error: error.message 
    });
  }
});

router.get('/template', async (req: any, res: any) => {
  try {
    const templateData = [{
      'employeeId': 'SKEMP0001',
      'name': 'John Doe',
      'email': 'john.doe@example.com',
      'phone': '9876543210',
      'aadharNumber': '123456789012',
      'panNumber': 'ABCDE1234F',
      'uanNumber': '123456789012',
      'esicNumber': '123456789012345',
      'dateOfBirth': '1990-01-01',
      'dateOfJoining': '2024-01-01',
      'dateOfExit': '',
      'gender': 'Male',
      'maritalStatus': 'Married',
      'bloodGroup': 'O+',
      'permanentAddress': '123 Main Street, Mumbai',
      'permanentPincode': '400001',
      'localAddress': '456 Local Street, Mumbai',
      'localPincode': '400002',
      'bankName': 'State Bank of India',
      'accountNumber': '12345678901234',
      'ifscCode': 'SBIN0001234',
      'branchName': 'Main Branch',
      'fatherName': 'Robert Doe',
      'motherName': 'Jane Doe',
      'spouseName': 'Alice Doe',
      'numberOfChildren': '2',
      'emergencyContactName': 'Robert Doe',
      'emergencyContactPhone': '9876543211',
      'emergencyContactRelation': 'Father',
      'nomineeName': 'Alice Doe',
      'nomineeRelation': 'Spouse',
      'department': 'Housekeeping',
      'position': 'Supervisor',
      'siteName': 'Corporate Office',
      'salary': '25000',
      'status': 'active'
    }];

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(templateData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Template');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="employee_import_template.xlsx"');
    
    res.send(buffer);
  } catch (error: any) {
    console.error('Template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating template',
      error: error.message 
    });
  }
});

// ==================== IMPORT ROUTES ====================

router.post('/import', excelUpload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    console.log('Processing import file:', req.file.filename);

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    
    if (!jsonData || jsonData.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        message: 'Excel file is empty or has no data' 
      });
    }

    console.log(`Found ${jsonData.length} rows to process`);

    const importedEmployees: any[] = [];
    const errors: string[] = [];
    const skippedEmployees: any[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any;
      const rowNum = i + 2;
      
      try {
        const requiredFields = ['name', 'email', 'phone', 'aadharNumber', 'department', 'position'];
        const missingFields = requiredFields.filter(field => !row[field]);
        
        if (missingFields.length > 0) {
          errors.push(`Row ${rowNum}: Missing required fields - ${missingFields.join(', ')}`);
          continue;
        }

        const existingEmployee = await Employee.findOne({ 
          $or: [
            { email: row.email.toString().toLowerCase().trim() },
            { aadharNumber: row.aadharNumber.toString().replace(/\s/g, '') }
          ] 
        });

        if (existingEmployee) {
          skippedEmployees.push({
            row: rowNum,
            name: row.name,
            email: row.email,
            reason: existingEmployee.email === row.email ? 'Email already exists' : 'Aadhar already exists'
          });
          continue;
        }

        const employeeData: any = {
          name: row.name.toString().trim(),
          email: row.email.toString().toLowerCase().trim(),
          phone: row.phone.toString().trim(),
          aadharNumber: row.aadharNumber.toString().replace(/\s/g, ''),
          panNumber: row.panNumber ? row.panNumber.toString().trim().toUpperCase() : null,
          esicNumber: row.esicNumber ? row.esicNumber.toString().trim() : null,
          uanNumber: row.uanNumber ? row.uanNumber.toString().trim() : null,
          dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
          dateOfJoining: row.dateOfJoining ? new Date(row.dateOfJoining) : new Date(),
          dateOfExit: row.dateOfExit ? new Date(row.dateOfExit) : null,
          bloodGroup: row.bloodGroup || null,
          gender: row.gender || null,
          maritalStatus: row.maritalStatus || null,
          permanentAddress: row.permanentAddress || null,
          permanentPincode: row.permanentPincode || null,
          localAddress: row.localAddress || null,
          localPincode: row.localPincode || null,
          bankName: row.bankName || null,
          accountNumber: row.accountNumber || null,
          ifscCode: row.ifscCode || null,
          branchName: row.branchName || null,
          fatherName: row.fatherName || null,
          motherName: row.motherName || null,
          spouseName: row.spouseName || null,
          numberOfChildren: parseInt(row.numberOfChildren) || 0,
          emergencyContactName: row.emergencyContactName || null,
          emergencyContactPhone: row.emergencyContactPhone || null,
          emergencyContactRelation: row.emergencyContactRelation || null,
          nomineeName: row.nomineeName || null,
          nomineeRelation: row.nomineeRelation || null,
          department: row.department.toString().trim(),
          position: row.position.toString().trim(),
          siteName: row.siteName || '',
          salary: parseFloat(row.salary) || 0,
          status: row.status && ['active', 'inactive', 'left'].includes(row.status.toLowerCase()) 
                  ? row.status.toLowerCase() as 'active' | 'inactive' | 'left' 
                  : 'active',
          role: 'employee',
          idCardIssued: false,
          westcoatIssued: false,
          apronIssued: false,
          kycDocuments: [],
          siteHistory: row.siteName ? [{
            siteName: row.siteName,
            assignedDate: new Date()
          }] : []
        };

        const newEmployee = new Employee(employeeData);
        await newEmployee.save();
        
        importedEmployees.push({
          employeeId: newEmployee.employeeId,
          name: newEmployee.name,
          email: newEmployee.email,
          department: newEmployee.department
        });

      } catch (error: any) {
        errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: `Import completed. Success: ${importedEmployees.length}, Failed: ${errors.length}, Skipped: ${skippedEmployees.length}`,
      summary: {
        totalRows: jsonData.length,
        imported: importedEmployees.length,
        errors: errors.length,
        skipped: skippedEmployees.length
      },
      importedCount: importedEmployees.length,
      imported: importedEmployees,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      skipped: skippedEmployees.length > 0 ? skippedEmployees.slice(0, 10) : undefined
    });

  } catch (error: any) {
    console.error('Import error:', error);
    
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Could not delete temp file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error importing employees',
      error: error.message 
    });
  }
});

// ==================== EXPORT ROUTES ====================

router.get('/export', async (req: any, res: any) => {
  try {
    const { department, status } = req.query;
    
    const query: any = {};
    if (department && department !== 'all') {
      query.department = department;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });

    if (employees.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No employees found to export' 
      });
    }

    const data = employees.map(emp => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Email': emp.email,
      'Phone': emp.phone,
      'Aadhar Number': emp.aadharNumber,
      'PAN Number': emp.panNumber || '',
      'UAN Number': emp.uanNumber || '',
      'ESIC Number': emp.esicNumber || '',
      'Date of Birth': emp.dateOfBirth ? emp.dateOfBirth.toISOString().split('T')[0] : '',
      'Date of Joining': emp.dateOfJoining ? emp.dateOfJoining.toISOString().split('T')[0] : '',
      'Date of Exit': emp.dateOfExit ? emp.dateOfExit.toISOString().split('T')[0] : '',
      'Gender': emp.gender || '',
      'Marital Status': emp.maritalStatus || '',
      'Blood Group': emp.bloodGroup || '',
      'Department': emp.department,
      'Position': emp.position,
      'Site Name': emp.siteName || '',
      'Salary': emp.salary,
      'Status': emp.status,
      'Bank Name': emp.bankName || '',
      'Account Number': emp.accountNumber || '',
      'IFSC Code': emp.ifscCode || '',
      'Father Name': emp.fatherName || '',
      'Mother Name': emp.motherName || '',
      'Spouse Name': emp.spouseName || '',
      'Number of Children': emp.numberOfChildren || 0,
      'Nominee Name': emp.nomineeName || '',
      'Nominee Relation': emp.nomineeRelation || '',
      'KYC Documents Count': emp.kycDocuments?.length || 0,
      'Verified Documents': emp.kycDocuments?.filter(d => d.verified).length || 0
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Employees');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="employees_export_${new Date().toISOString().split('T')[0]}.xlsx"`);
    
    res.send(buffer);
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error exporting employees',
      error: error.message 
    });
  }
});

// ==================== SINGLE EMPLOYEE CRUD ROUTES ====================

router.get('/', async (req: any, res: any) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      department, 
      siteName, 
      dateOfJoining,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
 if (req.query.supervisorId) {
      query.supervisorId = req.query.supervisorId;
    }
    if (req.query.userId) {
  query.userId = req.query.userId;
}
    if (department && department !== 'all') {
      query.department = department;
    }

    if (siteName && siteName !== 'all') {
  if (Array.isArray(siteName)) {
    query.siteName = { $in: siteName };
  } else {
    query.siteName = siteName;
  }
}
    if (dateOfJoining) {
      const date = new Date(dateOfJoining);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      query.dateOfJoining = {
        $gte: date,
        $lt: nextDate
      };
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const employees = await Employee.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v -photoPublicId -employeeSignaturePublicId -authorizedSignaturePublicId');

    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      data: employees,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Get employees error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching employees',
      error: error.message 
    });
  }
});

router.post('/',
  imageUpload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'employeeSignature', maxCount: 1 },
    { name: 'authorizedSignature', maxCount: 1 }
  ]),
  async (req: any, res: any) => {
    try {
      const employeeData = { ...req.body };
      console.log('Creating employee with data:', employeeData);
      console.log('Files received:', req.files);
      
      const existingEmployee = await Employee.findOne({ 
        $or: [
          { email: employeeData.email },
          { aadharNumber: employeeData.aadharNumber }
        ] 
      });

      if (existingEmployee) {
        return res.status(400).json({ 
          success: false, 
          message: 'Employee with same email or Aadhar already exists' 
        });
      }

       const Site = mongoose.model('Site');
      const site = await Site.findOne({ name: employeeData.siteName });
      
      if (!site) {
        return res.status(404).json({
          success: false,
          message: `Site "${employeeData.siteName}" not found. Please create the site first.`
        });
      }

      // ✅ Atomic counter increment
      const updatedSite = await Site.findByIdAndUpdate(
        site._id,
        { $inc: { employeeCounter: 1 } },
        { new: true }
      );

      // ✅ Generate simple serial ID (1, 2, 3...)
      const employeeId = updatedSite.employeeCounter.toString();
      
      console.log(`✅ Generated employee ID: ${employeeId} for site: ${site.name}`);
      
      // ✅ Set the generated ID
      employeeData.employeeId = employeeId;

      let photoUrl = '';
      let photoPublicId = '';
      let employeeSignatureUrl = '';
      let employeeSignaturePublicId = '';
      let authorizedSignatureUrl = '';
      let authorizedSignaturePublicId = '';

      if (req.files && req.files['photo'] && req.files['photo'][0]) {
        try {
          const photoFile = req.files['photo'][0];
          console.log('Uploading photo to Cloudinary...');
          const photoResult = await uploadImageToCloudinary(photoFile.buffer, 'employee-photos');
          photoUrl = photoResult.secure_url;
          photoPublicId = photoResult.public_id;
          console.log('Photo uploaded to Cloudinary:', photoUrl);
        } catch (photoError) {
          console.error('Error uploading photo to Cloudinary:', photoError);
        }
      }

      if (req.files && req.files['employeeSignature'] && req.files['employeeSignature'][0]) {
        try {
          const signatureFile = req.files['employeeSignature'][0];
          console.log('Uploading employee signature to Cloudinary...');
          const signatureResult = await uploadSignatureToCloudinary(signatureFile.buffer, 'employee-signatures');
          employeeSignatureUrl = signatureResult.secure_url;
          employeeSignaturePublicId = signatureResult.public_id;
          console.log('Employee signature uploaded to Cloudinary:', employeeSignatureUrl);
        } catch (sigError) {
          console.error('Error uploading employee signature to Cloudinary:', sigError);
        }
      }

      if (req.files && req.files['authorizedSignature'] && req.files['authorizedSignature'][0]) {
        try {
          const authSigFile = req.files['authorizedSignature'][0];
          console.log('Uploading authorized signature to Cloudinary...');
          const authSigResult = await uploadSignatureToCloudinary(authSigFile.buffer, 'authorized-signatures');
          authorizedSignatureUrl = authSigResult.secure_url;
          authorizedSignaturePublicId = authSigResult.public_id;
          console.log('Authorized signature uploaded to Cloudinary:', authorizedSignatureUrl);
        } catch (authSigError) {
          console.error('Error uploading authorized signature to Cloudinary:', authSigError);
        }
      }

      employeeData.photo = photoUrl;
      employeeData.photoPublicId = photoPublicId;
      employeeData.employeeSignature = employeeSignatureUrl;
      employeeData.employeeSignaturePublicId = employeeSignaturePublicId;
      employeeData.authorizedSignature = authorizedSignatureUrl;
      employeeData.authorizedSignaturePublicId = authorizedSignaturePublicId;

      const optionalFields = ['panNumber', 'esicNumber', 'uanNumber', 'permanentAddress', 'localAddress', 
                             'bankName', 'accountNumber', 'ifscCode', 'branchName', 'fatherName', 
                             'motherName', 'spouseName', 'emergencyContactName', 'emergencyContactPhone',
                             'emergencyContactRelation', 'nomineeName', 'nomineeRelation', 'bloodGroup',
                             'gender', 'maritalStatus', 'pantSize', 'shirtSize', 'capSize', 'siteName'];
      
      optionalFields.forEach(field => {
        if (employeeData[field] === '' || employeeData[field] === undefined) {
          employeeData[field] = null;
        }
      });

      if (employeeData.salary) employeeData.salary = parseFloat(employeeData.salary);
      if (employeeData.numberOfChildren) employeeData.numberOfChildren = parseInt(employeeData.numberOfChildren) || 0;

      employeeData.idCardIssued = employeeData.idCardIssued === 'true' || employeeData.idCardIssued === true;
      employeeData.westcoatIssued = employeeData.westcoatIssued === 'true' || employeeData.westcoatIssued === true;
      employeeData.apronIssued = employeeData.apronIssued === 'true' || employeeData.apronIssued === true;

      if (employeeData.dateOfBirth) employeeData.dateOfBirth = employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : null;
      if (employeeData.dateOfJoining) employeeData.dateOfJoining = employeeData.dateOfJoining ? new Date(employeeData.dateOfJoining) : new Date();
      if (employeeData.dateOfExit) employeeData.dateOfExit = employeeData.dateOfExit ? new Date(employeeData.dateOfExit) : null;

      employeeData.kycDocuments = [];

      if (employeeData.siteName && employeeData.siteName !== '') {
        employeeData.siteHistory = [{
          siteName: employeeData.siteName,
          assignedDate: new Date()
        }];
      }

      console.log('Creating employee with data:', employeeData);

      const newEmployee = new Employee(employeeData);
      await newEmployee.save();

      const employeeResponse = newEmployee.toObject();
      delete employeeResponse.photoPublicId;
      delete employeeResponse.employeeSignaturePublicId;
      delete employeeResponse.authorizedSignaturePublicId;

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        employee: employeeResponse
      });
    } catch (error: any) {
      console.error('Create employee error:', error);
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({ 
          success: false, 
          message: `Duplicate value for ${field}`,
          error: error.message 
        });
      }
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error',
          errors: messages
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Error creating employee',
        error: error.message 
      });
    }
  }
);

router.get('/:id', async (req: any, res: any) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .select('-__v -photoPublicId -employeeSignaturePublicId -authorizedSignaturePublicId');
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error: any) {
    console.error('Get employee error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching employee',
      error: error.message 
    });
  }
});

const updateEmployeeHandler = async (req: any, res: any) => {
  try {
    const employeeData = { ...req.body };
    console.log('Updating employee with data:', employeeData);
    console.log('Files received for update:', req.files);
    
    const existingEmployee = await Employee.findById(req.params.id);
    
    if (!existingEmployee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    if (req.files) {
      if (req.files['photo'] && req.files['photo'][0]) {
        try {
          const photoFile = req.files['photo'][0];
          console.log('Uploading new photo to Cloudinary...');
          const photoResult = await uploadImageToCloudinary(photoFile.buffer, 'employee-photos');
          employeeData.photo = photoResult.secure_url;
          employeeData.photoPublicId = photoResult.public_id;
          console.log('New photo uploaded to Cloudinary:', employeeData.photo);
        } catch (photoError) {
          console.error('Error uploading new photo to Cloudinary:', photoError);
        }
      }

      if (req.files['employeeSignature'] && req.files['employeeSignature'][0]) {
        try {
          const signatureFile = req.files['employeeSignature'][0];
          console.log('Uploading new employee signature to Cloudinary...');
          const signatureResult = await uploadSignatureToCloudinary(signatureFile.buffer, 'employee-signatures');
          employeeData.employeeSignature = signatureResult.secure_url;
          employeeData.employeeSignaturePublicId = signatureResult.public_id;
          console.log('New employee signature uploaded to Cloudinary:', employeeData.employeeSignature);
        } catch (sigError) {
          console.error('Error uploading new employee signature to Cloudinary:', sigError);
        }
      }

      if (req.files['authorizedSignature'] && req.files['authorizedSignature'][0]) {
        try {
          const authSigFile = req.files['authorizedSignature'][0];
          console.log('Uploading new authorized signature to Cloudinary...');
          const authSigResult = await uploadSignatureToCloudinary(authSigFile.buffer, 'authorized-signatures');
          employeeData.authorizedSignature = authSigResult.secure_url;
          employeeData.authorizedSignaturePublicId = authSigResult.public_id;
          console.log('New authorized signature uploaded to Cloudinary:', employeeData.authorizedSignature);
        } catch (authSigError) {
          console.error('Error uploading new authorized signature to Cloudinary:', authSigError);
        }
      }
    }

    if (employeeData.siteName && employeeData.siteName !== existingEmployee.siteName) {
      const today = new Date();
      const siteHistory = existingEmployee.siteHistory || [];
      
      if (existingEmployee.siteName && existingEmployee.siteName !== '') {
        const lastEntryIndex = siteHistory.findIndex(entry => !entry.leftDate);
        if (lastEntryIndex !== -1) {
          const lastEntry = siteHistory[lastEntryIndex];
          const daysWorked = Math.floor((today.getTime() - new Date(lastEntry.assignedDate).getTime()) / (1000 * 60 * 60 * 24));
          siteHistory[lastEntryIndex] = {
            ...lastEntry,
            leftDate: today,
            daysWorked: daysWorked
          };
        }
      }
      
      siteHistory.push({
        siteName: employeeData.siteName,
        assignedDate: today
      });
      
      employeeData.siteHistory = siteHistory;
    }

    const optionalFields = ['panNumber', 'esicNumber', 'uanNumber', 'permanentAddress', 'localAddress', 
                           'bankName', 'accountNumber', 'ifscCode', 'branchName', 'fatherName', 
                           'motherName', 'spouseName', 'emergencyContactName', 'emergencyContactPhone',
                           'emergencyContactRelation', 'nomineeName', 'nomineeRelation', 'bloodGroup',
                           'gender', 'maritalStatus', 'pantSize', 'shirtSize', 'capSize'];
    
    optionalFields.forEach(field => {
      if (employeeData[field] === '' || employeeData[field] === undefined) {
        employeeData[field] = null;
      }
    });

    if (employeeData.salary) employeeData.salary = parseFloat(employeeData.salary);
    if (employeeData.numberOfChildren) employeeData.numberOfChildren = parseInt(employeeData.numberOfChildren) || 0;

    if (employeeData.idCardIssued !== undefined) {
      employeeData.idCardIssued = employeeData.idCardIssued === 'true' || employeeData.idCardIssued === true;
    }
    if (employeeData.westcoatIssued !== undefined) {
      employeeData.westcoatIssued = employeeData.westcoatIssued === 'true' || employeeData.westcoatIssued === true;
    }
    if (employeeData.apronIssued !== undefined) {
      employeeData.apronIssued = employeeData.apronIssued === 'true' || employeeData.apronIssued === true;
    }

    if (employeeData.dateOfBirth) employeeData.dateOfBirth = employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : null;
    if (employeeData.dateOfJoining) employeeData.dateOfJoining = employeeData.dateOfJoining ? new Date(employeeData.dateOfJoining) : new Date();
    if (employeeData.dateOfExit) employeeData.dateOfExit = employeeData.dateOfExit ? new Date(employeeData.dateOfExit) : null;

    console.log('Cleaned employee data for update:', employeeData);

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: employeeData },
      { new: true, runValidators: false }
    ).select('-__v -photoPublicId -employeeSignaturePublicId -authorizedSignaturePublicId');

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    });
  } catch (error: any) {
    console.error('Update employee error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      errors: error.errors
    });
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false, 
        message: `Duplicate value for ${field}`,
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error updating employee',
      error: error.message 
    });
  }
};

router.put('/:id',
  imageUpload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'employeeSignature', maxCount: 1 },
    { name: 'authorizedSignature', maxCount: 1 }
  ]),
  updateEmployeeHandler
);

router.patch('/:id',
  imageUpload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'employeeSignature', maxCount: 1 },
    { name: 'authorizedSignature', maxCount: 1 }
  ]),
  updateEmployeeHandler
);

router.delete('/:id', async (req: any, res: any) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);

    if (!deletedEmployee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete employee error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting employee',
      error: error.message 
    });
  }
});

router.patch('/:id/status', async (req: any, res: any) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['active', 'inactive', 'left'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: active, inactive, left'
      });
    }

    const updateData: any = { status };
    
    if (status === 'left') {
      updateData.dateOfExit = new Date();
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: false }
    ).select('-__v -photoPublicId -employeeSignaturePublicId -authorizedSignaturePublicId');

    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    res.json({
      success: true,
      message: 'Employee status updated successfully',
      data: employee
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating employee status: ' + error.message,
      error: error.message 
    });
  }
});

// ==================== DOCUMENT MANAGEMENT ROUTES ====================

type DocumentType = 'aadhar' | 'pan' | 'police' | 'driving' | 'electricity' | 'voter' | 'passport' | 'other';

interface KYCdocument {
  documentType: DocumentType;
  documentName: string;
  documentNumber?: string;
  fileUrl: string;
  filePublicId: string;
  uploadedAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  expiryDate?: Date;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
  resourceType?: string;
}

router.post('/:id/documents',
  documentUpload.single('document'),
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { documentType, documentName, documentNumber, expiryDate } = req.body;
      
      console.log('Document upload request received:', { id, documentType, documentName, documentNumber });
      console.log('File info:', req.file ? { 
        originalname: req.file.originalname, 
        mimetype: req.file.mimetype, 
        size: req.file.size 
      } : 'No file');
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No document file uploaded'
        });
      }

      if (!documentType || !documentName) {
        return res.status(400).json({
          success: false,
          message: 'Document type and name are required'
        });
      }

      const validDocumentTypes: DocumentType[] = ['aadhar', 'pan', 'police', 'driving', 'electricity', 'voter', 'passport', 'other'];
      if (!validDocumentTypes.includes(documentType as DocumentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid document type. Must be one of: ${validDocumentTypes.join(', ')}`
        });
      }

      const employee = await Employee.findById(id);
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      let folder = 'employee-documents';
      if (documentType === 'aadhar') folder = 'employee-documents/aadhar';
      else if (documentType === 'pan') folder = 'employee-documents/pan';
      else if (documentType === 'police') folder = 'employee-documents/police';
      else if (documentType === 'driving') folder = 'employee-documents/driving';
      else if (documentType === 'electricity') folder = 'employee-documents/electricity';
      else if (documentType === 'voter') folder = 'employee-documents/voter';
      else if (documentType === 'passport') folder = 'employee-documents/passport';
      else folder = 'employee-documents/other';
      
      console.log('Uploading to Cloudinary folder:', folder);
      
      const uploadResult = await uploadDocumentToCloudinary(
        req.file.buffer, 
        folder,
        req.file.originalname
      );
      
      console.log('Cloudinary upload result:', uploadResult.secure_url);
      
      const newDocument = {
        documentType: documentType as DocumentType,
        documentName,
        documentNumber: documentNumber || undefined,
        fileUrl: uploadResult.secure_url,
        filePublicId: uploadResult.public_id,
        uploadedAt: new Date(),
        verified: false,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        fileType: req.file.mimetype,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        resourceType: uploadResult.resource_type
      };

      const updatedEmployee = await Employee.findByIdAndUpdate(
        id,
        { $push: { kycDocuments: newDocument } },
        { new: true, runValidators: false }
      );

      if (!updatedEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      const { filePublicId, ...documentResponse } = newDocument;

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document: documentResponse
      });

    } catch (error: any) {
      console.error('Error uploading document:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading document: ' + error.message,
        error: error.message
      });
    }
  }
);

router.get('/:id/documents', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findById(id).select('kycDocuments');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const documents = (employee.kycDocuments || []).map((doc: any) => {
      const { filePublicId, ...rest } = doc.toObject ? doc.toObject() : doc;
      return rest;
    });

    res.json({
      success: true,
      documents
    });

  } catch (error: any) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
      error: error.message
    });
  }
});

router.delete('/:id/documents/:documentIndex', async (req: any, res: any) => {
  try {
    const { id, documentIndex } = req.params;
    const index = parseInt(documentIndex);
    
    const employee = await Employee.findById(id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (!employee.kycDocuments || index >= employee.kycDocuments.length) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const documentToDelete = employee.kycDocuments[index];
    
    try {
      if (documentToDelete.filePublicId) {
        await deleteFromCloudinary(documentToDelete.filePublicId);
      }
    } catch (cloudinaryError) {
      console.error('Error deleting from Cloudinary:', cloudinaryError);
    }
    
    employee.kycDocuments.splice(index, 1);
    await employee.save();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document',
      error: error.message
    });
  }
});

router.patch('/:id/documents/:documentIndex/verify', async (req: any, res: any) => {
  try {
    const { id, documentIndex } = req.params;
    const index = parseInt(documentIndex);
    
    const employee = await Employee.findById(id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (!employee.kycDocuments || index >= employee.kycDocuments.length) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    employee.kycDocuments[index].verified = true;
    employee.kycDocuments[index].verifiedAt = new Date();
    employee.kycDocuments[index].verifiedBy = req.user?.id || 'system';
    
    await employee.save();

    res.json({
      success: true,
      message: 'Document verified successfully'
    });

  } catch (error: any) {
    console.error('Error verifying document:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying document',
      error: error.message
    });
  }
});

router.get('/:id/documents/stats', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findById(id).select('kycDocuments');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const documents = employee.kycDocuments || [];
    const totalDocs = documents.length;
    const verifiedDocs = documents.filter(d => d.verified).length;
    const pendingDocs = totalDocs - verifiedDocs;
    
    const documentTypes = {
      aadhar: documents.find(d => d.documentType === 'aadhar'),
      pan: documents.find(d => d.documentType === 'pan'),
      police: documents.find(d => d.documentType === 'police'),
      driving: documents.find(d => d.documentType === 'driving'),
      electricity: documents.find(d => d.documentType === 'electricity'),
      voter: documents.find(d => d.documentType === 'voter'),
      passport: documents.find(d => d.documentType === 'passport'),
      other: documents.filter(d => d.documentType === 'other').length
    };

    const requiredDocs = ['aadhar', 'pan', 'police'];
    const uploadedRequired = requiredDocs.filter(type => 
      documents.some(d => d.documentType === type)
    ).length;
    const verifiedRequired = requiredDocs.filter(type => 
      documents.some(d => d.documentType === type && d.verified)
    ).length;

    res.json({
      success: true,
      stats: {
        total: totalDocs,
        verified: verifiedDocs,
        pending: pendingDocs,
        uploadedRequired,
        verifiedRequired,
        completionPercentage: (uploadedRequired / requiredDocs.length) * 100,
        verificationPercentage: (verifiedRequired / requiredDocs.length) * 100,
        documentTypes
      }
    });

  } catch (error: any) {
    console.error('Error fetching document stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching document statistics',
      error: error.message
    });
  }
});

export default router;