// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { UserSiteService } from '../services/userSiteService';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
    }
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No authentication token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get full user from DB
    const user = await User.findById(decoded.userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'User account is inactive' });
    }

    // ✅ Get site info from AssignTask/Employee
    const siteInfo = await UserSiteService.getUserSites(
      user._id.toString(),
      user.role
    );

    // Attach to req.user with site info
    req.user = {
      _id: user._id.toString(),
      role: user.role,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email,
      department: user.department || '',
      assignedSites: siteInfo.assignedSites,
      siteName: siteInfo.siteName,
    };
    req.userId = user._id.toString();

    console.log(`✅ Auth: ${user.email} (${user.role}) site: ${siteInfo.siteName || 'none'}`);
    next();
  } catch (error: any) {
    console.error('❌ Auth middleware error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired' 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
};

export const mockAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      try {
        const decoded = jwt.decode(token) as any;
        
        if (decoded?.userId) {
          const user = await User.findById(decoded.userId).select('-password');
          if (user) {
            req.user = user;
            req.userId = user._id.toString();
            console.log(`✅ Mock Auth: Using real user ${user.name || user.email}`);
            return next();
          }
        }
      } catch (e) {
        // Continue with mock user
      }
    }

    // Fallback to mock user
    req.user = {
      id: 'system',
      _id: 'system',
      name: 'System User',
      email: 'system@example.com',
      role: 'admin',
      assignedSites: [],
      siteName: null,
    };
    req.userId = 'system';
    
    console.log(`⚠️ Mock Auth: Using system user for ${req.method} ${req.path}`);
    next();
  } catch (error: any) {
    console.error('Mock auth error:', error);
    next();
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

export const authenticate = auth;
export const requireRole = authorize;