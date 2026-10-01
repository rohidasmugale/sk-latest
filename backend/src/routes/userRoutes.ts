// src/routes/authRoutes.ts - COMPLETE FIXED VERSION WITH SUPER ADMIN RESTRICTION
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import { auth } from '../middleware/auth';

const router = express.Router();

// Login route - FIXED VERSION
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    console.log('\n🔐 ========== LOGIN ATTEMPT ==========');
    console.log(`📧 Email: ${email}`);
    console.log(`🎭 Requested role: ${role}`);
    console.log(`🔑 Password length: ${password?.length}`);

    // Validate required fields
    if (!email || !password || !role) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const user = await User.findOne({ email: email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ User found in database:', { 
      email: user.email, 
      role: user.role, 
      isActive: user.isActive,
      hasPassword: !!user.password,
      passwordPreview: user.password ? user.password.substring(0, 30) + '...' : 'NO PASSWORD',
      passwordLength: user.password ? user.password.length : 0
    });

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ Account is inactive');
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.'
      });
    }

    // Verify password
    console.log('🔐 Starting password comparison...');
    const isValidPassword = await user.comparePassword(password);
    console.log(`🔐 Password comparison result: ${isValidPassword ? '✅ VALID' : '❌ INVALID'}`);
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify role
    if (user.role !== role) {
      console.log('❌ Role mismatch:', { 
        expected: role, 
        actual: user.role,
        note: `User is registered as ${user.role}, not ${role}`
      });
      return res.status(403).json({
        success: false,
        message: `You are registered as ${user.role}, not ${role}. Please select the correct role.`
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();
    console.log('✅ Last login timestamp updated');

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
       { expiresIn: '30d' }
    );

    console.log(`🔑 Token generated: ${token.substring(0, 20)}...`);

    // User response without password
    const userResponse = {
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      joinDate: user.joinDate.toISOString().split('T')[0],
      lastLogin: user.lastLogin,
      department: user.department || '',
      // site: user.site || '',
      phone: user.phone || '',
      avatar: user.avatar || ''
    };

    console.log(`\n✅ ========== LOGIN SUCCESSFUL ==========`);
    console.log(`👤 User: ${userResponse.email}`);
    console.log(`🎭 Role: ${userResponse.role}`);
    // console.log(`📍 Site: ${userResponse.site}`);
    console.log(`📅 Joined: ${userResponse.joinDate}`);
    console.log(`==========================================\n`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error: any) {
    console.error('🔥 LOGIN ERROR:', error);
    console.error('🔥 Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userResponse = {
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      joinDate: user.joinDate.toISOString().split('T')[0],
      lastLogin: user.lastLogin,
      department: user.department || '',
      // site: user.site || '',
      phone: user.phone || '',
      avatar: user.avatar || ''
    };

    res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Verify token
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        userId: decoded.userId,
        role: decoded.role,
        email: decoded.email,
        name: decoded.name
      }
    });
  } catch (error: any) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Get user statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching stats'
    });
  }
});

// =============================================
// FIX: Add endpoint to check Super Admin status
// =============================================
router.get('/check-superadmin', async (req: Request, res: Response) => {
  try {
    const existingSuperAdmins = await User.find({ role: 'superadmin' });
    
    res.status(200).json({
      success: true,
      exists: existingSuperAdmins.length > 0,
      count: existingSuperAdmins.length,
      superAdmins: existingSuperAdmins.map(u => ({
        email: u.email,
        name: u.name,
        isActive: u.isActive,
        joinDate: u.joinDate
      }))
    });
  } catch (error: any) {
    console.error('Check superadmin error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking Super Admin status'
    });
  }
});



// Get current user info (with auth middleware)
router.get('/current-user', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Error in /current-user route:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user data' 
    });
  }
});

// =============================================
// Add Super Admin creation endpoint (protected)
// =============================================
router.post('/create-superadmin', auth, async (req: Request, res: Response) => {
  try {
    // Only allow current Super Admin to create another Super Admin
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only Super Admin can create another Super Admin'
      });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Optional: Limit to maximum 2 Super Admins
    const existingSuperAdmins = await User.find({ role: 'superadmin' });
    const MAX_SUPER_ADMINS = 2; // You can change this number
    
    if (existingSuperAdmins.length >= MAX_SUPER_ADMINS) {
      return res.status(403).json({
        success: false,
        message: `Maximum of ${MAX_SUPER_ADMINS} Super Admins allowed`
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const newSuperAdmin = new User({
      name,
      email,
      password,
      role: 'superadmin',
      username: email.split('@')[0],
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || '',
      isActive: true,
      // site: 'Mumbai Office',
      joinDate: new Date(),
      createdBy: req.user?._id // Track who created this Super Admin
    });

    await newSuperAdmin.save();

    res.status(201).json({
      success: true,
      message: 'Additional Super Admin created successfully',
      user: {
        _id: newSuperAdmin._id.toString(),
        id: newSuperAdmin._id.toString().slice(-6),
        name: newSuperAdmin.name,
        email: newSuperAdmin.email,
        role: newSuperAdmin.role,
        isActive: newSuperAdmin.isActive,
        // site: newSuperAdmin.site,
        joinDate: newSuperAdmin.joinDate.toISOString().split('T')[0]
      }
    });
  } catch (error: any) {
    console.error('Create superadmin error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating Super Admin'
    });
  }
});



// Emergency password reset (development only)
router.post('/emergency-reset', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Not allowed in production'
      });
    }
    
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email and new password required'
      });
    }
    
    const user = await User.findOne({ email: email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log(`\n🆘 ========== EMERGENCY RESET ==========`);
    console.log(`📧 User: ${user.email}`);
    console.log(`🔐 Old hash: ${user.password?.substring(0, 30) || 'NULL'}...`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log(`🔑 New password length: ${newPassword.length}`);
    
    // Force set password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    
    await user.save();
    
    const updatedUser = await User.findOne({ email: email }).select('+password');
    
    if (!updatedUser) {
      console.log('❌ Failed to retrieve updated user');
      return res.status(500).json({
        success: false,
        error: 'Failed to verify password update'
      });
    }
    
    console.log(`\n✅ Verification:`);
    console.log(`   New hash: ${updatedUser.password.substring(0, 30)}...`);
    console.log(`   Hash length: ${updatedUser.password.length}`);
    console.log(`   Is hashed? ${updatedUser.password.startsWith('$2')}`);
    
    const match = await bcrypt.compare(newPassword, updatedUser.password);
    console.log(`   Password matches? ${match ? '✅ YES' : '❌ NO'}`);
    console.log(`=====================================\n`);
    
    res.json({
      success: true,
      message: `Password for ${email} has been reset`,
      note: 'Try logging in with the new password',
      debug: {
        email: email,
        newPasswordSet: true,
        isHashed: updatedUser.password.startsWith('$2'),
        verification: match
      }
    });
    
  } catch (error: any) {
    console.error('❌ Emergency reset error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test password storage endpoint


export default router;
