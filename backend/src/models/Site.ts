import mongoose, { Schema, Document } from 'mongoose';

export interface ISite extends Document {
  // Basic Information
  name: string;
  clientId?: string;
  clientName: string;
  location: string;
  areaSqft: number;
  
  // Manager
  manager?: string;
  
  // Manager and Supervisor Limits
  managerCount: number;
  supervisorCount: number;
  
  // Services
  services: string[];
  
  // Staff Deployment
  staffDeployment: Array<{
    role: string;
    count: number;
  }>;
  
  // Contract Details
  contractValue: number;
  contractEndDate: Date;
  
  // Status
  status: 'active' | 'inactive';
  
  // User who added this site
  addedBy: string;
  addedByRole: 'superadmin' | 'admin' | 'manager';
  
  // System Fields
  createdAt: Date;
  updatedAt: Date;
  latitude?: number;
  longitude?: number;
   geofenceRadius?: number; // in km, default 0.5
}

const SiteSchema: Schema = new Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true
    },
    clientId: {
      type: String,
      trim: true,
      default: undefined
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    areaSqft: {
      type: Number,
      required: [true, 'Area is required'],
      min: [1, 'Area must be greater than 0']
    },
    
    manager: {
      type: String,
      trim: true,
      default: undefined
    },
    
    // Manager and Supervisor Limits
    managerCount: {
      type: Number,
      default: 0,
      min: [0, 'Manager count cannot be negative']
    },
    supervisorCount: {
      type: Number,
      default: 0,
      min: [0, 'Supervisor count cannot be negative']
    },
    
    // Services
    services: {
      type: [String],
      default: [],
      validate: {
        validator: function(services: string[]) {
          const validServices = [
            'Housekeeping',
            'Security',
            'Parking',
            'Waste Management'
          ];
          return services.every(service => validServices.includes(service));
        },
        message: 'Invalid service type'
      }
    },
    
    // Staff Deployment
    staffDeployment: {
      type: [{
        role: {
          type: String,
          required: true,
          enum: [
            'Manager',
            'Supervisor',
            'Housekeeping Staff',
            'Security Guard',
            'Parking Attendant',
            'Waste Collector'
          ]
        },
        count: {
          type: Number,
          required: true,
          min: [0, 'Staff count cannot be negative']
        }
      }],
      default: []
    },
    
    // Contract Details
    contractValue: {
      type: Number,
      required: [true, 'Contract value is required'],
      min: [0, 'Contract value cannot be negative']
    },
    contractEndDate: {
      type: Date,
      required: [true, 'Contract end date is required']
    },
    
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    
    // User who added this site
    addedBy: {
      type: String,
      required: [true, 'Added by user ID is required'],
      default: 'unknown'
    },
    addedByRole: {
      type: String,
      enum: ['superadmin', 'admin', 'manager'],
      required: [true, 'User role is required'],
      default: 'admin'
    },
     latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  geofenceRadius: { type: Number, default: 0.5 },
   employeeCounter: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
SiteSchema.index({ name: 1 });
SiteSchema.index({ clientName: 1 });
SiteSchema.index({ status: 1 });
SiteSchema.index({ contractEndDate: 1 });
SiteSchema.index({ location: 'text' });
SiteSchema.index({ addedBy: 1 });
SiteSchema.index({ addedByRole: 1 });

// Virtual for total staff count
SiteSchema.virtual('totalStaff').get(function(this: ISite) {
  return this.staffDeployment.reduce((total, item) => total + item.count, 0);
});

// Virtual for available manager slots
SiteSchema.virtual('availableManagerSlots').get(function(this: ISite) {
  const currentManagers = this.staffDeployment
    .filter(item => item.role === 'Manager')
    .reduce((total, item) => total + item.count, 0);
  return Math.max(0, this.managerCount - currentManagers);
});

// Virtual for available supervisor slots
SiteSchema.virtual('availableSupervisorSlots').get(function(this: ISite) {
  const currentSupervisors = this.staffDeployment
    .filter(item => item.role === 'Supervisor')
    .reduce((total, item) => total + item.count, 0);
  return Math.max(0, this.supervisorCount - currentSupervisors);
});

// Virtual for user display name
SiteSchema.virtual('addedByDisplay').get(function(this: ISite) {
  if (this.addedByRole === 'superadmin') {
    return 'SuperAdmin';
  } else if (this.addedByRole === 'admin') {
    return 'Admin';
  } else if (this.addedByRole === 'manager') {
    return 'Manager';
  }
  return this.addedBy;
});

export default mongoose.model<ISite>('Site', SiteSchema);