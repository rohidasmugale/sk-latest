import { Request, Response } from 'express';
import Employee, { IEmployee } from '../models/Employee';
import { 
  uploadImageToCloudinary, 
  uploadSignatureToCloudinary 
} from '../utils/CloudinaryUtils';


  
export const createEmployee = async (req: Request, res: Response) => {
  try {
    console.log('Creating employee with data:', req.body);
    console.log('Files received:', req.files);

    // 1️⃣ Get the employeeId from request
    const employeeId = req.body.employeeId?.trim();
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    // 2️⃣ Check if this employeeId already exists (optional but gives nicer error)
    const existingByEmployeeId = await Employee.findOne({ employeeId });
    if (existingByEmployeeId) {
      return res.status(400).json({
        success: false,
        message: `Employee ID "${employeeId}" already exists. Please choose a different one.`
      });
    }

    // 3️⃣ Check existing email or Aadhar (keep as is)
    const existingEmployee = await Employee.findOne({
      $or: [
        { email: req.body.email },
        { aadharNumber: req.body.aadharNumber }
      ]
    });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this email or Aadhar number already exists'
      });
    }

    // ---------- File uploads (no change) ----------
    let photoUrl = '', photoPublicId = '';
    let employeeSignatureUrl = '', employeeSignaturePublicId = '';
    let authorizedSignatureUrl = '', authorizedSignaturePublicId = '';

    if (req.files && (req.files as any).photo) {
      try {
        const photoFile = (req.files as any).photo[0];
        const photoResult = await uploadImageToCloudinary(photoFile.buffer, 'employee-photos');
        photoUrl = photoResult.secure_url;
        photoPublicId = photoResult.public_id;
      } catch (photoError) {
        console.error('Error uploading photo:', photoError);
      }
    }

    if (req.files && (req.files as any).employeeSignature) {
      try {
        const signatureFile = (req.files as any).employeeSignature[0];
        const signatureResult = await uploadSignatureToCloudinary(signatureFile.buffer, 'employee-signatures');
        employeeSignatureUrl = signatureResult.secure_url;
        employeeSignaturePublicId = signatureResult.public_id;
      } catch (sigError) {
        console.error('Error uploading employee signature:', sigError);
      }
    }

    if (req.files && (req.files as any).authorizedSignature) {
      try {
        const authSigFile = (req.files as any).authorizedSignature[0];
        const authSigResult = await uploadSignatureToCloudinary(authSigFile.buffer, 'authorized-signatures');
        authorizedSignatureUrl = authSigResult.secure_url;
        authorizedSignaturePublicId = authSigResult.public_id;
      } catch (authSigError) {
        console.error('Error uploading authorized signature:', authSigError);
      }
    }

    // ---------- Build employee data ----------
    const salary = req.body.salary ? parseFloat(req.body.salary) : 0;
    const dateOfBirth = req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined;
    const dateOfJoining = req.body.dateOfJoining ? new Date(req.body.dateOfJoining) : new Date();
    const dateOfExit = req.body.dateOfExit ? new Date(req.body.dateOfExit) : undefined;

    const idCardIssued = req.body.idCardIssued === 'true' || req.body.idCardIssued === true;
    const westcoatIssued = req.body.westcoatIssued === 'true' || req.body.westcoatIssued === true;
    const apronIssued = req.body.apronIssued === 'true' || req.body.apronIssued === true;
    const numberOfChildren = req.body.numberOfChildren ? parseInt(req.body.numberOfChildren) : 0;

    // 4️⃣ Create employee object – using the user‑provided employeeId
    const employeeData: Partial<IEmployee> = {
      employeeId,   // <── now uses the value from the request
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      aadharNumber: req.body.aadharNumber,
      panNumber: req.body.panNumber,
      esicNumber: req.body.esicNumber,
      uanNumber: req.body.uanNumber,
      dateOfBirth,
      dateOfJoining,
      dateOfExit,
      bloodGroup: req.body.bloodGroup,
      gender: req.body.gender,
      maritalStatus: req.body.maritalStatus,
      permanentAddress: req.body.permanentAddress,
      permanentPincode: req.body.permanentPincode,
      localAddress: req.body.localAddress,
      localPincode: req.body.localPincode,
      bankName: req.body.bankName,
      accountNumber: req.body.accountNumber,
      ifscCode: req.body.ifscCode,
      branchName: req.body.branchName,
      bankBranch: req.body.branchName,
      fatherName: req.body.fatherName,
      motherName: req.body.motherName,
      spouseName: req.body.spouseName,
      numberOfChildren,
      emergencyContactName: req.body.emergencyContactName,
      emergencyContactPhone: req.body.emergencyContactPhone,
      emergencyContactRelation: req.body.emergencyContactRelation,
      nomineeName: req.body.nomineeName,
      nomineeRelation: req.body.nomineeRelation,
      department: req.body.department,
      position: req.body.position,
      siteName: req.body.siteName,
      salary,
      status: 'active' as const,
      role: 'employee' as const,
      pantSize: req.body.pantSize,
      shirtSize: req.body.shirtSize,
      capSize: req.body.capSize,
      idCardIssued,
      westcoatIssued,
      apronIssued,
      photo: photoUrl,
      photoPublicId,
      employeeSignature: employeeSignatureUrl,
      employeeSignaturePublicId,
      authorizedSignature: authorizedSignatureUrl,
      authorizedSignaturePublicId,
    };

    const employee = new Employee(employeeData);
    const savedEmployee = await employee.save();

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: savedEmployee
    });

  } catch (error: any) {
    console.error('Error creating employee:', error);
    if (error.code === 11000) {
      let message = 'Duplicate value entered';
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'email') message = 'Email already exists';
      else if (field === 'aadharNumber') message = 'Aadhar number already exists';
      else if (field === 'employeeId') message = 'Employee ID already exists. Please use a unique ID.';
      return res.status(400).json({ success: false, message, error: error.message, field });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors: messages });
    }
    res.status(500).json({ success: false, message: 'Error creating employee', error: error.message });
  }
};
// Get all employees
export const getEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: employees.length,
      employees
    });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

// Get employee by ID or employeeId
export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    let employee;
    
    // Check if the id is a MongoDB ObjectId (24 hex characters)
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      employee = await Employee.findById(id);
    } else {
      // If not an ObjectId, search by employeeId
      employee = await Employee.findOne({ employeeId: id });
    }
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.status(200).json({
      success: true,
      employee
    });
  } catch (error: any) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee',
      error: error.message
    });
  }
};

// Update employee - also handle both ID types
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Handle file uploads if present
    let updateData: any = { ...req.body };
    
    if (req.files) {
      const files = req.files as any;
      
      if (files.photo) {
        const photoFile = files.photo[0];
        const photoResult = await uploadImageToCloudinary(photoFile.buffer, 'employee-photos');
        updateData.photo = photoResult.secure_url;
        updateData.photoPublicId = photoResult.public_id;
      }
      
      if (files.employeeSignature) {
        const sigFile = files.employeeSignature[0];
        const sigResult = await uploadSignatureToCloudinary(sigFile.buffer, 'employee-signatures');
        updateData.employeeSignature = sigResult.secure_url;
        updateData.employeeSignaturePublicId = sigResult.public_id;
      }
      
      if (files.authorizedSignature) {
        const authSigFile = files.authorizedSignature[0];
        const authSigResult = await uploadSignatureToCloudinary(authSigFile.buffer, 'authorized-signatures');
        updateData.authorizedSignature = authSigResult.secure_url;
        updateData.authorizedSignaturePublicId = authSigResult.public_id;
      }
    }
    
    // Parse numeric fields
    if (updateData.salary) updateData.salary = parseFloat(updateData.salary);
    if (updateData.numberOfChildren) updateData.numberOfChildren = parseInt(updateData.numberOfChildren);
    
    // Parse boolean fields
    if (updateData.idCardIssued !== undefined) {
      updateData.idCardIssued = updateData.idCardIssued === 'true' || updateData.idCardIssued === true;
    }
    if (updateData.westcoatIssued !== undefined) {
      updateData.westcoatIssued = updateData.westcoatIssued === 'true' || updateData.westcoatIssued === true;
    }
    if (updateData.apronIssued !== undefined) {
      updateData.apronIssued = updateData.apronIssued === 'true' || updateData.apronIssued === true;
    }
    
    // Parse date fields
    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.dateOfJoining) updateData.dateOfJoining = new Date(updateData.dateOfJoining);
    if (updateData.dateOfExit) updateData.dateOfExit = new Date(updateData.dateOfExit);
    
    let employee;
    
    // Check if the id is a MongoDB ObjectId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      employee = await Employee.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
    } else {
      // If not an ObjectId, update by employeeId
      employee = await Employee.findOneAndUpdate(
        { employeeId: id },
        updateData,
        { new: true, runValidators: true }
      );
    }
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      employee
    });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee',
      error: error.message
    });
  }
};

// Delete employee - also handle both ID types
export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    let employee;
    
    // Check if the id is a MongoDB ObjectId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      employee = await Employee.findById(id);
    } else {
      // If not an ObjectId, find by employeeId
      employee = await Employee.findOne({ employeeId: id });
    }
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Delete from Cloudinary if public IDs exist
    // Note: You might want to import deleteImageFromCloudinary from CloudinaryUtils
    // and call it for each image that needs to be deleted
    
    await employee.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting employee',
      error: error.message
    });
  }
};