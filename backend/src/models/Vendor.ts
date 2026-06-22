// Create src/models/Vendor.ts:
import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  name: string;
  [key: string]: any;
}

const VendorSchema = new Schema({ name: String }, { timestamps: true });
export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);