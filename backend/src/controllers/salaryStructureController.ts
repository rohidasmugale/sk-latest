import { Request, Response } from 'express';
import SalaryStructure, { ISalaryStructure } from '../models/SalaryStructure';
import Employee from '../models/Employee';
import mongoose from 'mongoose';
import { logAudit, getUserFromReq } from '../utils/auditLogger';

// Helper function to populate employee data
const populateEmployeeData = async (structures: any[]) => {
  try {
    const employeeIds = structures
      .map(s => s.employeeId)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);

    if (employeeIds.length === 0) {
      return structures.map(structure => {
        const structureObj = structure.toObject ? structure.toObject() : structure;
        return {
          ...structureObj,
          employee: null
        };
      });
    }

    const employees = await Employee.find({ employeeId: { $in: employeeIds } })
      .select('name employeeId department position email phone status dateOfJoining salary accountNumber ifscCode bankBranch bankName aadharNumber panNumber esicNumber uanNumber')
      .lean();

    const employeeMap = new Map();
    employees.forEach(emp => {
      const employeeObj = emp as any;
      employeeMap.set(employeeObj.employeeId, {
        _id: employeeObj._id,
        name: employeeObj.name,
        employeeId: employeeObj.employeeId,
        department: employeeObj.department,
        position: employeeObj.position,
        email: employeeObj.email,
        phone: employeeObj.phone,
        status: employeeObj.status,
        dateOfJoining: employeeObj.dateOfJoining,
        salary: employeeObj.salary,
        accountNumber: employeeObj.accountNumber,
        ifscCode: employeeObj.ifscCode,
        bankBranch: employeeObj.bankBranch,
        bankName: employeeObj.bankName,
        aadharNumber: employeeObj.aadharNumber,
        panNumber: employeeObj.panNumber,
        esicNumber: employeeObj.esicNumber,
        uanNumber: employeeObj.uanNumber
        // Note: providentFund and professionalTax fields don't exist in Employee model
      });
    });

    return structures.map(structure => {
      const structureObj = structure.toObject ? structure.toObject() : structure;
      const employee = employeeMap.get(structureObj.employeeId);

      return {
        ...structureObj,
        employee: employee || null
      };
    });
  } catch (error) {
    console.error('Error populating employee data:', error);
    return structures.map(structure => {
      const structureObj = structure.toObject ? structure.toObject() : structure;
      return {
        ...structureObj,
        employee: null
      };
    });
  }
};

// Get all salary structures
export const getAllSalaryStructures = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      isActive = 'true',
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    // Handle isActive filter
    if (isActive === 'true' || isActive === 'false') {
      query.isActive = isActive === 'true';
    }

    // Handle search
    if (search && search !== '') {
      // First find employees matching the search
      const employees = await Employee.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } }
        ]
      }).select('employeeId').lean();

      const employeeIds = employees.map(emp => (emp as any).employeeId);

      if (employeeIds.length > 0) {
        query.employeeId = { $in: employeeIds };
      } else {
        // If no employees match, return empty result
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            pages: 0
          }
        });
      }
    }

    // Count total documents
    const total = await SalaryStructure.countDocuments(query);

    // Determine sort order
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Fetch salary structures
    const salaryStructures = await SalaryStructure.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Populate employee data
    const populatedStructures = await populateEmployeeData(salaryStructures);

    res.status(200).json({
      success: true,
      data: populatedStructures,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching salary structures:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salary structures',
      error: error.message
    });
  }
};

// Get salary structure by ID
export const getSalaryStructureById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid salary structure ID'
      });
    }

    const salaryStructure = await SalaryStructure.findById(id);

    if (!salaryStructure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    // Populate employee data
    const populatedStructures = await populateEmployeeData([salaryStructure]);

    res.status(200).json({
      success: true,
      data: populatedStructures[0]
    });
  } catch (error: any) {
    console.error('Error fetching salary structure:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salary structure',
      error: error.message
    });
  }
};

// Get salary structure by employee ID
export const getSalaryStructureByEmployeeId = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    // Verify employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const salaryStructure = await SalaryStructure.findOne({
      employeeId,
      isActive: true
    });

    if (!salaryStructure) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active salary structure found for this employee'
      });
    }

    // Populate employee data
    const populatedStructures = await populateEmployeeData([salaryStructure]);

    res.status(200).json({
      success: true,
      data: populatedStructures[0]
    });
  } catch (error: any) {
    console.error('Error fetching salary structure:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salary structure',
      error: error.message
    });
  }
};

// Create new salary structure - Auto-fill basic salary from employee data
export const createSalaryStructure = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { employeeId, basicSalary } = req.body;

    console.log('Creating salary structure for employee:', employeeId);

    // Validate required fields
    if (!employeeId || !basicSalary) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Employee ID and Basic Salary are required'
      });
    }

    // Verify employee exists
    const employee = await Employee.findOne({ employeeId }).session(session);
    if (!employee) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if active structure already exists
    const existingStructure = await SalaryStructure.findOne({
      employeeId,
      isActive: true
    }).session(session);

    if (existingStructure) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Active salary structure already exists for this employee'
      });
    }

    // Prepare salary structure data - Use employee's monthly salary as basic if not provided
    const salaryStructureData: Partial<ISalaryStructure> = {
      employeeId,
      basicSalary: parseFloat(basicSalary) || (employee as any).salary || 0, // Use employee's monthly salary
      hra: parseFloat(req.body.hra) || 0,
      da: parseFloat(req.body.da) || 0,
      specialAllowance: parseFloat(req.body.specialAllowance) || 0,
      conveyance: parseFloat(req.body.conveyance) || 0,
      medicalAllowance: parseFloat(req.body.medicalAllowance) || 0,
      otherAllowances: parseFloat(req.body.otherAllowances) || 0,
      providentFund: parseFloat(req.body.providentFund) || 0, // Removed employee.providentFund as it doesn't exist
      professionalTax: parseFloat(req.body.professionalTax) || 0, // Removed employee.professionalTax as it doesn't exist
      incomeTax: parseFloat(req.body.incomeTax) || 0,
      otherDeductions: parseFloat(req.body.otherDeductions) || 0,
      leaveEncashment: parseFloat(req.body.leaveEncashment) || 0,
      arrears: parseFloat(req.body.arrears) || 0,
      esic: parseFloat(req.body.esic) || 0,
      advance: parseFloat(req.body.advance) || 0,
      mlwf: parseFloat(req.body.mlwf) || 0,
      effectiveFrom: req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : new Date(),
      isActive: true
    };

    console.log('Salary structure data:', salaryStructureData);

    const salaryStructure = new SalaryStructure(salaryStructureData);
    await salaryStructure.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log('Salary structure saved successfully:', salaryStructure._id);

    // Populate employee data
    const populatedStructures = await populateEmployeeData([salaryStructure]);

    await logAudit({
      action: 'structure.create',
      entity: 'salaryStructure',
      entityId: String(salaryStructure._id),
      employeeId: salaryStructure.employeeId,
      performedBy: getUserFromReq(req),
      description: `Created salary structure for ${salaryStructure.employeeId}`,
      after: { basicSalary: salaryStructure.basicSalary },
    });

    res.status(201).json({
      success: true,
      message: 'Salary structure created successfully',
      data: populatedStructures[0]
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error creating salary structure:', error);

    // Handle duplicate key error (unique constraint violation)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Active salary structure already exists for this employee'
      });
    }

    // Handle validation errors
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
      message: 'Error creating salary structure',
      error: error.message
    });
  }
};

// Update salary structure
export const updateSalaryStructure = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('Updating salary structure:', id, 'with data:', updates);

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid salary structure ID'
      });
    }

    // Check if salary structure exists
    const existingStructure = await SalaryStructure.findById(id).session(session);
    if (!existingStructure) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    const oldBasicSalary = existingStructure.basicSalary;

    // Remove immutable fields
    delete updates.employeeId;
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.__v;

    // Parse numeric values
    const parsedUpdates: any = {};
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'string' && !isNaN(parseFloat(updates[key])) && updates[key] !== '') {
        parsedUpdates[key] = parseFloat(updates[key]);
      } else {
        parsedUpdates[key] = updates[key];
      }
    });

    // Update the structure
    const salaryStructure = await SalaryStructure.findByIdAndUpdate(
      id,
      { ...parsedUpdates, updatedAt: new Date() },
      { new: true, runValidators: true, session }
    );

    if (!salaryStructure) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found after update'
      });
    }

    await session.commitTransaction();
    session.endSession();

    console.log('Salary structure updated successfully:', salaryStructure._id);

    // Populate employee data
    const populatedStructures = await populateEmployeeData([salaryStructure]);

    await logAudit({
      action: 'structure.update',
      entity: 'salaryStructure',
      entityId: String(salaryStructure._id),
      employeeId: salaryStructure.employeeId,
      performedBy: getUserFromReq(req),
      description: `Updated salary structure for ${salaryStructure.employeeId}`,
      before: { basicSalary: oldBasicSalary },
      after: { basicSalary: salaryStructure.basicSalary },
    });

    res.status(200).json({
      success: true,
      message: 'Salary structure updated successfully',
      data: populatedStructures[0]
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error updating salary structure:', error);

    // Handle validation errors
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
      message: 'Error updating salary structure',
      error: error.message
    });
  }
};

// Delete salary structure
export const deleteSalaryStructure = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    console.log('Deleting salary structure:', id);

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid salary structure ID'
      });
    }

    const salaryStructure = await SalaryStructure.findByIdAndDelete(id).session(session);

    if (!salaryStructure) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    await session.commitTransaction();
    session.endSession();

    console.log('Salary structure deleted successfully:', id);

    await logAudit({
      action: 'structure.delete',
      entity: 'salaryStructure',
      entityId: String(salaryStructure._id),
      employeeId: salaryStructure.employeeId,
      performedBy: getUserFromReq(req),
      description: `Deleted salary structure for ${salaryStructure.employeeId}`,
      before: { basicSalary: salaryStructure.basicSalary },
    });

    res.status(200).json({
      success: true,
      message: 'Salary structure deleted successfully',
      data: { id }
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error deleting salary structure:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting salary structure',
      error: error.message
    });
  }
};

// Deactivate salary structure
export const deactivateSalaryStructure = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    console.log('Deactivating salary structure:', id);

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid salary structure ID'
      });
    }

    const salaryStructure = await SalaryStructure.findByIdAndUpdate(
      id,
      {
        isActive: false,
        updatedAt: new Date()
      },
      { new: true, runValidators: true, session }
    );

    if (!salaryStructure) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    await session.commitTransaction();
    session.endSession();

    console.log('Salary structure deactivated successfully:', salaryStructure._id);

    // Populate employee data
    const populatedStructures = await populateEmployeeData([salaryStructure]);

    res.status(200).json({
      success: true,
      message: 'Salary structure deactivated successfully',
      data: populatedStructures[0]
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error deactivating salary structure:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating salary structure',
      error: error.message
    });
  }
};

// Get employees without salary structure
export const getEmployeesWithoutStructure = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get all employee IDs with active salary structures
    const salaryStructures = await SalaryStructure.find({ isActive: true })
      .select('employeeId')
      .lean();

    const employeeIdsWithStructure = salaryStructures.map(s => s.employeeId);

    // Build query for employees without structure
    const query: any = {
      employeeId: { $nin: employeeIdsWithStructure },
      status: 'active'
    };

    if (search && search !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }

    // Determine sort order
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Count total
    const total = await Employee.countDocuments(query);

    // Fetch employees
    const employees = await Employee.find(query)
      .select('name employeeId department position email phone status dateOfJoining salary accountNumber ifscCode bankBranch bankName')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching employees without salary structure:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees without salary structure',
      error: error.message
    });
  }
};

// Get salary structure summary
export const getSalaryStructureSummary = async (req: Request, res: Response) => {
  try {
    // Count active structures
    const activeStructures = await SalaryStructure.countDocuments({ isActive: true });

    // Count total employees
    const totalEmployees = await Employee.countDocuments({ status: 'active' });

    // Calculate employees without structure
    const employeesWithoutStructure = totalEmployees - activeStructures;

    // Get average basic salary
    const avgBasicResult = await SalaryStructure.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgBasic: { $avg: '$basicSalary' } } }
    ]);

    const avgBasicSalary = avgBasicResult.length > 0 ? avgBasicResult[0].avgBasic : 0;

    // Get total allowances and deductions
    const totalsResult = await SalaryStructure.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalBasic: { $sum: '$basicSalary' },
          totalHRA: { $sum: '$hra' },
          totalDA: { $sum: '$da' },
          totalAllowances: {
            $sum: {
              $add: [
                '$hra',
                '$da',
                '$specialAllowance',
                '$conveyance',
                '$medicalAllowance',
                '$otherAllowances',
                '$leaveEncashment',
                '$arrears'
              ]
            }
          },
          totalDeductions: {
            $sum: {
              $add: [
                '$providentFund',
                '$professionalTax',
                '$incomeTax',
                '$otherDeductions',
                '$esic',
                '$advance',
                '$mlwf'
              ]
            }
          }
        }
      }
    ]);

    const totals = totalsResult.length > 0 ? totalsResult[0] : {
      totalBasic: 0,
      totalHRA: 0,
      totalDA: 0,
      totalAllowances: 0,
      totalDeductions: 0
    };

    // Calculate total CTC (Cost to Company)
    const totalCTC = totals.totalBasic + totals.totalAllowances;

    res.status(200).json({
      success: true,
      data: {
        activeStructures,
        totalEmployees,
        employeesWithoutStructure,
        avgBasicSalary: Math.round(avgBasicSalary),
        totals: {
          ...totals,
          totalCTC: Math.round(totalCTC)
        },
        percentages: {
          withStructure: totalEmployees > 0 ? (activeStructures / totalEmployees * 100).toFixed(1) : 0,
          withoutStructure: totalEmployees > 0 ? (employeesWithoutStructure / totalEmployees * 100).toFixed(1) : 0
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching salary structure summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salary structure summary',
      error: error.message
    });
  }
};

// Get salary structure by multiple employee IDs
export const getSalaryStructuresByEmployeeIds = async (req: Request, res: Response) => {
  try {
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        message: 'Employee IDs array is required'
      });
    }

    const salaryStructures = await SalaryStructure.find({
      employeeId: { $in: employeeIds },
      isActive: true
    });

    // Populate employee data
    const populatedStructures = await populateEmployeeData(salaryStructures);

    res.status(200).json({
      success: true,
      data: populatedStructures
    });
  } catch (error: any) {
    console.error('Error fetching salary structures by employee IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salary structures',
      error: error.message
    });
  }
};

// Validate salary structure data
export const validateSalaryStructure = async (req: Request, res: Response) => {
  try {
    const { employeeId, basicSalary } = req.body;

    // Check if employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        valid: false
      });
    }

    // Check if active structure already exists
    const existingStructure = await SalaryStructure.findOne({
      employeeId,
      isActive: true
    });

    if (existingStructure) {
      return res.status(400).json({
        success: false,
        message: 'Active salary structure already exists for this employee',
        valid: false,
        existingStructureId: existingStructure._id
      });
    }

    // Validate basic salary
    const parsedBasicSalary = parseFloat(basicSalary) || (employee as any).salary || 0;
    if (parsedBasicSalary <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Basic salary must be greater than 0',
        valid: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Salary structure data is valid',
      valid: true,
      employee: {
        name: employee.name,
        employeeId: employee.employeeId,
        department: employee.department,
        salary: (employee as any).salary,
        accountNumber: (employee as any).accountNumber,
        bankName: (employee as any).bankName
      }
    });
  } catch (error: any) {
    console.error('Error validating salary structure:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating salary structure',
      error: error.message,
      valid: false
    });
  }
};

// Update salary structure status
export const updateSalaryStructureStatus = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { isActive } = req.body;

    console.log('Updating salary structure status:', id, 'to:', isActive);

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid salary structure ID'
      });
    }

    // Validate isActive
    if (typeof isActive !== 'boolean') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const salaryStructure = await SalaryStructure.findByIdAndUpdate(
      id,
      {
        isActive,
        updatedAt: new Date()
      },
      { new: true, runValidators: true, session }
    );

    if (!salaryStructure) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    await session.commitTransaction();
    session.endSession();

    console.log('Salary structure status updated successfully:', salaryStructure._id);

    // Populate employee data
    const populatedStructures = await populateEmployeeData([salaryStructure]);

    res.status(200).json({
      success: true,
      message: 'Salary structure status updated successfully',
      data: populatedStructures[0]
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error updating salary structure status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating salary structure status',
      error: error.message
    });
  }
};

// Get salary structure history for an employee
export const getSalaryStructureHistory = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Verify employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Build query
    const query = { employeeId };

    // Count total documents
    const total = await SalaryStructure.countDocuments(query);

    // Fetch salary structures history
    const salaryStructures = await SalaryStructure.find(query)
      .sort({ effectiveFrom: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Populate employee data
    const populatedStructures = await populateEmployeeData(salaryStructures);

    res.status(200).json({
      success: true,
      data: populatedStructures,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching salary structure history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salary structure history',
      error: error.message
    });
  }
};

// Calculate salary breakdown
export const calculateSalaryBreakdown = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    // Get active salary structure
    const salaryStructure = await SalaryStructure.findOne({
      employeeId,
      isActive: true
    });

    if (!salaryStructure) {
      return res.status(404).json({
        success: false,
        message: 'Active salary structure not found for this employee'
      });
    }

    // Get employee data
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Calculate totals
    const basicSalary = salaryStructure.basicSalary || 0;
    const hra = salaryStructure.hra || 0;
    const da = salaryStructure.da || 0;
    const specialAllowance = salaryStructure.specialAllowance || 0;
    const conveyance = salaryStructure.conveyance || 0;
    const medicalAllowance = salaryStructure.medicalAllowance || 0;
    const otherAllowances = salaryStructure.otherAllowances || 0;
    const leaveEncashment = salaryStructure.leaveEncashment || 0;
    const arrears = salaryStructure.arrears || 0;

    const providentFund = salaryStructure.providentFund || 0;
    const professionalTax = salaryStructure.professionalTax || 0;
    const incomeTax = salaryStructure.incomeTax || 0;
    const otherDeductions = salaryStructure.otherDeductions || 0;
    const esic = salaryStructure.esic || 0;
    const advance = salaryStructure.advance || 0;
    const mlwf = salaryStructure.mlwf || 0;

    const totalAllowances = hra + da + specialAllowance + conveyance +
                           medicalAllowance + otherAllowances + leaveEncashment + arrears;

    const totalDeductions = providentFund + professionalTax + incomeTax +
                           otherDeductions + esic + advance + mlwf;

    const grossSalary = basicSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;

    res.status(200).json({
      success: true,
      data: {
        employee: {
          name: employee.name,
          employeeId: employee.employeeId,
          department: employee.department,
          position: employee.position,
          salary: (employee as any).salary
        },
        salaryStructure: {
          ...salaryStructure.toObject(),
          _id: salaryStructure._id,
          id: salaryStructure._id
        },
        breakdown: {
          earnings: {
            basicSalary,
            hra,
            da,
            specialAllowance,
            conveyance,
            medicalAllowance,
            otherAllowances,
            leaveEncashment,
            arrears,
            total: totalAllowances
          },
          deductions: {
            providentFund,
            professionalTax,
            incomeTax,
            otherDeductions,
            esic,
            advance,
            mlwf,
            total: totalDeductions
          },
          summary: {
            grossSalary,
            totalDeductions,
            netSalary
          },
          percentages: {
            basicPercentage: basicSalary > 0 ? ((basicSalary / grossSalary) * 100).toFixed(2) : "0",
            allowancesPercentage: totalAllowances > 0 ? ((totalAllowances / grossSalary) * 100).toFixed(2) : "0",
            deductionsPercentage: totalDeductions > 0 ? ((totalDeductions / grossSalary) * 100).toFixed(2) : "0"
          }
        }
      }
    });
  } catch (error: any) {
    console.error('Error calculating salary breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating salary breakdown',
      error: error.message
    });
  }
};

// Import multiple salary structures
export const importSalaryStructures = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { structures } = req.body;

    if (!structures || !Array.isArray(structures)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Structures array is required'
      });
    }

    const results = [];
    const errors = [];
    let importedCount = 0; // Changed from const to let
    let updatedCount = 0; // Changed from const to let

    for (const structureData of structures) {
      try {
        const { employeeId, basicSalary } = structureData;

        // Validate required fields
        if (!employeeId || !basicSalary) {
          errors.push({
            employeeId: employeeId || 'Unknown',
            error: 'Employee ID and Basic Salary are required'
          });
          continue;
        }

        // Verify employee exists
        const employee = await Employee.findOne({ employeeId }).session(session);
        if (!employee) {
          errors.push({
            employeeId,
            error: 'Employee not found'
          });
          continue;
        }

        // Check if active structure already exists
        const existingStructure = await SalaryStructure.findOne({
          employeeId,
          isActive: true
        }).session(session);

        if (existingStructure) {
          // Update existing structure
          const updates = {
            basicSalary: parseFloat(basicSalary) || (employee as any).salary || 0,
            hra: parseFloat(structureData.hra) || 0,
            da: parseFloat(structureData.da) || 0,
            specialAllowance: parseFloat(structureData.specialAllowance) || 0,
            conveyance: parseFloat(structureData.conveyance) || 0,
            medicalAllowance: parseFloat(structureData.medicalAllowance) || 0,
            otherAllowances: parseFloat(structureData.otherAllowances) || 0,
            providentFund: parseFloat(structureData.providentFund) || 0, // Removed employee.providentFund
            professionalTax: parseFloat(structureData.professionalTax) || 0, // Removed employee.professionalTax
            incomeTax: parseFloat(structureData.incomeTax) || 0,
            otherDeductions: parseFloat(structureData.otherDeductions) || 0,
            leaveEncashment: parseFloat(structureData.leaveEncashment) || 0,
            arrears: parseFloat(structureData.arrears) || 0,
            esic: parseFloat(structureData.esic) || 0,
            advance: parseFloat(structureData.advance) || 0,
            mlwf: parseFloat(structureData.mlwf) || 0,
            effectiveFrom: structureData.effectiveFrom ? new Date(structureData.effectiveFrom) : new Date(),
            updatedAt: new Date()
          };

          const updatedStructure = await SalaryStructure.findByIdAndUpdate(
            existingStructure._id,
            updates,
            { new: true, runValidators: true, session }
          );

          results.push({
            employeeId,
            action: 'updated',
            structureId: updatedStructure?._id,
            name: employee.name
          });
          updatedCount++;
        } else {
          // Create new structure
          const salaryStructureData: Partial<ISalaryStructure> = {
            employeeId,
            basicSalary: parseFloat(basicSalary) || (employee as any).salary || 0,
            hra: parseFloat(structureData.hra) || 0,
            da: parseFloat(structureData.da) || 0,
            specialAllowance: parseFloat(structureData.specialAllowance) || 0,
            conveyance: parseFloat(structureData.conveyance) || 0,
            medicalAllowance: parseFloat(structureData.medicalAllowance) || 0,
            otherAllowances: parseFloat(structureData.otherAllowances) || 0,
            providentFund: parseFloat(structureData.providentFund) || 0, // Removed employee.providentFund
            professionalTax: parseFloat(structureData.professionalTax) || 0, // Removed employee.professionalTax
            incomeTax: parseFloat(structureData.incomeTax) || 0,
            otherDeductions: parseFloat(structureData.otherDeductions) || 0,
            leaveEncashment: parseFloat(structureData.leaveEncashment) || 0,
            arrears: parseFloat(structureData.arrears) || 0,
            esic: parseFloat(structureData.esic) || 0,
            advance: parseFloat(structureData.advance) || 0,
            mlwf: parseFloat(structureData.mlwf) || 0,
            effectiveFrom: structureData.effectiveFrom ? new Date(structureData.effectiveFrom) : new Date(),
            isActive: true
          };

          const salaryStructure = new SalaryStructure(salaryStructureData);
          await salaryStructure.save({ session });

          results.push({
            employeeId,
            action: 'created',
            structureId: salaryStructure._id,
            name: employee.name
          });
          importedCount++;
        }
      } catch (error: any) {
        errors.push({
          employeeId: structureData.employeeId || 'Unknown',
          error: error.message
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    await logAudit({
      action: 'structure.import',
      entity: 'salaryStructure',
      performedBy: getUserFromReq(req),
      description: `Imported salary structures — Created: ${importedCount}, Updated: ${updatedCount}, Errors: ${errors.length}`,
      metadata: { created: importedCount, updated: updatedCount, failed: errors.length, total: structures.length },
    });

    res.status(200).json({
      success: true,
      message: `Salary structures imported successfully. Created: ${importedCount}, Updated: ${updatedCount}, Errors: ${errors.length}`,
      results,
      errors,
      summary: {
        total: structures.length,
        imported: importedCount,
        updated: updatedCount,
        failed: errors.length
      }
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error importing salary structures:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing salary structures',
      error: error.message
    });
  }
};