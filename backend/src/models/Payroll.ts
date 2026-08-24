import mongoose, { Schema, Document } from 'mongoose';

export interface IPayroll extends Document {
  employeeId: string; // This should be string, not ObjectId
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'pending' | 'processed' | 'paid' | 'hold' | 'part-paid';
  paymentDate?: Date;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaves: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'paid' | 'hold' | 'part-paid';
  notes?: string;
  overtimeHours?: number;
  overtimeAmount?: number;
  bonus?: number;
  providentFund?: number;
  esic?: number;
  professionalTax?: number;
  mlwf?: number;
  advance?: number;
  uniformAndId?: number;
  fine?: number;
  otherDeductions?: number;
  da?: number;
  hra?: number;
  otherAllowances?: number;
  leaveEncashment?: number;
  arrears?: number;
  deductionBreakdown?: {
    additionalDeductions: number;
    items: Array<{
      type: string;
      amount: number;
      description: string;
      id: string;
    }>;
  };
  
  createdBy: string;
  updatedBy: string;
  // Employee details for reference
  employeeDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankBranch?: string;
    bankName?: string;
    aadharNumber?: string;
    panNumber?: string;
    esicNumber?: string;
    uanNumber?: string;
    permanentAddress?: string;
    localAddress?: string;
    salary?: number;
    monthlySalary?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema: Schema = new Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      index: true
    },
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
      index: true
    },
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary cannot be negative']
    },
    allowances: {
      type: Number,
      default: 0,
      min: [0, 'Allowances cannot be negative']
    },
    deductions: {
      type: Number,
      default: 0,
      min: [0, 'Deductions cannot be negative']
    },
    netSalary: {
      type: Number,
      required: [true, 'Net salary is required'],
      min: [0, 'Net salary cannot be negative']
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'paid', 'hold', 'part-paid'],
      default: 'pending',
      index: true
    },
    paymentDate: {
      type: Date
    },
    presentDays: {
      type: Number,
      default: 0,
      min: [0, 'Present days cannot be negative']
    },
    absentDays: {
      type: Number,
      default: 0,
      min: [0, 'Absent days cannot be negative']
    },
    halfDays: {
      type: Number,
      default: 0,
      min: [0, 'Half days cannot be negative']
    },
    leaves: {
      type: Number,
      default: 0,
      min: [0, 'Leaves cannot be negative']
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'hold', 'part-paid'],
      default: 'pending',
      index: true
    },
    notes: {
      type: String,
      trim: true
    },
    overtimeHours: {
      type: Number,
      default: 0,
      min: [0, 'Overtime hours cannot be negative']
    },
    overtimeAmount: {
      type: Number,
      default: 0,
      min: [0, 'Overtime amount cannot be negative']
    },
    bonus: {
      type: Number,
      default: 0,
      min: [0, 'Bonus cannot be negative']
    },
    providentFund: {
      type: Number,
      default: 0,
      min: [0, 'Provident fund cannot be negative']
    },
    esic: {
      type: Number,
      default: 0,
      min: [0, 'ESIC cannot be negative']
    },
    professionalTax: {
      type: Number,
      default: 0,
      min: [0, 'Professional tax cannot be negative']
    },
    mlwf: {
      type: Number,
      default: 0,
      min: [0, 'MLWF cannot be negative']
    },
    advance: {
      type: Number,
      default: 0,
      min: [0, 'Advance cannot be negative']
    },
    uniformAndId: {
      type: Number,
      default: 0,
      min: [0, 'Uniform and ID cannot be negative']
    },
    fine: {
      type: Number,
      default: 0,
      min: [0, 'Fine cannot be negative']
    },
    otherDeductions: {
      type: Number,
      default: 0,
      min: [0, 'Other deductions cannot be negative']
    },
    da: {
      type: Number,
      default: 0,
      min: [0, 'DA cannot be negative']
    },
    hra: {
      type: Number,
      default: 0,
      min: [0, 'HRA cannot be negative']
    },
    otherAllowances: {
      type: Number,
      default: 0,
      min: [0, 'Other allowances cannot be negative']
    },
    leaveEncashment: {
      type: Number,
      default: 0,
      min: [0, 'Leave encashment cannot be negative']
    },
    arrears: {
      type: Number,
      default: 0,
      min: [0, 'Arrears cannot be negative']
    },

    deductionBreakdown: {
  additionalDeductions: { type: Number, default: 0 },
  items: [
    {
      type: { type: String },
      amount: { type: Number },
      description: { type: String },
      id: { type: String }
    }
  ]
},
    // Employee details for reference
    employeeDetails: {
      accountNumber: {
        type: String,
        trim: true
      },
      ifscCode: {
        type: String,
        trim: true,
        uppercase: true
      },
      bankBranch: {
        type: String,
        trim: true
      },
      bankName: {
        type: String,
        trim: true
      },
      aadharNumber: {
        type: String,
        trim: true
      },
      panNumber: {
        type: String,
        trim: true,
        uppercase: true
      },
      esicNumber: {
        type: String,
        trim: true
      },
      uanNumber: {
        type: String,
        trim: true
      },
      permanentAddress: {
        type: String,
        trim: true
      },
      localAddress: {
        type: String,
        trim: true
      },
      salary: {
        type: Number,
        min: [0, 'Salary cannot be negative']
      },
      monthlySalary: {
        type: Number,
        min: [0, 'Monthly salary cannot be negative']
      }
    },
    createdBy: {
      type: String,
      required: [true, 'Created by is required']
    },
    updatedBy: {
      type: String,
      required: [true, 'Updated by is required']
    }
  },
  {
    timestamps: true
  }
);

// Ensure one payroll record per employee per month
PayrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });

export default mongoose.model<IPayroll>('Payroll', PayrollSchema);
