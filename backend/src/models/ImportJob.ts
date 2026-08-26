import mongoose, { Schema, Document } from 'mongoose';

export interface IImportJob extends Document {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  importErrors: any[];
  errorReportUrl?: string;
  fileName?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

const ImportJobSchema = new Schema<IImportJob>({
  jobId: { type: String, unique: true, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  totalRows: { type: Number, default: 0 },
  processedRows: { type: Number, default: 0 },
  createdCount: { type: Number, default: 0 },
  updatedCount: { type: Number, default: 0 },
importErrors: {
  type: [Schema.Types.Mixed] as unknown as any[],
  default: []
},
  errorReportUrl: { type: String },
  fileName: { type: String },
  startedAt: { type: Date },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IImportJob>('ImportJob', ImportJobSchema);