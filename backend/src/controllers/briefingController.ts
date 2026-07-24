import { Request, Response } from "express";
import StaffBriefing, { IStaffBriefing, IAttachment } from "../models/StaffBriefing";
import { uploadMultipleToCloudinary, deleteFromCloudinary } from "../utils/CloudinaryUtils";
import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|xls|xlsx|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images, documents, and videos are allowed"));
  }
}).any();

// controllers/briefingController.ts – replace getAllBriefings
export const getAllBriefings = async (req: Request, res: Response) => {
  try {
    const { role, assignedSites, siteName } = req.user;
    let filter: any = {};

    // ✅ UPDATED: Managers now see everything (like superadmin)
    if (role === 'superadmin' || role === 'manager'||role==='admin') {
      // ✅ No site filter - managers see ALL briefings
      // no filter applied
    } else if (role === 'supervisor') {
      if (!siteName) return res.status(403).json({ success: false, message: 'No site assigned' });
      filter.site = siteName;
    }

    // Apply other filters (department, shift, etc.)
    const { department, shift, site, search, startDate, endDate, page = '1', limit = '50' } = req.query;
    if (department && department !== 'all') filter.department = department;
    if (shift && shift !== 'all') filter.shift = shift;
    if (site && site !== 'all') filter.site = site; // manual override (allowed for superadmin)
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };
    else if (startDate) filter.date = { $gte: startDate };
    else if (endDate) filter.date = { $lte: endDate };
    if (search) {
      filter.$or = [
        { conductedBy: { $regex: search, $options: 'i' } },
        { site: { $regex: search, $options: 'i' } },
        { topics: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    console.log("MongoDB filter:", filter);
    const [briefings, total] = await Promise.all([
      StaffBriefing.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum),
      StaffBriefing.countDocuments(filter)
    ]);
    console.log(`Found ${briefings.length} staff briefings`);
    const transformedBriefings = briefings.map(briefing => ({
      id: briefing._id.toString(),
      _id: briefing._id.toString(),
      date: briefing.date,
      time: briefing.time,
      conductedBy: briefing.conductedBy,
      site: briefing.site,
      department: briefing.department,
      attendeesCount: briefing.attendeesCount,
      topics: briefing.topics,
      keyPoints: briefing.keyPoints,
      actionItems: briefing.actionItems.map(item => ({
        _id: item._id?.toString(),
        description: item.description,
        assignedTo: item.assignedTo,
        dueDate: item.dueDate,
        status: item.status,
        priority: item.priority
      })),
      attachments: briefing.attachments,
      notes: briefing.notes,
      shift: briefing.shift,
      supervisors: briefing.supervisors || [],
      managers: briefing.managers || [],
      createdBy: briefing.createdBy,
      createdAt: briefing.createdAt,
      updatedAt: briefing.updatedAt
    }));
    res.status(200).json({ success: true, briefings: transformedBriefings, total, page: pageNum, totalPages: Math.ceil(total / limitNum), filters: { department, shift, site, search, startDate, endDate } });
  } catch (error: any) {
    console.error("Error fetching briefings:", error);
    res.status(500).json({ success: false, message: "Error fetching staff briefings", error: error.message });
  }
};
export const getBriefingById = async (req: Request, res: Response) => {
  try {
    console.log(`GET /api/briefings/${req.params.id} called`);
    const briefing = await StaffBriefing.findById(req.params.id);
    if (!briefing) return res.status(404).json({ success: false, message: "Staff briefing not found" });
    const transformedBriefing = {
      id: briefing._id.toString(),
      _id: briefing._id.toString(),
      date: briefing.date,
      time: briefing.time,
      conductedBy: briefing.conductedBy,
      site: briefing.site,
      department: briefing.department,
      attendeesCount: briefing.attendeesCount,
      topics: briefing.topics,
      keyPoints: briefing.keyPoints,
      actionItems: briefing.actionItems.map(item => ({
        _id: item._id?.toString(),
        description: item.description,
        assignedTo: item.assignedTo,
        dueDate: item.dueDate,
        status: item.status,
        priority: item.priority
      })),
      attachments: briefing.attachments,
      notes: briefing.notes,
      shift: briefing.shift,
      supervisors: briefing.supervisors || [],
      managers: briefing.managers || [],
      createdBy: briefing.createdBy,
      createdAt: briefing.createdAt,
      updatedAt: briefing.updatedAt
    };
    res.status(200).json({ success: true, briefing: transformedBriefing });
  } catch (error: any) {
    console.error("Error fetching briefing by ID:", error);
    res.status(500).json({ success: false, message: "Error fetching staff briefing", error: error.message });
  }
};

export const createBriefing = async (req: Request, res: Response) => {
  try {
    console.log("POST /api/briefings called");
    
    upload(req, res, async (err: any) => {
      if (err) {
        console.error("File upload error:", err);
        return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
      }
      
      try {
        let briefingData: any;
        try {
          briefingData = req.body.data ? JSON.parse(req.body.data) : req.body;
        } catch (parseError) {
          console.error("Parse error:", parseError);
          briefingData = req.body;
        }
        
        console.log("Briefing data received:", briefingData);
        
        const userType = req.headers['x-user-type'] as string || 'superadmin';
        
        const requiredFields = ["date", "site"];
        const missingFields = requiredFields.filter(field => !briefingData[field]);
        
        if (missingFields.length > 0) {
          return res.status(400).json({ 
            success: false, 
            message: `Missing required fields: ${missingFields.join(", ")}` 
          });
        }
        
        // ✅ REMOVED: Supervisor and Manager validation
        // No longer require supervisors or managers
        
        const attachments: IAttachment[] = [];
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
          console.log(`Uploading ${files.length} files to Cloudinary`);
          const uploadPromises = files.map(async (file) => {
            try {
              const uploadResult = await uploadMultipleToCloudinary([{
                buffer: file.buffer,
                originalname: file.originalname
              }], "briefing-attachments");
              
              if (uploadResult && uploadResult.length > 0) {
                return {
                  name: file.originalname,
                  type: file.mimetype.startsWith('image/') ? 'image' as const : 
                        file.mimetype.startsWith('video/') ? 'video' as const : 'document' as const,
                  url: uploadResult[0].secure_url,
                  size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                  uploadedAt: new Date()
                };
              }
              return null;
            } catch (uploadError) {
              console.error("Error uploading file:", uploadError);
              return null;
            }
          });
          
          const uploadResults = await Promise.all(uploadPromises);
          const validResults = uploadResults.filter(result => result !== null);
          attachments.push(...validResults);
          console.log(`Successfully uploaded ${attachments.length} attachments`);
        }
        
        const briefingWithCreator = {
          date: briefingData.date,
          time: briefingData.time || '',
          conductedBy: briefingData.conductedBy || '',
          site: briefingData.site,
          department: briefingData.department || '',
          attendeesCount: briefingData.attendeesCount || 0,
          topics: briefingData.topics || [],
          keyPoints: briefingData.keyPoints || [],
          actionItems: briefingData.actionItems || [],
          attachments: attachments,
          notes: briefingData.notes || '',
          shift: briefingData.shift || 'morning',
          supervisors: briefingData.supervisors || [],
          managers: briefingData.managers || [],
          createdBy: userType
        };
        
        console.log("Saving briefing to database...");
        const briefing = new StaffBriefing(briefingWithCreator);
        await briefing.save();
        
        const transformedBriefing = {
          id: briefing._id.toString(),
          _id: briefing._id.toString(),
          date: briefing.date,
          time: briefing.time,
          conductedBy: briefing.conductedBy,
          site: briefing.site,
          department: briefing.department,
          attendeesCount: briefing.attendeesCount,
          topics: briefing.topics,
          keyPoints: briefing.keyPoints,
          actionItems: briefing.actionItems.map(item => ({
            _id: item._id?.toString(),
            description: item.description,
            assignedTo: item.assignedTo,
            dueDate: item.dueDate,
            status: item.status,
            priority: item.priority
          })),
          attachments: briefing.attachments,
          notes: briefing.notes,
          shift: briefing.shift,
          supervisors: briefing.supervisors || [],
          managers: briefing.managers || [],
          createdBy: briefing.createdBy,
          createdAt: briefing.createdAt,
          updatedAt: briefing.updatedAt
        };
        
        console.log("Staff briefing created successfully:", transformedBriefing.id);
        res.status(201).json({ 
          success: true, 
          message: "Staff briefing created successfully", 
          briefing: transformedBriefing 
        });
      } catch (error: any) {
        console.error("Error creating briefing:", error);
        if (error.code === 11000) {
          console.error("Duplicate key error detected:", error.keyPattern);
          return res.status(400).json({ 
            success: false, 
            message: "Duplicate entry detected. Please check if this briefing already exists.",
            error: "DUPLICATE_KEY_ERROR"
          });
        }
        res.status(500).json({ 
          success: false, 
          message: "Error creating staff briefing", 
          error: error.message 
        });
      }
    });
  } catch (error: any) {
    console.error("Error in createBriefing:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error creating staff briefing", 
      error: error.message 
    });
  }
};

export const updateBriefing = async (req: Request, res: Response) => {
  try {
    console.log(`PUT /api/briefings/${req.params.id} called`);
    
    upload(req, res, async (err: any) => {
      if (err) {
        console.error("File upload error:", err);
        return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
      }
      
      try {
        const { id } = req.params;
        
        let updateData: any;
        try {
          updateData = req.body.data ? JSON.parse(req.body.data) : req.body;
        } catch (parseError) {
          updateData = req.body;
        }
        
        console.log("Update data received:", updateData);
        
        const existingBriefing = await StaffBriefing.findById(id);
        if (!existingBriefing) {
          return res.status(404).json({ success: false, message: "Staff briefing not found" });
        }
        
        let newAttachments: IAttachment[] = [];
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
          console.log(`Uploading ${files.length} new files to Cloudinary`);
          const uploadPromises = files.map(async (file) => {
            try {
              const uploadResult = await uploadMultipleToCloudinary([{
                buffer: file.buffer,
                originalname: file.originalname
              }], "briefing-attachments");
              
              if (uploadResult && uploadResult.length > 0) {
                return {
                  name: file.originalname,
                  type: file.mimetype.startsWith('image/') ? 'image' as const : 
                        file.mimetype.startsWith('video/') ? 'video' as const : 'document' as const,
                  url: uploadResult[0].secure_url,
                  size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                  uploadedAt: new Date()
                };
              }
              return null;
            } catch (uploadError) {
              console.error("Error uploading file:", uploadError);
              return null;
            }
          });
          
          const uploadResults = await Promise.all(uploadPromises);
          newAttachments = uploadResults.filter(result => result !== null);
          console.log(`Successfully uploaded ${newAttachments.length} new attachments`);
        }
        
        const existingAttachments = updateData.attachments || existingBriefing.attachments || [];
        const allAttachments = [...existingAttachments, ...newAttachments];
        
        const briefing = await StaffBriefing.findByIdAndUpdate(
          id, 
          { 
            ...updateData, 
            attachments: allAttachments,
            updatedAt: new Date() 
          }, 
          { new: true, runValidators: true }
        );
        
        if (!briefing) {
          return res.status(404).json({ success: false, message: "Staff briefing not found after update" });
        }
        
        const transformedBriefing = {
          id: briefing._id.toString(),
          _id: briefing._id.toString(),
          date: briefing.date,
          time: briefing.time,
          conductedBy: briefing.conductedBy,
          site: briefing.site,
          department: briefing.department,
          attendeesCount: briefing.attendeesCount,
          topics: briefing.topics,
          keyPoints: briefing.keyPoints,
          actionItems: briefing.actionItems.map(item => ({
            _id: item._id?.toString(),
            description: item.description,
            assignedTo: item.assignedTo,
            dueDate: item.dueDate,
            status: item.status,
            priority: item.priority
          })),
          attachments: briefing.attachments,
          notes: briefing.notes,
          shift: briefing.shift,
          supervisors: briefing.supervisors || [],
          managers: briefing.managers || [],
          createdBy: briefing.createdBy,
          createdAt: briefing.createdAt,
          updatedAt: briefing.updatedAt
        };
        
        res.status(200).json({ 
          success: true, 
          message: "Staff briefing updated successfully", 
          briefing: transformedBriefing 
        });
      } catch (error: any) {
        console.error("Error updating briefing:", error);
        res.status(500).json({ success: false, message: "Error updating staff briefing", error: error.message });
      }
    });
  } catch (error: any) {
    console.error("Error in updateBriefing:", error);
    res.status(500).json({ success: false, message: "Error updating staff briefing", error: error.message });
  }
};

export const updateActionItemStatus = async (req: Request, res: Response) => {
  try {
    console.log(`PUT /api/briefings/${req.params.id}/actions/${req.params.actionId} called`);
    const { id, actionId } = req.params;
    const { status } = req.body;
    
    if (!status) return res.status(400).json({ success: false, message: "Status is required" });
    
    const briefing = await StaffBriefing.findById(id);
    if (!briefing) return res.status(404).json({ success: false, message: "Staff briefing not found" });
    
    const actionItemIndex = briefing.actionItems.findIndex(
      item => item._id && item._id.toString() === actionId
    );
    
    if (actionItemIndex === -1) {
      return res.status(404).json({ success: false, message: "Action item not found" });
    }
    
    briefing.actionItems[actionItemIndex].status = status;
    await briefing.save();
    
    res.status(200).json({ 
      success: true, 
      message: `Action item status updated to ${status}`, 
      actionItem: {
        _id: briefing.actionItems[actionItemIndex]._id?.toString(),
        description: briefing.actionItems[actionItemIndex].description,
        assignedTo: briefing.actionItems[actionItemIndex].assignedTo,
        dueDate: briefing.actionItems[actionItemIndex].dueDate,
        status: briefing.actionItems[actionItemIndex].status,
        priority: briefing.actionItems[actionItemIndex].priority
      }
    });
  } catch (error: any) {
    console.error("Error updating action item status:", error);
    res.status(500).json({ success: false, message: "Error updating action item status", error: error.message });
  }
};

export const deleteBriefing = async (req: Request, res: Response) => {
  try {
    console.log(`DELETE /api/briefings/${req.params.id} called`);
    const { id } = req.params;
    
    const briefing = await StaffBriefing.findById(id);
    if (!briefing) return res.status(404).json({ success: false, message: "Staff briefing not found" });
    
    if (briefing.attachments && briefing.attachments.length > 0) {
      for (const attachment of briefing.attachments) {
        if (attachment.url) {
          const publicId = attachment.url.split('/').slice(-2).join('/').split('.')[0];
          await deleteFromCloudinary(publicId);
        }
      }
    }
    
    await StaffBriefing.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Staff briefing deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting briefing:", error);
    res.status(500).json({ success: false, message: "Error deleting staff briefing", error: error.message });
  }
};

export const getBriefingStats = async (req: Request, res: Response) => {
  try {
    console.log("GET /api/briefings/stats called");
    const [totalBriefings, briefingsByShift, briefingsByDepartment, totalActionItems, pendingActions] = await Promise.all([
      StaffBriefing.countDocuments(),
      StaffBriefing.aggregate([{ $group: { _id: "$shift", count: { $sum: 1 } } }]),
      StaffBriefing.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }]),
      StaffBriefing.aggregate([{ $project: { actionItemCount: { $size: "$actionItems" } } }, { $group: { _id: null, total: { $sum: "$actionItemCount" } } }]),
      StaffBriefing.aggregate([{ $unwind: "$actionItems" }, { $match: { "actionItems.status": "pending" } }, { $count: "count" }])
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalBriefings,
        briefingsByShift: briefingsByShift.reduce((acc: any, curr) => { acc[curr._id] = curr.count; return acc; }, {}),
        briefingsByDepartment: briefingsByDepartment.reduce((acc: any, curr) => { acc[curr._id] = curr.count; return acc; }, {}),
        totalActionItems: totalActionItems[0]?.total || 0,
        pendingActions: pendingActions[0]?.count || 0
      }
    });
  } catch (error: any) {
    console.error("Error fetching briefing stats:", error);
    res.status(500).json({ success: false, message: "Error fetching briefing statistics", error: error.message });
  }
};
