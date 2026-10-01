import User from '../models/User';
import Notification from '../models/Notification';

interface NotifyPayload {
  title: string;
  message: string;
  type?: 'success' | 'warning' | 'info' | 'urgent';
  priority?: 'low' | 'medium' | 'high';
  notificationType?: string;
  metadata?: Record<string, any>;
  ttlMs?: number;
}

export async function notifyRolesServerSide(roles: string[], payload: NotifyPayload) {
  if (!roles.length) return;

  const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
  if (users.length === 0) {
    console.warn(`notifyRolesServerSide: no active users for [${roles.join(', ')}]`);
    return;
  }

  const expiresAt = payload.ttlMs ? new Date(Date.now() + payload.ttlMs) : undefined;

  const docs = users.map((u) => ({
    userId: u._id.toString(),
    title: payload.title,
    message: payload.message,
    type: payload.type || 'info',
    priority: payload.priority || 'medium',
    notificationType: payload.notificationType,
    metadata: payload.metadata || {},
    ...(expiresAt ? { expiresAt } : {}),
  }));

  await Notification.insertMany(docs);
  console.log(`✅ ${docs.length} notification(s) for [${roles.join(', ')}]`);
}

export async function notifyUserServerSide(userId: string, payload: NotifyPayload) {
  const expiresAt = payload.ttlMs ? new Date(Date.now() + payload.ttlMs) : undefined;
  await Notification.create({
    userId,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'info',
    priority: payload.priority || 'medium',
    notificationType: payload.notificationType,
    metadata: payload.metadata || {},
    ...(expiresAt ? { expiresAt } : {}),
  });
}