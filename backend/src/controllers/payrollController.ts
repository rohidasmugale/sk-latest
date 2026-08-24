import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Payroll, { IPayroll } from '../models/Payroll';
import SalaryStructure from '../models/SalaryStructure';
import SalarySlip from '../models/SalarySlip';
import Employee, { IEmployee } from '../models/Employee';
import * as XLSX from 'xlsx';
import Deduction from '../models/Deduction';
// Helper function to populate employee data
const populateEmployeeData = async (payrollRecords: any[]) => {
  try {
    const employeeIds = payrollRecords
      .map(p => p.employeeId)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);

    if (employeeIds.length === 0) {
      return payrollRecords.map(record => {
        const recordObj = record.toObject ? record.toObject() : record;
        return {
          ...recordObj,
          employee: null
        };
      });
    }

    const employees = await Employee.find({ employeeId: { $in: employeeIds } })
      .select('name employeeId department position email phone accountNumber ifscCode bankBranch bankName gender dateOfJoining status aadharNumber panNumber esicNumber uanNumber providentFund professionalTax permanentAddress localAddress salary')
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
        accountNumber: employeeObj.accountNumber,
        ifscCode: employeeObj.ifscCode,
        bankBranch: employeeObj.bankBranch,
        bankName: employeeObj.bankName,
        gender: employeeObj.gender,
        dateOfJoining: employeeObj.dateOfJoining,
        status: employeeObj.status,
        aadharNumber: employeeObj.aadharNumber,
        panNumber: employeeObj.panNumber,
        esicNumber: employeeObj.esicNumber,
        uanNumber: employeeObj.uanNumber,
        providentFund: employeeObj.providentFund,
        professionalTax: employeeObj.professionalTax,
        permanentAddress: employeeObj.permanentAddress,
        localAddress: employeeObj.localAddress,
        salary: employeeObj.salary
      });
    });

    return payrollRecords.map(record => {
      const recordObj = record.toObject ? record.toObject() : record;
      const employee = employeeMap.get(recordObj.employeeId);
      
      return {
        ...recordObj,
        employee: employee || null
      };
    });
  } catch (error) {
    console.error('Error populating employee data:', error);
    return payrollRecords.map(record => {
      const recordObj = record.toObject ? record.toObject() : record;
      return {
        ...recordObj,
        employee: null
      };
    });
  }
};

// Get all payroll records
export const getAllPayroll = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      search = '', 
      month, 
      status,
      department,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (month) {
      query.month = month;
    }

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Handle search across employee fields
    if (search && search !== '') {
      // Find employees matching the search
      const employees = await Employee.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } }
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

    // Handle department filter
    if (department && department !== '') {
      const employees = await Employee.find({
        department: { $regex: department, $options: 'i' }
      }).select('employeeId').lean();

      const employeeIds = employees.map(emp => (emp as any).employeeId);
      
      if (employeeIds.length > 0) {
        if (query.employeeId && query.employeeId.$in) {
          // Intersection with existing employeeIds from search
          const intersection = employeeIds.filter(id => 
            query.employeeId.$in.includes(id)
          );
          query.employeeId.$in = intersection;
        } else {
          query.employeeId = { $in: employeeIds };
        }
      } else {
        // If no employees in department, return empty
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

    // Determine sort order
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Count total documents
    const total = await Payroll.countDocuments(query);

    // Fetch payroll records
    const payroll = await Payroll.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Populate employee data manually
    const populatedPayroll = await populateEmployeeData(payroll);

    // Calculate summary
    const summary = {
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      holdAmount: 0,
      partPaidAmount: 0,
      processedCount: 0,
      pendingCount: 0,
      paidCount: 0,
      holdCount: 0,
      partPaidCount: 0,
      totalRecords: payroll.length
    };

    payroll.forEach(p => {
      summary.totalAmount += p.netSalary || 0;
      
      if (p.status === 'processed') summary.processedCount++;
      if (p.status === 'pending') summary.pendingCount++;
      
      if (p.paymentStatus === 'paid') {
        summary.paidCount++;
        summary.paidAmount += p.paidAmount || 0;
      } else if (p.paymentStatus === 'hold') {
        summary.holdCount++;
        summary.holdAmount += p.netSalary || 0;
      } else if (p.paymentStatus === 'part-paid') {
        summary.partPaidCount++;
        summary.partPaidAmount += p.paidAmount || 0;
        summary.pendingAmount += ((p.netSalary || 0) - (p.paidAmount || 0));
      } else {
        summary.pendingAmount += p.netSalary || 0;
      }
    });

    res.status(200).json({
      success: true,
      data: populatedPayroll,
      summary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching payroll records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payroll records',
      error: error.message
    });
  }
};

// Get payroll by ID
export const getPayrollById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payroll ID'
      });
    }

    const payroll = await Payroll.findById(id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    // Populate employee data manually
    const populatedPayroll = await populateEmployeeData([payroll]);

    res.status(200).json({
      success: true,
      data: populatedPayroll[0]
    });
  } catch (error: any) {
    console.error('Error fetching payroll record:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payroll record',
      error: error.message
    });
  }
};

// Get payroll by employee ID and month
export const getPayrollByEmployeeAndMonth = async (req: Request, res: Response) => {
  try {
    const { employeeId, month } = req.params;

    const payroll = await Payroll.findOne({ employeeId, month });

    if (!payroll) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Payroll record not found for this employee and month'
      });
    }

    // Populate employee data manually
    const populatedPayroll = await populateEmployeeData([payroll]);

    res.status(200).json({
      success: true,
      data: populatedPayroll[0]
    });
  } catch (error: any) {
    console.error('Error fetching payroll record:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payroll record',
      error: error.message
    });
  }
};

// Process payroll for an employee
export const processPayroll = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      employeeId, 
      month, 
      presentDays = 0, 
      absentDays = 0, 
      halfDays = 0, 
      leaves = 0,
      totalWorkingDays = 22 
    } = req.body;
    
    const userId = 'system'; // Hardcoded for now

    // Validate required fields
    if (!employeeId || !month) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Employee ID and Month are required'
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

    // Get active salary structure
    const salaryStructure = await SalaryStructure.findOne({ 
      employeeId,
      isActive: true 
    }).session(session);

    if (!salaryStructure) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Active salary structure not found for this employee'
      });
    }

    // Check if payroll already exists for this month
    const existingPayroll = await Payroll.findOne({ employeeId, month }).session(session);
    if (existingPayroll) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Payroll already processed for this month'
      });
    }

    // Calculate net salary
    const basicSalary = salaryStructure.basicSalary || 0;
    const dailyRate = totalWorkingDays > 0 ? basicSalary / totalWorkingDays : 0;
    const halfDayRate = dailyRate / 2;

    // Calculate earned basic salary
    const earnedBasicSalary = 
      (presentDays * dailyRate) +
      (halfDays * halfDayRate);

    // Calculate salary loss for absent days and leaves
    const salaryLoss = (absentDays * dailyRate) + (leaves * dailyRate);

    // Net basic salary after attendance adjustment
    const netBasicSalary = Math.max(0, earnedBasicSalary - salaryLoss);

    // Calculate total allowances
    const totalAllowances = 
      (salaryStructure.hra || 0) + 
      (salaryStructure.da || 0) + 
      (salaryStructure.specialAllowance || 0) + 
      (salaryStructure.conveyance || 0) + 
      (salaryStructure.medicalAllowance || 0) + 
      (salaryStructure.otherAllowances || 0) + 
      (salaryStructure.leaveEncashment || 0) + 
      (salaryStructure.arrears || 0);

    // Calculate total deductions
   // Calculate total deductions from salary structure
const totalDeductions = 
  (salaryStructure.providentFund || 0) + 
  (salaryStructure.professionalTax || 0) + 
  (salaryStructure.incomeTax || 0) + 
  (salaryStructure.otherDeductions || 0) + 
  (salaryStructure.esic || 0) + 
  (salaryStructure.advance || 0) + 
  (salaryStructure.mlwf || 0);

// ─── FETCH ACTIVE DEDUCTIONS (ADVANCES, FINES, OTHER) ────────────────
// Get all approved/completed deductions for this employee and month
const activeDeductions = await Deduction.aggregate([
  {
    $match: {
      employeeId: employeeId,
      appliedMonth: month,
      status: { $in: ['approved', 'completed'] }
    }
  },
  {
    $group: {
      _id: null,
      totalDeductions: { $sum: '$amount' },
      items: { $push: '$$ROOT' }
    }
  }
]);

let additionalDeductions = 0;
let deductionItems: any[] = [];

if (activeDeductions.length > 0) {
  additionalDeductions = activeDeductions[0].totalDeductions || 0;
  deductionItems = activeDeductions[0].items || [];
  console.log(`📌 Applying ${deductionItems.length} additional deductions: ₹${additionalDeductions}`);
}

// Add additional deductions to totalDeductions
const finalTotalDeductions = totalDeductions + additionalDeductions;

    // Calculate net salary
    const netSalary = Math.max(0, netBasicSalary + totalAllowances - totalDeductions);

    // Create payroll record with employee details
    const payrollData: Partial<IPayroll> = {
      employeeId,
      month,
      basicSalary: salaryStructure.basicSalary,
      allowances: totalAllowances,
      deductions: finalTotalDeductions,
      netSalary,
      status: 'processed',
      presentDays,
      absentDays,
      halfDays,
      leaves,
      paidAmount: 0,
      paymentStatus: 'pending',
      da: salaryStructure.da,
      hra: salaryStructure.hra,
      providentFund: salaryStructure.providentFund,
      professionalTax: salaryStructure.professionalTax,
      esic: salaryStructure.esic,
      advance: salaryStructure.advance,
      mlwf: salaryStructure.mlwf,
      leaveEncashment: salaryStructure.leaveEncashment,
      arrears: salaryStructure.arrears,
      otherAllowances: salaryStructure.otherAllowances,
      otherDeductions: salaryStructure.otherDeductions,
      createdBy: userId,
      updatedBy: userId,
      // Store employee details for reference
      employeeDetails: {
        accountNumber: employee.accountNumber,
        ifscCode: employee.ifscCode,
        bankBranch: employee.bankBranch,
        bankName: employee.bankName,
        aadharNumber: employee.aadharNumber,
        panNumber: employee.panNumber,
        esicNumber: employee.esicNumber,
        uanNumber: employee.uanNumber,
        permanentAddress: employee.permanentAddress,
        localAddress: employee.localAddress,
        salary: employee.salary,
        monthlySalary: employee.salary // Alias for clarity
      }
    };

    const payroll = new Payroll(payrollData);
    await payroll.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Populate employee data for response
    const populatedPayroll = await populateEmployeeData([payroll]);

    res.status(201).json({
      success: true,
      message: 'Payroll processed successfully',
      data: populatedPayroll[0],
      calculation: {
        netSalary,
        netBasicSalary,
        totalAllowances,
        totalDeductions,
        earnedBasicSalary,
        salaryLoss,
        dailyRate
      }
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error processing payroll:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Payroll already exists for this employee and month'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error processing payroll',
      error: error.message
    });
  }
};

// Bulk process payroll
export const bulkProcessPayroll = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { month, employeeIds, attendanceMap = {} } = req.body;
    const userId = 'system';
    const results = [];
    const errors = [];
    const totalWorkingDays = 22; // Default value

    if (!month || !employeeIds || !Array.isArray(employeeIds)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Month and employeeIds array are required'
      });
    }

    for (const employeeId of employeeIds) {
      try {
        // Check if payroll already exists
        const existingPayroll = await Payroll.findOne({ employeeId, month }).session(session);
        if (existingPayroll) {
          errors.push({
            employeeId,
            error: 'Payroll already exists for this month'
          });
          continue;
        }

        // Get employee and salary structure
        const employee = await Employee.findOne({ employeeId }).session(session);
        if (!employee) {
          errors.push({
            employeeId,
            error: 'Employee not found'
          });
          continue;
        }

        const salaryStructure = await SalaryStructure.findOne({ 
          employeeId,
          isActive: true 
        }).session(session);

        if (!salaryStructure) {
          errors.push({
            employeeId,
            error: 'Active salary structure not found'
          });
          continue;
        }

        // Get attendance data
        const attendanceData = attendanceMap[employeeId] || {
          presentDays: 0,
          absentDays: 0,
          halfDays: 0,
          leaves: 0
        };

        const { presentDays = 0, absentDays = 0, halfDays = 0, leaves = 0 } = attendanceData;

        // Calculate salary
        const basicSalary = salaryStructure.basicSalary || 0;
        const dailyRate = totalWorkingDays > 0 ? basicSalary / totalWorkingDays : 0;
        const halfDayRate = dailyRate / 2;

        const earnedBasicSalary = 
          (presentDays * dailyRate) +
          (halfDays * halfDayRate);

        const salaryLoss = (absentDays * dailyRate) + (leaves * dailyRate);
        const netBasicSalary = Math.max(0, earnedBasicSalary - salaryLoss);

        const totalAllowances = 
          (salaryStructure.hra || 0) + 
          (salaryStructure.da || 0) + 
          (salaryStructure.specialAllowance || 0) + 
          (salaryStructure.conveyance || 0) + 
          (salaryStructure.medicalAllowance || 0) + 
          (salaryStructure.otherAllowances || 0) + 
          (salaryStructure.leaveEncashment || 0) + 
          (salaryStructure.arrears || 0);

      const totalDeductions = 
  (salaryStructure.providentFund || 0) + 
  (salaryStructure.professionalTax || 0) + 
  (salaryStructure.incomeTax || 0) + 
  (salaryStructure.otherDeductions || 0) + 
  (salaryStructure.esic || 0) + 
  (salaryStructure.advance || 0) + 
  (salaryStructure.mlwf || 0);

// ─── FETCH ACTIVE DEDUCTIONS ─────────────────────────────────────────────
const activeDeductions = await Deduction.aggregate([
  {
    $match: {
      employeeId: employeeId,
      appliedMonth: month,
      status: { $in: ['approved', 'completed'] }
    }
  },
  {
    $group: {
      _id: null,
      totalDeductions: { $sum: '$amount' },
      items: { $push: '$$ROOT' }
    }
  }
]);

let additionalDeductions = 0;
let deductionItems: any[] = [];

if (activeDeductions.length > 0) {
  additionalDeductions = activeDeductions[0].totalDeductions || 0;
  deductionItems = activeDeductions[0].items || [];
}

const finalTotalDeductions = totalDeductions + additionalDeductions;
        const netSalary = Math.max(0, netBasicSalary + totalAllowances - totalDeductions);

        // Create payroll record with employee details
        const payrollData: Partial<IPayroll> = {
          employeeId,
          month,
          basicSalary: salaryStructure.basicSalary,
          allowances: totalAllowances,
          deductions: finalTotalDeductions,
          netSalary,
          status: 'processed',
          presentDays,
          absentDays,
          halfDays,
          leaves,
          paidAmount: 0,
          paymentStatus: 'pending',
          da: salaryStructure.da,
          hra: salaryStructure.hra,
          providentFund: salaryStructure.providentFund,
          professionalTax: salaryStructure.professionalTax,
          esic: salaryStructure.esic,
          advance: salaryStructure.advance,
          mlwf: salaryStructure.mlwf,
          leaveEncashment: salaryStructure.leaveEncashment,
          arrears: salaryStructure.arrears,
          otherAllowances: salaryStructure.otherAllowances,
          otherDeductions: salaryStructure.otherDeductions,
          createdBy: userId,
          updatedBy: userId,
          // Store employee details for reference
          employeeDetails: {
            accountNumber: employee.accountNumber,
            ifscCode: employee.ifscCode,
            bankBranch: employee.bankBranch,
            bankName: employee.bankName,
            aadharNumber: employee.aadharNumber,
            panNumber: employee.panNumber,
            esicNumber: employee.esicNumber,
            uanNumber: employee.uanNumber,
            permanentAddress: employee.permanentAddress,
            localAddress: employee.localAddress,
            salary: employee.salary
          }
        };

        const payroll = new Payroll(payrollData);
        await payroll.save({ session });

        results.push({
          employeeId,
          name: employee.name,
          netSalary,
          payrollId: payroll._id,
          accountNumber: employee.accountNumber,
          ifscCode: employee.ifscCode
        });
      } catch (error: any) {
        errors.push({
          employeeId,
          error: error.message
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: `Payroll processed for ${results.length} employees`,
      results,
      errors,
      summary: {
        processed: results.length,
        failed: errors.length,
        total: employeeIds.length
      }
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error processing bulk payroll:', error);

    res.status(500).json({
      success: false,
      message: 'Error processing bulk payroll',
      error: error.message
    });
  }
};

// Update payment status
export const updatePaymentStatus = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status, paidAmount = 0, notes = '', paymentDate } = req.body;
    const userId = 'system';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid payroll ID'
      });
    }

    const payroll = await Payroll.findById(id).session(session);
    if (!payroll) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    const updates: any = {
      paymentStatus: status,
      updatedBy: userId,
      notes: notes || ''
    };

    // Handle different statuses properly
    if (status === 'paid') {
      updates.paidAmount = payroll.netSalary;
      updates.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      updates.status = 'paid';
    } else if (status === 'part-paid') {
      const paid = parseFloat(paidAmount as string) || 0;
      updates.paidAmount = Math.min(Math.max(paid, 0), payroll.netSalary);
      updates.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      updates.status = 'part-paid';
    } else if (status === 'hold') {
      updates.paidAmount = 0;
      updates.paymentDate = null;
      updates.status = 'hold';
    } else if (status === 'pending') {
      updates.paidAmount = 0;
      updates.paymentDate = null;
      updates.status = 'pending';
    }

    console.log('Updating payment status:', { id, status, updates });

    const updatedPayroll = await Payroll.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true, session }
    );

    if (!updatedPayroll) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found after update'
      });
    }

    await session.commitTransaction();
    session.endSession();

    // Populate employee data for response
    const populatedPayroll = await populateEmployeeData([updatedPayroll]);

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: populatedPayroll[0]
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment status',
      error: error.message
    });
  }
};

// Delete payroll record
export const deletePayroll = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid payroll ID'
      });
    }

    // Check if salary slip exists
    const salarySlip = await SalarySlip.findOne({ payrollId: id }).session(session);
    if (salarySlip) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete payroll record with existing salary slip'
      });
    }

    const payroll = await Payroll.findByIdAndDelete(id).session(session);

    if (!payroll) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Payroll record deleted successfully',
      data: { id }
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error deleting payroll record:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payroll record',
      error: error.message
    });
  }
};

// Get payroll summary for dashboard
export const getPayrollSummary = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;

    const query: any = {};
    if (month) {
      query.month = month;
    }

    const payrollRecords = await Payroll.find(query);

    const summary = {
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      holdAmount: 0,
      partPaidAmount: 0,
      processedCount: 0,
      pendingCount: 0,
      paidCount: 0,
      holdCount: 0,
      partPaidCount: 0,
      totalEmployees: 0,
      totalRecords: payrollRecords.length,
      activeEmployees: 0,
      employeesWithStructure: 0,
      employeesWithoutStructure: 0,
      payrollMonth: month || 'All'
    };

    payrollRecords.forEach(p => {
      summary.totalAmount += p.netSalary || 0;
      summary.totalEmployees++;

      if (p.status === 'processed') summary.processedCount++;
      if (p.status === 'pending') summary.pendingCount++;
      
      if (p.paymentStatus === 'paid') {
        summary.paidCount++;
        summary.paidAmount += p.paidAmount || 0;
      } else if (p.paymentStatus === 'hold') {
        summary.holdCount++;
        summary.holdAmount += p.netSalary || 0;
      } else if (p.paymentStatus === 'part-paid') {
        summary.partPaidCount++;
        summary.partPaidAmount += p.paidAmount || 0;
        summary.pendingAmount += ((p.netSalary || 0) - (p.paidAmount || 0));
      } else {
        summary.pendingCount++;
        summary.pendingAmount += p.netSalary || 0;
      }
    });

    // Get employees with and without salary structure..
    summary.activeEmployees = await Employee.countDocuments({ status: 'active' });
    summary.employeesWithStructure = await SalaryStructure.countDocuments({ isActive: true });
    summary.employeesWithoutStructure = Math.max(0, summary.activeEmployees - summary.employeesWithStructure);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('Error fetching payroll summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payroll summary',
      error: error.message
    });
  }
};

// src/controllers/payrollController.ts

export const exportPayroll = async (req: Request, res: Response) => {
  try {
    const { month, format = 'csv', site } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month is required for export'
      });
    }

    // Build query with optional site filter
    const query: any = { month };
    if (site && site !== 'all') {
      const siteEmployees = await Employee.find({ siteName: site }).select('employeeId').lean();
      const employeeIds = siteEmployees.map(emp => (emp as any).employeeId);
      if (employeeIds.length > 0) {
        query.employeeId = { $in: employeeIds };
      } else {
        return res.status(200).json({
          success: true,
          data: [],
          message: 'No employees found for this site'
        });
      }
    }

    const payrollRecords = await Payroll.find(query);

    if (payrollRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No payroll records found for this month' + (site ? ' and site' : '')
      });
    }

    // Get employee data
    const employeeIds = payrollRecords.map(p => p.employeeId);
    const employees = await Employee.find({ employeeId: { $in: employeeIds } })
      .select('name employeeId department position gender accountNumber ifscCode bankBranch bankName aadharNumber panNumber esicNumber uanNumber siteName')
      .lean();
    const employeeMap = new Map();
    employees.forEach(emp => {
      const employeeObj = emp as any;
      employeeMap.set(employeeObj.employeeId, {
        name: employeeObj.name,
        employeeId: employeeObj.employeeId,
        department: employeeObj.department,
        position: employeeObj.position,
        gender: employeeObj.gender,
        accountNumber: employeeObj.accountNumber,
        ifscCode: employeeObj.ifscCode,
        bankBranch: employeeObj.bankBranch,
        bankName: employeeObj.bankName,
        aadharNumber: employeeObj.aadharNumber,
        panNumber: employeeObj.panNumber,
        esicNumber: employeeObj.esicNumber,
        uanNumber: employeeObj.uanNumber,
        siteName: employeeObj.siteName
      });
    });

    // Get salary structures for basic salary
    const salaryStructures = await SalaryStructure.find({ employeeId: { $in: employeeIds }, isActive: true })
      .select('employeeId basicSalary')
      .lean();
    const salaryStructureMap = new Map();
    salaryStructures.forEach(struct => {
      salaryStructureMap.set(struct.employeeId, struct);
    });

    // ─── 1. CLIENT TEMPLATE FORMAT (Excel) ──────────────────────────────
    if (format === 'client-template') {
      const exportData = payrollRecords.map((record, index) => {
        const employee = employeeMap.get(record.employeeId) || {};
        const structure = salaryStructureMap.get(record.employeeId) || {};

        return {
          SR: index + 1,
          'BANK AC': employee.accountNumber || '',
          BRANCH: employee.bankBranch || '',
          'IFSC CODE': employee.ifscCode || '',
          NAMES: employee.name || '',
          SITE: employee.siteName || '',
          DEP: employee.department || '',
          STATUS: record.status || '',
          PM_SAL: structure.basicSalary || 0,
          G: employee.gender ? employee.gender.charAt(0).toUpperCase() : '',
          DESG: employee.position || '',
          DAYS: record.presentDays || 0,
          GROSS: (record.basicSalary || 0) + (record.allowances || 0),
          ADVANCE: record.advance || 0,
          'UNIFORM ID': record.uniformAndId || 0,
          FINE: record.fine || 0,
          DED: record.deductions || 0,
          OTHER: record.otherDeductions || 0,
          NET: record.netSalary || 0,
          REMARK: record.notes || ''
        };
      });

      // Totals row
      const totals: any = {
        SR: 'TOTAL',
        'BANK AC': '',
        BRANCH: '',
        'IFSC CODE': '',
        NAMES: '',
        SITE: '',
        DEP: '',
        STATUS: '',
        PM_SAL: exportData.reduce((sum, row) => sum + (row.PM_SAL || 0), 0),
        G: '',
        DESG: '',
        DAYS: exportData.reduce((sum, row) => sum + (row.DAYS || 0), 0),
        GROSS: exportData.reduce((sum, row) => sum + (row.GROSS || 0), 0),
        ADVANCE: exportData.reduce((sum, row) => sum + (row.ADVANCE || 0), 0),
        'UNIFORM ID': exportData.reduce((sum, row) => sum + (row['UNIFORM ID'] || 0), 0),
        FINE: exportData.reduce((sum, row) => sum + (row.FINE || 0), 0),
        DED: exportData.reduce((sum, row) => sum + (row.DED || 0), 0),
        OTHER: exportData.reduce((sum, row) => sum + (row.OTHER || 0), 0),
        NET: exportData.reduce((sum, row) => sum + (row.NET || 0), 0),
        REMARK: ''
      };
      const finalData = [...exportData, totals];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(finalData);
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=client-payroll-${month}.xlsx`);
      return res.send(buffer);
    }

    // ─── 2. DEFAULT FORMAT (CSV / JSON) ──────────────────────────────────
    // Build export data with original columns
    const exportData = payrollRecords.map((record, index) => {
      const employee = employeeMap.get(record.employeeId) || {};
      return {
        SR: index + 1,
        'BANK AC': employee.accountNumber || 'N/A',
        'BANK NAME': employee.bankName || 'N/A',
        BRANCH: employee.bankBranch || 'N/A',
        'IFSC CODE': employee.ifscCode || 'N/A',
        NAMES: employee.name || 'N/A',
        G: employee.gender?.charAt(0) || 'N/A',
        MONTH: record.month,
        DEP: employee.department || 'N/A',
        STATUS: record.status?.toUpperCase() || 'N/A',
        'IN HAND': record.paidAmount || 0,
        DESG: employee.position || 'N/A',
        DAYS: record.presentDays || 0,
        OT: record.overtimeHours || 0,
        BASIC: record.basicSalary || 0,
        DA: record.da || 0,
        HRA: record.hra || 0,
        OTHER: record.otherAllowances || 0,
        LEAVE: record.leaves || 0,
        BONUS: record.bonus || 0,
        'OT AMOUNT': record.overtimeAmount || 0,
        GROSS: (record.basicSalary || 0) + (record.allowances || 0),
        PF: record.providentFund || 0,
        ESIC: record.esic || 0,
        PT: record.professionalTax || 0,
        MLWF: record.mlwf || 0,
        ADVANCE: record.advance || 0,
        'UNI & ID': record.uniformAndId || 0,
        FINE: record.fine || 0,
        DED: record.deductions || 0,
        'OTHER DED': record.otherDeductions || 0,
        NET: record.netSalary || 0,
        'AADHAR': employee.aadharNumber || 'N/A',
        'PAN': employee.panNumber || 'N/A',
        'ESIC NO': employee.esicNumber || 'N/A',
        'UAN': employee.uanNumber || 'N/A'
      };
    });

    // Totals row
    const totals: any = {
      SR: 'TOTAL',
      'BANK AC': '',
      'BANK NAME': '',
      BRANCH: '',
      'IFSC CODE': '',
      NAMES: '',
      G: '',
      MONTH: '',
      DEP: '',
      STATUS: '',
      'IN HAND': exportData.reduce((sum, row) => sum + (row['IN HAND'] || 0), 0),
      DESG: '',
      DAYS: exportData.reduce((sum, row) => sum + (row['DAYS'] || 0), 0),
      OT: exportData.reduce((sum, row) => sum + (row['OT'] || 0), 0),
      BASIC: exportData.reduce((sum, row) => sum + (row['BASIC'] || 0), 0),
      DA: exportData.reduce((sum, row) => sum + (row['DA'] || 0), 0),
      HRA: exportData.reduce((sum, row) => sum + (row['HRA'] || 0), 0),
      OTHER: exportData.reduce((sum, row) => sum + (row['OTHER'] || 0), 0),
      LEAVE: exportData.reduce((sum, row) => sum + (row['LEAVE'] || 0), 0),
      BONUS: exportData.reduce((sum, row) => sum + (row['BONUS'] || 0), 0),
      'OT AMOUNT': exportData.reduce((sum, row) => sum + (row['OT AMOUNT'] || 0), 0),
      GROSS: exportData.reduce((sum, row) => sum + (row['GROSS'] || 0), 0),
      PF: exportData.reduce((sum, row) => sum + (row['PF'] || 0), 0),
      ESIC: exportData.reduce((sum, row) => sum + (row['ESIC'] || 0), 0),
      PT: exportData.reduce((sum, row) => sum + (row['PT'] || 0), 0),
      MLWF: exportData.reduce((sum, row) => sum + (row['MLWF'] || 0), 0),
      ADVANCE: exportData.reduce((sum, row) => sum + (row['ADVANCE'] || 0), 0),
      'UNI & ID': exportData.reduce((sum, row) => sum + (row['UNI & ID'] || 0), 0),
      FINE: exportData.reduce((sum, row) => sum + (row['FINE'] || 0), 0),
      DED: exportData.reduce((sum, row) => sum + (row['DED'] || 0), 0),
      'OTHER DED': exportData.reduce((sum, row) => sum + (row['OTHER DED'] || 0), 0),
      NET: exportData.reduce((sum, row) => sum + (row['NET'] || 0), 0),
      'AADHAR': '',
      'PAN': '',
      'ESIC NO': '',
      'UAN': ''
    };
    const finalData = [...exportData, totals];

    if (format === 'json') {
      res.status(200).json({
        success: true,
        data: finalData,
        count: payrollRecords.length,
        month
      });
    } else {
      // CSV export
      const csvRows = [];
      const headers = Object.keys(finalData[0]);
      csvRows.push(headers.join(','));

      for (const row of finalData) {
        const values = headers.map(header => {
          const value = row[header];
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvRows.push(values.join(','));
      }

      const csvContent = csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payroll-${month}.csv`);
      res.send(csvContent);
    }
  } catch (error: any) {
    console.error('Error exporting payroll data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting payroll data',
      error: error.message
    });
  }
};