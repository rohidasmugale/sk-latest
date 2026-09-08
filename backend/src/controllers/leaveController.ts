import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Leave from '../models/Leaves';
import Employee from '../models/Employee';

// Helper function to format date
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to calculate days between dates
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff + 1;
};

// Get all leave requests
export const getAllLeaves = async (req: Request, res: Response) => {
  try {
    const leaves = await Leave.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error: any) {
    console.error('❌ Error fetching leaves:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching leaves', 
      error: error.message 
    });
  }
};

// Get leaves for a specific employee
export const getEmployeeLeaves = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const leaves = await Leave.find({ employeeId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error: any) {
    console.error('❌ Error fetching employee leaves:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching employee leaves', 
      error: error.message 
    });
  }
};

// Get all leave requests for supervisor view - LIKE ATTENDANCE SYSTEM
export const getSupervisorLeaves = async (req: Request, res: Response) => {
  try {
    const { department, siteIds, siteNames, includeSupervisorLeaves, supervisorId, date } = req.query;
    
    let query: any = {};
    
    // Filter by department if provided
    if (department && department !== 'undefined' && department !== 'all') {
      query.department = department;
    }
    
    // Filter by date if provided (like attendance system)
    if (date) {
      const queryDate = new Date(date as string);
      const startOfDay = new Date(queryDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(queryDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.fromDate = { $lte: endOfDay };
      query.toDate = { $gte: startOfDay };
    }
    
    // Include supervisor leaves if requested - like attendance system
    if (includeSupervisorLeaves === 'true') {
      // Show both employee and supervisor leaves
      if (supervisorId) {
        // If supervisorId provided, show supervisor's own leaves and employee leaves
        query.$or = [
          { isSupervisorLeave: { $ne: true } }, // Employee leaves
          { supervisorId: supervisorId } // This supervisor's leaves
        ];
      }
    } else {
      // Only show employee leaves (not supervisor leaves)
      query.isSupervisorLeave = { $ne: true };
    }
    
    console.log('📋 Fetching supervisor leaves with query:', JSON.stringify(query));

    const leaves = await Leave.find(query).sort({ createdAt: -1 });
    
    // Filter by site if siteIds or siteNames provided (like attendance system)
    let filteredLeaves = leaves;
    if (siteIds || siteNames) {
      const siteIdList = siteIds ? JSON.parse(siteIds as string) : [];
      const siteNameList = siteNames ? JSON.parse(siteNames as string) : [];
      
      filteredLeaves = leaves.filter(leave => {
        const siteMatch = siteNameList.includes(leave.department) || 
                          siteIdList.includes(leave.employeeId);
        return siteMatch;
      });
    }
    
    console.log(`✅ Found ${filteredLeaves.length} leave requests for supervisor view`);
    
    res.status(200).json({
      success: true,
      data: filteredLeaves
    });
  } catch (error: any) {
    console.error('❌ Error fetching supervisor leaves:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching supervisor leaves', 
      error: error.message 
    });
  }
};

// Apply for leave - EXACTLY LIKE ATTENDANCE CHECKIN
export const applyForLeave = async (req: Request, res: Response) => {
  try {
    const { 
      employeeId, 
      employeeName, 
      department, 
      contactNumber,
      leaveType, 
      fromDate, 
      toDate, 
      reason,
      appliedBy,
      appliedFor,
      supervisorId,
      isSupervisorLeave,
      position,
      email,
      site,
      siteId,
      reportingManagerId,
      reportingManagerName
    } = req.body;

    console.log('📝 Applying for leave:', {
      employeeId,
      employeeName,
      department,
      leaveType,
      fromDate,
      toDate,
      supervisorId,
      isSupervisorLeave
    });

    // Validate required fields - like attendance checkin
    if (!employeeId || !employeeName || !department || !contactNumber || 
        !leaveType || !fromDate || !toDate || !reason || !appliedBy) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: employeeId, employeeName, department, contactNumber, leaveType, fromDate, toDate, reason, appliedBy are required' 
      });
    }

    // Parse and validate dates
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid date format' 
      });
    }
    
    if (from > to) {
      return res.status(400).json({ 
        success: false,
        message: 'From date must be before to date' 
      });
    }
    
    // Calculate total days
    const timeDiff = to.getTime() - from.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    // FOR SUPERVISOR LEAVES - Skip employee validation (like attendance system)
    // For employee leaves, check if employee exists in Employee collection
    if (!isSupervisorLeave) {
      // Check if employee exists in Employee collection
      const employee = await Employee.findOne({ employeeId, status: 'active' });
      if (!employee) {
        return res.status(404).json({ 
          success: false,
          message: `Employee ${employeeId} not found or inactive in Employee collection`,
          suggestion: 'Check if employee exists and has status: "active"'
        });
      }
    } else {
      // SUPERVISOR LEAVE - Skip validation, just log it
      console.log('👑 Supervisor leave application - skipping employee validation');
    }
// ========== INSERT DUPLICATE CHECK HERE ==========
const existing = await Leave.findOne({
  employeeId: employeeId,
  leaveType,
  fromDate: from,
  toDate: to,
  status: { $in: ['pending', 'approved'] }
});

if (existing) {
  return res.status(409).json({
    success: false,
    message: `A ${leaveType} leave request for these exact dates (${fromDate} to ${toDate}) already exists (status: ${existing.status}).`,
    data: existing
  });
}
    // Create new leave request - EXACTLY LIKE ATTENDANCE SYSTEM
    const leaveData: any = {
      employeeId,
      employeeName,
      department,
      contactNumber,
      leaveType,
      fromDate: from,
      toDate: to,
      totalDays,
      reason,
      status: 'pending',
      appliedBy,
      appliedFor: appliedFor || employeeId,
    };

    // Add supervisor fields if provided - exactly like attendance system
    if (supervisorId) {
      leaveData.supervisorId = supervisorId; // This references users collection
    }
    
    if (isSupervisorLeave !== undefined) {
      leaveData.isSupervisorLeave = isSupervisorLeave;
    }
    
    // Add optional fields
    if (position) leaveData.position = position;
    if (email) leaveData.email = email;
    if (site) leaveData.site = site;
    if (siteId) leaveData.siteId = siteId;
    if (reportingManagerId) leaveData.reportingManagerId = reportingManagerId;
    if (reportingManagerName) leaveData.reportingManagerName = reportingManagerName;

    const leave = new Leave(leaveData);
    await leave.save();

    console.log('✅ Leave request submitted successfully:', {
      id: leave._id,
      employeeId: leave.employeeId,
      supervisorId: leave.supervisorId,
      isSupervisorLeave: leave.isSupervisorLeave
    });

    res.status(201).json({
      success: true,
      message: isSupervisorLeave ? 'Supervisor leave request submitted successfully' : 'Leave request submitted successfully',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error applying for leave:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error applying for leave',
      error: error.message 
    });
  }
};

// Get leave by ID
export const getLeaveDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid leave ID' 
      });
    }
    
    const leave = await Leave.findById(id);
    
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave request not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error fetching leave details:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching leave details', 
      error: error.message 
    });
  }
};

// Cancel leave request
export const cancelLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid leave ID' 
      });
    }
    
    const leave = await Leave.findById(id);
    
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave request not found' 
      });
    }
    
    if (leave.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Only pending leave requests can be cancelled' 
      });
    }
    
    leave.status = 'cancelled';
    leave.cancellationReason = cancellationReason;
    await leave.save();
    
    res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error cancelling leave request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error cancelling leave request', 
      error: error.message 
    });
  }
};

// Get all leaves for admin view
export const getAllLeavesForAdmin = async (req: Request, res: Response) => {
  try {
    const { status, department, employeeName, page = 1, limit = 20 } = req.query;
    
    let filter: any = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (department && department !== 'all') {
      filter.department = department;
    }
    
    if (employeeName) {
      filter.employeeName = { $regex: employeeName, $options: 'i' };
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const [leaves, total] = await Promise.all([
      Leave.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Leave.countDocuments(filter)
    ]);
    
    res.status(200).json({
      success: true,
      data: leaves,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching leaves for admin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching leaves for admin', 
      error: error.message 
    });
  }
};

// Update leave status with remarks - ALLOWS ALL STATUS CHANGES
export const updateLeaveStatusWithRemarks = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remarks, managerName, approvedBy, rejectedBy } = req.body;

    console.log('📝 Updating leave status:', {
      id,
      status,
      remarks,
      managerName,
      approvedBy,
      rejectedBy
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid leave ID' 
      });
    }

    // Allow all status changes: approved, rejected, pending
    const validStatuses = ['approved', 'rejected', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Must be approved, rejected, or pending' 
      });
    }

    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave request not found' 
      });
    }

    const updateData: any = { 
      status,
      updatedAt: new Date()
    };
    
    if (remarks !== undefined) updateData.remarks = remarks;
    
    // Set approval/rejection fields based on status
    if (status === 'approved') {
      updateData.approvedBy = approvedBy || managerName || 'Manager';
      updateData.approvedAt = new Date();
      // Clear rejection fields
      updateData.rejectedBy = null;
      updateData.rejectedAt = null;
    } else if (status === 'rejected') {
      updateData.rejectedBy = rejectedBy || managerName || 'Manager';
      updateData.rejectedAt = new Date();
      // Clear approval fields
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    } else if (status === 'pending') {
      // Clear both approval and rejection fields when reverting to pending
      updateData.approvedBy = null;
      updateData.approvedAt = null;
      updateData.rejectedBy = null;
      updateData.rejectedAt = null;
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedLeave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave request not found' 
      });
    }

    console.log('✅ Leave status updated successfully:', {
      id: updatedLeave._id,
      status: updatedLeave.status
    });

    res.status(200).json({
      success: true,
      message: `Leave request ${status}`,
      data: updatedLeave
    });
  } catch (error: any) {
    console.error('❌ Error updating leave status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating leave status', 
      error: error.message 
    });
  }
};

// Get pending leaves
export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    const { department } = req.query;
    
    let filter: any = { status: 'pending' };
    
    if (department && department !== 'all') {
      filter.department = department;
    }
    
    const leaves = await Leave.find(filter).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error: any) {
    console.error('❌ Error fetching pending leaves:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching pending leaves', 
      error: error.message 
    });
  }
};

// Update leave status - ALLOWS ALL STATUS CHANGES
// Update leave status - ALLOWS ALL STATUS CHANGES with type preservation
export const updateLeaveStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approvedBy, rejectedBy, remarks, managerName } = req.body;

    console.log('📝 Updating leave status:', {
      id,
      status,
      approvedBy,
      rejectedBy,
      remarks
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid leave ID' 
      });
    }

    // Allow all status changes: approved, rejected, pending
    const validStatuses = ['approved', 'rejected', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Must be approved, rejected, or pending' 
      });
    }

    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave request not found' 
      });
    }

    // IMPORTANT: Preserve the original leave type
    const updateData: any = { 
      status,
      updatedAt: new Date()
    };
    
    if (remarks !== undefined) updateData.remarks = remarks;
    
    // Set approval/rejection fields based on status while preserving type
    if (status === 'approved') {
      updateData.approvedBy = approvedBy || managerName || 'Manager';
      updateData.approvedAt = new Date();
      // Clear rejection fields
      updateData.rejectedBy = null;
      updateData.rejectedAt = null;
    } else if (status === 'rejected') {
      updateData.rejectedBy = rejectedBy || managerName || 'Manager';
      updateData.rejectedAt = new Date();
      // Clear approval fields
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    } else if (status === 'pending') {
      // Clear both approval and rejection fields when reverting to pending
      updateData.approvedBy = null;
      updateData.approvedAt = null;
      updateData.rejectedBy = null;
      updateData.rejectedAt = null;
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedLeave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave request not found' 
      });
    }

    console.log('✅ Leave status updated successfully:', {
      id: updatedLeave._id,
      status: updatedLeave.status,
      isManagerLeave: updatedLeave.isManagerLeave,
      isSupervisorLeave: updatedLeave.isSupervisorLeave
    });

    res.status(200).json({
      success: true,
      message: `Leave request ${status}`,
      data: updatedLeave
    });
  } catch (error: any) {
    console.error('❌ Error updating leave status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating leave status', 
      error: error.message 
    });
  }
};

// ============= FUNCTIONS FOR EDIT AND DELETE =============

// Update leave request
export const updateLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { leaveType, fromDate, toDate, totalDays, reason } = req.body;

    console.log('📝 Updating leave request:', {
      id,
      leaveType,
      fromDate,
      toDate,
      totalDays,
      reason
    });

    // Check if ID is valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    
    if (!isValidObjectId) {
      console.log('❌ Invalid MongoDB ObjectId format:', id);
      
      // Try to find by other fields if not a valid ObjectId
      const leave = await Leave.findOne({ 
        $or: [
          { employeeId: id },
          { supervisorId: id },
          { appliedFor: id }
        ]
      });
      
      if (!leave) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid leave ID format' 
        });
      }
      
      // Update using the found document's _id
      return updateLeaveById(leave._id, req.body, res);
    }

    // Validate required fields
    if (!leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: leaveType, fromDate, toDate, reason are required' 
      });
    }

    // Find the leave request
    const leave = await Leave.findById(id);
    
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave request not found' 
      });
    }

    // Check if leave is pending (only pending leaves can be edited)
    if (leave.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Only pending leave requests can be edited' 
      });
    }

    // Parse and validate dates
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid date format' 
      });
    }
    
    if (from > to) {
      return res.status(400).json({ 
        success: false,
        message: 'From date must be before to date' 
      });
    }

    // Update the leave request
    leave.leaveType = leaveType;
    leave.fromDate = from;
    leave.toDate = to;
    leave.totalDays = totalDays || Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1;
    leave.reason = reason;
    leave.updatedAt = new Date();

    await leave.save();

    console.log('✅ Leave request updated successfully:', {
      id: leave._id,
      employeeId: leave.employeeId
    });

    res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error updating leave request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating leave request', 
      error: error.message 
    });
  }
};

// Helper function to update by _id
const updateLeaveById = async (id: any, body: any, res: Response) => {
  try {
    const { leaveType, fromDate, toDate, totalDays, reason } = body;

    // Find the leave request
    const leave = await Leave.findById(id);
    
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave request not found' 
      });
    }

    // Check if leave is pending (only pending leaves can be edited)
    if (leave.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Only pending leave requests can be edited' 
      });
    }

    // Parse and validate dates
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid date format' 
      });
    }
    
    if (from > to) {
      return res.status(400).json({ 
        success: false,
        message: 'From date must be before to date' 
      });
    }

    // Update the leave request
    leave.leaveType = leaveType;
    leave.fromDate = from;
    leave.toDate = to;
    leave.totalDays = totalDays || Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1;
    leave.reason = reason;
    leave.updatedAt = new Date();

    await leave.save();

    console.log('✅ Leave request updated successfully via helper:', {
      id: leave._id,
      employeeId: leave.employeeId
    });

    res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error in updateLeaveById:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating leave request', 
      error: error.message 
    });
  }
};

// Delete leave request
export const deleteLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('📝 Deleting leave request:', { id });

    // Check if ID is valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    
    if (!isValidObjectId) {
      console.log('❌ Invalid MongoDB ObjectId format:', id);
      
      // Try to find by other fields
      const leave = await Leave.findOne({ 
        $or: [
          { employeeId: id },
          { supervisorId: id },
          { appliedFor: id }
        ]
      });
      
      if (!leave) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid leave ID format' 
        });
      }
      
      // Delete using the found document's _id
      return deleteLeaveById(leave._id, res);
    }

    // Find the leave request
    const leave = await Leave.findById(id);
    
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave request not found' 
      });
    }

    // Check if leave is pending (only pending leaves can be deleted)
    if (leave.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Only pending leave requests can be deleted' 
      });
    }

    await Leave.findByIdAndDelete(id);

    console.log('✅ Leave request deleted successfully:', {
      id
    });

    res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ Error deleting leave request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting leave request', 
      error: error.message 
    });
  }
};

// Helper function to delete by _id
const deleteLeaveById = async (id: any, res: Response) => {
  try {
    // Find the leave request
    const leave = await Leave.findById(id);
    
    if (!leave) {
      return res.status(404).json({ 
        success: false,
        message: 'Leave request not found' 
      });
    }

    // Check if leave is pending (only pending leaves can be deleted)
    if (leave.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Only pending leave requests can be deleted' 
      });
    }

    await Leave.findByIdAndDelete(id);

    console.log('✅ Leave request deleted successfully via helper:', {
      id
    });

    res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ Error in deleteLeaveById:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting leave request', 
      error: error.message 
    });
  }
};

// Get all employees for supervisor's department FROM EMPLOYEE COLLECTION
export const getSupervisorEmployees = async (req: Request, res: Response) => {
  try {
    const { department } = req.query;
    
    console.log(`📋 Fetching employees from Employee collection for department: "${department}"`);
    
    if (!department) {
      return res.status(400).json({ 
        success: false,
        message: 'Department is required',
        example: '?department=Operations'
      });
    }
    
    const totalEmployees = await Employee.countDocuments();
    console.log(`📊 Total employees in Employee collection: ${totalEmployees}`);
    
    if (totalEmployees === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No employees found in Employee collection',
        suggestion: 'Please add employees to your database first'
      });
    }
    
    const allDepartments = await Employee.distinct('department');
    console.log('🏢 Available departments:', allDepartments);
    
    const employees = await Employee.find({ 
      department: department,
      status: 'active'
    })
    .select('employeeId name department phone position email')
    .sort('name');
    
    console.log(`✅ Found ${employees.length} active employees in "${department}" department`);
    
    if (employees.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: `No active employees found in "${department}" department`,
        availableDepartments: allDepartments,
        suggestion: `Try one of these departments: ${allDepartments.join(', ')}`
      });
    }
    
    const formattedEmployees = employees.map(emp => ({
      _id: emp._id.toString(),
      employeeId: emp.employeeId,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      email: emp.email,
      contactNumber: emp.phone
    }));
    
    console.log('📤 Sending employees:', formattedEmployees.map(e => `${e.name} (${e.employeeId})`));
    
    res.status(200).json({
      success: true,
      data: formattedEmployees
    });
  } catch (error: any) {
    console.error('❌ Error fetching employees:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching employees from Employee collection', 
      error: error.message,
      details: 'Make sure MongoDB is connected and Employee model exists'
    });
  }
};

// Get leave statistics
export const getLeaveStats = async (req: Request, res: Response) => {
  try {
    const stats = await Leave.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('❌ Error fetching leave statistics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching leave statistics', 
      error: error.message 
    });
  }
};

// Get all departments from Employee collection
export const getAllDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await Employee.distinct('department');
    res.status(200).json({
      success: true,
      data: departments
    });
  } catch (error: any) {
    console.error('❌ Error fetching departments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching departments', 
      error: error.message 
    });
  }
};

// Get employee count by department
export const getEmployeeCountByDepartment = async (req: Request, res: Response) => {
  try {
    const stats = await Employee.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          active: { 
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('❌ Error fetching employee counts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching employee counts', 
      error: error.message 
    });
  }
};

// Get today's leave status for an employee - LIKE ATTENDANCE TODAY STATUS
export const getTodayLeaveStatus = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const today = formatDate(new Date());
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const leave = await Leave.findOne({
      employeeId,
      fromDate: { $lte: endOfDay },
      toDate: { $gte: startOfDay },
      status: { $in: ['pending', 'approved'] }
    });

    if (!leave) {
      return res.status(200).json({
        success: true,
        message: 'No leave found for today',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      message: 'Leave status retrieved',
      data: leave
    });
  } catch (error: any) {
    console.error('❌ Error fetching today leave status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching today leave status',
      error: error.message
    });
  }
};

// Test endpoint to check leaves in database
export const testLeaves = async (req: Request, res: Response) => {
  try {
    const leaves = await Leave.find().limit(10).lean();
    const totalCount = await Leave.countDocuments();
    const supervisorLeaves = await Leave.countDocuments({ isSupervisorLeave: true });
    const employeeLeaves = await Leave.countDocuments({ isSupervisorLeave: { $ne: true } });
    
    res.status(200).json({
      success: true,
      totalCount,
      supervisorLeaves,
      employeeLeaves,
      sampleLeaves: leaves.map(l => ({
        id: l._id,
        employee: l.employeeName,
        department: l.department,
        isSupervisor: l.isSupervisorLeave,
        supervisorId: l.supervisorId,
        status: l.status
      }))
    });
  } catch (error: any) {
    console.error('❌ Error testing leaves:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Bulk update leave status
export const bulkUpdateLeaveStatus = async (req: Request, res: Response) => {
  try {
    const { leaveIds, status, managerName, remarks } = req.body;

    console.log('📝 Bulk updating leave status:', {
      count: leaveIds?.length,
      status,
      managerName
    });

    if (!leaveIds || !Array.isArray(leaveIds) || leaveIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of leave IDs'
      });
    }

    const validStatuses = ['approved', 'rejected', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or pending'
      });
    }

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (remarks) {
      updateData.remarks = remarks;
    }

    if (status === 'approved') {
      updateData.approvedBy = managerName || 'Manager';
      updateData.approvedAt = new Date();
      updateData.rejectedBy = null;
      updateData.rejectedAt = null;
    } else if (status === 'rejected') {
      updateData.rejectedBy = managerName || 'Manager';
      updateData.rejectedAt = new Date();
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    } else if (status === 'pending') {
      updateData.approvedBy = null;
      updateData.approvedAt = null;
      updateData.rejectedBy = null;
      updateData.rejectedAt = null;
    }

    const result = await Leave.updateMany(
      { _id: { $in: leaveIds } },
      { $set: updateData }
    );

    console.log('✅ Bulk update completed:', result);

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} leave requests`,
      data: result
    });
  } catch (error: any) {
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Error in bulk update',
      error: error.message
    });
  }
};