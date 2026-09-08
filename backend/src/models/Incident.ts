import mongoose, { Schema, Document } from 'mongoose';

export interface IIncident extends Document {
  site: string;
  siteId?: mongoose.Types.ObjectId;  // ✅ ADD THIS
  employeeId?: string;
  type: 'accident' | 'issue';
  description: string;
  date: Date;
  photoUrl?: string;  
  reportedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const IncidentSchema = new Schema<IIncident>({
  site: { type: String, required: true },
  siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },  // ✅ ADD THIS
  employeeId: { type: String },
  type: { type: String, enum: ['accident', 'issue'], required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  photoUrl: { type: String, default: null },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// ✅ ADD THIS INDEX for siteId + date queries
IncidentSchema.index({ siteId: 1, date: -1 });

export default mongoose.model<IIncident>('Incident', IncidentSchema);