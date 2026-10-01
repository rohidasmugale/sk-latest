import { Request, Response } from 'express';
import mongoose from 'mongoose';
import SalarySlip from '../models/SalarySlip';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';
import SalaryStructure from '../models/SalaryStructure';
import { logAudit, getUserFromReq } from '../utils/auditLogger';

// Get logged-in user's own salary slip
export const getMySalarySlip = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id; // assuming you attach user from auth middleware
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }

    // Find employee by userId (assuming Employee model has userId field)
    const employee = await Employee.findOne({ userId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const slip = await SalarySlip.findOne({ employeeId: employee.employeeId, month });
    if (!slip) {
      return res.status(404).json({ success: false, message: 'No salary slip found for this month' });
    }

    // Return slip or generate download URL
    // You can return the slip data and let frontend generate a PDF, or return a download URL
    return res.status(200).json({ success: true, data: slip });
  } catch (error) {
   return res.status(500).json({ success: false, message: (error as any).message });
  }
};

// Get salary slip for an employee (supervisor only)
export const getEmployeeSalarySlip = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query;
    const supervisorId = (req as any).user?.id;

    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }

    // Verify supervisor can access this employee
    // Option 1: Check if this employee is under the supervisor (via attendance, tasks, or a supervisor field)
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check if supervisor has access (e.g., employee.supervisorId === supervisorId)
    if (employee.supervisorId?.toString() !== supervisorId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const slip = await SalarySlip.findOne({ employeeId, month });
    if (!slip) {
      return res.status(404).json({ success: false, message: 'No salary slip found for this employee' });
    }

    return res.status(200).json({ success: true, data: slip });
  } catch (error) {
    return res.status(500).json({ success: false, message: (error as any).message });
  }
};
// Generate salary slip
export const generateSalarySlip = async (req: Request, res: Response) => {
  try {
    const { payrollId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(payrollId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payroll ID'
      });
    }

    // Check if payroll exists
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    // Check if salary slip already exists
    const existingSlip = await SalarySlip.findOne({ payrollId });
    if (existingSlip) {
      return res.status(400).json({
        success: false,
        message: 'Salary slip already exists for this payroll',
        data: existingSlip
      });
    }

    // Get employee details
    const employee = await Employee.findOne({ employeeId: payroll.employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Generate slip number
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

    const lastSlip = await SalarySlip.findOne({
      slipNumber: new RegExp(`^SS/${year}/${month}/`)
    }).sort({ createdAt: -1 });

    let sequence = 1;
    if (lastSlip && lastSlip.slipNumber) {
      const matches = lastSlip.slipNumber.match(/SS\/\d{4}\/\d{2}\/(\d+)/);
      if (matches && matches[1]) {
        sequence = parseInt(matches[1]) + 1;
      }
    }

    const slipNumber = `SS/${year}/${month}/${sequence.toString().padStart(4, '0')}`;

    // Create salary slip
   const salarySlipData = {
  payrollId,
  employeeId: payroll.employeeId,
  month: payroll.month,
  basicSalary: payroll.basicSalary,
  allowances: payroll.allowances,
  deductions: payroll.deductions,
  netSalary: payroll.netSalary,
  generatedDate: new Date(),
  presentDays: payroll.presentDays,
  absentDays: payroll.absentDays,
  halfDays: payroll.halfDays,
  leaves: payroll.leaves,
  slipNumber,
  // Optional extras (only if the SalarySlip model has these fields):
  // deductionBreakdown: payroll.deductionBreakdown,
};

    const salarySlip = new SalarySlip(salarySlipData);
    await salarySlip.save();

    // Populate employee data
    const populatedSlip = await SalarySlip.findById(salarySlip._id);

    await logAudit({
      action: 'slip.generate',
      entity: 'salarySlip',
      entityId: String(salarySlip._id),
      month: salarySlip.month,
      employeeId: salarySlip.employeeId,
      performedBy: getUserFromReq(req),
      description: `Generated salary slip for ${salarySlip.employeeId} (${salarySlip.month})`,
      metadata: { slipNumber: salarySlip.slipNumber, netSalary: salarySlip.netSalary },
    });

    res.status(201).json({
      success: true,
      message: 'Salary slip generated successfully',
      data: populatedSlip
    });
  } catch (error: any) {
    console.error('Error generating salary slip:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating salary slip',
      error: error.message
    });
  }
};

// Get all salary slips
// salarySlipController.ts
export const getAllSalarySlips = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { page = 1, limit = 100, month, employeeId, emailSent } = req.query;

    // Build query
    const query: any = {};
    if (month) query.month = month;
    if (employeeId) query.employeeId = employeeId;
    if (emailSent !== undefined) query.emailSent = emailSent === 'true';

    // --- PERMISSION CHECK ---
    // Get the logged-in user's employee record
    const currentEmployee = await Employee.findOne({ userId: user.id });
    if (!currentEmployee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    // If the user is not admin, restrict access
    if (user.role !== 'admin') {
      // If employeeId is not provided, default to their own
      if (!employeeId) {
        query.employeeId = currentEmployee.employeeId;
      } else if (user.role === 'supervisor') {
        // Supervisor can access their own OR their team members
        if (employeeId !== currentEmployee.employeeId) {
          // Check if this employee is under this supervisor
          const targetEmployee = await Employee.findOne({ employeeId });
          if (!targetEmployee || targetEmployee.supervisorId?.toString() !== user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
          }
        }
      } else {
        // Regular employee can only access their own
        if (employeeId !== currentEmployee.employeeId) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const salarySlips = await SalarySlip.find(query)
      .sort({ generatedDate: -1 })
      .skip(skip)
      .limit(limitNum);
    const total = await SalarySlip.countDocuments(query);

    res.status(200).json({
      success: true,
      data: salarySlips,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as any).message });
  }
};

// Get salary slip by ID
export const getSalarySlipById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid salary slip ID'
      });
    }

    const salarySlip = await SalarySlip.findById(id);

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: 'Salary slip not found'
      });
    }

    res.status(200).json({
      success: true,
      data: salarySlip
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching salary slip',
      error: error.message
    });
  }
};

// Get salary slip by employee and month
export const getSalarySlipByEmployeeAndMonth = async (req: Request, res: Response) => {
  try {
    const { employeeId, month } = req.params;

    const salarySlip = await SalarySlip.findOne({ employeeId, month });

    if (!salarySlip) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Salary slip not found'
      });
    }

    res.status(200).json({
      success: true,
      data: salarySlip
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching salary slip',
      error: error.message
    });
  }
};

// Mark salary slip as emailed
export const markAsEmailed = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid salary slip ID'
      });
    }

    const salarySlip = await SalarySlip.findByIdAndUpdate(
      id,
      {
        emailSent: true,
        emailSentAt: new Date(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: 'Salary slip not found'
      });
    }

    await logAudit({
      action: 'slip.send',
      entity: 'salarySlip',
      entityId: String(salarySlip._id),
      month: salarySlip.month,
      employeeId: salarySlip.employeeId,
      performedBy: getUserFromReq(req),
      description: `Marked slip as emailed for ${salarySlip.employeeId} (${salarySlip.month})`,
    });

    res.status(200).json({
      success: true,
      message: 'Salary slip marked as emailed',
      data: salarySlip
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating salary slip',
      error: error.message
    });
  }
};

// Delete salary slip
export const deleteSalarySlip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid salary slip ID'
      });
    }

    const salarySlip = await SalarySlip.findByIdAndDelete(id);

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: 'Salary slip not found'
      });
    }

    await logAudit({
      action: 'slip.delete',
      entity: 'salarySlip',
      entityId: String(salarySlip._id),
      month: salarySlip.month,
      employeeId: salarySlip.employeeId,
      performedBy: getUserFromReq(req),
      description: `Deleted salary slip for ${salarySlip.employeeId} (${salarySlip.month})`,
      before: { slipNumber: salarySlip.slipNumber, netSalary: salarySlip.netSalary },
    });

    res.status(200).json({
      success: true,
      message: 'Salary slip deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting salary slip',
      error: error.message
    });
  }
};

// Update salary slip
export const updateSalarySlip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid salary slip ID'
      });
    }

    // Remove immutable fields
    delete updates._id;
    delete updates.slipNumber;
    delete updates.payrollId;
    delete updates.employeeId;
    delete updates.month;
    delete updates.createdAt;

    const salarySlip = await SalarySlip.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: 'Salary slip not found'
      });
    }

    await logAudit({
      action: 'slip.update',
      entity: 'salarySlip',
      entityId: String(salarySlip._id),
      month: salarySlip.month,
      employeeId: salarySlip.employeeId,
      performedBy: getUserFromReq(req),
      description: `Updated salary slip for ${salarySlip.employeeId} (${salarySlip.month})`,
    });

    res.status(200).json({
      success: true,
      message: 'Salary slip updated successfully',
      data: salarySlip
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating salary slip',
      error: error.message
    });
  }
};