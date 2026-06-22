import { Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import Attendance, { IAttendance } from '../models/attendance';
import Employee, { IEmployee } from '../models/Employee';
import { uploadAttendancePhoto, deleteFromCloudinary } from '../utils/CloudinaryUtils';
import axios from 'axios';
import FormData from 'form-data';
import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import path from 'path';

// ------------------ Types and helpers ------------------
let modelsLoaded = false;

async function loadFaceModels() {
  if (modelsLoaded) return;
  const { Canvas, Image, ImageData } = canvas;
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
  const modelsPath = path.join(process.cwd(), 'models');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
  modelsLoaded = true;
  console.log('✅ Face models loaded');
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

function calculateHours(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return (end - start) / (1000 * 60 * 60);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ------------------ Multer config ------------------
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Auto-attendance: recognize face + checkin/checkout in one API call
export const autoAttendance = async (req: Request, res: Response) => {
  console.log('🔵 autoAttendance called');
  console.log('🔍 [autoAttendance] req.file:', req.file);
console.log('🔍 [autoAttendance] req.body:', req.body);
  try {
    const { supervisorId, siteName } = req.body;
    const photoFile = req.file;

    if (!photoFile) {
      return res.status(400).json({ success: false, message: 'Photo is required' });
    }

    // 1. Call face recognition service (your Python endpoint)
    const formData = new FormData();
    formData.append('file', photoFile.buffer, { filename: 'photo.jpg' });
    const pyRes = await axios.post<{ success: boolean; message?: string; data?: any }>('http://localhost:8000/match', formData, {
  headers: { ...formData.getHeaders() },
  timeout: 60000,
});
    const matchData = pyRes.data as { success: boolean; message?: string; data?: any };
console.log('🐍 Python /match full response:', JSON.stringify(matchData));
    if (!matchData.success) {
      return res.status(400).json({ success: false, message: matchData.message || 'Face not recognised' });
    }
    const payload = matchData.data || matchData;
const { employeeId, employeeName } = payload;
    // 2. Check today's attendance status
    const today = formatDate(new Date());
    const  attendance = await Attendance.findOne({ employeeId, date: today });

    let action = 'checkin';
    let updateData: any = {};

    if (attendance) {
      if (attendance.checkOutTime) {
        return res.status(400).json({ success: false, message: `${employeeName} already checked out today` });
      }
      if (attendance.checkInTime && !attendance.checkOutTime) {
        // Already checked in → check out
        action = 'checkout';
        const checkOutTime = new Date().toISOString();
        const totalHours = calculateHours(attendance.checkInTime, checkOutTime);
        updateData = {
          checkOutTime,
          isCheckedIn: false,
          isOnBreak: false,
          totalHours,
          hasCheckedOutToday: true,
          updatedAt: new Date(),
        };
      } else {
        // No checkin yet → check in
        action = 'checkin';
        const checkInTime = new Date().toISOString();
        // Upload photo to Cloudinary (optional)
        let photoUrl = '', photoPublicId = '';
        try {
          const uploadResult = await uploadAttendancePhoto(photoFile.buffer, employeeId, employeeName, 'checkin');
          photoUrl = uploadResult.secure_url;
          photoPublicId = uploadResult.public_id;
        } catch (uploadError: any) {
          console.warn('Photo upload failed, proceeding without photo:', uploadError.message);
        }
        updateData = {
          checkInTime,
          isCheckedIn: true,
          isOnBreak: false,
          checkInPhoto: photoUrl || null,
          hasCheckedInToday: true,
          hasCheckedOutToday: false,
          updatedAt: new Date(),
        };
      }
    } else {
      // No record today → check in
      action = 'checkin';
      const checkInTime = new Date().toISOString();
      let photoUrl = '', photoPublicId = '';
      try {
        const uploadResult = await uploadAttendancePhoto(photoFile.buffer, employeeId, employeeName, 'checkin');
        photoUrl = uploadResult.secure_url;
        photoPublicId = uploadResult.public_id;
      } catch (uploadError: any) {
        console.warn('Photo upload failed, proceeding without photo:', uploadError.message);
      }

      // Get employee details
      const employee = await Employee.findById(employeeId);
      updateData = {
        employeeId,
        employeeName,
        date: today,
        checkInTime,
        isCheckedIn: true,
        isOnBreak: false,
        checkInPhoto: photoUrl || null,
        hasCheckedInToday: true,
        hasCheckedOutToday: false,
        supervisorId: supervisorId || null,
        department: employee?.department || 'General',
        siteName: employee?.siteName || null,
        status: 'present',
        totalHours: 0,
        breakTime: 0,
        updatedAt: new Date(),
      };
    }

    // 3. Save/update attendance
    let result;
    if (attendance) {
      result = await Attendance.findByIdAndUpdate(attendance._id, updateData, { new: true });
    } else {
      result = await Attendance.create(updateData);
    }

    res.json({
      success: true,
      data: {
        employeeId,
        employeeName,
        action,
        message: `${employeeName} ${action}ed successfully`,
      },
    });
  } catch (error: any) {
    console.error('❌ autoAttendance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const faceRecognize = async (req: Request, res: Response) => {
  console.log('🔵 faceRecognize controller reached');
  try {
    const photoFile = req.file;
    if (!photoFile) {
      return res.status(400).json({ success: false, message: 'Photo is required' });
    }

    const formData = new FormData();
    formData.append('file', photoFile.buffer, { filename: 'photo.jpg' });
    const pyRes = await axios.post<{ success: boolean; message?: string; data?: any }>('http://localhost:8000/embedding', formData, {
      headers: { ...formData.getHeaders() },
      timeout: 60000,
    });

    const data = pyRes.data as { success: boolean; message?: string; embedding?: number[] };
    if (!data.success) {
      return res.status(400).json({ success: false, message: data.message });
    }
    const capturedEmbedding = data.embedding!;

    const employees = await Employee.find({
      faceEmbeddings: { $exists: true, $not: { $size: 0 } },
    });

    let bestMatch: IEmployee | null = null;
    let bestScore = 0.45;

    for (const emp of employees) {
      // ✅ Safe guard
      if (!emp.faceEmbeddings || emp.faceEmbeddings.length === 0) continue;
      for (const storedEmb of emp.faceEmbeddings) {
        const sim = cosineSimilarity(capturedEmbedding, storedEmb);
        if (sim > bestScore) {
          bestScore = sim;
          bestMatch = emp;
        }
      }
    }

    if (!bestMatch) {
      return res.status(404).json({ success: false, message: 'Face not recognized' });
    }

    res.json({
      success: true,
      data: { employeeId: bestMatch._id, employeeName: bestMatch.name },
    });
  } catch (error: any) {
    console.error('Face recognition error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const registerFace = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const photoFile = req.file;
    if (!photoFile) {
      return res.status(400).json({ success: false, message: 'Photo required' });
    }

    const formData = new FormData();
    formData.append('file', photoFile.buffer, { filename: 'photo.jpg' });
    const pyRes = await axios.post('http://localhost:8000/embedding', formData, {
      headers: { ...formData.getHeaders() },
      timeout: 60000,
    });

    console.log('🐍 Python /embedding response:', JSON.stringify(pyRes.data));

    const data = pyRes.data as { success: boolean; message?: string; embedding?: number[] };
    if (!data.success) {
      return res.status(400).json({ success: false, message: data.message });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!employee.faceEmbeddings) employee.faceEmbeddings = [];
    employee.faceEmbeddings.push(data.embedding!);
    await employee.save();

    console.log(`✅ Saved embedding for ${employee.name}, total: ${employee.faceEmbeddings.length}`);

    // ✅ Tell Python to reload so new face is immediately matchable
    try {
      await axios.post('http://localhost:8000/reload');
      console.log('✅ Python FAISS index reloaded');
    } catch (e) {
      console.warn('⚠️ Could not reload Python index (non-fatal)');
    }

    res.json({ success: true, message: 'Face registered successfully' });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ------------------ Attendance CRUD ------------------
export const checkInWithPhoto = async (req: Request, res: Response) => {
  console.log('🔵 checkInWithPhoto called');
  console.log('req.body:', req.body);
  console.log('req.file:', req.file ? 'present' : 'missing');
  
  try {
    const { employeeId, employeeName, supervisorId, latitude, longitude } = req.body;
    const photoFile = req.file;

    if (!employeeId || !employeeName) {
      return res.status(400).json({ success: false, message: 'Employee ID and name are required' });
    }
    if (!photoFile) {
      return res.status(400).json({ success: false, message: 'Photo is required for check-in' });
    }

    const today = formatDate(new Date());
    const existingAttendance = await Attendance.findOne({ employeeId, date: today });
    if (existingAttendance?.isCheckedIn) {
      return res.status(400).json({ success: false, message: 'Already checked in for today' });
    }

    let photoUrl = '', photoPublicId = '';
    try {
      const uploadResult = await uploadAttendancePhoto(photoFile.buffer, employeeId, employeeName, 'checkin');
      photoUrl = uploadResult.secure_url;
      photoPublicId = uploadResult.public_id;
    } catch (uploadError: any) {
      console.error('Photo upload error:', uploadError);
      return res.status(500).json({ success: false, message: `Failed to upload photo: ${uploadError.message}` });
    }

    const checkInTime = new Date().toISOString();
    let attendance: IAttendance | null;

    if (existingAttendance) {
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        {
          checkInTime,
          checkInPhoto: photoUrl,
          isCheckedIn: true,
          status: 'present',
          latitude: latitude || null,
          longitude: longitude || null,
          updatedAt: new Date(),
        },
        { new: true }
      );
    } else {
      const employee = await Employee.findById(employeeId);
      attendance = await Attendance.create({
        employeeId,
        employeeName,
        date: today,
        checkInTime,
        checkInPhoto: photoUrl,
        checkOutTime: null,
        checkOutPhoto: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 0,
        breakTime: 0,
        status: 'present',
        isCheckedIn: true,
        isOnBreak: false,
        supervisorId: supervisorId || null,
        department: employee?.department || 'General',
        siteName: employee?.siteName || null,
        latitude: latitude || null,
        longitude: longitude || null,
         checkInLatitude:  latitude  ? Number(latitude)  : null,
  checkInLongitude: longitude ? Number(longitude) : null,
  currentLatitude:  latitude  ? Number(latitude)  : null,
  currentLongitude: longitude ? Number(longitude) : null,
  lastLocationUpdate: new Date(),
  isLocationTracking: !!(latitude && longitude),
  isOutOfGeofence: false,
      });
    }

    if (!attendance) {
      return res.status(500).json({ success: false, message: 'Failed to update/create attendance record' });
    }

    res.status(200).json({
      success: true,
      message: 'Checked in successfully with photo',
      data: { ...attendance.toJSON(), checkInPhoto: photoUrl },
    });
 } catch (error: any) {
  console.error('❌ checkInWithPhoto error:', error);
  res.status(500).json({ success: false, message: error.message });
}
};

export const checkOutWithPhoto = async (req: Request, res: Response) => {
  try {
    const { employeeId, latitude, longitude } = req.body;
    const photoFile = req.file;

    if (!employeeId) return res.status(400).json({ success: false, message: 'Employee ID is required' });
    if (!photoFile) return res.status(400).json({ success: false, message: 'Photo is required for check-out' });

    const today = formatDate(new Date());
    const checkOutTime = new Date().toISOString();

    const attendance = await Attendance.findOne({ employeeId, date: today, isCheckedIn: true });
    if (!attendance) return res.status(404).json({ success: false, message: 'No active check-in found' });

    let photoUrl = '', photoPublicId = '';
    try {
      const uploadResult = await uploadAttendancePhoto(photoFile.buffer, employeeId, attendance.employeeName, 'checkout');
      photoUrl = uploadResult.secure_url;
      photoPublicId = uploadResult.public_id;
    } catch (uploadError: any) {
      console.error('Photo upload error:', uploadError);
      return res.status(500).json({ success: false, message: `Failed to upload photo: ${uploadError.message}` });
    }

    const totalHours = calculateHours(attendance.checkInTime, checkOutTime);
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        checkOutTime,
        checkOutPhoto: photoUrl,
        isCheckedIn: false,
        isOnBreak: false,
        totalHours,
        latitude: latitude || null,
        longitude: longitude || null,
          isLocationTracking: false,      // <-- add
    isOutOfGeofence: false,         // <-- add
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(500).json({ success: false, message: 'Failed to update attendance record' });
    }

    res.status(200).json({
      success: true,
      message: 'Checked out successfully with photo',
      data: updatedAttendance,
      totalHours: totalHours.toFixed(2),
      checkOutPhoto: photoUrl,
    });
  } catch (error: any) {
    console.error('❌ Check-out error:', error.message);
    res.status(500).json({ success: false, message: 'Error checking out', error: error.message });
  }
};


export const checkIn = async (req: Request, res: Response) => {
  try {
   const { employeeId, employeeName, supervisorId, latitude, longitude } = req.body;

    
    if (!employeeId || !employeeName) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and name are required',
      });
    }

    const today = formatDate(new Date());

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: today,
    });

    if (existingAttendance?.isCheckedIn) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in for today',
      });
    }

    const checkInTime = new Date().toISOString();

    let attendance: IAttendance | null;
    
    if (existingAttendance) {
      // Update existing record
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        {
          checkInTime,
          isCheckedIn: true,
          status: 'present',
          updatedAt: new Date(),
        },
        { new: true }
      );
      
      if (!attendance) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update attendance record',
        });
      }
    } else {
      // Get employee details for department/site
      const employee = await Employee.findById(employeeId);
      
      // Create new attendance record
      attendance = await Attendance.create({
        employeeId,
        employeeName,
        date: today,
        checkInTime,
        checkOutTime: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 0,
        breakTime: 0,
        status: 'present',
        isCheckedIn: true,
        isOnBreak: false,
        supervisorId: supervisorId || null,
        department: employee?.department || 'General',
        siteName: employee?.siteName || null,
         checkInLatitude:  latitude  ? Number(latitude)  : null,
  checkInLongitude: longitude ? Number(longitude) : null,
  currentLatitude:  latitude  ? Number(latitude)  : null,
  currentLongitude: longitude ? Number(longitude) : null,
  lastLocationUpdate: new Date(),
  isLocationTracking: !!(latitude && longitude),
  isOutOfGeofence: false,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Checked in successfully',
      data: attendance,
    });
  } catch (error: any) {
    console.error('❌ Check-in error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error checking in',
      error: error.message,
    });
  }
};

// Regular check out (without photo) - for backward compatibility
export const checkOut = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = formatDate(new Date());
    const checkOutTime = new Date().toISOString();

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
      isCheckedIn: true,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No active check-in found',
      });
    }

    // Calculate total hours
    const totalHours = calculateHours(attendance.checkInTime, checkOutTime);
    
    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        checkOutTime,
        isCheckedIn: false,
        isOnBreak: false,
        totalHours,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update attendance record',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      data: updatedAttendance,
      totalHours: totalHours.toFixed(2),
    });
  } catch (error: any) {
    console.error('❌ Check-out error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error checking out',
      error: error.message,
    });
  }
};

// Break in (no photo required for break)
export const breakIn = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = formatDate(new Date());
    const breakStartTime = new Date().toISOString();

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
      isCheckedIn: true,
      isOnBreak: false,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No active check-in found or already on break',
      });
    }

    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        breakStartTime,
        isOnBreak: true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update break status',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Break started successfully',
      data: updatedAttendance,
    });
  } catch (error: any) {
    console.error('❌ Break-in error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error starting break',
      error: error.message,
    });
  }
};

// Break out (no photo required for break)
export const breakOut = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const today = formatDate(new Date());
    const breakEndTime = new Date().toISOString();

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
      isCheckedIn: true,
      isOnBreak: true,
    });

    if (!attendance || !attendance.breakStartTime) {
      return res.status(404).json({
        success: false,
        message: 'No active break found',
      });
    }

    // Calculate break duration
    const breakDuration = calculateHours(attendance.breakStartTime, breakEndTime);
    const totalBreakTime = (attendance.breakTime || 0) + breakDuration;

    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        breakEndTime,
        isOnBreak: false,
        breakTime: totalBreakTime,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update break status',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Break ended successfully',
      data: updatedAttendance,
      breakDuration: breakDuration.toFixed(2),
    });
  } catch (error: any) {
    console.error('❌ Break-out error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error ending break',
      error: error.message,
    });
  }
};

// Get today's attendance status
export const getTodayStatus = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    const today = formatDate(new Date());
    const attendance = await Attendance.findOne({ employeeId, date: today });

    if (!attendance) {
      return res.status(200).json({
        success: true,
        data: {
          isCheckedIn: false,
          isOnBreak: false,
          hasCheckedInToday: false,
          hasCheckedOutToday: false,
          checkInTime: null,
          checkOutTime: null,
          checkInPhoto: null,
          checkOutPhoto: null,
          breakStartTime: null,
          breakEndTime: null,
          totalHours: 0,
          breakTime: 0,
          lastCheckInDate: null
        }
      });
    }

    const hasCheckedInToday = !!attendance.checkInTime;
    const hasCheckedOutToday = !!attendance.checkOutTime;

    res.status(200).json({
      success: true,
      data: {
        isCheckedIn: attendance.isCheckedIn || false,
        isOnBreak: attendance.isOnBreak || false,
        hasCheckedInToday,
        hasCheckedOutToday,
        checkInTime: attendance.checkInTime || null,
        checkOutTime: attendance.checkOutTime || null,
        checkInPhoto: attendance.checkInPhoto || null,
        checkOutPhoto: attendance.checkOutPhoto || null,
        breakStartTime: attendance.breakStartTime || null,
        breakEndTime: attendance.breakEndTime || null,
        totalHours: attendance.totalHours || 0,
        breakTime: attendance.breakTime || 0,
        lastCheckInDate: attendance.date
      }
    });
  } catch (error: any) {
    console.error('❌ Get status error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
 


// Get attendance history
export const getAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const { employeeId, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const query: any = { employeeId: employeeId.toString() };
    
    if (startDate && endDate) {
      query.date = {
        $gte: startDate.toString(),
        $lte: endDate.toString(),
      };
    }

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    const [attendanceHistory, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Attendance.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      message: 'Attendance history retrieved',
      data: attendanceHistory,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('❌ Get history error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance history',
      error: error.message,
    });
  }
};

// Get team attendance
export const getTeamAttendance = async (req: Request, res: Response) => {
  try {
    const { supervisorId, date } = req.query;
    
    if (!supervisorId) {
      return res.status(400).json({
        success: false,
        message: 'Supervisor ID is required',
      });
    }

    const queryDate = date ? date.toString() : formatDate(new Date());
    
    const teamAttendance = await Attendance.find({
      date: queryDate,
      supervisorId: supervisorId.toString(),
    }).sort({ checkInTime: -1 });

    res.status(200).json({
      success: true,
      message: 'Team attendance retrieved',
      data: teamAttendance,
      date: queryDate,
      total: teamAttendance.length,
    });
  } catch (error: any) {
    console.error('❌ Get team attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving team attendance',
      error: error.message,
    });
  }
};

// Get all attendance
export const getAllAttendance = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, date, employeeId, startDate, endDate } = req.query;
    
    const query: any = {};
    
    if (date) {
      query.date = date.toString();
    }
    
    if (employeeId) {
      query.employeeId = employeeId.toString();
    }

    if (startDate && endDate) {
      query.date = {
        $gte: startDate.toString(),
        $lte: endDate.toString(),
      };
    }

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    const [attendanceRecords, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Attendance.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      message: 'Attendance records retrieved',
      data: attendanceRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('❌ Get all attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance records',
      error: error.message,
    });
  }
};

// Update attendance
export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance ID',
      });
    }

    // Calculate total hours if both check-in and check-out times are provided
    if (updateData.checkInTime && updateData.checkOutTime) {
      updateData.totalHours = calculateHours(
        updateData.checkInTime,
        updateData.checkOutTime
      );
    }

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedAttendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: updatedAttendance,
    });
  } catch (error: any) {
    console.error('❌ Update attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating attendance',
      error: error.message,
    });
  }
};

// Manual attendance entry
export const manualAttendance = async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      employeeName,
      date,
      checkInTime,
      checkOutTime,
      checkInPhoto,
      checkOutPhoto,
      breakStartTime,
      breakEndTime,
      status,
      remarks,
      totalHours = 0,
      isCheckedIn = false,
      supervisorId
    } = req.body;

    if (!employeeId || !employeeName || !date) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, name, and date are required',
      });
    }

    // Validate date
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    const formattedDate = formatDate(attendanceDate);

    // Get employee details
    const employee = await Employee.findById(employeeId);

    // Check if record already exists
    const existingRecord = await Attendance.findOne({
      employeeId,
      date: formattedDate,
    });

    let attendance;
    
    if (existingRecord) {
      // Update existing record
      attendance = await Attendance.findByIdAndUpdate(
        existingRecord._id,
        {
          employeeName,
          checkInTime,
          checkOutTime,
          checkInPhoto,
          checkOutPhoto,
          breakStartTime,
          breakEndTime,
          status,
          remarks,
          totalHours,
          isCheckedIn: isCheckedIn && !checkOutTime,
          isOnBreak: !!breakStartTime && !breakEndTime,
          supervisorId: supervisorId || existingRecord.supervisorId,
          department: employee?.department || existingRecord.department,
          siteName: employee?.siteName || existingRecord.siteName,
          updatedAt: new Date(),
        },
        { new: true }
      );
    } else {
      // Create new record
      attendance = await Attendance.create({
        employeeId,
        employeeName,
        date: formattedDate,
        checkInTime,
        checkOutTime,
        checkInPhoto,
        checkOutPhoto,
        breakStartTime,
        breakEndTime,
        status: status || 'present',
        remarks: remarks || '',
        totalHours,
        isCheckedIn: isCheckedIn && !checkOutTime,
        isOnBreak: !!breakStartTime && !breakEndTime,
        supervisorId: supervisorId || null,
        department: employee?.department || 'General',
        siteName: employee?.siteName || null,
        
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: attendance,
    });
  } catch (error: any) {
    console.error('❌ Manual attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error recording attendance',
      error: error.message,
    });
  }
};

// Update attendance status (for supervisors)
export const updateAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const { 
      employeeId, 
      attendanceId, 
      date, 
      status, 
      remarks, 
      supervisorId,
      employeeName 
    } = req.body;

    console.log('📝 Updating attendance status:', {
      employeeId,
      attendanceId,
      date,
      status,
      remarks,
      supervisorId,
      employeeName
    });

    // Validate required fields
    if (!employeeId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeId, date, and status are required'
      });
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'half-day', 'leave', 'weekly-off'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: present, absent, half-day, leave, weekly-off'
      });
    }

    // Parse and validate date
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const formattedDate = formatDate(attendanceDate);

    // Check if attendance record exists
    let attendanceRecord;
    
    if (attendanceId && mongoose.Types.ObjectId.isValid(attendanceId)) {
      // Update existing record by ID
      attendanceRecord = await Attendance.findById(attendanceId);
      
      if (!attendanceRecord) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }
      
      // Update the record
      attendanceRecord.status = status as any;
      if (remarks !== undefined) attendanceRecord.remarks = remarks;
      if (supervisorId) attendanceRecord.supervisorId = supervisorId;
      
      await attendanceRecord.save();
      
    } else {
      // Check if record exists for this employee and date
      attendanceRecord = await Attendance.findOne({
        employeeId,
        date: formattedDate
      });
      
      if (attendanceRecord) {
        // Update existing record
        attendanceRecord.status = status as any;
        if (remarks !== undefined) attendanceRecord.remarks = remarks;
        if (supervisorId) attendanceRecord.supervisorId = supervisorId;
        
        await attendanceRecord.save();
      } else {
        // Try to get employee name if not provided
        let finalEmployeeName = employeeName;
        let employeeDepartment = 'General';
        let employeeSiteName = null;
        
        if (!finalEmployeeName) {
          const employee = await Employee.findById(employeeId);
          finalEmployeeName = employee?.name || 'Unknown Employee';
          employeeDepartment = employee?.department || 'General';
          employeeSiteName = employee?.siteName || null;
        }

        // Create new attendance record
        const newAttendance = new Attendance({
          employeeId,
          employeeName: finalEmployeeName,
          date: formattedDate,
          status,
          remarks: remarks || '',
          supervisorId: supervisorId || null,
          isCheckedIn: false,
          isOnBreak: false,
          checkInTime: null,
          checkOutTime: null,
          checkInPhoto: null,
          checkOutPhoto: null,
          breakStartTime: null,
          breakEndTime: null,
          totalHours: 0,
          breakTime: 0,
          department: employeeDepartment,
          siteName: employeeSiteName
        });
        
        attendanceRecord = await newAttendance.save();
      }
    }

    console.log('✅ Attendance status updated successfully:', {
      id: attendanceRecord._id,
      employeeId: attendanceRecord.employeeId,
      status: attendanceRecord.status,
      date: attendanceRecord.date
    });

    return res.status(200).json({
      success: true,
      message: `Attendance status updated to ${status} successfully`,
      data: attendanceRecord
    });

  } catch (error: any) {
    console.error('❌ Error updating attendance status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while updating attendance status'
    });
  }
};

// Get weekly summary
export const getWeeklySummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    // Get all attendance records for the week
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: startDate.toString(),
        $lte: endDate.toString(),
      },
    });

    // Group by employee
    const employeeMap = new Map();
    
    attendanceRecords.forEach(record => {
      if (!employeeMap.has(record.employeeId)) {
        employeeMap.set(record.employeeId, {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          department: record.department || 'Unknown',
          weekStartDate: startDate,
          weekEndDate: endDate,
          daysPresent: 0,
          daysAbsent: 0,
          daysHalfDay: 0,
          daysLeave: 0,
          daysWeeklyOff: 0,
          totalHours: 0,
          totalBreakTime: 0,
        });
      }
      
      const employeeData = employeeMap.get(record.employeeId);
      
      switch (record.status) {
        case 'present':
          employeeData.daysPresent++;
          employeeData.totalHours += record.totalHours || 0;
          break;
        case 'absent':
          employeeData.daysAbsent++;
          break;
        case 'half-day':
          employeeData.daysHalfDay++;
          employeeData.totalHours += record.totalHours || 0;
          break;
        case 'leave':
          employeeData.daysLeave++;
          break;
        case 'weekly-off':
          employeeData.daysWeeklyOff++;
          break;
      }
      
      employeeData.totalBreakTime += record.breakTime || 0;
    });

    // Convert map to array and determine overall status
    const weeklySummaries = Array.from(employeeMap.values()).map(emp => {
      let overallStatus: 'present' | 'absent' | 'mixed' = 'absent';
      
      if (emp.daysPresent > 0 || emp.daysHalfDay > 0) {
        overallStatus = emp.daysPresent >= 5 ? 'present' : 'mixed';
      }
      
      return {
        ...emp,
        overallStatus
      };
    });

    res.status(200).json({
      success: true,
      message: 'Weekly summary retrieved',
      data: weeklySummaries,
    });
  } catch (error: any) {
    console.error('❌ Weekly summary error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving weekly summary',
      error: error.message,
    });
  }
};

async function recognizeFace(imageBuffer: Buffer): Promise<string | null> {
  try {
    await loadFaceModels();

    const img = await canvas.loadImage(imageBuffer);
    const detection = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;

    const queryDescriptor = detection.descriptor;
    const employees = await Employee.find({ faceDescriptor: { $ne: null } });

    let bestMatch: string | null = null;
    let bestDistance = 0.6; // threshold

    for (const emp of employees) {
      // Skip if face descriptor is invalid
      if (!emp.faceDescriptor || !Array.isArray(emp.faceDescriptor) || emp.faceDescriptor.length === 0) {
        continue;
      }
      if (!emp.faceDescriptor.every(v => typeof v === 'number' && isFinite(v))) {
        continue;
      }

      const storedDescriptor = new Float32Array(emp.faceDescriptor);
      const distance = faceapi.euclideanDistance(queryDescriptor, storedDescriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = emp._id.toString();
      }
    }

    console.log(`Face recognition result: ${bestMatch}, distance: ${bestDistance}`);
    return bestMatch;
  } catch (error) {
    console.error('Face recognition error:', error);
    return null;
  }
}

// ==================== Geofencing ====================

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const updateEmployeeLocation = async (req: Request, res: Response) => {
  try {
    const { employeeId, latitude, longitude } = req.body;

    if (!employeeId || latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, latitude, and longitude are required',
      });
    }

    const today = formatDate(new Date());
    const record = await Attendance.findOne({
      employeeId,
      date: today,
      isCheckedIn: true,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No active check‑in found for today',
      });
    }

    const wasOutOfGeofence = record.isOutOfGeofence || false;
    let isOutOfGeofence = false;
    let distanceKm = 0;

    if (record.checkInLatitude != null && record.checkInLongitude != null) {
      distanceKm = haversineKm(
        record.checkInLatitude,
        record.checkInLongitude,
        Number(latitude),
        Number(longitude),
      );
      isOutOfGeofence = distanceKm > 0.5; // 0.5 km threshold
    }

    await Attendance.findByIdAndUpdate(record._id, {
      currentLatitude: Number(latitude),
      currentLongitude: Number(longitude),
      lastLocationUpdate: new Date(),
      isOutOfGeofence,
    });

    const justLeft = !wasOutOfGeofence && isOutOfGeofence;

    res.json({
      success: true,
      data: {
        isOutOfGeofence,
        distanceKm: Math.round(distanceKm * 1000) / 1000,
        justLeft, // only true when crossing from inside to outside
        employeeName: record.employeeName,
        siteName: record.siteName,
      },
    });
  } catch (error: any) {
    console.error('updateEmployeeLocation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGeofenceBreaches = async (req: Request, res: Response) => {
  try {
    const today = formatDate(new Date());
    const breaches = await Attendance.find({
      date: today,
      isCheckedIn: true,
      isOutOfGeofence: true,
    }).select(
      'employeeId employeeName siteName currentLatitude currentLongitude checkInLatitude checkInLongitude lastLocationUpdate'
    );

    res.json({ success: true, data: breaches });
  } catch (error: any) {
    console.error('getGeofenceBreaches error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};