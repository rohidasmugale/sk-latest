import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  isCheckedIn: boolean;
  isOnBreak: boolean;
  department: string;
  siteName?: string;
  siteId?: string;
  supervisorId?: string;
  remarks?: string;
  latitude?: number | null;
  longitude?: number | null;
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: Date;
  isLocationTracking: boolean; // whether watcher is active
  checkInLatitude?: number | null;   // geofence center (set at check-in)
checkInLongitude?: number | null;

isOutOfGeofence: boolean;
shiftId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      trim: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      trim: true,
      index: true,
    },
    checkInTime: {
      type: String,
      default: null,
    },
    checkOutTime: {
      type: String,
      default: null,
    },
    checkInPhoto: {
      type: String,
      default: null,
    },
    checkOutPhoto: {
      type: String,
      default: null,
    },
    breakStartTime: {
      type: String,
      default: null,
    },
    breakEndTime: {
      type: String,
      default: null,
    },
    totalHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    breakTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day', 'leave', 'weekly-off'],
      default: 'absent',
    },
    isCheckedIn: {
      type: Boolean,
      default: false,
    },
    isOnBreak: {
      type: Boolean,
      default: false,
    },
    department: {
      type: String,
      default: 'General',
    },
    siteName: {
      type: String,
      default: null,
    },
    siteId: {
      type: String,
      default: null,
    },
    supervisorId: {
      type: String,
      trim: true,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    checkInLatitude:  { type: Number, default: null },
checkInLongitude: { type: Number, default: null },
currentLatitude:  { type: Number, default: null },
currentLongitude: { type: Number, default: null },
lastLocationUpdate: { type: Date, default: null },
isLocationTracking: { type: Boolean, default: false },
isOutOfGeofence:  { type: Boolean, default: false },
 shiftId: {
     type: String,
    default: null,
   },
  },
 
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: Document, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Create compound index for efficient queries
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ createdAt: -1 });
attendanceSchema.index({ supervisorId: 1, date: 1 });

const Attendance: Model<IAttendance> = mongoose.model<IAttendance>('Attendance', attendanceSchema);

export default Attendance;