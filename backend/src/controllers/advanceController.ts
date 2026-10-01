// backend/src/controllers/advanceController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Advance, { IAdvance } from '../models/Advance';
import Employee from '../models/Employee';

class AdvanceController {
  // Create new advance
  async createAdvance(req: Request, res: Response) {
    try {
      const {
        employeeId,
        employeeName,
        employeeCode,
        advanceAmount,
        paymentDate,
        deductionType,
        monthlyEMI,
        customAmount,
        customStartDate,
        customEndDate,
        description,
        appliedMonth,
        status
      } = req.body;

      // Validate required fields
      if (!employeeId || !advanceAmount || !paymentDate || !deductionType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: employeeId, advanceAmount, paymentDate, deductionType'
        });
      }

      // Validate advance amount
      const parsedAmount = parseFloat(advanceAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Advance amount must be a positive number'
        });
      }

      // Check if employee exists
      let employee = await Employee.findOne({ employeeId });
      if (!employee) {
        // If employee not found by employeeId, try by _id
        if (mongoose.Types.ObjectId.isValid(employeeId)) {
          employee = await Employee.findById(employeeId);
        }
      }

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found with the provided employee ID'
        });
      }

      // Validate deduction type specific fields
      if (deductionType === 'monthly') {
        if (!monthlyEMI || parseFloat(monthlyEMI) <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Monthly EMI is required and must be greater than 0 for monthly deduction type'
          });
        }
      } else if (deductionType === 'custom') {
        if (!customAmount || parseFloat(customAmount) <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Custom amount is required and must be greater than 0 for custom deduction type'
          });
        }
        if (!customStartDate || !customEndDate) {
          return res.status(400).json({
            success: false,
            message: 'Custom start date and end date are required for custom deduction type'
          });
        }
      }

      // Prepare advance data
      const advanceData: Partial<IAdvance> = {
        employeeId: employee.employeeId,
        employeeName: employee.name,
        employeeCode: employee.employeeId,
        advanceAmount: parsedAmount,
        paymentDate: new Date(paymentDate),
        deductionType,
        appliedMonth: appliedMonth || new Date().toISOString().slice(0, 7),
        status: status || 'active',
        repaidAmount: 0,
        remainingAmount: parsedAmount
      };

      // Add optional fields
      if (description) advanceData.description = description;
      
      // Add deduction type specific fields
      if (deductionType === 'monthly') {
        advanceData.monthlyEMI = parseFloat(monthlyEMI);
      } else if (deductionType === 'custom') {
        advanceData.customAmount = parseFloat(customAmount);
        advanceData.customStartDate = new Date(customStartDate);
        advanceData.customEndDate = new Date(customEndDate);
      }

      // Create new advance
      const advance = new Advance(advanceData);
      await advance.save();

      res.status(201).json({
        success: true,
        message: 'Salary advance created successfully',
        data: advance
      });

    } catch (error: any) {
      console.error('Error creating advance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error creating salary advance'
      });
    }
  }

  // Get all advances with pagination and filters
  async getAllAdvances(req: Request, res: Response) {
    try {
      const {
        page = '1',
        limit = '10',
        status,
        deductionType,
        employeeId,
        search,
        startDate,
        endDate,
        appliedMonth
      } = req.query;

      const query: any = {};

      // Apply filters
      if (status && status !== 'all') query.status = status;
      if (deductionType && deductionType !== 'all') query.deductionType = deductionType;
      if (employeeId) query.employeeId = employeeId;
      if (appliedMonth) query.appliedMonth = appliedMonth;

      // Date range filter for payment date
      if (startDate || endDate) {
        query.paymentDate = {};
        if (startDate) query.paymentDate.$gte = new Date(startDate as string);
        if (endDate) query.paymentDate.$lte = new Date(endDate as string);
      }

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;

      // Build aggregation pipeline
      const pipeline: any[] = [
        { $match: query },
        {
          $lookup: {
            from: 'employees',
            localField: 'employeeId',
            foreignField: 'employeeId',
            as: 'employeeDetails'
          }
        },
        {
          $unwind: {
            path: '$employeeDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            employeeName: '$employeeDetails.name',
            employeeCode: '$employeeDetails.employeeId',
            department: '$employeeDetails.department',
            position: '$employeeDetails.position'
          }
        },
        { $sort: { createdAt: -1 } }
      ];

      // Add search filtering if search term exists
      const searchTerm = search as string;
      if (searchTerm) {
        pipeline.push({
          $match: {
            $or: [
              { employeeName: { $regex: searchTerm, $options: 'i' } },
              { employeeCode: { $regex: searchTerm, $options: 'i' } },
              { description: { $regex: searchTerm, $options: 'i' } }
            ]
          }
        });
      }

      // Clone pipeline for counting
      const countPipeline = [...pipeline];
      countPipeline.push({ $count: 'total' });

      // Add pagination to main pipeline
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limitNum });

      // Execute both queries in parallel
      const [advances, countResult] = await Promise.all([
        Advance.aggregate(pipeline),
        Advance.aggregate(countPipeline)
      ]);

      const total = countResult[0]?.total || 0;

      res.status(200).json({
        success: true,
        data: advances,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        }
      });

    } catch (error: any) {
      console.error('Error fetching advances:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching salary advances'
      });
    }
  }

  // Get advance by ID
  async getAdvanceById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid advance ID format'
        });
      }

      const advance = await Advance.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(id) }
        },
        {
          $lookup: {
            from: 'employees',
            localField: 'employeeId',
            foreignField: 'employeeId',
            as: 'employeeDetails'
          }
        },
        {
          $unwind: {
            path: '$employeeDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            employeeName: '$employeeDetails.name',
            employeeCode: '$employeeDetails.employeeId',
            department: '$employeeDetails.department',
            position: '$employeeDetails.position'
          }
        }
      ]);

      if (!advance || advance.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Advance not found'
        });
      }

      res.status(200).json({
        success: true,
        data: advance[0]
      });

    } catch (error: any) {
      console.error('Error fetching advance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching advance'
      });
    }
  }

  // Update advance
  async updateAdvance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid advance ID format'
        });
      }

      const existingAdvance = await Advance.findById(id);
      if (!existingAdvance) {
        return res.status(404).json({
          success: false,
          message: 'Advance not found'
        });
      }

      // Convert numeric fields
      if (updateData.advanceAmount) updateData.advanceAmount = parseFloat(updateData.advanceAmount);
      if (updateData.monthlyEMI) updateData.monthlyEMI = parseFloat(updateData.monthlyEMI);
      if (updateData.customAmount) updateData.customAmount = parseFloat(updateData.customAmount);
      if (updateData.paymentDate) updateData.paymentDate = new Date(updateData.paymentDate);
      if (updateData.customStartDate) updateData.customStartDate = new Date(updateData.customStartDate);
      if (updateData.customEndDate) updateData.customEndDate = new Date(updateData.customEndDate);

      // Update advance
      const advance = await Advance.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Advance updated successfully',
        data: advance
      });

    } catch (error: any) {
      console.error('Error updating advance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating advance'
      });
    }
  }

  // Update advance repayment
  async updateAdvanceRepayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { repaidAmount, nextInstallmentDate } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid advance ID format'
        });
      }

      const advance = await Advance.findById(id);
      if (!advance) {
        return res.status(404).json({
          success: false,
          message: 'Advance not found'
        });
      }

      const newRepaidAmount = (advance.repaidAmount || 0) + parseFloat(repaidAmount);
      const newRemainingAmount = advance.advanceAmount - newRepaidAmount;

      advance.repaidAmount = newRepaidAmount;
      advance.remainingAmount = newRemainingAmount;
      
      if (nextInstallmentDate) {
        advance.nextInstallmentDate = new Date(nextInstallmentDate);
      }

      // Update status if fully repaid
      if (newRemainingAmount <= 0) {
        advance.status = 'completed';
      }

      await advance.save();

      res.status(200).json({
        success: true,
        message: 'Advance repayment updated successfully',
        data: advance
      });

    } catch (error: any) {
      console.error('Error updating advance repayment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating advance repayment'
      });
    }
  }

  // Delete advance
  async deleteAdvance(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid advance ID format'
        });
      }

      const advance = await Advance.findByIdAndDelete(id);

      if (!advance) {
        return res.status(404).json({
          success: false,
          message: 'Advance not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Advance deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting advance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting advance'
      });
    }
  }

  // Get employee advances
  async getEmployeeAdvances(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { status, page = '1', limit = '10' } = req.query;

      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      const query: any = { employeeId };
      if (status && status !== 'all') query.status = status;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;

      const total = await Advance.countDocuments(query);
     const advances = await Advance.find(query)
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limitNum)
  .lean();

      res.status(200).json({
        success: true,
        data: advances,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        }
      });

    } catch (error: any) {
      console.error('Error fetching employee advances:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching employee advances'
      });
    }
  }

  // Get advances summary
  // Get advances summary
  async getAdvancesSummary(req: Request, res: Response) {
    try {
      const { appliedMonth, employeeId } = req.query;

      const query: any = {};
      if (appliedMonth) query.appliedMonth = appliedMonth;
      if (employeeId) query.employeeId = employeeId;

      // Aggregate totals — Mongo does the math
      const summaryAgg = await Advance.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAdvanceAmount: { $sum: '$advanceAmount' },
            totalRepaidAmount: { $sum: { $ifNull: ['$repaidAmount', 0] } },
            totalRemainingAmount: { $sum: { $ifNull: ['$remainingAmount', 0] } },
            totalAdvances: { $sum: 1 },
            activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]);

      // Default zeros if no records match
      const totals = summaryAgg[0] || {
        totalAdvanceAmount: 0,
        totalRepaidAmount: 0,
        totalRemainingAmount: 0,
        totalAdvances: 0,
        activeCount: 0,
        completedCount: 0,
        cancelledCount: 0,
      };

      // Monthly breakdown — aggregate in Mongo, not JS
      const monthlyAgg = await Advance.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$appliedMonth',
            totalAmount: { $sum: '$advanceAmount' },
            count: { $sum: 1 },
            repaidAmount: { $sum: { $ifNull: ['$repaidAmount', 0] } },
            remainingAmount: { $sum: { $ifNull: ['$remainingAmount', 0] } },
          },
        },
      ]);

      const monthlyBreakdown: any = {};
      monthlyAgg.forEach((m) => {
        if (!m._id) return;
        monthlyBreakdown[m._id] = {
          totalAmount: m.totalAmount,
          count: m.count,
          repaidAmount: m.repaidAmount,
          remainingAmount: m.remainingAmount,
        };
      });

      // Type breakdown — aggregate in Mongo
      const typeAgg = await Advance.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$deductionType',
            count: { $sum: 1 },
            totalAmount: { $sum: '$advanceAmount' },
          },
        },
      ]);

      const typeBreakdown = {
        monthly: { count: 0, totalAmount: 0 },
        custom: { count: 0, totalAmount: 0 },
      };
      typeAgg.forEach((t) => {
        if (t._id === 'monthly') {
          typeBreakdown.monthly = { count: t.count, totalAmount: t.totalAmount };
        } else if (t._id === 'custom') {
          typeBreakdown.custom = { count: t.count, totalAmount: t.totalAmount };
        }
      });

      res.status(200).json({
        success: true,
        data: {
          totalAdvanceAmount: totals.totalAdvanceAmount,
          totalRepaidAmount: totals.totalRepaidAmount,
          totalRemainingAmount: totals.totalRemainingAmount,
          totalAdvances: totals.totalAdvances,
          activeCount: totals.activeCount,
          completedCount: totals.completedCount,
          cancelledCount: totals.cancelledCount,
          monthlyBreakdown,
          typeBreakdown,
        },
      });

    } catch (error: any) {
      console.error('Error fetching advances summary:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching advances summary',
      });
    }
  }
}

export default new AdvanceController();
