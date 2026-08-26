// backend/models/Task.ts - Complete updated Task model with visit tracking
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHourlyUpdate {
  id: string;
  timestamp: Date;
  content: string;
  submittedBy: string; // User ID
}

export interface IAttachment {
  id: string;
  filename: string;
  url: string;
  uploadedAt: Date;
  size: number;
  type: string;
}

export interface IAssignedUser {
  userId: string;
  name: string;
  role: 'manager' | 'supervisor' | 'employee';
  assignedAt: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'; // Individual status
}

export interface IVisitHistory {
  visitedBy: string;
  visitedByName: string;
  visitedAt: Date;
  notes?: string;
}

// ... imports and small interfaces (IHourlyUpdate, IAttachment, etc.) ...

export interface ITaskMethods {
  isUserAssigned(userId: string): boolean;
  getUserStatus(userId: string): string | null;
  updateUserStatus(userId: string, newStatus: string): boolean;
  updateOverallStatus(): void;
  recordVisit(managerId: string, managerName: string, notes?: string): Promise<ITask>;
}

export type ITask = Document & ITaskMethods & {
  title: string;
  description: string;
  assignedUsers: IAssignedUser[];
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  deadline: Date;
  dueDateTime: Date;
  siteId: mongoose.Types.ObjectId;  
  siteName: string;
  clientName: string;
  taskType?: string;
  attachments: IAttachment[];
  hourlyUpdates: IHourlyUpdate[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  assignedSupervisors?: Array<{
    userId: string;
    name: string;
    status: string;
    assignedAt: Date;
  }>;
  lastVisitedAt?: Date;
  visitedBy?: string;
  visitCount: number;
  visitHistory: IVisitHistory[];
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ITaskModel = Model<ITask, {}, ITaskMethods>;


const AttachmentSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  size: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  }
}, { _id: false });

const HourlyUpdateSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  content: {
    type: String,
    required: true
  },
  submittedBy: {
    type: String,
    required: true
  }
}, { _id: false });

const AssignedUserSchema = new Schema({
  userId: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['manager', 'supervisor', 'employee'],
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  }
}, { _id: false });

// Visit History Schema
const VisitHistorySchema = new Schema({
  visitedBy: {
    type: String,
    required: true,
    trim: true
  },
  visitedByName: {
    type: String,
    required: true,
    trim: true
  },
  visitedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const TaskSchema: Schema<ITask, ITaskModel> = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Task title must be at least 3 characters']
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
      minlength: [10, 'Task description must be at least 10 characters']
    },
    assignedUsers: {
      type: [AssignedUserSchema],
      default: [],
      validate: {
        validator: function(users: IAssignedUser[]) {
          // Allow empty array for templates and fully staffed sites
          return true; // Remove the requirement for at least one assignee
        },
        message: 'At least one assignee is required'
      }
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
      required: true
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
      validate: {
        validator: function(value: Date) {
          return value instanceof Date && !isNaN(value.getTime());
        },
        message: 'Invalid deadline date'
      }
    },
    dueDateTime: {
      type: Date,
      required: [true, 'Due date and time is required'],
      validate: {
        validator: function(value: Date) {
          return value instanceof Date && !isNaN(value.getTime());
        },
        message: 'Invalid due date and time'
      }
    },
     siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
    index: true
  },
    siteName: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true
    },
    clientName: {
      type: String,
     
      trim: true
    },
    taskType: {
      type: String,
      enum: ['inspection', 'maintenance', 'training', 'audit', 'emergency', 'routine', 'safety', 'equipment', 'general', 'other'],
      default: 'general'
    },
    attachments: {
      type: [AttachmentSchema],
      default: []
    },
    hourlyUpdates: {
      type: [HourlyUpdateSchema],
      default: []
    },
    createdBy: {
      type: String,
      required: [true, 'Creator ID is required'],
      trim: true
    },
    // New visit tracking fields
    lastVisitedAt: {
      type: Date,
      default: null
    },
    visitedBy: {
      type: String,
      trim: true,
      default: null
    },
    visitCount: {
      type: Number,
      default: 0
    },
    visitHistory: {
      type: [VisitHistorySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance (existing indexes)
TaskSchema.index({ 'assignedUsers.userId': 1 });
TaskSchema.index({ siteId: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ deadline: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ createdAt: -1 });

// New indexes for visit tracking
TaskSchema.index({ visitedBy: 1 });
TaskSchema.index({ lastVisitedAt: -1 });
TaskSchema.index({ visitCount: -1 });

// Virtual for formatted due date (existing)
TaskSchema.virtual('formattedDueDate').get(function(this: ITask) {
  return this.dueDateTime.toLocaleString();
});

// Virtual for formatted deadline (existing)
TaskSchema.virtual('formattedDeadline').get(function(this: ITask) {
  return this.deadline.toLocaleDateString();
});

// Virtual to get assigned user names as comma-separated string (existing)
TaskSchema.virtual('assignedUserNames').get(function(this: ITask) {
  return this.assignedUsers.map(user => user.name).join(', ');
});

// Virtual to get assigned user IDs as array (existing)
TaskSchema.virtual('assignedUserIds').get(function(this: ITask) {
  return this.assignedUsers.map(user => user.userId);
});

// New virtual for last visit formatted
TaskSchema.virtual('formattedLastVisited').get(function(this: ITask) {
  if (!this.lastVisitedAt) return 'Never visited';
  return this.lastVisitedAt.toLocaleString();
});

// New virtual for visit count summary
TaskSchema.virtual('visitSummary').get(function(this: ITask) {
  return {
    totalVisits: this.visitCount,
    lastVisitedAt: this.lastVisitedAt,
    lastVisitedBy: this.visitedBy,
    visitHistory: this.visitHistory.slice(-5) // Last 5 visits
  };
});

// Method to check if a specific user is assigned (existing)
TaskSchema.methods.isUserAssigned = function(userId: string): boolean {
  return this.assignedUsers.some((user: IAssignedUser) => user.userId === userId);
};

// Method to get user's individual status (existing)
TaskSchema.methods.getUserStatus = function(userId: string): string | null {
  const user = this.assignedUsers.find((u: IAssignedUser) => u.userId === userId);
  return user ? user.status : null;
};

// Method to update user's individual status (existing)
TaskSchema.methods.updateUserStatus = function(userId: string, newStatus: string): boolean {
  const userIndex = this.assignedUsers.findIndex((u: IAssignedUser) => u.userId === userId);
  if (userIndex === -1) return false;
  
  this.assignedUsers[userIndex].status = newStatus;
  
  // Update overall status based on all users' statuses
  this.updateOverallStatus();
  
  return true;
};

// Method to update overall status based on all users' statuses (existing)
TaskSchema.methods.updateOverallStatus = function() {
  const allCompleted = this.assignedUsers.every((user: IAssignedUser) => user.status === 'completed');
  const anyInProgress = this.assignedUsers.some((user: IAssignedUser) => user.status === 'in-progress');
  const anyCancelled = this.assignedUsers.some((user: IAssignedUser) => user.status === 'cancelled');
  
  if (allCompleted) {
    this.status = 'completed';
  } else if (anyCancelled) {
    this.status = 'cancelled';
  } else if (anyInProgress) {
    this.status = 'in-progress';
  } else {
    this.status = 'pending';
  }
};

// NEW METHOD: Record a site visit
TaskSchema.methods.recordVisit = function(managerId: string, managerName: string, notes?: string): Promise<ITask> {
  this.lastVisitedAt = new Date();
  this.visitedBy = managerId;
  this.visitCount = (this.visitCount || 0) + 1;
  
  // Initialize visitHistory if not exists
  if (!this.visitHistory) {
    this.visitHistory = [];
  }
  
  // Add to visit history
  this.visitHistory.push({
    visitedBy: managerId,
    visitedByName: managerName,
    visitedAt: new Date(),
    notes: notes || `Site visit recorded by ${managerName}`
  });
  
  return this.save();
};

// Pre-save middleware to ensure overall status consistency (existing)
TaskSchema.pre('save', function(next) {
  if (this.assignedUsers && this.assignedUsers.length > 0) {
    this.updateOverallStatus();
  }
  next();
});

export default mongoose.model<ITask, ITaskModel>('Task', TaskSchema);