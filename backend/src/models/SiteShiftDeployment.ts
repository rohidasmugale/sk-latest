import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteShiftDeployment extends Document {
  site: string;
  siteId?: mongoose.Types.ObjectId;  // ✅ ADD THIS
  date: string;
  text: string;
  updatedAt: Date;
}

const SiteShiftDeploymentSchema = new Schema<ISiteShiftDeployment>({
  site: { type: String, required: true },
  siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },  // ✅ ADD THIS
  date: { type: String, required: true },
  text: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

// ❌ REMOVE THIS compound index (site + date):
// SiteShiftDeploymentSchema.index({ site: 1, date: 1 }, { unique: true });

// ✅ REPLACE WITH compound index (siteId + date):
SiteShiftDeploymentSchema.index({ siteId: 1, date: 1 }, { unique: true });

export default mongoose.model<ISiteShiftDeployment>('SiteShiftDeployment', SiteShiftDeploymentSchema);