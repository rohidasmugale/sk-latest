// backend/src/models/Advance.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAdvance extends Document {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  advanceAmount: number;
  paymentDate: Date;
  deductionType: 'monthly' | 'custom';
  monthlyEMI?: number;
  customAmount?: number;
  customStartDate?: Date;
  customEndDate?: Date;
  description: string;
  appliedMonth: string;
 status: 'active' | 'completed' | 'cancelled';
  remainingAmount: number;
  repaidAmount: number;
  nextInstallmentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdvanceSchema: Schema = new Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    ref: 'Employee',
    trim: true
  },
  employeeName: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true
  },
  employeeCode: {
    type: String,
    required: [true, 'Employee code is required'],
    trim: true
  },
  advanceAmount: {
    type: Number,
    required: [true, 'Advance amount is required'],
    min: [0, 'Advance amount must be greater than 0']
  },
  paymentDate: {
    type: Date,
    default: Date.now,
    required: [true, 'Payment date is required']
  },
  deductionType: {
    type: String,
    enum: ['monthly', 'custom'],
    required: [true, 'Deduction type is required']
  },
  monthlyEMI: {
    type: Number,
    min: 0,
    required: function(this: IAdvance) {
      return this.deductionType === 'monthly';
    }
  },
  customAmount: {
    type: Number,
    min: 0,
    required: function(this: IAdvance) {
      return this.deductionType === 'custom';
    }
  },
  customStartDate: {
    type: Date,
    required: function(this: IAdvance) {
      return this.deductionType === 'custom';
    }
  },
  customEndDate: {
    type: Date,
    required: function(this: IAdvance) {
      return this.deductionType === 'custom';
    }
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  appliedMonth: {
    type: String,
    required: [true, 'Applied month is required'],
    match: [/^\d{4}-\d{2}$/, 'Applied month must be in YYYY-MM format']
  },
  status: {
  type: String,
  enum: ['active', 'completed', 'cancelled'],
  default: 'active'
},
  remainingAmount: {
    type: Number,
    default: 0
  },
  repaidAmount: {
    type: Number,
    default: 0
  },
  nextInstallmentDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Calculate remaining amount before saving
AdvanceSchema.pre('save', function(next) {
  const advance = this as IAdvance;
  advance.remainingAmount = advance.advanceAmount - (advance.repaidAmount || 0);
  
  // Set next installment date for monthly deductions
  if (advance.deductionType === 'monthly' && advance.monthlyEMI && advance.monthlyEMI > 0) {
    const paymentDate = new Date(advance.paymentDate);
    paymentDate.setMonth(paymentDate.getMonth() + 1);
    advance.nextInstallmentDate = paymentDate;
  }
  
  next();
});

// Create indexes for better query performance
AdvanceSchema.index({ employeeId: 1 });
AdvanceSchema.index({ status: 1 });
AdvanceSchema.index({ deductionType: 1 });
AdvanceSchema.index({ appliedMonth: 1 });
AdvanceSchema.index({ createdAt: -1 });
AdvanceSchema.index({ employeeId: 1, status: 1 });
AdvanceSchema.index({ appliedMonth: 1, status: 1 });

export default mongoose.model<IAdvance>('Advance', AdvanceSchema);
