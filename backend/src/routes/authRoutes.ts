import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import Employee from '../models/Employee';
import AssignTask from '../models/AssignTask';
import Site from '../models/Site';
import { auth } from '../middleware/auth';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const router = express.Router();



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

// =============================================
// PASSWORD RESET
// =============================================
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a reset link has been sent.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password/${resetToken}`;

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SK PROJECT <onboarding@resend.dev>',
      to: user.email,
      subject: 'Reset your SK PROJECT password',
      html: `<p>Click the link below to reset your password. This link expires in 30 minutes.</p>
             <a href="${resetUrl}">${resetUrl}</a>`
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ success: false, message: 'Failed to send reset email' });
    }

    console.log(`✅ Reset email sent to ${user.email}, id: ${data?.id}`);

    res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.'
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Error processing request' });
  }
});

router.post('/reset-password/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
const user = await User.findOne({
  resetPasswordToken: hashedToken,
  resetPasswordExpires: { $gt: new Date() }
}).select('+resetPasswordToken +resetPasswordExpires');
    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired' });
    }

    user.password = newPassword; // hashed by pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password has been reset. Please log in.' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
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