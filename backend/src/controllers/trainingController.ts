// controllers/trainingController.ts
import { Request, Response } from "express";
import TrainingSession, { ITrainingSession, IAttachment } from "../models/TrainingSession";
import { uploadMultipleToCloudinary, deleteFromCloudinary } from "../utils/CloudinaryUtils";
import multer from "multer";
import path from "path";

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|xls|xlsx|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images, documents, and videos are allowed"));
  }
}).any(); // Use .any() to accept any field names

// controllers/trainingController.ts â€“ replace getAllTrainings
export const getAllTrainings = async (req: Request, res: Response) => {
  try {
    const { role, assignedSites, siteName } = req.user; // from middleware
    let filter: any = {};

    // ✅ UPDATED: Managers now see everything (like superadmin)
    if (role === 'superadmin' || role === 'manager'||role==='admin') {
      // ✅ No site filter - managers see ALL trainings
      // no filter applied
    } else if (role === 'supervisor') {
      if (!siteName) {
        return res.status(403).json({ success: false, message: 'No site assigned to you' });
      }
      filter.site = siteName;
    }

    // Apply optional query filters (department, status, etc.)
    const { department, status, type, search, startDate, endDate, page = '1', limit = '50' } = req.query;
    if (department && department !== 'all') filter.department = department;
    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.type = type;
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };
    else if (startDate) filter.date = { $gte: startDate };
    else if (endDate) filter.date = { $lte: endDate };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { trainer: { $regex: search, $options: 'i' } },
        { site: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [trainings, total] = await Promise.all([
      TrainingSession.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum),
      TrainingSession.countDocuments(filter)
    ]);

    console.log(`Found ${trainings.length} training sessions`);
    const transformedTrainings = trainings.map(training => ({
      id: training._id.toString(),
      _id: training._id.toString(),
      title: training.title,
      description: training.description,
      type: training.type,
      date: training.date,
      time: training.time,
      duration: training.duration,
      trainer: training.trainer,
      supervisor: training.supervisor,
      site: training.site,
      department: training.department,
      attendees: training.attendees,
      maxAttendees: training.maxAttendees,
      status: training.status,
      attachments: training.attachments,
      feedback: training.feedback,
      location: training.location,
      objectives: training.objectives,
      supervisors: training.supervisors || [],
      managers: training.managers || [],
      createdBy: training.createdBy,
      createdAt: training.createdAt,
      updatedAt: training.updatedAt
    }));
    res.status(200).json({ success: true, trainings: transformedTrainings, total, page: pageNum, totalPages: Math.ceil(total / limitNum), filters: { department, status, type, search, startDate, endDate } });
  } catch (error: any) {
    console.error("Error fetching trainings:", error);
    res.status(500).json({ success: false, message: "Error fetching training sessions", error: error.message });
  }
};

export const getTrainingById = async (req: Request, res: Response) => {
  try {
    console.log(`GET /api/trainings/${req.params.id} called`);
    const training = await TrainingSession.findById(req.params.id);
    if (!training) return res.status(404).json({ success: false, message: "Training session not found" });
    const transformedTraining = {
      id: training._id.toString(),
      _id: training._id.toString(),
      title: training.title,
      description: training.description,
      type: training.type,
      date: training.date,
      time: training.time,
      duration: training.duration,
      trainer: training.trainer,
      supervisor: training.supervisor,
      site: training.site,
      department: training.department,
      attendees: training.attendees,
      maxAttendees: training.maxAttendees,
      status: training.status,
      attachments: training.attachments,
      feedback: training.feedback,
      location: training.location,
      objectives: training.objectives,
      supervisors: training.supervisors || [],
      managers: training.managers || [],
      createdBy: training.createdBy,
      createdAt: training.createdAt,
      updatedAt: training.updatedAt
    };
    res.status(200).json({ success: true, training: transformedTraining });
  } catch (error: any) {
    console.error("Error fetching training by ID:", error);
    res.status(500).json({ success: false, message: "Error fetching training session", error: error.message });
  }
};

export const createTraining = async (req: Request, res: Response) => {
  try {
    console.log("POST /api/trainings called");
    
    upload(req, res, async (err: any) => {
      if (err) {
        console.error("File upload error:", err);
        return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
      }
      
      try {
        let trainingData: any;
        try {
          trainingData = req.body.data ? JSON.parse(req.body.data) : req.body;
        } catch (parseError) {
          console.error("Parse error:", parseError);
          trainingData = req.body;
        }
        
        console.log("Training data received:", trainingData);
        
        const userType = req.headers['x-user-type'] as string || 'superadmin';
        
        const requiredFields = ["title", "date", "trainer"];
        const missingFields = requiredFields.filter(field => !trainingData[field]);
        
        if (missingFields.length > 0) {
          return res.status(400).json({ 
            success: false, 
            message: `Missing required fields: ${missingFields.join(", ")}` 
          });
        }
        
        const attachments: IAttachment[] = [];
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
          console.log(`Uploading ${files.length} files to Cloudinary`);
          const uploadPromises = files.map(async (file) => {
            try {
              const uploadResult = await uploadMultipleToCloudinary([{
                buffer: file.buffer,
                originalname: file.originalname
              }], "training-attachments");
              
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
        
        const trainingWithCreator = {
          title: trainingData.title,
          description: trainingData.description || '',
          type: trainingData.type || 'safety',
          date: trainingData.date,
          time: trainingData.time || '',
          duration: trainingData.duration || '',
          trainer: trainingData.trainer,
          supervisor: trainingData.supervisor || '',
          site: trainingData.site || '',
          department: trainingData.department || 'All Departments',
          attendees: trainingData.attendees || [],
          maxAttendees: trainingData.maxAttendees || 20,
          status: trainingData.status || 'scheduled',
          attachments: attachments,
          feedback: trainingData.feedback || [],
          location: trainingData.location || '',
          objectives: trainingData.objectives || [],
          supervisors: trainingData.supervisors || [],
          managers: trainingData.managers || [],
          createdBy: userType
        };
        
        console.log("Saving training to database...");
        const training = new TrainingSession(trainingWithCreator);
        await training.save();
        
        const transformedTraining = {
          id: training._id.toString(),
          _id: training._id.toString(),
          title: training.title,
          description: training.description,
          type: training.type,
          date: training.date,
          time: training.time,
          duration: training.duration,
          trainer: training.trainer,
          supervisor: training.supervisor,
          site: training.site,
          department: training.department,
          attendees: training.attendees,
          maxAttendees: training.maxAttendees,
          status: training.status,
          attachments: training.attachments,
          feedback: training.feedback,
          location: training.location,
          objectives: training.objectives,
          supervisors: training.supervisors || [],
          managers: training.managers || [],
          createdBy: training.createdBy,
          createdAt: training.createdAt,
          updatedAt: training.updatedAt
        };
        
        console.log("Training session created successfully:", transformedTraining.id);
        res.status(201).json({ 
          success: true, 
          message: "Training session created successfully", 
          training: transformedTraining 
        });
      } catch (error: any) {
        console.error("Error creating training:", error);
        res.status(500).json({ 
          success: false, 
          message: "Error creating training session", 
          error: error.message 
        });
      }
    });
  } catch (error: any) {
    console.error("Error in createTraining:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error creating training session", 
      error: error.message 
    });
  }
};

export const updateTraining = async (req: Request, res: Response) => {
  try {
    console.log(`PUT /api/trainings/${req.params.id} called`);
    
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
        
        const existingTraining = await TrainingSession.findById(id);
        if (!existingTraining) {
          return res.status(404).json({ success: false, message: "Training session not found" });
        }
        
        // Handle new file uploads
        let newAttachments: IAttachment[] = [];
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
          console.log(`Uploading ${files.length} new files to Cloudinary`);
          const uploadPromises = files.map(async (file) => {
            try {
              const uploadResult = await uploadMultipleToCloudinary([{
                buffer: file.buffer,
                originalname: file.originalname
              }], "training-attachments");
              
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
        
        // Combine existing attachments with new ones
        const existingAttachments = updateData.attachments || existingTraining.attachments || [];
        const allAttachments = [...existingAttachments, ...newAttachments];
        
        const training = await TrainingSession.findByIdAndUpdate(
          id, 
          { 
            ...updateData, 
            attachments: allAttachments,
            updatedAt: new Date() 
          }, 
          { new: true, runValidators: true }
        );
        
        if (!training) {
          return res.status(404).json({ success: false, message: "Training session not found after update" });
        }
        
        const transformedTraining = {
          id: training._id.toString(),
          _id: training._id.toString(),
          title: training.title,
          description: training.description,
          type: training.type,
          date: training.date,
          time: training.time,
          duration: training.duration,
          trainer: training.trainer,
          supervisor: training.supervisor,
          site: training.site,
          department: training.department,
          attendees: training.attendees,
          maxAttendees: training.maxAttendees,
          status: training.status,
          attachments: training.attachments,
          feedback: training.feedback,
          location: training.location,
          objectives: training.objectives,
          supervisors: training.supervisors || [],
          managers: training.managers || [],
          createdBy: training.createdBy,
          createdAt: training.createdAt,
          updatedAt: training.updatedAt
        };
        
        res.status(200).json({ 
          success: true, 
          message: "Training session updated successfully", 
          training: transformedTraining 
        });
      } catch (error: any) {
        console.error("Error updating training:", error);
        res.status(500).json({ success: false, message: "Error updating training session", error: error.message });
      }
    });
  } catch (error: any) {
    console.error("Error in updateTraining:", error);
    res.status(500).json({ success: false, message: "Error updating training session", error: error.message });
  }
};

export const updateTrainingStatus = async (req: Request, res: Response) => {
  try {
    console.log(`PUT /api/trainings/${req.params.id}/status called`);
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) return res.status(400).json({ success: false, message: "Status is required" });
    
    const training = await TrainingSession.findByIdAndUpdate(
      id, 
      { status, updatedAt: new Date() }, 
      { new: true, runValidators: true }
    );
    
    if (!training) return res.status(404).json({ success: false, message: "Training session not found" });
    
    res.status(200).json({ 
      success: true, 
      message: `Training status updated to ${status}`, 
      training: { id: training._id.toString(), status: training.status } 
    });
  } catch (error: any) {
    console.error("Error updating training status:", error);
    res.status(500).json({ success: false, message: "Error updating training status", error: error.message });
  }
};

export const addAttendee = async (req: Request, res: Response) => {
  try {
    console.log(`POST /api/trainings/${req.params.id}/attendees called`);
    const { id } = req.params;
    const { employeeId, employeeName } = req.body;
    
    if (!employeeId) return res.status(400).json({ success: false, message: "Employee ID is required" });
    
    const training = await TrainingSession.findById(id);
    if (!training) return res.status(404).json({ success: false, message: "Training session not found" });
    
    if (training.attendees.includes(employeeId)) {
      return res.status(400).json({ success: false, message: "Employee already added to this training" });
    }
    
    if (training.attendees.length >= training.maxAttendees) {
      return res.status(400).json({ success: false, message: "Training session is full" });
    }
    
    training.attendees.push(employeeId);
    await training.save();
    
    res.status(200).json({ 
      success: true, 
      message: "Attendee added successfully", 
      attendees: training.attendees, 
      attendeesCount: training.attendees.length 
    });
  } catch (error: any) {
    console.error("Error adding attendee:", error);
    res.status(500).json({ success: false, message: "Error adding attendee", error: error.message });
  }
};

export const addFeedback = async (req: Request, res: Response) => {
  try {
    console.log(`POST /api/trainings/${req.params.id}/feedback called`);
    const { id } = req.params;
    const { employeeId, employeeName, rating, comment } = req.body;
    
    if (!employeeId || !rating) {
      return res.status(400).json({ success: false, message: "Employee ID and rating are required" });
    }
    
    const training = await TrainingSession.findById(id);
    if (!training) return res.status(404).json({ success: false, message: "Training session not found" });
    
    const feedback = { 
      employeeId, 
      employeeName: employeeName || "Anonymous", 
      rating, 
      comment: comment || "", 
      submittedAt: new Date() 
    };
    
    training.feedback.push(feedback);
    await training.save();
    
    res.status(200).json({ success: true, message: "Feedback added successfully", feedback });
  } catch (error: any) {
    console.error("Error adding feedback:", error);
    res.status(500).json({ success: false, message: "Error adding feedback", error: error.message });
  }
};

export const deleteTraining = async (req: Request, res: Response) => {
  try {
    console.log(`DELETE /api/trainings/${req.params.id} called`);
    const { id } = req.params;
    
    const training = await TrainingSession.findById(id);
    if (!training) return res.status(404).json({ success: false, message: "Training session not found" });
    
    if (training.attachments && training.attachments.length > 0) {
      for (const attachment of training.attachments) {
        if (attachment.url) {
          const publicId = attachment.url.split('/').slice(-2).join('/').split('.')[0];
          await deleteFromCloudinary(publicId);
        }
      }
    }
    
    await TrainingSession.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Training session deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting training:", error);
    res.status(500).json({ success: false, message: "Error deleting training session", error: error.message });
  }
};

export const getTrainingStats = async (req: Request, res: Response) => {
  try {
    console.log("GET /api/trainings/stats called");
    const [totalTrainings, trainingsByStatus, trainingsByType, trainingsByDepartment] = await Promise.all([
      TrainingSession.countDocuments(),
      TrainingSession.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      TrainingSession.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
      TrainingSession.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }])
    ]);
    
    const completedTrainings = trainingsByStatus.find(s => s._id === 'completed')?.count || 0;
    const scheduledTrainings = trainingsByStatus.find(s => s._id === 'scheduled')?.count || 0;
    const ongoingTrainings = trainingsByStatus.find(s => s._id === 'ongoing')?.count || 0;
    const cancelledTrainings = trainingsByStatus.find(s => s._id === 'cancelled')?.count || 0;
    
    res.status(200).json({
      success: true,
      data: {
        totalTrainings,
        completedTrainings,
        scheduledTrainings,
        ongoingTrainings,
        cancelledTrainings,
        trainingsByStatus: trainingsByStatus.reduce((acc: any, curr) => { acc[curr._id] = curr.count; return acc; }, {}),
        trainingsByType: trainingsByType.reduce((acc: any, curr) => { acc[curr._id] = curr.count; return acc; }, {}),
        trainingsByDepartment: trainingsByDepartment.reduce((acc: any, curr) => { acc[curr._id] = curr.count; return acc; }, {})
      }
    });
  } catch (error: any) {
    console.error("Error fetching training stats:", error);
    res.status(500).json({ success: false, message: "Error fetching training statistics", error: error.message });
  }
};