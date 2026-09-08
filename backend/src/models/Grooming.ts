import mongoose, { Schema, Document } from 'mongoose';

export interface IGrooming extends Document {
  employeeId: string;
  date: string;
  siteId?: mongoose.Types.ObjectId;  // ✅ ADD THIS
  site?: string;  // keep for back-compat
  shirt: boolean;
  pant: boolean;
  cap: boolean;
  shoes: boolean;
  idCard: boolean;
  nails?: boolean;
  singleBangles?: boolean;
  studs?: boolean;
  shaving?: boolean;
  haircut?: boolean;
  apron?: boolean;
  westcoat?: boolean;
  supervisorId?: string;
}

const GroomingSchema = new Schema({
  employeeId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true },
  siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },  // ✅ ADD THIS
  site: { type: String },  // keep for back-compat
  shirt: { type: Boolean, default: false },
  pant: { type: Boolean, default: false },
  cap: { type: Boolean, default: false },
  shoes: { type: Boolean, default: false },
  idCard: { type: Boolean, default: false },
  nails: { type: Boolean, default: false },
  singleBangles: { type: Boolean, default: false },
  studs: { type: Boolean, default: false },
  shaving: { type: Boolean, default: false },
  haircut: { type: Boolean, default: false },
  apron: { type: Boolean, default: false },
  westcoat: { type: Boolean, default: false },
  supervisorId: { type: String },
}, { timestamps: true });

GroomingSchema.index({ employeeId: 1, date: 1 }, { unique: true });
// ✅ ADD THIS INDEX for siteId + date queries
GroomingSchema.index({ siteId: 1, date: 1 });

export default mongoose.model<IGrooming>('Grooming', GroomingSchema);