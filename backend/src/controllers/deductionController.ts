// backend/src/controllers/deductionController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Deduction, { IDeduction } from '../models/Deduction';
import Employee from '../models/Employee';

class DeductionController {
  // Get all deductions with pagination and filters (excludes advances)
  async getAllDeductions(req: Request, res: Response) {
    try {
      const { 
        page = '1', 
        limit = '10', 
        status, 
        type, 
        employeeId, 
        search,
        startDate,
        endDate 
      } = req.query;
      
      const query: any = {};
      
      // Apply filters - exclude advances
      if (status && status !== 'all') query.status = status;
      if (type && type !== 'all') query.type = type;
      if (employeeId) query.employeeId = employeeId;
      
      // Date range filter
      if (startDate || endDate) {
        query.deductionDate = {};
        if (startDate) query.deductionDate.$gte = new Date(startDate as string);
        if (endDate) query.deductionDate.$lte = new Date(endDate as string);
      }
      
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;
      
      // Build aggregation pipeline
      const pipeline: any[] = [
        {
          $match: query
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
            employeeCode: '$employeeDetails.employeeId'
          }
        },
        {
          $sort: { createdAt: -1 }
        }
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
      const [deductions, countResult] = await Promise.all([
        Deduction.aggregate(pipeline),
        Deduction.aggregate(countPipeline)
      ]);
      
      const total = countResult[0]?.total || 0;
      
      res.status(200).json({
        success: true,
        data: deductions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        }
      });
      
    } catch (error: any) {
      console.error('Error fetching deductions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching deductions'
      });
    }
  }

  // Get deduction by ID
  async getDeductionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deduction ID format'
        });
      }
      
      const deduction = await Deduction.aggregate([
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
            employeeCode: '$employeeDetails.employeeId'
          }
        }
      ]);

      if (!deduction || deduction.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Deduction not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: deduction[0]
      });
      
    } catch (error: any) {
      console.error('Error fetching deduction:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching deduction'
      });
    }
  }

  // Create new deduction (non-advance)
  async createDeduction(req: Request, res: Response) {
    try {
      const {
        employeeId,
        type,
        amount,
        description,
        deductionDate,
        status,
        repaymentMonths,
        fineAmount,
        appliedMonth
      } = req.body;
      
      // Validate required fields
      if (!employeeId || !type || !amount || !appliedMonth) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: employeeId, type, amount, and appliedMonth are required'
        });
      }
      
      // Prevent creating advance deductions here
      if (type === 'advance') {
        return res.status(400).json({
          success: false,
          message: 'Please use the advances endpoint for salary advances'
        });
      }
      
      // Validate amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }
      
      // Check if employee exists
      const employee = await Employee.findOne({ employeeId });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found with the provided employee ID'
        });
      }
      
      // Prepare deduction data
      const deductionData: Partial<IDeduction> = {
        employeeId,
        employeeName: employee.name,
        employeeCode: employee.employeeId,
        type,
        amount: parsedAmount,
        appliedMonth,
        status: status || 'active'
      };
      
      // Optional fields
      if (description) deductionData.description = description;
      if (deductionDate) deductionData.deductionDate = new Date(deductionDate);
      if (repaymentMonths) deductionData.repaymentMonths = parseInt(repaymentMonths);
      if (fineAmount) deductionData.fineAmount = parseFloat(fineAmount);
      
      // Create new deduction
      const deduction = new Deduction(deductionData);
      await deduction.save();
      
      res.status(201).json({
        success: true,
        message: 'Deduction created successfully',
        data: deduction
      });
      
    } catch (error: any) {
      console.error('Error creating deduction:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error creating deduction'
      });
    }
  }

  // Update deduction
  async updateDeduction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Validate deduction ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deduction ID format'
        });
      }
      
      // Check if deduction exists
      const existingDeduction = await Deduction.findById(id);
      if (!existingDeduction) {
        return res.status(404).json({
          success: false,
          message: 'Deduction not found'
        });
      }
      
      // Prevent updating type to 'advance'
      if (updateData.type === 'advance') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update deduction to advance type. Use advances endpoint.'
        });
      }
      
      // If employeeId is being updated, check if employee exists
      if (updateData.employeeId && updateData.employeeId !== existingDeduction.employeeId) {
        const employee = await Employee.findOne({ employeeId: updateData.employeeId });
        if (!employee) {
          return res.status(404).json({
            success: false,
            message: 'Employee not found with the provided employee ID'
          });
        }
        updateData.employeeName = employee.name;
        updateData.employeeCode = employee.employeeId;
      }
      
      // Convert numeric fields
      if (updateData.amount) updateData.amount = parseFloat(updateData.amount);
      if (updateData.repaymentMonths) updateData.repaymentMonths = parseInt(updateData.repaymentMonths);
      if (updateData.fineAmount) updateData.fineAmount = parseFloat(updateData.fineAmount);
      if (updateData.deductionDate) updateData.deductionDate = new Date(updateData.deductionDate);
      
      // Update deduction
      const deduction = await Deduction.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      
      res.status(200).json({
        success: true,
        message: 'Deduction updated successfully',
        data: deduction
      });
      
    } catch (error: any) {
      console.error('Error updating deduction:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating deduction'
      });
    }
  }

  // Delete deduction
  async deleteDeduction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Validate deduction ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deduction ID format'
        });
      }
      
      const deduction = await Deduction.findByIdAndDelete(id);
      
      if (!deduction) {
        return res.status(404).json({
          success: false,
          message: 'Deduction not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Deduction deleted successfully'
      });
      
    } catch (error: any) {
      console.error('Error deleting deduction:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting deduction'
      });
    }
  }

  // Get deduction statistics (excludes advances)
  async getDeductionStats(req: Request, res: Response) {
    try {
      const stats = await Deduction.aggregate([
        {
          $group: {
            _id: null,
            totalDeductions: { $sum: '$amount' },
            totalFines: {
              $sum: {
                $cond: [{ $eq: ['$type', 'fine'] }, '$amount', 0]
              }
            },
            totalOther: {
              $sum: {
                $cond: [{ $eq: ['$type', 'other'] }, '$amount', 0]
              }
            },
           activeCount: {
  $sum: {
    $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
  }
},
completedCount: {
  $sum: {
    $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
  }
},
cancelledCount: {
  $sum: {
    $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
  }
},
            totalCount: { $sum: 1 }
          }
        }
      ]);
      
      // If no deductions exist, return zero stats
     const result = stats[0] || {
  totalDeductions: 0,
  totalFines: 0,
  totalOther: 0,
  activeCount: 0,
  completedCount: 0,
  cancelledCount: 0,
  totalCount: 0
};
      // Add zero for advances (handled separately)
      result.totalAdvances = 0;
      
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      console.error('Error fetching deduction stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching deduction statistics'
      });
    }
  }

  // Get active employees for dropdown
  async getActiveEmployees(req: Request, res: Response) {
    try {
      const employees = await Employee.find({ 
        status: 'active' 
      })
      .select('employeeId name email phone department position salary')
      .sort({ name: 1 });
      
      res.status(200).json({
        success: true,
        data: employees
      });
      
    } catch (error: any) {
      console.error('Error fetching active employees:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching employees'
      });
    }
  }

  // Get deductions by employee ID
  async getDeductionsByEmployee(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      
      const deductions = await Deduction.aggregate([
        {
          $match: { employeeId: employeeId }
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
            employeeCode: '$employeeDetails.employeeId'
          }
        },
        {
          $sort: { deductionDate: -1 }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: deductions
      });
      
    } catch (error: any) {
      console.error('Error fetching employee deductions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching employee deductions'
      });
    }
  }

  // Get deductions summary by month
  async getDeductionsByMonth(req: Request, res: Response) {
    try {
      const { year, month } = req.params;
      
      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Year and month parameters are required'
        });
      }
      
      const appliedMonth = `${year}-${month.padStart(2, '0')}`;
      
      const deductions = await Deduction.aggregate([
        {
          $match: { appliedMonth }
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
            department: '$employeeDetails.department'
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $group: {
            _id: '$employeeId',
            employeeName: { $first: '$employeeName' },
            employeeCode: { $first: '$employeeCode' },
            department: { $first: '$department' },
            totalDeductions: { $sum: '$amount' },
            deductions: { $push: '$$ROOT' }
          }
        },
        {
          $sort: { employeeName: 1 }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: deductions,
        month: appliedMonth
      });
      
    } catch (error: any) {
      console.error('Error fetching deductions by month:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching monthly deductions'
      });
    }
  }
}

export default new DeductionController();
