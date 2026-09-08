import mongoose, { Schema, Document } from 'mongoose';

export interface ICleaningPhoto extends Document {
  photoUrl: string;
  cloudinaryPublicId: string;
  site: string;
  siteId?: mongoose.Types.ObjectId;  // ✅ ADD THIS
  remark?: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CleaningPhotoSchema = new Schema<ICleaningPhoto>({
  photoUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  site: { type: String, required: true },
  siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },  // ✅ ADD THIS
  remark: { type: String },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// ✅ ADD THIS INDEX for siteId + createdAt queries
CleaningPhotoSchema.index({ siteId: 1, createdAt: -1 });

export default mongoose.model<ICleaningPhoto>('CleaningPhoto', CleaningPhotoSchema);