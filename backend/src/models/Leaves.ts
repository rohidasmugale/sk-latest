import mongoose, { Schema, Document } from 'mongoose';

export interface ILeave extends Document {
  employeeId: string;
  employeeName: string;
  department: string;
  contactNumber: string;
  leaveType: 'annual' | 'sick' | 'casual' | 'emergency' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid' | 'other';
  fromDate: Date;
  toDate: Date;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedBy: string;
  appliedFor: string;
  // Supervisor fields - exactly like attendance system
  supervisorId?: string;  // This references users collection
  isSupervisorLeave?: boolean;
  // Manager fields
  managerId?: string;
  isManagerLeave?: boolean;
  // Approval fields
  remarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  cancellationReason?: string;
  managerRemarks?: string;
  // Site fields
  site?: string;
  siteId?: string;
  // Employee fields
  position?: string;
  email?: string;
  // Additional fields
  attachmentUrl?: string;
  emergencyContact?: string;
  handoverTo?: string;
  handoverCompleted?: boolean;
  handoverRemarks?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema: Schema = new Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    trim: true,
    index: true
  },
  employeeName: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    index: true
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true
  },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'casual', 'emergency', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other'],
    required: true,
    default: 'casual'
  },
  fromDate: {
    type: Date,
    required: [true, 'From date is required']
  },
  toDate: {
    type: Date,
    required: [true, 'To date is required']
  },
  totalDays: {
    type: Number,
    required: true,
    min: 0.5,
    max: 90
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  appliedBy: {
    type: String,
    required: [true, 'Applied by is required'],
    trim: true
  },
  appliedFor: {
    type: String,
    required: [true, 'Applied for is required'],
    trim: true
  },
  // Supervisor fields - exactly like attendance system
  supervisorId: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  isSupervisorLeave: {
    type: Boolean,
    default: false,
    index: true
  },
  // Manager fields
  managerId: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  isManagerLeave: {
    type: Boolean,
    default: false,
    index: true
  },
  // Approval fields
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  approvedBy: {
    type: String,
    trim: true,
    default: null
  },
  rejectedBy: {
    type: String,
    trim: true,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    trim: true,
    default: null
  },
  managerRemarks: {
    type: String,
    trim: true,
    default: null
  },
  // Site fields
  site: {
    type: String,
    default: null
  },
   siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', index: true },
  // Employee fields
  position: {
    type: String,
    default: null
  },
  email: {
    type: String,
    default: null
  },
  // Additional fields
  attachmentUrl: {
    type: String,
    default: null
  },
  emergencyContact: {
    type: String,
    default: null
  },
  handoverTo: {
    type: String,
    trim: true,
    default: null
  },
  handoverCompleted: {
    type: Boolean,
    default: false
  },
  handoverRemarks: {
    type: String,
    trim: true,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Add indexes for better query performance - exactly like attendance
LeaveSchema.index({ employeeId: 1, fromDate: 1 });
LeaveSchema.index({ department: 1, status: 1 });
LeaveSchema.index({ status: 1 });
LeaveSchema.index({ createdAt: -1 });
LeaveSchema.index({ supervisorId: 1, fromDate: 1 }); // Like attendance supervisorId index
LeaveSchema.index({ isSupervisorLeave: 1 });
LeaveSchema.index({ managerId: 1, fromDate: 1 });
LeaveSchema.index({ isManagerLeave: 1 });

export default mongoose.model<ILeave>('Leave', LeaveSchema);