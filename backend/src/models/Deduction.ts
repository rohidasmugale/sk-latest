import mongoose, { Schema, Document } from 'mongoose';

export interface IDeduction extends Document {
  employeeId: string; // Changed to string to match employeeId (EMP001)
  employeeName?: string;
  employeeCode?: string;
  type: 'advance' | 'fine' | 'other';
  amount: number;
  description?: string;
  deductionDate: Date;
status: 'active' | 'completed' | 'cancelled';
  repaymentMonths?: number;
  installmentAmount?: number;
  fineAmount?: number;
  appliedMonth: string; // Format: YYYY-MM
  createdAt: Date;
  updatedAt: Date;
}

const DeductionSchema: Schema = new Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    ref: 'Employee'
  },
  employeeName: {
    type: String,
    trim: true
  },
  employeeCode: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['advance', 'fine', 'other'],
    required: [true, 'Deduction type is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive'],
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  deductionDate: {
    type: Date,
    default: Date.now,
  },
 status: {
  type: String,
  enum: ['active', 'completed', 'cancelled'],
  default: 'active'
},
  repaymentMonths: {
    type: Number,
    default: 0,
    min: [0, 'Repayment months must be positive'],
  },
  installmentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Installment amount must be positive'],
  },
  fineAmount: {
    type: Number,
    default: 0,
    min: [0, 'Fine amount must be positive'],
  },
  appliedMonth: {
    type: String,
    required: [true, 'Applied month is required'],
    match: [/^\d{4}-\d{2}$/, 'Applied month must be in YYYY-MM format']
  }
}, {
  timestamps: true,
});

// Calculate installment amount before saving
DeductionSchema.pre('save', function(next) {
  const deduction = this as IDeduction;
  
  if (deduction.type === 'advance' && deduction.repaymentMonths && deduction.repaymentMonths > 0) {
    deduction.installmentAmount = parseFloat((deduction.amount / deduction.repaymentMonths).toFixed(2));
  }
  
  if (deduction.type === 'fine') {
    deduction.fineAmount = deduction.amount;
  }
  
  next();
});

// Create indexes for better query performance
DeductionSchema.index({ employeeId: 1 });
DeductionSchema.index({ status: 1 });
DeductionSchema.index({ type: 1 });
DeductionSchema.index({ appliedMonth: 1 });
DeductionSchema.index({ createdAt: -1 });
DeductionSchema.index({ employeeId: 1, appliedMonth: 1 });

export default mongoose.model<IDeduction>('Deduction', DeductionSchema);

