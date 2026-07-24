import mongoose, { Schema, Document } from "mongoose";

export interface IAttachment {
  _id?: mongoose.Types.ObjectId;
  name: string;
  type: 'image' | 'document' | 'video';
  url: string;
  size: string;
  uploadedAt: Date;
}

export interface IFeedback {
  _id?: mongoose.Types.ObjectId;
  employeeId: string;
  employeeName: string;
  rating: number;
  comment: string;
  submittedAt: Date;
}

export interface ISupervisor {
  id: string;
  name: string;
}

export interface IManager {
  id: string;
  name: string;
}

export interface ITrainingSession extends Document {
  title: string;
  description: string;
  type: 'safety' | 'technical' | 'soft_skills' | 'compliance' | 'other';
  date: string;
  time: string;
  duration: string;
  trainer: string;
  supervisor?: string;
  site: string;
  department: string;
  attendees: string[];
  maxAttendees: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  attachments: IAttachment[];
  feedback: IFeedback[];
  location: string;
  objectives: string[];
  supervisors: ISupervisor[];
  managers: IManager[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema: Schema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['image', 'document', 'video'], required: true },
  url: { type: String, required: true },
  size: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const FeedbackSchema: Schema = new Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now }
}, { _id: true });

const SupervisorSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true }
}, { _id: false });

const ManagerSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true }
}, { _id: false });

const TrainingSessionSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['safety', 'technical', 'soft_skills', 'compliance', 'other'],
      required: [true, 'Type is required']
    },
    date: {
      type: String,
      required: [true, 'Date is required']
    },
    time: {
      type: String,
      default: ''
    },
    duration: {
      type: String,
      default: ''
    },
    trainer: {
      type: String,
      required: [true, 'Trainer is required']
    },
    supervisor: {
      type: String,
      default: ''
    },
    site: {
      type: String,
      default: ''
    },
    department: {
      type: String,
      default: 'All Departments'
    },
    attendees: {
      type: [String],
      default: []
    },
    maxAttendees: {
      type: Number,
      default: 20,
      min: 1
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    attachments: {
      type: [AttachmentSchema],
      default: []
    },
    feedback: {
      type: [FeedbackSchema],
      default: []
    },
    location: {
      type: String,
      default: ''
    },
    objectives: {
      type: [String],
      default: []
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
    timestamps: true
  }
);

// Create indexes
TrainingSessionSchema.index({ date: 1, status: 1 });
TrainingSessionSchema.index({ department: 1 });
TrainingSessionSchema.index({ site: 1 });
TrainingSessionSchema.index({ type: 1 });
TrainingSessionSchema.index({ trainer: 1 });
TrainingSessionSchema.index({ "supervisors.id": 1 });
TrainingSessionSchema.index({ "managers.id": 1 });

// Transform toJSON
TrainingSessionSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

export default mongoose.models.TrainingSession || mongoose.model<ITrainingSession>("TrainingSession", TrainingSessionSchema);