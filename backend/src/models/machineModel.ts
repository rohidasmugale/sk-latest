import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMaintenanceRecord {
  type: string;
  description: string;
  cost: number;
  performedBy: string;
  date: Date;
  status: 'pending' | 'approved' | 'rejected';
  expenseId?: string;
}

export interface IMachine extends Document {
  name: string;
  cost: number;
  purchaseDate: Date;
  quantity: number;
  description?: string;
  status: 'operational' | 'maintenance' | 'out-of-service';
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  location?: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  department?: string;
  assignedTo?: string;
  remark?: string;   // <-- add this
  siteId?: mongoose.Types.ObjectId;
  maintenanceHistory: IMaintenanceRecord[];
}

const MaintenanceSchema: Schema<IMaintenanceRecord> = new Schema(
  {
    type: { type: String, required: true },
    description: { type: String, required: true },
    cost: { type: Number, required: true },
    performedBy: { type: String, required: true },
    date: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    expenseId: { type: String }
  },
  { _id: false }
);

const MachineSchema: Schema<IMachine> = new Schema(
  {
    name: { type: String, required: true },
    cost: { type: Number, required: true },
    purchaseDate: { type: Date, required: true },
    quantity: { type: Number, required: true, default: 1 },
    description: { type: String },
    status: {
      type: String,
      enum: ['operational', 'maintenance', 'out-of-service'],
      default: 'operational',
    },
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDate: { type: Date },
    location: { type: String },
    manufacturer: { type: String },
    modelNumber: { type: String },
    serialNumber: { 
      type: String, 
      unique: true, 
      sparse: true,
      index: true 
    },
    department: { type: String },
    assignedTo: { type: String },
    remark: { type: String, default: '' },   // <-- add this
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', index: true },
    maintenanceHistory: { type: [MaintenanceSchema], default: [] },
  },
  { timestamps: true }
);

// Create text index for search
MachineSchema.index({ name: 'text', modelNumber: 'text', location: 'text', department: 'text' });

// Add a pre-save middleware to handle empty serial numbers
MachineSchema.pre('save', function(next) {
  if (this.serialNumber === '' || this.serialNumber === null) {
    this.serialNumber = undefined;
  }
  next();
});

// Also handle update operations
MachineSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update.serialNumber === '' || update.serialNumber === null) {
    update.serialNumber = undefined;
  }
  next();
});

const Machine: Model<IMachine> =
  mongoose.models.Machine || mongoose.model<IMachine>('Machine', MachineSchema);

export default Machine;