import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import Employee from '../models/Employee';

const router = express.Router();

// Define auth middleware inline or import properly
const auth = async (req: Request, res: Response, next: any) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    (req as any).user = { id: decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Signup route
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
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
        message: 'Email address is already registered'
      });
    }

    // Only allow superadmin role for signup
    if (role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only Super Admin can sign up directly'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password,
      role: 'superadmin',
      username: email.split('@')[0],
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || '',
      isActive: true,
      joinDate: new Date()
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const userResponse = {
      _id: newUser._id.toString(),
      id: newUser._id.toString().slice(-6),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
      joinDate: newUser.joinDate.toISOString().split('T')[0],
      department: newUser.department || ''
    };

    res.status(201).json({
      success: true,
      message: 'Super Admin account created successfully!',
      user: userResponse,
      token
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during signup'
    });
  }
});

// Login route - FIXED VERSION
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Find user by email
    let user = await User.findOne({ email }).select('+password');

    // If not found by email, try employeeId
    if (!user) {
      const employee = await Employee.findOne({ employeeId: email });
      if (employee?.email) {
        user = await User.findOne({ email: employee.email }).select('+password');
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.'
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify role
    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `You are registered as ${user.role}, not ${role}. Please select the correct role.`
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

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
      phone: user.phone || '',
      avatar: user.avatar || ''
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.'
    });
  }
});

// Get current user
router.get('/me', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user.id);
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
      phone: user.phone || '',
      avatar: user.avatar || ''
    };

    res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
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

export default router;