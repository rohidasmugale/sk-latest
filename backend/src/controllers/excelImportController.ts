import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import Employee from '../models/Employee';
import path from 'path';
import fs from 'fs';

// Function to clean and validate data
const cleanValue = (value: any): any => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.toString().trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return undefined;
    }
    return trimmed;
  }
  
  return value;
};

// Function to parse date from Excel
const parseExcelDate = (excelDate: any): Date | undefined => {
  if (!excelDate) return undefined;
  
  try {
    // If it's already a Date object
    if (excelDate instanceof Date) {
      return excelDate;
    }
    
    // If it's an Excel serial number
    if (typeof excelDate === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      return new Date(excelEpoch.getTime() + excelDate * millisecondsPerDay);
    }
    
    // If it's a string
    if (typeof excelDate === 'string') {
      // Handle "2001-04-19 00:00:00" format
      const dateStr = excelDate.toString().split(' ')[0].trim();
      return new Date(dateStr);
    }
    
    return undefined;
  } catch (error) {
    console.error('Error parsing date:', excelDate, error);
    return undefined;
  }
};

// Function to generate employee ID
const generateEmployeeId = async (): Promise<string> => {
  const lastEmployee = await Employee.findOne().sort({ createdAt: -1 });
  const lastId = lastEmployee?.employeeId || 'SKEMP0000';
  const lastNumber = parseInt(lastId.replace('SKEMP', '')) || 0;
  return `SKEMP${String(lastNumber + 1).padStart(4, '0')}`;
};

// Function to determine department from position
const determineDepartment = (position: string = ''): string => {
  const positionLower = position.toLowerCase();
  
  if (positionLower.includes('hk') || positionLower.includes('housekeeping')) {
    return 'Housekeeping Management';
  } else if (positionLower.includes('security') || positionLower.includes('guard')) {
    return 'Security Management';
  } else if (positionLower.includes('parking') || positionLower.includes('attendant')) {
    return 'Parking Management';
  } else if (positionLower.includes('owc') || positionLower.includes('operator') || positionLower.includes('waste')) {
    return 'Waste Management';
  } else if (positionLower.includes('driver')) {
    return 'Operations';
  } else if (positionLower.includes('account') || positionLower.includes('finance')) {
    return 'Finance';
  } else if (positionLower.includes('hr') || positionLower.includes('human resource')) {
    return 'HR';
  } else if (positionLower.includes('admin') || positionLower.includes('administration')) {
    return 'Administration';
  } else if (positionLower.includes('it') || positionLower.includes('tech')) {
    return 'IT';
  } else if (positionLower.includes('supervisor') || positionLower.includes('manager')) {
    return 'Administration';
  } else if (positionLower.includes('sales')) {
    return 'Sales';
  } else if (positionLower.includes('maintenance')) {
    return 'Maintenance';
  } else if (positionLower.includes('stp') || positionLower.includes('tank')) {
    return 'STP Tank Cleaning';
  } else if (positionLower.includes('consumable')) {
    return 'Consumables Management';
  }
  
  return 'General Staff';
};

// Function to map Excel row to Employee schema based on YOUR Excel columns
const mapExcelRowToEmployee = async (row: any, index: number): Promise<any> => {
  const employeeId = await generateEmployeeId();
  
  // Extract position from column T (Position) or department from column AM
  const position = cleanValue(row.getCell('T')?.value) || 'Employee';
  const departmentFromExcel = cleanValue(row.getCell('AM')?.value);
  
  // Determine department
  const department = departmentFromExcel || determineDepartment(position);
  
  // Map ALL columns from your Excel sheet
  return {
    // Basic Information
    employeeId,
    name: cleanValue(row.getCell('B')?.value), // Employee Name
    email: cleanValue(row.getCell('H')?.value), // Email
    phone: cleanValue(row.getCell('F')?.value), // Contact No
    aadharNumber: cleanValue(row.getCell('I')?.value), // Aadhar Number
    panNumber: cleanValue(row.getCell('J')?.value), // PAN Number
    esicNumber: cleanValue(row.getCell('K')?.value), // ESIC Number
    uanNumber: cleanValue(row.getCell('L')?.value), // PF/UAN Number
    
    // Personal Details
    dateOfBirth: parseExcelDate(row.getCell('D')?.value), // Date of Birth
    dateOfJoining: parseExcelDate(row.getCell('E')?.value) || new Date(), // Date of Joining
    dateOfExit: parseExcelDate(row.getCell('F')?.value), // Date of Exit (same as Contact No column)
    bloodGroup: cleanValue(row.getCell('G')?.value), // Blood Group
    // Note: Gender and MaritalStatus not in your Excel, can add if needed
    
    // Address
    permanentAddress: cleanValue(row.getCell('M')?.value), // Permanent Address
    permanentPincode: cleanValue(row.getCell('N')?.value), // Permanent Pin Code
    localAddress: cleanValue(row.getCell('O')?.value), // Local Address
    localPincode: cleanValue(row.getCell('P')?.value), // Local Pin Code
    
    // Bank Details
    bankName: cleanValue(row.getCell('Q')?.value), // Bank Name
    accountNumber: cleanValue(row.getCell('R')?.value), // Account Number
    ifscCode: cleanValue(row.getCell('S')?.value), // IFSC Code
    branchName: cleanValue(row.getCell('T')?.value), // Branch Name
    
    // Family Details
    fatherName: cleanValue(row.getCell('U')?.value), // Father's Name
    motherName: cleanValue(row.getCell('V')?.value), // Mother's Name
    spouseName: cleanValue(row.getCell('W')?.value), // Spouse Name
    numberOfChildren: parseInt(cleanValue(row.getCell('X')?.value) || '0'), // Number of Children
    
    // Emergency Contact
    emergencyContactName: cleanValue(row.getCell('Y')?.value), // Emergency Contact Name
    emergencyContactPhone: cleanValue(row.getCell('Z')?.value), // Emergency Contact Phone
    emergencyContactRelation: cleanValue(row.getCell('AA')?.value), // Relation
    
    // Nominee Details
    nomineeName: cleanValue(row.getCell('AB')?.value), // Nominee Name
    nomineeRelation: cleanValue(row.getCell('AC')?.value), // Nominee Relation
    
    // Uniform Details
    pantSize: cleanValue(row.getCell('AD')?.value), // Pant Size
    shirtSize: cleanValue(row.getCell('AE')?.value), // Shirt Size
    capSize: cleanValue(row.getCell('AF')?.value), // Cap Size
    
    // Issued Items (convert Yes/No to boolean)
    idCardIssued: (cleanValue(row.getCell('AG')?.value) || '').toString().toLowerCase() === 'yes',
    westcoatIssued: (cleanValue(row.getCell('AH')?.value) || '').toString().toLowerCase() === 'yes',
    apronIssued: (cleanValue(row.getCell('AI')?.value) || '').toString().toLowerCase() === 'yes',
    
    // Employment Details
    department,
    position,
    siteName: cleanValue(row.getCell('A')?.value), // Site Name
    salary: parseFloat(cleanValue(row.getCell('AL')?.value) || '0'), // Monthly Salary
    status: row.getCell('F')?.value ? 'left' : 'active', // Has Date of Exit?
    
    // Role - determine from position
    role: position.toLowerCase().includes('supervisor') ? 'supervisor' : 
          position.toLowerCase().includes('manager') ? 'manager' : 'employee',
    
    // Cloudinary fields (empty for now, can be added later)
    photo: '',
    photoPublicId: '',
    employeeSignature: '',
    employeeSignaturePublicId: '',
    authorizedSignature: '',
    authorizedSignaturePublicId: '',
    
    // Bank Branch (same as branch name for now)
    bankBranch: cleanValue(row.getCell('T')?.value),
    
    // System fields will be added by timestamps
  };
};

// Main import function
export const importEmployeesFromExcel = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    
    const filePath = path.join(__dirname, '../../uploads', req.file.filename);
    
    console.log(`📥 Processing Excel file: ${filePath}`);
    
    // Read Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.worksheets[0];
    const totalRows = worksheet.rowCount;
    
    console.log(`📊 Total rows in Excel: ${totalRows}`);
    console.log(`📊 Total columns: ${worksheet.columnCount}`);
    
    // Log header row to understand column structure
    const headerRow = worksheet.getRow(1);
    const headers: any[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });
    console.log('📋 Excel headers:', headers.filter(Boolean));
    
    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [] as any[]
    };
    
    // Start from row 2 (skip header)
    for (let i = 2; i <= totalRows; i++) {
      const row = worksheet.getRow(i);
      
      // Skip completely empty rows
    const hasData = row.hasValues;
      if (!hasData) {
        continue;
      }
      
      results.total++;
      
      try {
        const employeeData = await mapExcelRowToEmployee(row, i);
        
        // Check required fields
        if (!employeeData.name) {
          throw new Error('Missing required field: name');
        }
        
        if (!employeeData.aadharNumber) {
          throw new Error('Missing required field: aadharNumber');
        }
        
        // Validate Aadhar length
        if (employeeData.aadharNumber && employeeData.aadharNumber.length !== 12) {
          throw new Error(`Invalid Aadhar length: ${employeeData.aadharNumber} (must be 12 digits)`);
        }
        
        // Check for duplicates (Aadhar is unique)
        const existingAadhar = await Employee.findOne({ 
          aadharNumber: employeeData.aadharNumber 
        });
        
        if (existingAadhar) {
          console.log(`⚠️ Skipping duplicate Aadhar: ${employeeData.aadharNumber}`);
          results.failed++;
          results.errors.push({
            row: i,
            name: employeeData.name,
            aadhar: employeeData.aadharNumber,
            error: 'Duplicate Aadhar number'
          });
          continue;
        }
        
        // Check for duplicate email if email exists
        if (employeeData.email) {
          const existingEmail = await Employee.findOne({ 
            email: employeeData.email 
          });
          
          if (existingEmail) {
            console.log(`⚠️ Skipping duplicate email: ${employeeData.email}`);
            results.failed++;
            results.errors.push({
              row: i,
              name: employeeData.name,
              email: employeeData.email,
              error: 'Duplicate email'
            });
            continue;
          }
        }
        
        // Create and save employee
        const employee = new Employee(employeeData);
        await employee.save();
        
        console.log(`✅ Created: ${employeeData.name} (${employeeData.employeeId}) - ${employeeData.department}`);
        results.success++;
        
      } catch (error: any) {
        console.error(`❌ Row ${i} error:`, error.message);
        results.failed++;
        results.errors.push({
          row: i,
          name: row.getCell(2)?.value || 'Unknown',
          error: error.message
        });
        
        // Log validation errors in detail
        if (error.name === 'ValidationError') {
          console.error(`❌ Validation errors for row ${i}:`, error.errors);
        }
      }
    }
    
    // Delete the uploaded file
    fs.unlinkSync(filePath);
    
    console.log(`📊 Import completed: ${results.success} successful, ${results.failed} failed`);
    
    res.status(200).json({
      message: 'Import completed',
      results
    });
    
  } catch (error: any) {
    console.error('❌ Import error:', error);
    res.status(500).json({
      message: 'Import failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Test with direct data insertion (for debugging)
export const testDirectImport = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    // Create a test employee that matches YOUR schema
    const testEmployee = {
      employeeId: 'SKEMPTEST001',
      name: 'Test Employee',
      email: 'test@example.com',
      phone: '9876543210',
      aadharNumber: '111122223333',
      panNumber: 'ABCDE1234F',
      esicNumber: '123456789012345',
      uanNumber: '123456789012',
      
      dateOfBirth: new Date('1990-01-01'),
      dateOfJoining: new Date(),
      bloodGroup: 'O+',
      gender: 'Male',
      maritalStatus: 'Single',
      
      permanentAddress: '123 Test Street, Pune',
      permanentPincode: '411001',
      localAddress: '456 Local Road, Pune',
      localPincode: '411002',
      
      bankName: 'State Bank of India',
      accountNumber: '12345678901234',
      ifscCode: 'SBIN0001234',
      branchName: 'Main Branch',
      bankBranch: 'Main Branch',
      
      fatherName: 'Father Test',
      motherName: 'Mother Test',
      spouseName: '',
      numberOfChildren: 0,
      
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '9876543211',
      emergencyContactRelation: 'Father',
      
      nomineeName: 'Nominee Test',
      nomineeRelation: 'Spouse',
      
      department: 'General Staff',
      position: 'Test Position',
      siteName: 'Test Site',
      salary: 25000,
      status: 'active',
      role: 'employee',
      
      pantSize: '32',
      shirtSize: 'M',
      capSize: 'M',
      
      idCardIssued: false,
      westcoatIssued: false,
      apronIssued: false,
      
      photo: '',
      photoPublicId: '',
      employeeSignature: '',
      employeeSignaturePublicId: '',
      authorizedSignature: '',
      authorizedSignaturePublicId: '',
    };
    
    // Check for duplicates
    const existing = await Employee.findOne({
      $or: [
        { aadharNumber: testEmployee.aadharNumber },
        { email: testEmployee.email },
        { employeeId: testEmployee.employeeId }
      ]
    });
    
    if (existing) {
      return res.status(400).json({
        message: 'Test employee already exists',
        existing: existing.employeeId
      });
    }
    
    const employee = new Employee(testEmployee);
    await employee.save();
    
    res.status(201).json({
      message: 'Test employee created successfully',
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department
      }
    });
    
  } catch (error: any) {
    console.error('❌ Test import error:', error);
    
    if (error.name === 'ValidationError') {
      const errors: any = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      message: 'Test import failed',
      error: error.message
    });
  }
};