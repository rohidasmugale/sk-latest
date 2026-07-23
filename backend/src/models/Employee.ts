import mongoose, { Schema, Document } from 'mongoose';

// KYC Document Interface
interface KYCdocument {
  documentType: 'aadhar' | 'pan' | 'electricity' | 'driving' | 'police' | 'voter' | 'passport' | 'other';
  documentName: string;
  documentNumber?: string;
  fileUrl: string;
  filePublicId: string;
  uploadedAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  expiryDate?: Date;
}

// Site History Entry Interface
interface SiteHistoryEntry {
  siteName: string;
  assignedDate: Date;
  leftDate?: Date;
  daysWorked?: number;
}

export interface IEmployee extends Document {
  // Basic Information
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  panNumber?: string;
  esicNumber?: string;
  uanNumber?: string;
  
  // Personal Details
  dateOfBirth?: Date;
  dateOfJoining: Date;
  dateOfExit?: Date;
  bloodGroup?: string;
  gender?: string;
  maritalStatus?: string;
  
  // Address
  permanentAddress?: string;
  permanentPincode?: string;
  localAddress?: string;
  localPincode?: string;
  bankBranch?: string;
  
  // Bank Details
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  
  // Family Details
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  numberOfChildren?: number;
  
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  
  // Nominee Details
  nomineeName?: string;
  nomineeRelation?: string;
  
  // Employment Details
  department: string;
  position: string;
  siteName?: string;
  salary: number;
  status: 'active' | 'inactive' | 'left';
  role?: string;
  
  // Uniform Details
  pantSize?: string;
  shirtSize?: string;
  capSize?: string;
  
  // Issued Items
  idCardIssued: boolean;
  westcoatIssued: boolean;
  apronIssued: boolean;
  
  // Site History
  siteHistory?: SiteHistoryEntry[];
  
  // KYC Documents
  kycDocuments: KYCdocument[];
  
  // Documents - Cloudinary URLs
  photo?: string;
  photoPublicId?: string;
  employeeSignature?: string;
  employeeSignaturePublicId?: string;
  authorizedSignature?: string;
  authorizedSignaturePublicId?: string;
  faceDescriptor?: number[];
  faceEmbeddings?: number[][];
  // System Fields
  createdAt: Date;
  updatedAt: Date;
     // array of embeddings (each embedding is an array of 512 numbers)
    userId?: mongoose.Types.ObjectId;      // reference to User
  supervisorId?: mongoose.Types.ObjectId; // who supervises this employee (User or Employee ID)
}

const EmployeeSchema: Schema = new Schema(
  {
    // Basic Information
    // REPLACE the employeeId field definition
employeeId: {
  type: String,
  unique: true,
  trim: true,
  required: [true, 'Employee ID is required']
  // REMOVE the 'default' function completely
},
    name: {
      type: String,
      required: [true, 'Name is required'],
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
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v || v.trim() === '') return false;
          return /^[0-9]{10}$/.test(v);
        },
        message: 'Please enter a valid 10-digit phone number'
      }
    },
    aadharNumber: {
      type: String,
      required: [true, 'Aadhar number is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^[0-9]{12}$/.test(v);
        },
        message: 'Aadhar number must be exactly 12 digits'
      }
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      validate: {
        validator: function(v: string) {
          if (!v || v.trim() === '') return true;
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: 'Please enter a valid PAN format (e.g., ABCDE1234F) or leave empty'
      }
    },
    esicNumber: {
      type: String,
      trim: true,
      default: null
    },
    uanNumber: {
      type: String,
      trim: true,
      default: null
    },
    
    // Personal Details
    dateOfBirth: {
      type: Date,
      default: null
    },
    dateOfJoining: {
      type: Date,
      required: [true, 'Date of joining is required'],
      default: Date.now
    },
    dateOfExit: {
      type: Date,
      default: null
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', null],
      default: null
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Transgender', null],
      default: null
    },
    maritalStatus: {
      type: String,
      enum: ['Single', 'Married', 'Widow', 'Widower', 'Divorcee', null],
      default: null
    },
    faceEmbeddings: {
  type: [[Number]],   // array of arrays of numbers
  default: []
},
    // Address
    permanentAddress: {
      type: String,
      trim: true,
      default: null
    },
    permanentPincode: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function(v: string) {
          if (!v || v.trim() === '') return true;
          return /^[1-9][0-9]{5}$/.test(v);
        },
        message: 'Please enter a valid 6-digit pincode'
      }
    },
    localAddress: {
      type: String,
      trim: true,
      default: null
    },
    localPincode: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function(v: string) {
          if (!v || v.trim() === '') return true;
          return /^[1-9][0-9]{5}$/.test(v);
        },
        message: 'Please enter a valid 6-digit pincode'
      }
    },
    bankBranch: {
      type: String,
      trim: true,
      default: null
    },
    
    // Bank Details
    bankName: {
      type: String,
      trim: true,
      default: null
    },
    accountNumber: {
      type: String,
      trim: true,
      default: null
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      validate: {
        validator: function(v: string) {
          if (!v || v.trim() === '') return true;
          return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
        },
        message: 'Please enter a valid IFSC code (e.g., SBIN0001234)'
      }
    },
    branchName: {
      type: String,
      trim: true,
      default: null
    },
    
    // Family Details
    fatherName: {
      type: String,
      trim: true,
      default: null
    },
    motherName: {
      type: String,
      trim: true,
      default: null
    },
    spouseName: {
      type: String,
      trim: true,
      default: null
    },
    numberOfChildren: {
      type: Number,
      min: 0,
      default: 0
    },
    
    // Emergency Contact
    emergencyContactName: {
      type: String,
      trim: true,
      default: null
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function(v: string) {
          if (!v || v.trim() === '') return true;
          return /^[0-9]{10}$/.test(v);
        },
        message: 'Please enter a valid 10-digit phone number or leave empty'
      }
    },
    emergencyContactRelation: {
      type: String,
      trim: true,
      default: null
    },
    
    // Nominee Details
    nomineeName: {
      type: String,
      trim: true,
      default: null
    },
    nomineeRelation: {
      type: String,
      trim: true,
      default: null
    },
    
    // Employment Details
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: [
        'Housekeeping',
        'Security',
        'Parking Management',
        'Waste Management',
        'STP Tank Cleaning',
        'Consumables Management',
        'Administration',
        'Finance',
        'HR',
        'IT',
        'Operations',
        'Maintenance',
        'Driver',
        'Supervisor',
        'Sales',
        'General Staff'
      ],
      default: 'General Staff'
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
      default: 'Employee'
    },
    siteName: {
      type: String,
      trim: true,
      default: ''
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
      min: [0, 'Salary cannot be negative'],
      default: 15000
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'left'],
      default: 'active'
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'supervisor', 'employee', null],
      default: 'employee'
    },
    
    // Uniform Details
    pantSize: {
      type: String,
      enum: ['28', '30', '32', '34', '36', '38', '40', null],
      default: null
    },
    shirtSize: {
      type: String,
      enum: ['S', 'M', 'L', 'XL', 'XXL', null],
      default: null
    },
    capSize: {
      type: String,
      enum: ['S', 'M', 'L', 'XL', null],
      default: null
    },
    
    // Issued Items
    idCardIssued: {
      type: Boolean,
      default: false
    },
    westcoatIssued: {
      type: Boolean,
      default: false
    },
    apronIssued: {
      type: Boolean,
      default: false
    },
    
    // Site History
    siteHistory: {
      type: [{
        siteName: { type: String, required: true },
        assignedDate: { type: Date, required: true, default: Date.now },
        leftDate: { type: Date },
        daysWorked: { type: Number }
      }],
      default: []
    },
    
    // KYC Documents
    kycDocuments: {
      type: [{
        documentType: {
          type: String,
          enum: ['aadhar', 'pan', 'electricity', 'driving', 'police', 'voter', 'passport', 'other'],
          required: true
        },
        documentName: {
          type: String,
          required: true
        },
        documentNumber: {
          type: String,
          trim: true
        },
        fileUrl: {
          type: String,
          required: true
        },
        filePublicId: {
          type: String,
          required: true
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        },
        verified: {
          type: Boolean,
          default: false
        },
        verifiedAt: Date,
        verifiedBy: String,
        expiryDate: Date
      }],
      default: []
    },
    
    // Cloudinary URLs
    photo: {
      type: String,
      default: null
    },
    
    photoPublicId: {
      type: String,
      default: null
    },
    
    employeeSignature: {
      type: String,
      default: null
    },
    
    employeeSignaturePublicId: {
      type: String,
      default: null
    },
    
    authorizedSignature: {
      type: String,
      default: null
    },
    
    authorizedSignaturePublicId: {
      type: String,
      default: null
    },

    faceDescriptor: {
      type: [Number],
      default: null
    },

    userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
},
supervisorId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',   // or 'Employee' – whichever you prefer
  default: null
}
   
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        delete ret.photoPublicId;
        delete ret.employeeSignaturePublicId;
        delete ret.authorizedSignaturePublicId;
        
        // Remove public IDs from KYC documents
        if (ret.kycDocuments) {
          ret.kycDocuments = ret.kycDocuments.map((doc: any) => {
            const { filePublicId, ...rest } = doc;
            return rest;
          });
        }
        return ret;
      }
    },
    toObject: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        delete ret.photoPublicId;
        delete ret.employeeSignaturePublicId;
        delete ret.authorizedSignaturePublicId;
        
        // Remove public IDs from KYC documents
        if (ret.kycDocuments) {
          ret.kycDocuments = ret.kycDocuments.map((doc: any) => {
            const { filePublicId, ...rest } = doc;
            return rest;
          });
        }
        return ret;
      }
    }
  }
);

// Indexes for better query performance
EmployeeSchema.index({ email: 1 }, { unique: true });
EmployeeSchema.index({ aadharNumber: 1 }, { unique: true });
EmployeeSchema.index({ employeeId: 1 }, { unique: true });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ dateOfJoining: -1 });
EmployeeSchema.index({ siteName: 1 });
EmployeeSchema.index({ 'kycDocuments.verified': 1 });
EmployeeSchema.index({ 'kycDocuments.documentType': 1 });

// Virtual for formatted date
EmployeeSchema.virtual('formattedDateOfJoining').get(function() {
  return this.dateOfJoining ? this.dateOfJoining.toISOString().split('T')[0] : '';
});

EmployeeSchema.virtual('formattedDateOfBirth').get(function() {
  return this.dateOfBirth ? this.dateOfBirth.toISOString().split('T')[0] : '';
});

EmployeeSchema.virtual('formattedDateOfExit').get(function() {
  return this.dateOfExit ? this.dateOfExit.toISOString().split('T')[0] : '';
});

// Virtual for KYC completion status
EmployeeSchema.virtual('kycCompletionPercentage').get(function() {
  const requiredDocs = ['aadhar', 'pan', 'police'];
  const uploadedDocs = this.kycDocuments?.map((doc: any) => doc.documentType) || [];
  const verifiedDocs = this.kycDocuments?.filter((doc: any) => doc.verified).map((doc: any) => doc.documentType) || [];
  
  const uploadedCount = requiredDocs.filter(type => uploadedDocs.includes(type)).length;
  const verifiedCount = requiredDocs.filter(type => verifiedDocs.includes(type)).length;
  
  return {
    uploaded: (uploadedCount / requiredDocs.length) * 100,
    verified: (verifiedCount / requiredDocs.length) * 100,
    requiredDocs,
    uploadedDocs,
    verifiedDocs
  };
});

// Post-save middleware for error handling
EmployeeSchema.post('save', function(error: any, doc: any, next: any) {
  if (error.name === 'MongoError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    let message = '';
    
    if (field === 'email') {
      message = 'Email already exists. Please use a different email.';
    } else if (field === 'aadharNumber') {
      message = 'Aadhar number already exists. Please check and try again.';
    } else if (field === 'employeeId') {
      message = 'Employee ID already exists.';
    } else {
      message = `Duplicate value for ${field}`;
    }
    
    next(new Error(message));
  } else if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((err: any) => {
      return `• ${err.message}`;
    });
    next(new Error(errors.join('\n')));
  } else {
    next(error);
  }
});

// Pre-save middleware to clean up data
EmployeeSchema.pre('save', function(next) {
  const stringFields = ['name', 'email', 'phone', 'aadharNumber', 'panNumber', 
                       'esicNumber', 'uanNumber', 'position', 'siteName',
                       'permanentAddress', 'localAddress', 'bankName', 
                       'accountNumber', 'ifscCode', 'branchName'];
  
  stringFields.forEach(field => {
    if (this.get(field) && typeof this.get(field) === 'string') {
      this.set(field, this.get(field).trim());
    }
  });
  
  const optionalFields = ['panNumber', 'esicNumber', 'uanNumber', 'permanentAddress',
                         'localAddress', 'bankName', 'accountNumber', 'ifscCode',
                         'branchName', 'fatherName', 'motherName', 'spouseName',
                         'emergencyContactName', 'emergencyContactPhone',
                         'emergencyContactRelation', 'nomineeName', 'nomineeRelation'];
  
  optionalFields.forEach(field => {
    const value = this.get(field);
    if (value === '' || value === undefined) {
      this.set(field, null);
    }
  });
  
  next();
});

// Static methods
EmployeeSchema.statics.getValidDepartments = function() {
  return [
    'Housekeeping',
    'Security',
    'Parking Management',
    'Waste Management',
    'STP Tank Cleaning',
    'Consumables Management',
    'Administration',
    'Finance',
    'HR',
    'IT',
    'Operations',
    'Maintenance',
    'Driver',
    'Supervisor',
    'Sales',
    'General Staff'
  ];
};

EmployeeSchema.statics.getValidBloodGroups = function() {
  return ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
};

EmployeeSchema.statics.getValidGenders = function() {
  return ['Male', 'Female', 'Transgender'];
};

EmployeeSchema.statics.getDocumentTypes = function() {
  return {
    aadhar: { label: 'Aadhaar Card', required: true },
    pan: { label: 'PAN Card', required: true },
    electricity: { label: 'Electricity Bill', required: false },
    driving: { label: 'Driving License', required: false },
    police: { label: 'Police Verification', required: true },
    voter: { label: 'Voter ID', required: false },
    passport: { label: 'Passport', required: false },
    other: { label: 'Other Document', required: false }
  };
};

interface EmployeeModel extends mongoose.Model<IEmployee> {
  getValidDepartments(): string[];
  getValidBloodGroups(): string[];
  getValidGenders(): string[];
  getDocumentTypes(): Record<string, { label: string; required: boolean }>;
}

export default mongoose.model<IEmployee, EmployeeModel>('Employee', EmployeeSchema);