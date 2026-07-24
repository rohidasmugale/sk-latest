import mongoose, { Schema, Document, UpdateQuery, FilterQuery } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'superadmin' | 'admin' | 'manager' | 'supervisor' | 'employee';
  username: string;
  firstName: string;
  lastName: string;
  department: string;
  phone: string;
  isActive: boolean;
  joinDate: Date;
  createdBy?: mongoose.Types.ObjectId;
  assignedSites?: string[];
  siteName?: string;
    site: { type: String, default: '' };
  avatar?: string;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
  notificationPreferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    securityAlerts: boolean;
    weeklyReports: boolean;
  };
  permissions?: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isPasswordChangedAfter(JWTTimestamp: number): boolean;
}

const UserSchema = new Schema(
  {
    name: { type: String, required: false, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ['superadmin', 'admin', 'manager', 'supervisor', 'employee'],
      default: 'employee',
    },
    username: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    joinDate: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedSites: { type: [String], default: [] },
    siteName: { type: String, default: '' },
    avatar: { type: String, default: '' },
    lastLogin: { type: Date },
    passwordChangedAt: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: true },
    },
    permissions: { type: Map, of: Boolean, default: {} },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: Document, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (_doc: Document, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

interface UserModel extends mongoose.Model<IUser> {
  isValidPasswordHash(password: string): boolean;
  superadminExists(): Promise<boolean>;
  getSuperadmin(): Promise<IUser | null>;
}

// ============ SINGLE SUPERADMIN CONSTRAINT ============
UserSchema.pre('save', async function (next) {
  // Use 'this' directly, no aliasing
  if ((this as IUser).isModified('role') && (this as IUser).role === 'superadmin') {
    try {
      console.log(`👑 [SUPERADMIN CHECK] Checking superadmin limit for: ${(this as IUser).email || 'new user'}`);
      const query: FilterQuery<IUser> = { role: 'superadmin' };
      if ((this as IUser)._id) {
        query._id = { $ne: (this as IUser)._id };
        console.log(`👑 [SUPERADMIN CHECK] Excluding user ID: ${(this as IUser)._id}`);
      }
      const existingSuperadmin = await mongoose.model('User').findOne(query);
      if (existingSuperadmin) {
        console.log(`❌ [SUPERADMIN CHECK] Superadmin already exists: ${existingSuperadmin.email}`);
        const error = new Error('Only one superadmin is allowed in the system');
        error.name = 'SuperadminLimitError';
        return next(error);
      }
      console.log(`✅ [SUPERADMIN CHECK] No existing superadmin found, allowing creation`);
    } catch (error) {
      console.error('❌ [SUPERADMIN CHECK] Error:', error);
      return next(error instanceof Error ? error : new Error(String(error)));
    }
  }
  next();
});

UserSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as UpdateQuery<IUser>;
  const roleUpdate = update?.$set?.role || update?.role;
  if (roleUpdate === 'superadmin') {
    try {
      console.log(`👑 [FINDONEANDUPDATE] Checking superadmin limit for update`);
      const filter = this.getQuery() as FilterQuery<IUser>;
      const existingSuperadmin = await mongoose.model('User').findOne({
        role: 'superadmin',
        _id: { $ne: filter._id },
      });
      if (existingSuperadmin) {
        console.log(`❌ [FINDONEANDUPDATE] Superadmin already exists: ${existingSuperadmin.email}`);
        const error = new Error('Only one superadmin is allowed in the system');
        error.name = 'SuperadminLimitError';
        return next(error);
      }
      console.log(`✅ [FINDONEANDUPDATE] No existing superadmin found, allowing update`);
    } catch (error) {
      console.error('❌ [FINDONEANDUPDATE] Error:', error);
      return next(error instanceof Error ? error : new Error(String(error)));
    }
  }
  next();
});

UserSchema.statics.superadminExists = async function (): Promise<boolean> {
  const superadmin = await this.findOne({ role: 'superadmin' });
  return !!superadmin;
};

UserSchema.statics.getSuperadmin = async function () {
  return await this.findOne({ role: 'superadmin' }).select('-password');
};

// Auto-generate name from firstName and lastName
UserSchema.pre('save', function (next) {
  const user = this as IUser;
  if (!user.name && (user.firstName || user.lastName)) {
    user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }
  next();
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  const user = this as IUser;

  console.log(`\n🔐 [PRE-SAVE] Starting for user: ${user.email || 'new user'}`);
  console.log(`🔐 [PRE-SAVE] Is new user? ${user.isNew}`);
  console.log(`🔐 [PRE-SAVE] Password modified? ${user.isModified('password')}`);

  if (!user.isModified('password')) {
    console.log('🔐 [PRE-SAVE] Password not modified, skipping');
    return next();
  }

  try {
    console.log(`🔐 [PRE-SAVE] Password value received: ${user.password ? 'SET' : 'NULL'}`);
    if (user.password) {
      console.log(`🔐 [PRE-SAVE] Password length: ${user.password.length}`);
      console.log(`🔐 [PRE-SAVE] Looks like hash? ${user.password.startsWith('$2') ? 'YES' : 'NO'}`);
      console.log(`🔐 [PRE-SAVE] Preview: ${user.password.substring(0, 30)}...`);
    }

    if (user.password && user.password.startsWith('$2')) {
      console.error(`❌❌❌ CRITICAL BUG DETECTED!`);
      console.error(`❌❌❌ Calling code is sending HASHED password instead of PLAIN TEXT!`);
      console.warn(`⚠️ Storing hash as-is. Login WILL FAIL unless fixed!`);
      user.passwordChangedAt = new Date();
      return next();
    }

    console.log('🔐 [PRE-SAVE] Generating salt...');
    const salt = await bcrypt.genSalt(12);
    console.log('🔐 [PRE-SAVE] Hashing password...');
    user.password = await bcrypt.hash(user.password, salt);
    user.passwordChangedAt = new Date();
    console.log(`🔐 [PRE-SAVE] Password hashed successfully`);
    next();
  } catch (error) {
    console.error('❌ [PRE-SAVE] Password hashing error:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    const user = this as IUser;
    console.log(`\n🔐 [COMPARE] Starting comparison for: ${user.email}`);
    if (!user.password) {
      console.error(`❌ [COMPARE] No password stored for user ${user.email}`);
      return false;
    }
    console.log(`🔐 [COMPARE] Stored password length: ${user.password.length}`);
    console.log(`🔐 [COMPARE] Is bcrypt hash? ${user.password.startsWith('$2')}`);
    const isMatch = await bcrypt.compare(candidatePassword, user.password);
    console.log(`🔐 [COMPARE] Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    return isMatch;
  } catch (error) {
    console.error('❌ [COMPARE] Password comparison error:', error instanceof Error ? error.message : error);
    return false;
  }
};

UserSchema.methods.isPasswordChangedAfter = function (JWTTimestamp: number): boolean {
  const user = this as IUser;
  if (user.passwordChangedAt) {
    const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

UserSchema.statics.isValidPasswordHash = function (password: string): boolean {
  return !!(password && password.startsWith('$2'));
};

export const User = mongoose.model<IUser, UserModel>('User', UserSchema);
export default User;