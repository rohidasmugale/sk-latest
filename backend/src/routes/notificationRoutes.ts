import express from 'express';
import Notification from '../models/Notification';
import { auth } from '../middleware/auth';

const router = express.Router();

// Get all notifications (for current user)
router.get('/', auth, async (req: any, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const query: any = {};
    
    if (userId) {
      query.$or = [
        { userId: userId },
        { userId: { $exists: false } } // System-wide notifications
      ];
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({ success: true, data: notifications });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// Test endpoint - no auth required
router.get('/test', async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, data: notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// Get unread notifications count
router.get('/unread-count', auth, async (req: any, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const query: any = { read: false };
    
    if (userId) {
      query.$or = [
        { userId: userId },
        { userId: { $exists: false } }
      ];
    }
    
    const count = await Notification.countDocuments(query);
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new notification
router.post('/', auth, async (req: any, res) => {
  try {
    const { userId, title, message, type, priority, notificationType, metadata } = req.body;
    
    const notification = new Notification({
      userId: userId || req.userId || req.user?._id,
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      read: false,
      notificationType,
      metadata,
    });
    
    await notification.save();
    res.status(201).json({ success: true, data: notification });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req: any, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    notification.read = true;
    await notification.save();
    res.json({ success: true, data: notification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all notifications as read
router.patch('/read-all', auth, async (req: any, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const query: any = { read: false };
    
    if (userId) {
      query.$or = [
        { userId: userId },
        { userId: { $exists: false } }
      ];
    }
    
    await Notification.updateMany(query, { read: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a notification
router.delete('/:id', auth, async (req: any, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    await notification.deleteOne();
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear all notifications
router.delete('/clear-all', auth, async (req: any, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const query: any = {};
    
    if (userId) {
      query.$or = [
        { userId: userId },
        { userId: { $exists: false } }
      ];
    }
    
    await Notification.deleteMany(query);
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;