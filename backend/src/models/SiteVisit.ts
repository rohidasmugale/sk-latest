// backend/models/SiteVisit.ts
import mongoose from 'mongoose';

export interface ISiteVisit extends mongoose.Document {
  siteId: string;
  siteName: string;
  managerId: string;
  managerName: string;
  visitDate: Date;
  photos: Array<{
    url: string;
    filename: string;
    uploadedAt: Date;
  }>;
  workQueries: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in-progress' | 'completed';
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    resolution?: string;
  }>;
  updates: Array<{
    content: string;
    timestamp: Date;
    type: 'general' | 'issue' | 'maintenance' | 'completed';
  }>;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SiteVisitSchema = new mongoose.Schema({
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', index: true },
  siteName: { type: String, required: true },
  managerId: { type: String, required: true, index: true },
  managerName: { type: String, required: true },
  visitDate: { type: Date, required: true, default: Date.now, index: true },
  photos: [{
    url: { type: String, required: true },
    filename: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  workQueries: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
    resolution: String
  }],
  updates: [{
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['general', 'issue', 'maintenance', 'completed'], default: 'general' }
  }],
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected'], default: 'draft' },
  rejectionReason: String,
  approvedBy: String,
  approvedAt: Date
}, { timestamps: true });

// Indexes for efficient queries
SiteVisitSchema.index({ managerId: 1, visitDate: -1 });
SiteVisitSchema.index({ siteId: 1, visitDate: -1 });
SiteVisitSchema.index({ status: 1, visitDate: -1 });

export const SiteVisit = mongoose.model<ISiteVisit>('SiteVisit', SiteVisitSchema);