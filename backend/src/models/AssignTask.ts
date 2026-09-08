import mongoose from 'mongoose';

const assignedUserSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['manager', 'supervisor'], required: true },
  assignedAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  }
});

const hourlyUpdateSchema = new mongoose.Schema({
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  submittedBy: { type: String, required: true },
  submittedByName: { type: String, required: true }
});

const attachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, required: true },
  uploadedByName: { type: String, required: true },
  size: { type: Number, default: 0 },
  type: { type: String, default: 'application/octet-stream' }
});

const assignTaskSchema = new mongoose.Schema({
  taskTitle: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  dueDateTime: { type: Date, required: true },
  priority: { 
    type: String, 
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  taskType: { type: String, required: true },
siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
  siteName: { type: String, required: true },
  siteLocation: { type: String, required: true },
  clientName: { type: String, required: true },
  assignedManagers: [assignedUserSchema],
  assignedSupervisors: [assignedUserSchema],
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  createdBy: { type: String, required: true },
  createdByName: { type: String, required: true },
  completionPercentage: { type: Number, default: 0 },
  isOverdue: { type: Boolean, default: false },
  hourlyUpdates: [hourlyUpdateSchema],
  attachments: [attachmentSchema]
}, {
  timestamps: true
});

// Indexes for better query performance
assignTaskSchema.index({ 'assignedManagers.userId': 1 });
assignTaskSchema.index({ 'assignedSupervisors.userId': 1 });
assignTaskSchema.index({ createdBy: 1 });
assignTaskSchema.index({ siteId: 1 });
assignTaskSchema.index({ status: 1 });
assignTaskSchema.index({ dueDateTime: 1 });

// Calculate completion percentage before saving
assignTaskSchema.pre('save', function(next) {
  const totalStaff = this.assignedManagers.length + this.assignedSupervisors.length;
  if (totalStaff > 0) {
    const completedStaff = 
      this.assignedManagers.filter(m => m.status === 'completed').length +
      this.assignedSupervisors.filter(s => s.status === 'completed').length;
    this.completionPercentage = Math.round((completedStaff / totalStaff) * 100);
  }
  
  // Check if overdue
  if (this.status !== 'completed' && this.status !== 'cancelled') {
    const dueDate = new Date(this.dueDateTime);
    this.isOverdue = dueDate < new Date();
  }
  
  next();
});

// Create or get the model
const AssignTask = mongoose.models.AssignTask || mongoose.model('AssignTask', assignTaskSchema);

export default AssignTask;