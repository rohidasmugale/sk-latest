import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;         // e.g. "payroll.adjust"
  entity: string;         // "payroll" | "salaryStructure" | "salarySlip" | "lockedMonth"
  entityId?: string;      // Mongo _id of the affected doc
  month?: string;         // "2025-01" — useful for payroll
  employeeId?: string;    // human employee id
  employeeName?: string;  // cached for display
  performedBy: string;    // email/id
  performedAt: Date;
  description: string;    // human-readable one-liner
  before?: any;           // snapshot before (sanitized)
  after?: any;            // snapshot after (sanitized)
  metadata?: any;         // extra context (amount, reason, etc.)
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    month: { type: String, index: true },
    employeeId: { type: String, index: true },
    employeeName: { type: String },
    performedBy: { type: String, required: true, index: true },
    performedAt: { type: Date, default: Date.now, index: true },
    description: { type: String, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound index for common queries
AuditLogSchema.index({ entity: 1, performedAt: -1 });
AuditLogSchema.index({ month: 1, entity: 1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);