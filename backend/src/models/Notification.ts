import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId?: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'urgent';
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  notificationType?: string;
  metadata?: Record<string, any>;
  expiresAt: Date;        // ✅ NEW
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['success', 'warning', 'info', 'urgent'],
      default: 'info'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    read: { type: Boolean, default: false },
    notificationType: { type: String },
   metadata: { type: Schema.Types.Mixed, default: {} },
expiresAt: {
  type: Date,
  default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
},
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ read: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });   // ✅ NEW — TTL

const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;