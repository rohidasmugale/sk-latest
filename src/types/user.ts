export type UserRole = 'admin' | 'manager' | 'supervisor' | 'employee' | 'superadmin';
export type UserStatus = 'active' | 'inactive';

export interface User {
  _id: string;
  id?: string;
  username: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  department: string;
  site: string;
  phone: string;
  isActive: boolean;
  status: UserStatus;
  joinDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  department: string;
  site: string;
  phone: string;
  joinDate: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: UserRole;
  department?: string;
  site?: string;
  phone?: string;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
}

export interface UserStats {
  _id: UserRole;
  count: number;
}

export interface UsersResponse {
  allUsers: User[];
  groupedByRole: {
    [key in UserRole]?: User[];
  };
  total: number;
}