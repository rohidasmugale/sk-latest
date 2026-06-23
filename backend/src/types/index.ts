// backend/src/types/index.ts
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// User Types
export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  role: Role;
  emailVerified?: Date | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserPermission {
  id: string;
  userId: string;
  canCreateAdmins: boolean;
  canManageManagers: boolean;
  canViewReports: boolean;
  canDeleteUsers: boolean;
}

export type UserWithPermissions = IUser & {
  permissions?: IUserPermission | null;
};

// Request Types
export interface AuthenticatedRequest extends Request {
  body: any;
  user?: {
    userId: string;
    email: string;
    role: Role;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Request Body Types
export interface UpdateProfileRequest {
  name: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdatePermissionsRequest {
  canCreateAdmins: boolean;
  canManageManagers: boolean;
  canViewReports: boolean;
  canDeleteUsers: boolean;
}

// Enums
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER'
}

// JWT Types
export interface JwtUserPayload extends JwtPayload {
  userId: string;
  email: string;
  role: Role;
}