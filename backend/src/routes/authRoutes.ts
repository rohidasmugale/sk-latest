import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import Employee from '../models/Employee';
import AssignTask from '../models/AssignTask';
import Site from '../models/Site';
import { auth } from '../middleware/auth';

const router = express.Router();

// =============================================
// AUTH ENDPOINTS (Signup, Login, etc.)
// =============================================

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email address is already registered'
      });
    }

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

    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
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

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    let user = await User.findOne({ email }).select('+password');

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

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `You are registered as ${user.role}, not ${role}. Please select the correct role.`
      });
    }

    user.lastLogin = new Date();
    await user.save();

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

router.get('/me', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
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

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        role: decoded.role,
        email: decoded.email,
        name: decoded.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    console.log('✅ Token refreshed for user:', decoded.email);
    res.status(200).json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });
  } catch (error: any) {
    console.error('❌ Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// =============================================
// ✅ SUPERVISOR SITE ENDPOINTS (FIXED)
// =============================================

/**
 * Helper: get all site IDs for a supervisor (by user ID)
 */
async function getSupervisorSiteIds(userId: string): Promise<string[]> {
  // 1. Try to get from User.assignedSites (if stored)
  const user = await User.findById(userId);
  if (user?.assignedSites && Array.isArray(user.assignedSites) && user.assignedSites.length > 0) {
    // Resolve names to IDs
    const sites = await Site.find({
      name: { $in: user.assignedSites.map((n: string) => new RegExp(`^${n.trim()}$`, 'i')) }
    });
    if (sites.length > 0) {
      return sites.map(s => s._id.toString());
    }
  }

  // 2. Fallback: find from AssignTask where this user is a supervisor
  const tasks = await AssignTask.find({
    $or: [
      { 'assignedSupervisors.userId': userId },
      { assignedTo: userId }
    ],
    siteId: { $exists: true }
  });

  if (tasks.length === 0) return [];

  const siteIdSet = new Set<string>();
  tasks.forEach(task => {
    if (task.siteId) {
      siteIdSet.add(task.siteId.toString());
    }
  });

  return Array.from(siteIdSet);
}

// GET /api/auth/supervisor-site - returns first site ID and name
router.get('/supervisor-site', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const siteIds = await getSupervisorSiteIds(userId);

    if (siteIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No site assigned to this supervisor'
      });
    }

    const site = await Site.findById(siteIds[0]);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    res.json({
      success: true,
      siteId: site._id.toString(),
      siteName: site.name
    });
  } catch (error: any) {
    console.error('Error fetching supervisor site:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching site'
    });
  }
});

// GET /api/auth/supervisor-sites - returns all site IDs and names
router.get('/supervisor-sites', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const siteIds = await getSupervisorSiteIds(userId);

    if (siteIds.length === 0) {
      return res.json({
        success: true,
        siteIds: [],
        siteNames: [],
        sites: []
      });
    }

    const sites = await Site.find({ _id: { $in: siteIds } });
    const siteData = sites.map(s => ({
      id: s._id.toString(),
      name: s.name
    }));

    res.json({
      success: true,
      siteIds: siteData.map(s => s.id),
      siteNames: siteData.map(s => s.name),
      sites: siteData
    });
  } catch (error: any) {
    console.error('Error fetching supervisor sites:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sites'
    });
  }
});

// GET /api/auth/site-name/:siteId - helper to get site name from ID
router.get('/site-name/:siteId', auth, async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    res.json({
      success: true,
      siteName: site.name
    });
  } catch (error: any) {
    console.error('Error fetching site name:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching site name'
    });
  }
});

export default router;