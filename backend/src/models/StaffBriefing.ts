import mongoose, { Schema, Document } from "mongoose";

export interface IActionItem {
  _id?: mongoose.Types.ObjectId;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export interface IAttachment {
  _id?: mongoose.Types.ObjectId;
  name: string;
  type: 'image' | 'document' | 'video';
  url: string;
  size: string;
  uploadedAt: Date;
}

export interface ISupervisor {
  id: string;
  name: string;
}

export interface IManager {
  id: string;
  name: string;
}

export interface IStaffBriefing extends Document {
  date: string;
  time: string;
  conductedBy: string;
  site: string;
  department: string;
  attendeesCount: number;
  topics: string[];
  keyPoints: string[];
  actionItems: IActionItem[];
  attachments: IAttachment[];
  notes: string;
  shift: 'morning' | 'evening' | 'night';
  supervisors: ISupervisor[];
  managers: IManager[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActionItemSchema: Schema = new Schema({
  description: { type: String, required: true },
  assignedTo: { type: String, required: true },
  dueDate: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, { _id: true });

const AttachmentSchema: Schema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['image', 'document', 'video'], required: true },
  url: { type: String, required: true },
  size: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const SupervisorSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true }
}, { _id: false });

const ManagerSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true }
}, { _id: false });

const StaffBriefingSchema: Schema = new Schema(
  {
    date: {
      type: String,
      required: true
    },
    time: {
      type: String,
      default: ''
    },
    conductedBy: {
  type: String,
  default: ''
},
    site: {
      type: String,
      required: true
    },
    department: {
      type: String,
      default: ''
    },
    attendeesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    topics: {
      type: [String],
      default: []
    },
    keyPoints: {
      type: [String],
      default: []
    },
    actionItems: {
      type: [ActionItemSchema],
      default: []
    },
    attachments: {
      type: [AttachmentSchema],
      default: []
    },
    notes: {
      type: String,
      default: ''
    },
    shift: {
      type: String,
      enum: ['morning', 'evening', 'night'],
      default: 'morning'
    },
    supervisors: {
      type: [SupervisorSchema],
      default: []
    },
    managers: {
      type: [ManagerSchema],
      default: []
    },
    createdBy: {
      type: String,
      default: 'system'
    }
  },
  {
    timestamps: true,
    id: false,
    autoIndex: false
  }
);

StaffBriefingSchema.index({ date: -1, shift: 1 });
StaffBriefingSchema.index({ department: 1 });
StaffBriefingSchema.index({ site: 1 });
StaffBriefingSchema.index({ conductedBy: 1 });
StaffBriefingSchema.index({ "supervisors.id": 1 });
StaffBriefingSchema.index({ "managers.id": 1 });

if (mongoose.models.StaffBriefing) {
  delete mongoose.models.StaffBriefing;
}

export default mongoose.model<IStaffBriefing>("StaffBriefing", StaffBriefingSchema);