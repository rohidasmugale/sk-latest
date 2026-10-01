import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Payroll, { IPayroll } from '../models/Payroll';
import SalaryStructure from '../models/SalaryStructure';
import SalarySlip from '../models/SalarySlip';
import Employee, { IEmployee } from '../models/Employee';
import * as XLSX from 'xlsx';
import Deduction from '../models/Deduction';
import Advance from '../models/Advance';
import { logAudit, getUserFromReq } from '../utils/auditLogger';

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
        return { ...recordObj, employee: null };
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
      return { ...recordObj, employee: employee || null };
    });
  } catch (error) {
    console.error('Error populating employee data:', error);
    return payrollRecords.map(record => {
      const recordObj = record.toObject ? record.toObject() : record;
      return { ...recordObj, employee: null };
    });
  }
};

// Get all payroll records
export const getAllPayroll = async (req: Request, res: Response) => {
  try {
    const {
      page = 1, limit = 100, search = '', month, status,
      department, paymentStatus, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (month) query.month = month;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (search && search !== '') {
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
        return res.status(200).json({
          success: true, data: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 }
        });
      }
    }

    if (department && department !== '') {
      const employees = await Employee.find({
        department: { $regex: department, $options: 'i' }
      }).select('employeeId').lean();

      const employeeIds = employees.map(emp => (emp as any).employeeId);
      if (employeeIds.length > 0) {
        if (query.employeeId && query.employeeId.$in) {
          const intersection = employeeIds.filter(id => query.employeeId.$in.includes(id));
          query.employeeId.$in = intersection;
        } else {
          query.employeeId = { $in: employeeIds };
        }
      } else {
        return res.status(200).json({
          success: true, data: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 }
        });
      }
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const total = await Payroll.countDocuments(query);
    const payroll = await Payroll.find(query).sort(sortOptions).skip(skip).limit(limitNum);
    const populatedPayroll = await populateEmployeeData(payroll);

    const summary = {
      totalAmount: 0, paidAmount: 0, pendingAmount: 0, holdAmount: 0, partPaidAmount: 0,
      processedCount: 0, pendingCount: 0, paidCount: 0, holdCount: 0, partPaidCount: 0,
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
        page: pageNum, limit: limitNum, total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching payroll records:', error);
    res.status(500).json({ success: false, message: 'Error fetching payroll records', error: error.message });
  }
};

// Get payroll by ID
export const getPayrollById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid payroll ID' });
    }
    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }
    const populatedPayroll = await populateEmployeeData([payroll]);
    res.status(200).json({ success: true, data: populatedPayroll[0] });
  } catch (error: any) {
    console.error('Error fetching payroll record:', error);
    res.status(500).json({ success: false, message: 'Error fetching payroll record', error: error.message });
  }
};

// Get payroll by employee ID and month
export const getPayrollByEmployeeAndMonth = async (req: Request, res: Response) => {
  try {
    const { employeeId, month } = req.params;
    const payroll = await Payroll.findOne({ employeeId, month });
    if (!payroll) {
      return res.status(200).json({ success: true, data: null, message: 'Payroll record not found for this employee and month' });
    }
    const populatedPayroll = await populateEmployeeData([payroll]);
    res.status(200).json({ success: true, data: populatedPayroll[0] });
  } catch (error: any) {
    console.error('Error fetching payroll record:', error);
    res.status(500).json({ success: false, message: 'Error fetching payroll record', error: error.message });
  }
};

// Process payroll for an employee
export const processPayroll = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      employeeId, month, presentDays = 0, absentDays = 0, halfDays = 0, leaves = 0,
      totalWorkingDays = 22
    } = req.body;
    const userId = getUserFromReq(req);

    if (!employeeId || !month) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Employee ID and Month are required' });
    }

    const employee = await Employee.findOne({ employeeId }).session(session);
    if (!employee) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const salaryStructure = await SalaryStructure.findOne({ employeeId, isActive: true }).session(session);
    if (!salaryStructure) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Active salary structure not found' });
    }

    const existingPayroll = await Payroll.findOne({ employeeId, month }).session(session);
    if (existingPayroll) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Payroll already processed for this month' });
    }

    // --- Calculate basic salary components ---
    const basicSalary = salaryStructure.basicSalary || 0;
    const dailyRate = totalWorkingDays > 0 ? basicSalary / totalWorkingDays : 0;
    const halfDayRate = dailyRate / 2;
    const earnedBasicSalary = (presentDays * dailyRate) + (halfDays * halfDayRate);
    const salaryLoss = (absentDays * dailyRate) + (leaves * dailyRate);
    const netBasicSalary = Math.max(0, earnedBasicSalary - salaryLoss);

    const totalAllowances =
      (salaryStructure.hra || 0) + (salaryStructure.da || 0) +
      (salaryStructure.specialAllowance || 0) + (salaryStructure.conveyance || 0) +
      (salaryStructure.medicalAllowance || 0) + (salaryStructure.otherAllowances || 0) +
      (salaryStructure.leaveEncashment || 0) + (salaryStructure.arrears || 0);

    const structureDeductions =
      (salaryStructure.providentFund || 0) + (salaryStructure.professionalTax || 0) +
      (salaryStructure.incomeTax || 0) + (salaryStructure.otherDeductions || 0) +
      (salaryStructure.esic || 0) + (salaryStructure.advance || 0) + (salaryStructure.mlwf || 0);

    // --- FETCH FINES / OTHER DEDUCTIONS ---
    const activeDeductions = await Deduction.find({
      employeeId,
      appliedMonth: month,
      status: 'active',
      type: { $in: ['fine', 'other'] }
    }).session(session);

    // --- FETCH SALARY ADVANCES ---
    const activeAdvances = await Advance.find({
      employeeId,
      status: { $in: ['active', 'completed'] },
      remainingAmount: { $gt: 0 }
    }).session(session);

    const deductionItems: Array<{ type: string; amount: number; description: string; id: string }> = [];
    let additionalDeductions = 0;
    const advancesToUpdate: Array<{ advance: any; deductAmount: number }> = [];

    for (const d of activeDeductions) {
      additionalDeductions += d.amount;
      deductionItems.push({
        type: d.type || 'other',
        amount: d.amount,
        description: d.description || '',
        id: String(d._id)
      });
    }

    for (const adv of activeAdvances) {
      let due = 0;
      if (adv.deductionType === 'monthly' && adv.monthlyEMI) {
        due = Math.min(adv.monthlyEMI, adv.remainingAmount);
      } else if (adv.deductionType === 'custom' && adv.customAmount) {
        const monthDate = new Date(`${month}-01`);
        const start = adv.customStartDate ? new Date(adv.customStartDate) : null;
        const end = adv.customEndDate ? new Date(adv.customEndDate) : null;
        if (start && end && monthDate >= start && monthDate <= end) {
          due = Math.min(adv.customAmount, adv.remainingAmount);
        }
      }
      if (due > 0) {
        additionalDeductions += due;
        deductionItems.push({
          type: 'advance',
          amount: due,
          description: `Salary advance EMI (${adv.description || ''})`,
          id: String(adv._id)
        });
        advancesToUpdate.push({ advance: adv, deductAmount: due });
      }
    }

    const finalTotalDeductions = structureDeductions + additionalDeductions;
    const netSalary = Math.max(0, netBasicSalary + totalAllowances - finalTotalDeductions);

    const payrollData: Partial<IPayroll> = {
      employeeId, month,
      basicSalary: netBasicSalary,
      allowances: totalAllowances,
      deductions: finalTotalDeductions,
      netSalary,
      status: 'processed',
      presentDays, absentDays, halfDays, leaves,
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
      deductionBreakdown: { additionalDeductions, items: deductionItems },
      createdBy: userId,
      updatedBy: userId,
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
        monthlySalary: employee.salary
      }
    };

    const payroll = new Payroll(payrollData);
    await payroll.save({ session });

    if (activeDeductions.length > 0) {
      await Deduction.updateMany(
        { _id: { $in: activeDeductions.map(d => d._id) } },
        { $set: { status: 'completed' } },
        { session }
      );
    }

    for (const { advance, deductAmount } of advancesToUpdate) {
      const newRepaid = (advance.repaidAmount || 0) + deductAmount;
      const newRemaining = advance.advanceAmount - newRepaid;
      await Advance.findByIdAndUpdate(
        advance._id,
        {
          $set: {
            repaidAmount: newRepaid,
            remainingAmount: newRemaining,
            status: newRemaining <= 0 ? 'completed' : advance.status,
          }
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    const populatedPayroll = await populateEmployeeData([payroll]);

    await logAudit({
      action: 'payroll.process',
      entity: 'payroll',
      entityId: String(payroll._id),
      month: payroll.month,
      employeeId: payroll.employeeId,
      performedBy: userId,
      description: `Processed payroll for ${payroll.employeeId} (${payroll.month}) — Net ₹${payroll.netSalary}`,
      after: { netSalary: payroll.netSalary, status: payroll.status },
      metadata: { presentDays: payroll.presentDays, absentDays: payroll.absentDays },
    });

    res.status(201).json({
      success: true,
      message: 'Payroll processed successfully',
      data: populatedPayroll[0],
      calculation: {
        netSalary, netBasicSalary, totalAllowances,
        totalDeductions: finalTotalDeductions,
        deductionBreakdown: { additionalDeductions, items: deductionItems }
      }
    });
  } catch (error: any) {
    await session.abortTransaction(); session.endSession();
    console.error('Error processing payroll:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Payroll already exists for this employee and month' });
    }
    res.status(500).json({ success: false, message: 'Error processing payroll', error: error.message });
  }
};

// Bulk process payroll
export const bulkProcessPayroll = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { month, employeeIds, attendanceMap = {} } = req.body;
    const userId = getUserFromReq(req);
    const results = [];
    const errors = [];
    const totalWorkingDays = 22;

    if (!month || !employeeIds || !Array.isArray(employeeIds)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Month and employeeIds array are required' });
    }

    for (const employeeId of employeeIds) {
      try {
        const existingPayroll = await Payroll.findOne({ employeeId, month }).session(session);
        if (existingPayroll) {
          errors.push({ employeeId, error: 'Payroll already exists for this month' });
          continue;
        }

        const employee = await Employee.findOne({ employeeId }).session(session);
        if (!employee) {
          errors.push({ employeeId, error: 'Employee not found' });
          continue;
        }

        const salaryStructure = await SalaryStructure.findOne({ employeeId, isActive: true }).session(session);
        if (!salaryStructure) {
          errors.push({ employeeId, error: 'Active salary structure not found' });
          continue;
        }

        const attendanceData = attendanceMap[employeeId] || { presentDays: 0, absentDays: 0, halfDays: 0, leaves: 0 };
        const { presentDays = 0, absentDays = 0, halfDays = 0, leaves = 0 } = attendanceData;

        const basicSalary = salaryStructure.basicSalary || 0;
        const dailyRate = totalWorkingDays > 0 ? basicSalary / totalWorkingDays : 0;
        const halfDayRate = dailyRate / 2;
        const earnedBasicSalary = (presentDays * dailyRate) + (halfDays * halfDayRate);
        const salaryLoss = (absentDays * dailyRate) + (leaves * dailyRate);
        const netBasicSalary = Math.max(0, earnedBasicSalary - salaryLoss);

        const totalAllowances =
          (salaryStructure.hra || 0) + (salaryStructure.da || 0) +
          (salaryStructure.specialAllowance || 0) + (salaryStructure.conveyance || 0) +
          (salaryStructure.medicalAllowance || 0) + (salaryStructure.otherAllowances || 0) +
          (salaryStructure.leaveEncashment || 0) + (salaryStructure.arrears || 0);

        const structureDeductions =
          (salaryStructure.providentFund || 0) + (salaryStructure.professionalTax || 0) +
          (salaryStructure.incomeTax || 0) + (salaryStructure.otherDeductions || 0) +
          (salaryStructure.esic || 0) + (salaryStructure.advance || 0) + (salaryStructure.mlwf || 0);

        const activeDeductions = await Deduction.find({
          employeeId, appliedMonth: month, status: 'active',
          type: { $in: ['fine', 'other'] }
        }).session(session);

        const activeAdvances = await Advance.find({
          employeeId,
          status: { $in: ['active', 'completed'] },
          remainingAmount: { $gt: 0 }
        }).session(session);

        const deductionItems: Array<{ type: string; amount: number; description: string; id: string }> = [];
        let additionalDeductions = 0;
        const advancesToUpdate: Array<{ advance: any; deductAmount: number }> = [];

        for (const d of activeDeductions) {
          additionalDeductions += d.amount;
          deductionItems.push({ type: d.type || 'other', amount: d.amount, description: d.description || '', id: String(d._id) });
        }

        for (const adv of activeAdvances) {
          let due = 0;
          if (adv.deductionType === 'monthly' && adv.monthlyEMI) {
            due = Math.min(adv.monthlyEMI, adv.remainingAmount);
          } else if (adv.deductionType === 'custom' && adv.customAmount) {
            const monthDate = new Date(`${month}-01`);
            const start = adv.customStartDate ? new Date(adv.customStartDate) : null;
            const end = adv.customEndDate ? new Date(adv.customEndDate) : null;
            if (start && end && monthDate >= start && monthDate <= end) {
              due = Math.min(adv.customAmount, adv.remainingAmount);
            }
          }
          if (due > 0) {
            additionalDeductions += due;
            deductionItems.push({ type: 'advance', amount: due, description: `Salary advance EMI (${adv.description || ''})`, id: String(adv._id) });
            advancesToUpdate.push({ advance: adv, deductAmount: due });
          }
        }

        const finalTotalDeductions = structureDeductions + additionalDeductions;
        const netSalary = Math.max(0, netBasicSalary + totalAllowances - finalTotalDeductions);

        const payrollData: Partial<IPayroll> = {
          employeeId, month,
          basicSalary: netBasicSalary,
          allowances: totalAllowances,
          deductions: finalTotalDeductions,
          netSalary,
          status: 'processed',
          presentDays, absentDays, halfDays, leaves,
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
          deductionBreakdown: { additionalDeductions, items: deductionItems },
          createdBy: userId,
          updatedBy: userId,
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

        if (activeDeductions.length > 0) {
          await Deduction.updateMany(
            { _id: { $in: activeDeductions.map(d => d._id) } },
            { $set: { status: 'completed' } },
            { session }
          );
        }

        for (const { advance, deductAmount } of advancesToUpdate) {
          const newRepaid = (advance.repaidAmount || 0) + deductAmount;
          const newRemaining = advance.advanceAmount - newRepaid;
          await Advance.findByIdAndUpdate(
            advance._id,
            {
              $set: {
                repaidAmount: newRepaid,
                remainingAmount: newRemaining,
                status: newRemaining <= 0 ? 'completed' : advance.status,
              }
            },
            { session }
          );
        }

        results.push({
          employeeId, name: employee.name, netSalary,
          payrollId: payroll._id,
          accountNumber: employee.accountNumber,
          ifscCode: employee.ifscCode
        });

      } catch (error: any) {
        errors.push({ employeeId, error: error.message });
      }
    }

    await session.commitTransaction();
    session.endSession();

    await logAudit({
      action: 'payroll.bulkProcess',
      entity: 'payroll',
      month,
      performedBy: userId,
      description: `Bulk-processed payroll for ${results.length} employees (${month})`,
      metadata: { processed: results.length, failed: errors.length, total: employeeIds.length, month },
    });

    res.status(200).json({
      success: true,
      message: `Payroll processed for ${results.length} employees`,
      results, errors,
      summary: { processed: results.length, failed: errors.length, total: employeeIds.length }
    });
  } catch (error: any) {
    await session.abortTransaction(); session.endSession();
    console.error('Error processing bulk payroll:', error);
    res.status(500).json({ success: false, message: 'Error processing bulk payroll', error: error.message });
  }
};

// Update payment status
export const updatePaymentStatus = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status, paidAmount = 0, notes = '', paymentDate } = req.body;
    const userId = getUserFromReq(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid payroll ID' });
    }

    const payroll = await Payroll.findById(id).session(session);
    if (!payroll) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    const oldStatus = payroll.paymentStatus;
    const oldPaidAmount = payroll.paidAmount;

    const updates: any = { paymentStatus: status, updatedBy: userId, notes: notes || '' };

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

    const updatedPayroll = await Payroll.findByIdAndUpdate(
      id, updates, { new: true, runValidators: true, session }
    );

    if (!updatedPayroll) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Payroll record not found after update' });
    }

    await session.commitTransaction();
    session.endSession();

    await logAudit({
      action: 'payroll.updatePaymentStatus',
      entity: 'payroll',
      entityId: String(updatedPayroll._id),
      month: updatedPayroll.month,
      employeeId: updatedPayroll.employeeId,
      performedBy: userId,
      description: `Payment status → ${updatedPayroll.paymentStatus} on ${updatedPayroll.employeeId} (${updatedPayroll.month})`,
      before: { status: oldStatus, paidAmount: oldPaidAmount },
      after: { status: updatedPayroll.paymentStatus, paidAmount: updatedPayroll.paidAmount },
    });

    const populatedPayroll = await populateEmployeeData([updatedPayroll]);
    res.status(200).json({ success: true, message: 'Payment status updated successfully', data: populatedPayroll[0] });
  } catch (error: any) {
    await session.abortTransaction(); session.endSession();
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, message: 'Error updating payment status', error: error.message });
  }
};

// ─── Delete payroll record (with reversal of consumed deductions/advances) ───
export const deletePayroll = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid payroll ID' });
    }

    const salarySlip = await SalarySlip.findOne({ payrollId: id }).session(session);
    if (salarySlip) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete payroll record with existing salary slip'
      });
    }

    const payroll = await Payroll.findById(id).session(session);
    if (!payroll) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    // ─── REVERSE CONSUMED DEDUCTIONS/ADVANCES ───────────────────────────
    const items = payroll.deductionBreakdown?.items || [];
    for (const item of items) {
      if (item.type === 'fine' || item.type === 'other') {
        await Deduction.findByIdAndUpdate(
          item.id,
          { $set: { status: 'active' } },
          { session }
        );
      } else if (item.type === 'advance') {
        const adv = await Advance.findById(item.id).session(session);
        if (adv) {
          const newRepaid = Math.max(0, (adv.repaidAmount || 0) - item.amount);
          await Advance.findByIdAndUpdate(
            adv._id,
            {
              $set: {
                repaidAmount: newRepaid,
                remainingAmount: adv.advanceAmount - newRepaid,
                status: newRepaid < adv.advanceAmount ? 'active' : adv.status,
              }
            },
            { session }
          );
        }
      }
    }

    await logAudit({
      action: 'payroll.delete',
      entity: 'payroll',
      entityId: String(payroll._id),
      month: payroll.month,
      employeeId: payroll.employeeId,
      performedBy: getUserFromReq(req),
      description: `Deleted payroll for ${payroll.employeeId} (${payroll.month})`,
      before: { netSalary: payroll.netSalary, status: payroll.status, paymentStatus: payroll.paymentStatus },
    });

    await Payroll.findByIdAndDelete(id).session(session);
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Payroll record deleted successfully',
      data: { id }
    });
  } catch (error: any) {
    await session.abortTransaction(); session.endSession();
    console.error('Error deleting payroll record:', error);
    res.status(500).json({ success: false, message: 'Error deleting payroll record', error: error.message });
  }
};

// Get payroll summary
export const getPayrollSummary = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    const query: any = {};
    if (month) query.month = month;

    const payrollRecords = await Payroll.find(query);

    const summary = {
      totalAmount: 0, paidAmount: 0, pendingAmount: 0, holdAmount: 0, partPaidAmount: 0,
      processedCount: 0, pendingCount: 0, paidCount: 0, holdCount: 0, partPaidCount: 0,
      totalEmployees: 0, totalRecords: payrollRecords.length,
      activeEmployees: 0, employeesWithStructure: 0, employeesWithoutStructure: 0,
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

    summary.activeEmployees = await Employee.countDocuments({ status: 'active' });
    summary.employeesWithStructure = await SalaryStructure.countDocuments({ isActive: true });
    summary.employeesWithoutStructure = Math.max(0, summary.activeEmployees - summary.employeesWithStructure);

    res.status(200).json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Error fetching payroll summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching payroll summary', error: error.message });
  }
};

// ─── Export payroll ───
export const exportPayroll = async (req: Request, res: Response) => {
  try {
    const { month, format = 'csv', site } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required for export' });
    }

    const query: any = { month };
    if (site && site !== 'all') {
      const siteEmployees = await Employee.find({
        $or: [{ siteId: site }, { site: site }, { siteName: site }]
      }).select('employeeId').lean();
      const employeeIds = siteEmployees.map(emp => (emp as any).employeeId);
      if (employeeIds.length > 0) {
        query.employeeId = { $in: employeeIds };
      } else {
        return res.status(200).json({ success: true, data: [], message: 'No employees found for this site' });
      }
    }

    const payrollRecords = await Payroll.find(query);
    if (payrollRecords.length === 0) {
      return res.status(404).json({ success: false, message: 'No payroll records found for this month' + (site ? ' and site' : '') });
    }

    const employeeIds = payrollRecords.map(p => p.employeeId);
    const employees = await Employee.find({ employeeId: { $in: employeeIds } }).lean();
    const employeeMap = new Map();
    employees.forEach(emp => { employeeMap.set(emp.employeeId, emp); });

    const validPayrollRecords = payrollRecords.filter(r => employeeMap.has(r.employeeId));
    const orphaned = payrollRecords.filter(r => !employeeMap.has(r.employeeId));
    if (orphaned.length > 0) {
      console.warn(`⚠️ Export: skipping ${orphaned.length} payroll record(s) with no matching employee:`,
        orphaned.map(r => ({ id: r._id, employeeId: r.employeeId, month: r.month })));
    }

    if (validPayrollRecords.length === 0) {
      return res.status(404).json({ success: false, message: 'No valid payroll records found after filtering orphans' });
    }

    const validEmployeeIds = validPayrollRecords.map(p => p.employeeId);
    const salaryStructures = await SalaryStructure.find({ employeeId: { $in: validEmployeeIds }, isActive: true })
      .select('employeeId basicSalary').lean();
    const salaryStructureMap = new Map();
    salaryStructures.forEach(struct => { salaryStructureMap.set(struct.employeeId, struct); });

    if (format === 'client-template') {
      const exportData = validPayrollRecords.map((record, index) => {
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

      const totals: any = {
        SR: 'TOTAL', 'BANK AC': '', BRANCH: '', 'IFSC CODE': '', NAMES: '', SITE: '', DEP: '', STATUS: '',
        PM_SAL: exportData.reduce((s, r) => s + (r.PM_SAL || 0), 0), G: '', DESG: '',
        DAYS: exportData.reduce((s, r) => s + (r.DAYS || 0), 0),
        GROSS: exportData.reduce((s, r) => s + (r.GROSS || 0), 0),
        ADVANCE: exportData.reduce((s, r) => s + (r.ADVANCE || 0), 0),
        'UNIFORM ID': exportData.reduce((s, r) => s + (r['UNIFORM ID'] || 0), 0),
        FINE: exportData.reduce((s, r) => s + (r.FINE || 0), 0),
        DED: exportData.reduce((s, r) => s + (r.DED || 0), 0),
        OTHER: exportData.reduce((s, r) => s + (r.OTHER || 0), 0),
        NET: exportData.reduce((s, r) => s + (r.NET || 0), 0),
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

    const exportData = validPayrollRecords.map((record, index) => {
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

    const totals: any = {
      SR: 'TOTAL', 'BANK AC': '', 'BANK NAME': '', BRANCH: '', 'IFSC CODE': '', NAMES: '', G: '', MONTH: '', DEP: '', STATUS: '',
      'IN HAND': exportData.reduce((s, r) => s + (r['IN HAND'] || 0), 0), DESG: '',
      DAYS: exportData.reduce((s, r) => s + (r['DAYS'] || 0), 0),
      OT: exportData.reduce((s, r) => s + (r['OT'] || 0), 0),
      BASIC: exportData.reduce((s, r) => s + (r['BASIC'] || 0), 0),
      DA: exportData.reduce((s, r) => s + (r['DA'] || 0), 0),
      HRA: exportData.reduce((s, r) => s + (r['HRA'] || 0), 0),
      OTHER: exportData.reduce((s, r) => s + (r['OTHER'] || 0), 0),
      LEAVE: exportData.reduce((s, r) => s + (r['LEAVE'] || 0), 0),
      BONUS: exportData.reduce((s, r) => s + (r['BONUS'] || 0), 0),
      'OT AMOUNT': exportData.reduce((s, r) => s + (r['OT AMOUNT'] || 0), 0),
      GROSS: exportData.reduce((s, r) => s + (r['GROSS'] || 0), 0),
      PF: exportData.reduce((s, r) => s + (r['PF'] || 0), 0),
      ESIC: exportData.reduce((s, r) => s + (r['ESIC'] || 0), 0),
      PT: exportData.reduce((s, r) => s + (r['PT'] || 0), 0),
      MLWF: exportData.reduce((s, r) => s + (r['MLWF'] || 0), 0),
      ADVANCE: exportData.reduce((s, r) => s + (r['ADVANCE'] || 0), 0),
      'UNI & ID': exportData.reduce((s, r) => s + (r['UNI & ID'] || 0), 0),
      FINE: exportData.reduce((s, r) => s + (r['FINE'] || 0), 0),
      DED: exportData.reduce((s, r) => s + (r['DED'] || 0), 0),
      'OTHER DED': exportData.reduce((s, r) => s + (r['OTHER DED'] || 0), 0),
      NET: exportData.reduce((s, r) => s + (r['NET'] || 0), 0),
      'AADHAR': '', 'PAN': '', 'ESIC NO': '', 'UAN': ''
    };
    const finalData = [...exportData, totals];

    if (format === 'json') {
      res.status(200).json({ success: true, data: finalData, count: validPayrollRecords.length, month });
    } else {
      const csvRows = [];
      const headers = Object.keys(finalData[0]);
      csvRows.push(headers.join(','));
      for (const row of finalData) {
        const values = headers.map(header => {
          const value = row[header];
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
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
    res.status(500).json({ success: false, message: 'Error exporting payroll data', error: error.message });
  }
};

// ─── Preview deductions & advances (read-only) ───
export const previewDeductions = async (req: Request, res: Response) => {
  try {
    const { employeeId, month } = req.query;

    if (!employeeId || !month) {
      return res.status(400).json({ success: false, message: 'employeeId and month are required' });
    }

    const deductions = await Deduction.find({
      employeeId,
      appliedMonth: month,
      status: 'active',
      type: { $in: ['fine', 'other'] }
    }).lean();

    const advances = await Advance.find({
      employeeId,
      status: { $in: ['active', 'completed'] },
      remainingAmount: { $gt: 0 }
    }).lean();

    const items: Array<{ type: string; amount: number; description: string; id: string }> = [];
    let totalAdditionalDeductions = 0;

    for (const d of deductions) {
      totalAdditionalDeductions += d.amount;
      items.push({
        type: d.type || 'other',
        amount: d.amount,
        description: d.description || '',
        id: String(d._id)
      });
    }

    for (const adv of advances) {
      let due = 0;
      if (adv.deductionType === 'monthly' && adv.monthlyEMI) {
        due = Math.min(adv.monthlyEMI, adv.remainingAmount);
      } else if (adv.deductionType === 'custom' && adv.customAmount) {
        const monthDate = new Date(`${month}-01`);
        const start = adv.customStartDate ? new Date(adv.customStartDate) : null;
        const end = adv.customEndDate ? new Date(adv.customEndDate) : null;
        if (start && end && monthDate >= start && monthDate <= end) {
          due = Math.min(adv.customAmount, adv.remainingAmount);
        }
      }
      if (due > 0) {
        totalAdditionalDeductions += due;
        items.push({
          type: 'advance',
          amount: due,
          description: `Salary advance EMI (${adv.description || ''})`,
          id: String(adv._id)
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { additionalDeductions: totalAdditionalDeductions, items }
    });
  } catch (error: any) {
    console.error('Error previewing deductions:', error);
    res.status(500).json({ success: false, message: 'Error previewing deductions', error: error.message });
  }
};

export const updatePayrollNotes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid payroll ID' });
    }

    const existing = await Payroll.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }
    const oldNotes = existing.notes;

    const payroll = await Payroll.findByIdAndUpdate(
      id,
      { $set: { notes: notes || '', updatedAt: new Date() } },
      { new: true, runValidators: true }
    );

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    await logAudit({
      action: 'payroll.updateNotes',
      entity: 'payroll',
      entityId: String(payroll._id),
      month: payroll.month,
      employeeId: payroll.employeeId,
      performedBy: getUserFromReq(req),
      description: `Notes updated on ${payroll.employeeId} (${payroll.month})`,
      before: { notes: oldNotes },
      after: { notes: payroll.notes },
    });

    res.json({ success: true, message: 'Notes updated', data: payroll });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADD MANUAL ADJUSTMENT ─────────────────────────────────────────
export const adjustPayroll = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    const userId = getUserFromReq(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid payroll ID' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Amount must be non-zero' });
    }

   if (!reason || reason.trim().length < 3) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Reason is required (min 3 characters)' });
    }

    const payroll = await Payroll.findById(id).session(session);
    if (!payroll) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }
    const oldNetSalary = payroll.netSalary;

    // Append the adjustment
    const newAdjustment = {
      amount: numericAmount,
      reason: reason.trim(),
      adjustedBy: userId,
      adjustedAt: new Date(),
    };

    if (!payroll.manualAdjustments) payroll.manualAdjustments = [];
    payroll.manualAdjustments.push(newAdjustment);

    // Recalculate net salary
    const totalAdjustments = payroll.manualAdjustments.reduce(
      (sum, a) => sum + (a.amount || 0),
      0
    );
    const recomputedNet =
      (payroll.basicSalary || 0) +
      (payroll.allowances || 0) -
      (payroll.deductions || 0) +
      totalAdjustments;

    payroll.netSalary = Math.max(0, recomputedNet);
    payroll.updatedBy = userId;
    await payroll.save({ session });

    await session.commitTransaction();
    session.endSession();

    await logAudit({
      action: 'payroll.adjust',
      entity: 'payroll',
      entityId: String(payroll._id),
      month: payroll.month,
      employeeId: payroll.employeeId,
      performedBy: userId,
      description: `Adjustment ${numericAmount >= 0 ? '+' : ''}₹${numericAmount} on ${payroll.employeeId} (${payroll.month}) — ${reason.trim()}`,
      before: { netSalary: oldNetSalary },
      after: { netSalary: payroll.netSalary },
      metadata: { amount: numericAmount, reason: reason.trim() },
    });

    // Populate response
    const populated = await populateEmployeeData([payroll]);

    res.status(200).json({
      success: true,
      message: 'Adjustment added successfully',
      data: populated[0],
      totalAdjustments,
      newNetSalary: payroll.netSalary,
    });
  } catch (error: any) {
    await session.abortTransaction(); session.endSession();
    console.error('Error adding adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding adjustment',
      error: error.message,
    });
  }
};

// ─── REMOVE MANUAL ADJUSTMENT ───────────────────────────────────────
export const removeAdjustment = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id, adjustmentIndex } = req.params;
    const userId = getUserFromReq(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid payroll ID' });
    }

    const payroll = await Payroll.findById(id).session(session);
    if (!payroll) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ success: false, message: 'Payroll not found' });
    }

    const idx = parseInt(adjustmentIndex);
    if (isNaN(idx) || idx < 0 || idx >= (payroll.manualAdjustments?.length || 0)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid adjustment index' });
    }

    const oldNetSalary = payroll.netSalary;
    const removed = payroll.manualAdjustments[idx];

    payroll.manualAdjustments.splice(idx, 1);

    const totalAdjustments = payroll.manualAdjustments.reduce(
      (sum, a) => sum + (a.amount || 0),
      0
    );
    payroll.netSalary = Math.max(
      0,
      (payroll.basicSalary || 0) +
        (payroll.allowances || 0) -
        (payroll.deductions || 0) +
        totalAdjustments
    );
    payroll.updatedBy = userId;
    await payroll.save({ session });

    await session.commitTransaction();
    session.endSession();

    await logAudit({
      action: 'payroll.removeAdjustment',
      entity: 'payroll',
      entityId: String(payroll._id),
      month: payroll.month,
      employeeId: payroll.employeeId,
      performedBy: userId,
      description: `Removed adjustment ₹${removed.amount} on ${payroll.employeeId} (${payroll.month}) — was: ${removed.reason}`,
      before: { netSalary: oldNetSalary, adjustment: removed },
      after: { netSalary: payroll.netSalary },
    });

    const populated = await populateEmployeeData([payroll]);

    res.status(200).json({
      success: true,
      message: 'Adjustment removed',
      data: populated[0],
    });
  } catch (error: any) {
    await session.abortTransaction(); session.endSession();
    console.error('Error removing adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing adjustment',
      error: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════════

// ─── BULK DELETE PAYROLL ────────────────────────────────────────────
export const bulkDeletePayroll = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { ids, reason } = req.body;
    const userId = getUserFromReq(req);

    if (!Array.isArray(ids) || ids.length === 0) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'ids array is required' });
    }

    const results: { deleted: number; skipped: any[]; errors: any[] } = {
      deleted: 0, skipped: [], errors: [],
    };

    for (const id of ids) {
      try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          results.errors.push({ id, error: 'Invalid ID' });
          continue;
        }

        // Skip if salary slip exists
        const slip = await SalarySlip.findOne({ payrollId: id }).session(session);
        if (slip) {
          results.skipped.push({ id, reason: 'Salary slip exists' });
          continue;
        }

        const payroll = await Payroll.findById(id).session(session);
        if (!payroll) {
          results.skipped.push({ id, reason: 'Not found' });
          continue;
        }

        // Reverse consumed deductions/advances (same as single delete)
        const items = payroll.deductionBreakdown?.items || [];
        for (const item of items) {
          if (item.type === 'fine' || item.type === 'other') {
            await Deduction.findByIdAndUpdate(
              item.id,
              { $set: { status: 'active' } },
              { session }
            );
          } else if (item.type === 'advance') {
            const adv = await Advance.findById(item.id).session(session);
            if (adv) {
              const newRepaid = Math.max(0, (adv.repaidAmount || 0) - item.amount);
              await Advance.findByIdAndUpdate(
                adv._id,
                {
                  $set: {
                    repaidAmount: newRepaid,
                    remainingAmount: adv.advanceAmount - newRepaid,
                    status: newRepaid < adv.advanceAmount ? 'active' : adv.status,
                  }
                },
                { session }
              );
            }
          }
        }

        await Payroll.findByIdAndDelete(id).session(session);
        results.deleted++;
      } catch (err: any) {
        results.errors.push({ id, error: err.message });
      }
    }

    await session.commitTransaction();
    session.endSession();

    await logAudit({
      action: 'payroll.bulkDelete',
      entity: 'payroll',
      performedBy: userId,
      description: `Bulk-deleted ${results.deleted} payroll record(s)${reason ? ` — ${reason}` : ''}`,
      metadata: {
        deleted: results.deleted,
        skipped: results.skipped.length,
        failed: results.errors.length,
        reason: reason || '',
      },
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${results.deleted} record(s)`,
      data: results,
    });
  } catch (error: any) {
    await session.abortTransaction(); session.endSession();
    console.error('Error bulk deleting payroll:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── BULK UPDATE PAYMENT STATUS ─────────────────────────────────────
export const bulkUpdatePaymentStatus = async (req: Request, res: Response) => {
  try {
    const { ids, status, paymentDate, notes } = req.body;
    const userId = getUserFromReq(req);

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array is required' });
    }
    if (!['paid', 'hold', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'status must be one of: paid, hold, pending',
      });
    }

    const dateToUse = paymentDate ? new Date(paymentDate) : new Date();
    let updated = 0;

    const payrolls = await Payroll.find({ _id: { $in: ids } });

    for (const p of payrolls) {
      const updates: any = {
        paymentStatus: status,
        updatedBy: userId,
        notes: notes !== undefined ? notes : p.notes,
      };

      if (status === 'paid') {
        updates.paidAmount = p.netSalary;
        updates.paymentDate = dateToUse;
        updates.status = 'paid';
      } else if (status === 'hold') {
        updates.paidAmount = 0;
        updates.paymentDate = null;
        updates.status = 'hold';
      } else if (status === 'pending') {
        updates.paidAmount = 0;
        updates.paymentDate = null;
        updates.status = 'pending';
      }

      await Payroll.findByIdAndUpdate(p._id, updates, { runValidators: true });
      updated++;
    }

    await logAudit({
      action: 'payroll.bulkUpdatePaymentStatus',
      entity: 'payroll',
      performedBy: userId,
      description: `Bulk-updated payment status to "${status}" for ${updated} record(s)`,
      metadata: {
        status,
        count: updated,
        paymentDate: status === 'paid' ? dateToUse : null,
      },
    });

    res.status(200).json({
      success: true,
      message: `Updated ${updated} record(s) to "${status}"`,
      data: { updated },
    });
  } catch (error: any) {
    console.error('Error bulk updating payment status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── BULK GENERATE SALARY SLIPS ─────────────────────────────────────
export const bulkGenerateSlips = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    const userId = getUserFromReq(req);

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array is required' });
    }

    const results: { generated: number; skipped: any[]; errors: any[]; slipIds: string[] } = {
      generated: 0, skipped: [], errors: [], slipIds: [],
    };

    for (const payrollId of ids) {
      try {
        if (!mongoose.Types.ObjectId.isValid(payrollId)) {
          results.errors.push({ id: payrollId, error: 'Invalid ID' });
          continue;
        }

        const payroll = await Payroll.findById(payrollId);
        if (!payroll) {
          results.skipped.push({ id: payrollId, reason: 'Payroll not found' });
          continue;
        }

        const existing = await SalarySlip.findOne({ payrollId });
        if (existing) {
          results.skipped.push({ id: payrollId, reason: 'Slip exists' });
          continue;
        }

        // Reuse slip-number logic (per-month counter)
        const year = new Date().getFullYear();
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const lastSlip = await SalarySlip.findOne({
          slipNumber: new RegExp(`^SS/${year}/${month}/`),
        }).sort({ createdAt: -1 });

        let sequence = 1;
        if (lastSlip?.slipNumber) {
          const m = lastSlip.slipNumber.match(/SS\/\d{4}\/\d{2}\/(\d+)/);
          if (m && m[1]) sequence = parseInt(m[1]) + 1;
        }
        const slipNumber = `SS/${year}/${month}/${sequence.toString().padStart(4, '0')}`;

        const slip = new SalarySlip({
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
        });
        await slip.save();

        results.generated++;
        results.slipIds.push(String(slip._id));
      } catch (err: any) {
        results.errors.push({ id: payrollId, error: err.message });
      }
    }

    await logAudit({
      action: 'payroll.bulkGenerateSlips',
      entity: 'payroll',
      performedBy: userId,
      description: `Bulk-generated ${results.generated} salary slip(s)`,
      metadata: {
        generated: results.generated,
        skipped: results.skipped.length,
        failed: results.errors.length,
      },
    });

    res.status(200).json({
      success: true,
      message: `Generated ${results.generated} slip(s)`,
      data: results,
    });
  } catch (error: any) {
    console.error('Error bulk generating slips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};