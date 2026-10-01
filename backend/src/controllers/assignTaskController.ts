import { Request, Response } from 'express';
import AssignTask from '../models/AssignTask';
import mongoose from 'mongoose';

// Helper function to generate unique ID
const generateId = () => {
  return new mongoose.Types.ObjectId().toString();
};

// Get all assign tasks
export const getAllAssignTasks = async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching all assign tasks');
    
    const { 
      status, 
      priority, 
      siteId, 
      taskType,
      managerId,
      supervisorId,
      userId,
      userRole,
      overdue,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = '10',
      page = '1'
    } = req.query;
    
    let filter: any = {};
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (siteId) filter.siteId = siteId;
    if (taskType) filter.taskType = taskType;
    
    // Filter by manager ID - tasks where this manager is assigned
    if (managerId) {
      filter['assignedManagers.userId'] = managerId;
    }
    
    // Filter by supervisor ID
    if (supervisorId) {
      filter['assignedSupervisors.userId'] = supervisorId;
    }
    
    // Filter by user role and ID - for role-based access
    if (userId && userRole) {
      if (userRole === 'manager') {
        // Managers see tasks where they are assigned OR tasks they created
        filter.$or = [
          { 'assignedManagers.userId': userId },
          { createdBy: userId }
        ];
      } else if (userRole === 'supervisor') {
        // Supervisors see tasks where they are assigned
        filter['assignedSupervisors.userId'] = userId;
      }
      // Superadmin sees all tasks (no filter)
    }
    
    // Filter overdue tasks
    if (overdue === 'true') {
      filter.dueDateTime = { $lt: new Date() };
      filter.status = { $ne: 'completed' };
    }
    
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const tasks = await AssignTask.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    const total = await AssignTask.countDocuments(filter);
    
    console.log(`✅ Found ${tasks.length} assign tasks`);
    
    res.status(200).json({
      tasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: unknown) {
    console.error('❌ Error fetching assign tasks:', error);
    const err = error as Error;
    res.status(500).json({ 
      message: 'Error fetching assign tasks', 
      error: err.message 
    });
  }
};

// Get assign task by ID
export const getAssignTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching assign task with ID: ${id}`);
     const task = await AssignTask.findById(id).lean() as any;

if (!task) {
  return res.status(404).json({ message: 'Assign task not found' });
}

console.log(`✅ Found assign task: ${task.taskTitle}`);
    res.status(200).json(task);
  } catch (error: unknown) {
    console.error('❌ Error fetching assign task:', error);
    const err = error as Error;
    res.status(500).json({ 
      message: 'Error fetching assign task', 
      error: err.message 
    });
  }
};

// Create new assign task
export const createAssignTask = async (req: Request, res: Response) => {
  try {
    console.log('📝 CREATE ASSIGN TASK REQUEST START ============');
    console.log('📦 Request body received:', JSON.stringify(req.body, null, 2));
    
    // Remove any id fields
    const { _id, id, __v, ...requestData } = req.body;
    
    // Validate required fields
    const requiredFields = [
      'taskTitle',
      'description',
      'startDate',
      'endDate',
      'dueDateTime',
      'priority',
      'taskType',
      'siteId',
      'siteName',
      'siteLocation',
      'clientName',
      'createdBy',
      'createdByName'
    ];
    
    const missingFields = requiredFields.filter(field => {
      const value = requestData[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }
    
    // Parse dates
    let startDate: Date, endDate: Date, dueDateTime: Date;
    
    try {
      startDate = new Date(requestData.startDate);
      endDate = new Date(requestData.endDate);
      dueDateTime = new Date(requestData.dueDateTime);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(dueDateTime.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      console.log('❌ Invalid date format');
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    // Validate date order
    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }
    
    if (dueDateTime < endDate) {
      return res.status(400).json({
        success: false,
        message: 'Due date must be after end date'
      });
    }
    
    // Process assigned managers
    let assignedManagers = [];
    if (requestData.assignedManagers && Array.isArray(requestData.assignedManagers)) {
      assignedManagers = requestData.assignedManagers.map((manager: any) => ({
        userId: manager.userId || manager._id || '',
        name: manager.name || '',
        role: 'manager',
        assignedAt: new Date(),
        status: 'pending'
      }));
    }
    
    // Process assigned supervisors
    let assignedSupervisors = [];
    if (requestData.assignedSupervisors && Array.isArray(requestData.assignedSupervisors)) {
      assignedSupervisors = requestData.assignedSupervisors.map((supervisor: any) => ({
        userId: supervisor.userId || supervisor._id || '',
        name: supervisor.name || '',
        role: 'supervisor',
        assignedAt: new Date(),
        status: 'pending'
      }));
    }
    
    // Prepare task data
    const taskData: any = {
      taskTitle: String(requestData.taskTitle).trim(),
      description: String(requestData.description).trim(),
      startDate,
      endDate,
      dueDateTime,
      priority: requestData.priority,
      taskType: requestData.taskType,
      siteId: String(requestData.siteId).trim(),
      siteName: String(requestData.siteName).trim(),
      siteLocation: String(requestData.siteLocation).trim(),
      clientName: String(requestData.clientName).trim(),
      assignedManagers,
      assignedSupervisors,
      status: requestData.status || 'pending',
      createdBy: String(requestData.createdBy).trim(),
      createdByName: String(requestData.createdByName).trim(),
      hourlyUpdates: [],
      attachments: [],
      completionPercentage: 0,
      isOverdue: false
    };
    
    console.log('📊 Final task data to save:', JSON.stringify(taskData, null, 2));
    
    // Create new task instance
    const task = new AssignTask(taskData);
    console.log('🏗️ Task instance created');
    
    // Save to database
    console.log('💾 Attempting to save task to database...');
    await task.save();
    
    console.log(`✅ Assign task created successfully! ID: ${task._id}, Title: ${task.taskTitle}`);
    
    res.status(201).json({
      success: true,
      message: 'Assign task created successfully',
      task
    });
    
  } catch (error: unknown) {
    console.error('❌ CREATE ASSIGN TASK ERROR ============');
    console.error('Error:', error);
    
    const err = error as Error;
    
    if (err.name === 'ValidationError') {
      // Handle validation error
      const validationError = err as any;
      const messages = Object.values(validationError.errors || {}).map((err: any) => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error', 
        errors: messages
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error creating assign task', 
      error: err.message
    });
  }
};

// Update assign task
export const updateAssignTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Updating assign task with ID: ${id}`);
    
    const task = await AssignTask.findById(id);
    if (!task) {
      console.log(`❌ Assign task not found for update: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Assign task not found' 
      });
    }
    
    // Remove id fields
    const { _id, id: reqId, ...updateData } = req.body;
    
    // Handle date updates
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }
    if (updateData.dueDateTime) {
      updateData.dueDateTime = new Date(updateData.dueDateTime);
    }
    
    // Update fields
    Object.assign(task, updateData);
    
    // Validate date order if dates were updated
    if (updateData.startDate || updateData.endDate || updateData.dueDateTime) {
      if (task.endDate < task.startDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
      
      if (task.dueDateTime < task.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Due date must be after end date'
        });
      }
    }
    
    await task.save();
    
    console.log(`✅ Assign task updated successfully: ${task.taskTitle}`);
    
    res.status(200).json({
      success: true,
      message: 'Assign task updated successfully',
      task
    });
  } catch (error: unknown) {
    console.error('❌ Error updating assign task:', error);
    const err = error as Error;
    res.status(500).json({ 
      success: false,
      message: 'Error updating assign task', 
      error: err.message 
    });
  }
};

// Delete assign task
export const deleteAssignTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting assign task with ID: ${id}`);
    
    const task = await AssignTask.findByIdAndDelete(id);
    
    if (!task) {
      console.log(`❌ Assign task not found for deletion: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Assign task not found' 
      });
    }
    
    console.log(`✅ Assign task deleted successfully: ${task.taskTitle}`);
    
    res.status(200).json({
      success: true,
      message: 'Assign task deleted successfully',
      task
    });
  } catch (error: unknown) {
    console.error('❌ Error deleting assign task:', error);
    const err = error as Error;
    res.status(500).json({ 
      success: false,
      message: 'Error deleting assign task', 
      error: err.message 
    });
  }
};

// Update task status
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Updating task ${id} status to: ${status}`);
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const task = await AssignTask.findById(id);
    if (!task) {
      console.log(`❌ Assign task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Assign task not found' 
      });
    }
    
    task.status = status;
    await task.save();
    
    console.log(`✅ Task status updated successfully: ${task.taskTitle} -> ${status}`);
    
    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      task
    });
  } catch (error: unknown) {
    console.error('❌ Error updating task status:', error);
    const err = error as Error;
    res.status(500).json({ 
      success: false,
      message: 'Error updating task status', 
      error: err.message 
    });
  }
};

// Add hourly update
export const addHourlyUpdate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, submittedBy, submittedByName } = req.body;
    
    console.log(`📝 Adding hourly update to assign task ID: ${id}`);
    
    if (!content || !submittedBy || !submittedByName) {
      return res.status(400).json({
        success: false,
        message: 'Content, submittedBy, and submittedByName are required'
      });
    }
    
    const task = await AssignTask.findById(id);
    if (!task) {
      console.log(`❌ Assign task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Assign task not found' 
      });
    }
    
    const newUpdate = {
      content: String(content).trim(),
      timestamp: new Date(),
      submittedBy: String(submittedBy).trim(),
      submittedByName: String(submittedByName).trim()
    };
    
    task.hourlyUpdates.push(newUpdate);
    await task.save();
    
    console.log(`✅ Hourly update added to assign task: ${task.taskTitle}`);
    
    res.status(200).json({
      success: true,
      message: 'Hourly update added successfully',
      update: newUpdate,
      task
    });
  } catch (error: unknown) {
    console.error('❌ Error adding hourly update:', error);
    const err = error as Error;
    res.status(500).json({ 
      success: false,
      message: 'Error adding hourly update', 
      error: err.message 
    });
  }
};


// Add attachment (supports both JSON and file upload)
export const addAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('📎 ===== ADD ATTACHMENT START =====');
    console.log(`📎 Task ID: ${id}`);
    console.log('📎 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📎 Request file:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    // Get attachment data from request body (now populated by Cloudinary upload)
    const { 
      filename, 
      url, 
      size, 
      type, 
      uploadedBy, 
      uploadedByName,
      cloudinaryPublicId 
    } = req.body;

    // Validate required fields
    if (!filename || !url || !uploadedBy || !uploadedByName) {
      console.log('❌ Missing required fields:', { filename, url, uploadedBy, uploadedByName });
      return res.status(400).json({
        success: false,
        message: 'Filename, URL, uploadedBy, and uploadedByName are required'
      });
    }
    
    const task = await AssignTask.findById(id);
    if (!task) {
      console.log(`❌ Assign task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Assign task not found' 
      });
    }
    
    console.log('📎 Current task attachments count:', task.attachments.length);
    
    const newAttachment: any = {
      id: new mongoose.Types.ObjectId().toString(),
      filename: String(filename).trim(),
      url: String(url).trim(),
      uploadedAt: new Date(),
      size: size || 0,
      type: type || 'application/octet-stream',
      uploadedBy: String(uploadedBy).trim(),
      uploadedByName: String(uploadedByName).trim()
    };

    // Store Cloudinary public ID if available (for deletion)
    if (cloudinaryPublicId) {
      newAttachment.cloudinaryPublicId = cloudinaryPublicId;
    }
    
    task.attachments.push(newAttachment);
    await task.save();
    
    console.log(`✅ Attachment added successfully!`);
    console.log(`📎 New attachment:`, newAttachment);
    console.log(`📎 Total attachments now:`, task.attachments.length);
    console.log('📎 ===== ADD ATTACHMENT END =====');
    
    res.status(200).json({
      success: true,
      message: 'Attachment added successfully',
      attachment: newAttachment,
      task
    });
  } catch (error: any) {
    console.error('❌ Error adding attachment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding attachment', 
      error: error.message 
    });
  }
};

// Add multiple attachments
export const addMultipleAttachments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`📎 Adding multiple attachments to assign task ID: ${id}`);
    
    // Check if files exist in request
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { uploadedBy, uploadedByName } = req.body;
    
    if (!uploadedBy || !uploadedByName) {
      return res.status(400).json({
        success: false,
        message: 'uploadedBy and uploadedByName are required'
      });
    }
    
    const task = await AssignTask.findById(id);
    if (!task) {
      console.log(`❌ Assign task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Assign task not found' 
      });
    }
    
    // Create attachment objects from uploaded files
    const newAttachments = (req.files as Express.Multer.File[]).map(file => ({
      filename: file.originalname,
      url: `/uploads/${file.filename}`,
      uploadedAt: new Date(),
      size: file.size,
      type: file.mimetype,
      uploadedBy: String(uploadedBy).trim(),
      uploadedByName: String(uploadedByName).trim()
    }));
    
    task.attachments.push(...newAttachments);
    await task.save();
    
    console.log(`✅ ${newAttachments.length} attachments added to assign task: ${task.taskTitle}`);
    
    res.status(200).json({
      success: true,
      message: 'Attachments added successfully',
      attachments: newAttachments,
      task
    });
  } catch (error: any) {
    console.error('❌ Error adding attachments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding attachments', 
      error: error.message 
    });
  }
};
// Delete attachment
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { id, attachmentId } = req.params;
    
    console.log(`🗑️ Deleting attachment ${attachmentId} from assign task ID: ${id}`);
    
    const task = await AssignTask.findById(id);
    if (!task) {
      console.log(`❌ Assign task not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Assign task not found' 
      });
    }
    
    task.attachments = task.attachments.filter((att: any) => {
      return att._id?.toString() !== attachmentId && 
             (att as any).id !== attachmentId;
    });
    
    await task.save();
    
    console.log(`✅ Attachment deleted from assign task: ${task.taskTitle}`);
    
    res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
      task
    });
  } catch (error: unknown) {
    console.error('❌ Error deleting attachment:', error);
    const err = error as Error;
    res.status(500).json({ 
      success: false,
      message: 'Error deleting attachment', 
      error: err.message 
    });
  }
};
