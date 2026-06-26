import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import connectDB from './config/database';
import mongoose from 'mongoose';
import multer from 'multer';  // ← ADD THIS: import Multer type
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import User, { IUser } from './models/User';
import excelImportRoutes from './routes/employeeImportExport.routes';
import { PasswordFixer } from './utils/passwordFixer';
import groomingRoutes from './routes/groomingRoutes';
// Import all routes
import deductionRoutes from './routes/deductionRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import uploadRoutes from './routes/upload.routes';
import authRoutes from './routes/authRoutes';
import epfRoutes from './routes/epfRoutes';
import shiftRoutes from './routes/shiftRoutes';
import salaryStructureRoutes from './routes/salaryStructureRoutes';
import salarySlipRoutes from './routes/salarySlipRoutes';
import leaveRoutes from './routes/leaveRoutes';
import siteRoutes from './routes/siteRoutes';
import clientRoutes from './routes/clientRoutes';
import tasksRoutes from './routes/tasksRoutes';
import employeeRoutes from './routes/employeeRoutes';
import leadRoutes from './routes/leadRoutes';
// In backend/src/server.ts
import notificationRoutes from './routes/notificationRoutes';
import expenseRoutes from './routes/expenseRoutes';

import serviceRoutes from './routes/serviceRoutes';
import alertRoutes from './routes/alertRoutes'
import machineRoutes from './routes/machineRoutes';
import payrollRoutes from './routes/payrollRoutes'
import adminLeaveRoutes from './routes/adminLeaveRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import managerLeaveRoutes from './routes/managerLeaveRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import supervisorRoutes from './routes/supervisorRoutes';
import trainingRoutes from './routes/trainingRoutes';
import briefingRoutes from './routes/briefingRoutes';
import settingsRoutes from './routes/settings';
import managerAttendanceRoutes from './routes/managerAttendanceRoutes';
import documentRoutes from './routes/documentRoutes';
import assignTaskRoutes from './routes/assignTaskRoutes';
import siteVisitRoutes from './routes/siteVisitRoutes';
import incidentRoutes from './routes/incidentRoutes';
import cleaningPhotoRoutes from './routes/cleaningPhotoRoutes';
import faceRoutes from './routes/faceRoutes';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
const app: Application = express();

// ==================== CORS CONFIGURATION ====================
// ==================== CORS CONFIGURATION ====================
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:8081',  // ← Your React app port
      'http://localhost:5001',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://sk-project-khaki.vercel.app',
      'https://sk-backend-btbj.onrender.com',
      // Allow any Vercel or Render preview deployments
      /\.vercel\.app$/,
      /\.onrender\.com$/
    ];
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With', 'cache-control', 'Cache-control'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// ==================== MIDDLEWARE ====================
app.use(express.json());
// server.ts – after app.use(express.json())


const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    (req as any).user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Then, when registering the route:
app.use('/api/salary-slips', authenticate, salarySlipRoutes);
app.use(express.urlencoded({ extended: true }));

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer storage for Cloudinary – no `any` inside
const createCloudinaryStorage = () => {
  const storage = multer.memoryStorage();
  
  return {
    _handleFile: async (
      req: Request,
      file: Express.Multer.File ,
      cb: (error?: Error | null, info?: Partial<Express.Multer.File>) => void
    ) => {
      try {
        // Upload to Cloudinary
        const result = await new Promise<UploadApiResponse>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'employee-photos',
              allowed_formats: ['jpg', 'jpeg', 'png'],
              transformation: [{ width: 500, height: 500, crop: 'limit' }],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as UploadApiResponse);
            }
          );
          uploadStream.end(file.buffer);
        });

        // Return file info with Cloudinary URL
        const fileInfo: Partial<Express.Multer.File> = {
          filename: result.public_id,
          path: result.secure_url,
          size: result.bytes,
          mimetype: file.mimetype,
          originalname: file.originalname,
        };
        cb(null, fileInfo);
      } catch (error) {
        cb(error instanceof Error ? error : new Error(String(error)));
      }
    },
    
    _removeFile: (
      req: Request,
      file: Express.Multer.File ,
      cb: (error: Error | null) => void
    ) => {
      if (file.filename) {
        cloudinary.uploader.destroy(file.filename, (error) => {
          cb(error);
        });
      } else {
        cb(null);
      }
    }
  };
};

const cloudinaryStorage = createCloudinaryStorage();
const upload = multer({ 
  storage: cloudinaryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Only images and PDF files are allowed'));
  }
});

const memoryStorage = multer.memoryStorage();
const simpleUpload = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
 fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Only images and PDF files are allowed'));
  }
});

// ==================== DATABASE CONNECTION ====================
connectDB();

// ==================== PASSWORD FIXER ON STARTUP ====================
const runPasswordFixer = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for MongoDB connection...');
      await new Promise<void>(resolve => {
        mongoose.connection.once('connected', () => resolve());
      });
    }
    
    console.log('\n🔧 [STARTUP] Running password health check...');
    const fixResult = await PasswordFixer.checkAndFixUnhashedPasswords();
    
    if (fixResult.fixedCount > 0) {
      console.log(`\n⚠️ [STARTUP] IMPORTANT: Fixed ${fixResult.fixedCount} unhashed passwords.`);
      console.log('💡 [STARTUP] Users may need to use their original plain-text passwords until they change them.');
    } else if (fixResult.success && fixResult.alreadyHashedCount === fixResult.totalUsers) {
      console.log('✅ [STARTUP] All passwords are already properly hashed!');
    }
    
    if (fixResult.errorCount > 0) {
      console.warn(`⚠️ [STARTUP] Had ${fixResult.errorCount} errors during password check`);
    }
    
    console.log('✅ [STARTUP] Password health check completed\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [STARTUP] Password fixer failed:', message);
    console.log('⚠️ [STARTUP] Continuing server startup despite password fixer error');
  }
};

// ==================== LOGGING & CACHING MIDDLEWARE ====================
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  if (req.path.startsWith('/api')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Serve static files

app.use('/api/import', excelImportRoutes);
app.use('/api/settings', settingsRoutes);
console.log('✅ Settings routes registered at /api/settings');
app.use('/api', uploadRoutes);
app.use('/uploads', express.static('uploads'));


// After other route registrations
app.use('/api/notifications', notificationRoutes);
app.use('/api/alerts',alertRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/manager-leaves', managerLeaveRoutes); 
app.use('/api/attendance', attendanceRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/briefings', briefingRoutes);
app.use('/api/assigntasks', assignTaskRoutes);
app.use('/api/site-visits', siteVisitRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/manager-attendance', managerAttendanceRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log('📁 Static files being served from:', path.join(__dirname, '../uploads'));
app.use('/api/face', faceRoutes);

// ==================== BASIC TEST ENDPOINTS ====================
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'SK Enterprises Backend API',
    status: 'running',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    endpoints:{
      alerts: '/api/alerts',
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Document Management API',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime()
  });
});

app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// ==================== USER MANAGEMENT ROUTES ====================
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    console.log('POST /api/users called with:', req.body);
    
    const { 
      username, 
      email, 
      password, 
      role, 
      firstName, 
      lastName,
      department,
      phone,
      joinDate
    } = req.body;

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User with this email or username already exists' 
      });
    }

    const name = `${firstName} ${lastName}`.trim();

    const newUser = new User({
      username,
      email,
      password,
      role: role || 'employee',
      firstName,
      lastName,
      name,
      department: department || 'General',
      phone,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      isActive: true
    });

    await newUser.save();

    const userResponse = {
      _id: newUser._id.toString(),
      id: newUser._id.toString().slice(-6),
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      department: newUser.department,
      phone: newUser.phone,
      isActive: newUser.isActive,
      status: newUser.isActive ? 'active' : 'inactive',
      joinDate: newUser.joinDate.toISOString().split('T')[0]
    };

    console.log('User created successfully:', userResponse);
    res.status(201).json({ success: true, message: 'User created successfully', user: userResponse });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error creating user';
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message });
  }
});

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    console.log('GET /api/users called');
    const users = await User.find().sort({ createdAt: -1 });
    console.log(`Found ${users.length} users`);

    const transformedUsers = users.map((user: IUser) => {
      const userObj = user.toJSON();
      return {
        ...userObj,
        id: userObj._id.toString().slice(-6),
        _id: userObj._id.toString(),
        status: userObj.isActive ? 'active' : 'inactive'
      };
    });

    const groupedByRole: Record<string, unknown[]> = transformedUsers.reduce((acc, user) => {
      const role = (user as any).role; // we know role exists, but we can cast safely
      if (!acc[role]) acc[role] = [];
      acc[role].push(user);
      return acc;
    }, {} as Record<string, unknown[]>);

    res.status(200).json({
      success: true,
      allUsers: transformedUsers,
      groupedByRole,
      total: transformedUsers.length,
      active: transformedUsers.filter((u: any) => u.isActive).length,
      inactive: transformedUsers.filter((u: any) => !u.isActive).length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching users';
    console.error('GET /api/users failed:', error);
    res.status(500).json({ success: false, message, error: message });
  }
});

app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const userObj = user.toJSON();
    const userResponse = {
      ...userObj,
      id: userObj._id.toString().slice(-6),
      _id: userObj._id.toString(),
      status: userObj.isActive ? 'active' : 'inactive',
      joinDate: user.joinDate.toISOString().split('T')[0],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    res.status(200).json({ success: true, user: userResponse });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching user';
    res.status(500).json({ success: false, message });
  }
});

app.get('/api/users/stats', async (req: Request, res: Response) => {
  try {
    const stats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    res.status(200).json({
      success: true,
      data: { stats, totalUsers, activeUsers, inactiveUsers: totalUsers - activeUsers }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching stats';
    res.status(500).json({ success: false, message });
  }
});

app.patch('/api/users/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    await user.save();
    const userObj = user.toJSON();
    const userResponse = {
      ...userObj,
      id: userObj._id.toString().slice(-6),
      _id: userObj._id.toString(),
      status: userObj.isActive ? 'active' : 'inactive',
      joinDate: user.joinDate.toISOString().split('T')[0]
    };
    res.status(200).json({ success: true, message: 'User status updated successfully', user: userResponse });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error updating status';
    res.status(500).json({ success: false, message });
  }
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (updates.name) {
      const [firstName, ...lastNameParts] = updates.name.split(' ');
      updates.firstName = firstName;
      updates.lastName = lastNameParts.join(' ');
      delete updates.name;
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const userObj = user.toJSON();
    const userResponse = {
      ...userObj,
      id: userObj._id.toString().slice(-6),
      _id: userObj._id.toString(),
      status: userObj.isActive ? 'active' : 'inactive',
      joinDate: user.joinDate.toISOString().split('T')[0]
    };
    res.status(200).json({ success: true, message: 'User updated successfully', user: userResponse });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error updating user';
    res.status(400).json({ success: false, message });
  }
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error deleting user';
    res.status(500).json({ success: false, message });
  }
});

app.put('/api/users/:id/role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'manager', 'supervisor', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, updatedAt: new Date() },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const userObj = user.toJSON();
    const userResponse = {
      ...userObj,
      id: userObj._id.toString().slice(-6),
      _id: userObj._id.toString(),
      status: userObj.isActive ? 'active' : 'inactive',
      joinDate: user.joinDate.toISOString().split('T')[0]
    };
    res.status(200).json({ success: true, message: 'User role updated successfully', user: userResponse });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error updating role';
    res.status(500).json({ success: false, message });
  }
});

app.get('/api/users/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { department: { $regex: query, $options: 'i' } },
        { role: { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });
    const transformedUsers = users.map((user: IUser) => {
      const userObj = user.toJSON();
      return {
        ...userObj,
        id: userObj._id.toString().slice(-6),
        _id: userObj._id.toString(),
        status: userObj.isActive ? 'active' : 'inactive'
      };
    });
    res.status(200).json({ success: true, users: transformedUsers, count: transformedUsers.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error searching users';
    res.status(500).json({ success: false, message });
  }
});

// ==================== PASSWORD HEALTH CHECK ENDPOINT ====================
app.get('/api/password-health', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Password health check requested');
    const result = await PasswordFixer.checkAndFixUnhashedPasswords();
    res.status(200).json({ success: true, message: 'Password health check completed', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error checking password health';
    console.error('❌ Password health check error:', error);
    res.status(500).json({ success: false, message, error: message });
  }
});

// ==================== ROUTE REGISTRATION ====================
app.use('/api/employees', employeeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/epf-forms', epfRoutes);
 
app.use('/api/shifts', shiftRoutes);
app.use('/api/deductions', deductionRoutes);
app.use('/api/salary-structures', salaryStructureRoutes);
app.use('/api/payroll', payrollRoutes);

app.use('/api/salary-slips', salarySlipRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/crm/clients', clientRoutes);
app.use('/api/crm/leads', leadRoutes);

app.use('/api/admin-leaves', adminLeaveRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/grooming', groomingRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/cleaning-photos', cleaningPhotoRoutes);

// ==================== CRM DASHBOARD STATS ====================
app.get('/api/crm/stats', async (req: Request, res: Response) => {
  try {
    const Client = (await import('./models/Client')).default;
    const Lead = (await import('./models/Lead')).default;
    const Communication = (await import('./models/Communication')).default;
    
    const [clientsCount, leadsCount, communicationsCount] = await Promise.all([
      Client.countDocuments(),
      Lead.countDocuments({ status: { $nin: ['closed-won', 'closed-lost'] } }),
      Communication.countDocuments()
    ]);

    const allClients = await Client.find({}, 'value');
    const totalValue = allClients.reduce((sum: number, client: any) => {
      const valueStr = client.value || '0';
      const numericValue = parseFloat(valueStr.replace(/[₹,]/g, '')) || 0;
      return sum + numericValue;
    }, 0);
    
    let formattedValue = '₹0';
    if (totalValue >= 10000000) formattedValue = `₹${(totalValue / 10000000).toFixed(1)}Cr`;
    else if (totalValue >= 100000) formattedValue = `₹${(totalValue / 100000).toFixed(1)}L`;
    else formattedValue = `₹${totalValue.toLocaleString('en-IN')}`;

    res.status(200).json({
      success: true,
      data: {
        totalClients: clientsCount,
        activeLeads: leadsCount,
        totalValue: formattedValue,
        communications: communicationsCount
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching CRM stats';
    console.error('CRM stats error:', error);
    res.status(500).json({
      success: false,
      message,
      data: { totalClients: 0, activeLeads: 0, totalValue: '₹0', communications: 0 }
    });
  }
});


// Create rate limiter for notifications
const notificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Only allow 5 requests per minute
  handler: (req, res) => {
    console.log('🚫 Rate limit exceeded for notifications');
    res.status(429).json({
      success: false,
      message: 'Too many notification requests. Please wait 1 minute.'
    });
  }
});

// Rate limited notifications endpoint
app.get('/api/notifications', notificationLimiter, (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: [] });
});
app.patch('/api/notifications/:id/read', (req: Request, res: Response) => {
  res.json({ success: true });
});
app.patch('/api/notifications/read-all', (req: Request, res: Response) => {
  res.json({ success: true });
});
app.delete('/api/notifications/:id', (req: Request, res: Response) => {
  res.json({ success: true });
});

// ==================== 404 HANDLER ====================
app.use('*', (req: Request, res: Response) => {
  console.log(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({ success: false, message: 'Route not found', path: req.originalUrl });
});

// ==================== ERROR HANDLER ====================
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    app.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`👤 Users endpoint: http://localhost:${PORT}/api/users`);
      console.log(`🔐 Password health: http://localhost:${PORT}/api/password-health`);
      console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not Configured'}`);
      setTimeout(runPasswordFixer, 2000);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  console.log('\n🔌 Shutting down gracefully...');
  await mongoose.disconnect();
  console.log('✅ MongoDB disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔌 Received SIGTERM, shutting down...');
  await mongoose.disconnect();
  console.log('✅ MongoDB disconnected');
  process.exit(0);
});

export { app, upload, simpleUpload, cloudinary };

if (require.main === module) {
  startServer();
}
