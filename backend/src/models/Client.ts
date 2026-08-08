
import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  contactPerson?: string;
  contactPersonPhone?: string;
  value: string;
  industry: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema: Schema = new Schema(
  {
    name: {
      type: String,
      
      trim: true
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true,
      default: 'Mumbai'
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    contactPerson: {
      type: String,
      trim: true
    },
    contactPersonPhone: {
      type: String,
      trim: true
    },
    value: {
      type: String,
      required: [true, 'Value is required'],
      trim: true
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
      default: 'IT Services'
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
ClientSchema.index({ name: 1 });
ClientSchema.index({ company: 1 });
ClientSchema.index({ email: 1 }, { unique: true });
ClientSchema.index({ status: 1 });
ClientSchema.index({ industry: 1 });
ClientSchema.index({ value: 1 });
ClientSchema.index({ city: 1 });

export default mongoose.model<IClient>('Client', ClientSchema);