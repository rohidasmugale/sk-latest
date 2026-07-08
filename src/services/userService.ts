import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Types for user data
export interface User {
  updatedAt: string;
  createdAt: string;
  _id: string;
  id: string;
  username: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin' | 'manager' | 'supervisor' | 'employee';
  department: string;
  site: string;
  siteName?: string;
  assignedSites?: string[];
  phone: string;
  isActive: boolean;
  status: 'active' | 'inactive';
  joinDate: string;
  photo?: string;
}

export interface CreateUserData {
  username?: string;
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  department?: string;
  site?: string;
  siteName?: string;
  assignedSites?: string[];
  phone?: string;
  joinDate?: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  site?: string;
  siteName?: string;
  assignedSites?: string[];
  phone?: string;
  role?: 'superadmin' | 'admin' | 'manager' | 'supervisor' | 'employee';
  isActive?: boolean;
}

export interface UserStats {
  _id: string;
  count: number;
}

export interface UsersResponse {
  success: boolean;
  allUsers: User[];
  groupedByRole: Record<string, User[]>;
  total: number;
  active: number;
  inactive: number;
}

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'supervisor' | 'employee';

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

// Create axios instance with auth interceptor
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sk_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error: AxiosError) => {
    console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
    
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sk_token');
        localStorage.removeItem('sk_user');
        window.location.href = '/login';
      }
    }
    
    if (error.response?.status === 403) {
      console.error('Access denied:', error.response.data);
    }
    
    if (error.response?.status === 404) {
      console.error('Resource not found:', error.config?.url);
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config?.url);
    }
    
    return Promise.reject({
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

export const userService = {
  // Get all users
  async getAllUsers(): Promise<UsersResponse> {
    try {
      console.log('📤 Fetching all users...');
      const response = await api.get<UsersResponse>('/users');
      console.log('✅ Users fetched successfully:', response.data.allUsers?.length || 0, 'users');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching users:', error);
      throw new Error(error.message || 'Failed to fetch users');
    }
  },

  // Get users by role
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      console.log(`📤 Fetching users with role: ${role}`);
      const response = await api.get<UsersResponse>('/users');
      const users = response.data.allUsers.filter(user => user.role === role);
      console.log(`✅ Found ${users.length} users with role ${role}`);
      return users;
    } catch (error: any) {
      console.error(`❌ Error fetching users with role ${role}:`, error);
      throw new Error(error.message || `Failed to fetch users with role ${role}`);
    }
  },

  // Create user
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      console.log('📤 Creating user with data:', userData);
      
      if (!userData.username && userData.email) {
        userData.username = userData.email.split('@')[0];
      }

      // Ensure siteName is set from site if not provided
      if (!userData.siteName && userData.site) {
        userData.siteName = userData.site;
      }

      // Ensure assignedSites is set from site if not provided
      if (!userData.assignedSites && userData.site) {
        userData.assignedSites = [userData.site];
      }

      const response = await api.post<{ 
        success: boolean; 
        user: User; 
        message: string 
      }>('/users', userData);
      
      console.log('✅ User created successfully:', response.data.user.email);
      return response.data.user;
    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      throw new Error(error.message || 'Failed to create user. Please check the data and try again.');
    }
  },

  // Update user
  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    try {
      console.log(`📤 Updating user ${id} with data:`, userData);
      const response = await api.put<{ 
        success: boolean;
        user: User; 
        message: string 
      }>(`/users/${id}`, userData);
      
      console.log(`✅ User ${id} updated successfully`);
      return response.data.user;
    } catch (error: any) {
      console.error(`❌ Error updating user ${id}:`, error);
      throw new Error(error.message || `Failed to update user ${id}`);
    }
  },

  // Update user with photo (multipart/form-data)
  async updateUserWithPhoto(id: string, formData: FormData): Promise<User> {
    try {
      console.log(`📤 Updating user ${id} with photo...`);
      const response = await api.put<{ 
        success: boolean;
        user: User; 
        message: string 
      }>(`/users/${id}`, formData, {
        headers: {
          // Do NOT set 'Content-Type' – browser will set it with boundary
        }
      });
      
      console.log(`✅ User ${id} updated with photo`);
      return response.data.user;
    } catch (error: any) {
      console.error(`❌ Error updating user ${id} with photo:`, error);
      throw new Error(error.message || `Failed to update user ${id}`);
    }
  },

  // Delete user
  async deleteUser(id: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting user ${id}`);
      await api.delete(`/users/${id}`);
      console.log(`✅ User ${id} deleted successfully`);
    } catch (error: any) {
      console.error(`❌ Error deleting user ${id}:`, error);
      throw new Error(error.message || `Failed to delete user ${id}`);
    }
  },

  // Toggle user status
  async toggleUserStatus(id: string): Promise<User> {
    try {
      console.log(`🔄 Toggling status for user ${id}`);
      const response = await api.patch<{ 
        success: boolean;
        user: User; 
        message: string 
      }>(`/users/${id}/toggle-status`);
      
      console.log(`✅ User ${id} status toggled to:`, response.data.user.isActive ? 'active' : 'inactive');
      return response.data.user;
    } catch (error: any) {
      console.error(`❌ Error toggling status for user ${id}:`, error);
      throw new Error(error.message || `Failed to toggle status for user ${id}`);
    }
  },

  // Update user role
  async updateUserRole(id: string, role: UserRole): Promise<User> {
    try {
      console.log(`🎭 Updating role for user ${id} to:`, role);
      const response = await api.put<{ 
        success: boolean;
        user: User; 
        message: string 
      }>(`/users/${id}/role`, { role });
      
      console.log(`✅ User ${id} role updated to ${role}`);
      return response.data.user;
    } catch (error: any) {
      console.error(`❌ Error updating role for user ${id}:`, error);
      throw new Error(error.message || `Failed to update role for user ${id}`);
    }
  },

  // Get user statistics
  async getUserStats(): Promise<UserStats[]> {
    try {
      console.log('📊 Fetching user statistics...');
      const response = await api.get<{ success: boolean; data: UserStats[] }>('/users/stats');
      console.log('✅ User statistics fetched successfully');
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error fetching user stats:', error);
      throw new Error(error.message || 'Failed to fetch user statistics');
    }
  },

  // Search users
  async searchUsers(query: string): Promise<User[]> {
    try {
      console.log(`🔍 Searching users for: "${query}"`);
      const response = await api.get<UsersResponse>('/users');
      const users = response.data.allUsers.filter(user =>
        user.name?.toLowerCase().includes(query.toLowerCase()) ||
        user.email?.toLowerCase().includes(query.toLowerCase()) ||
        user.department?.toLowerCase().includes(query.toLowerCase()) ||
        user.role?.toLowerCase().includes(query.toLowerCase())
      );
      console.log(`✅ Found ${users.length} users matching "${query}"`);
      return users;
    } catch (error: any) {
      console.error('❌ Error searching users:', error);
      throw new Error(error.message || 'Failed to search users');
    }
  },

  // Get single user by ID
  async getUserById(id: string): Promise<User> {
    try {
      console.log(`📤 Fetching user ${id}`);
      const response = await api.get<{ 
        success: boolean; 
        data: User 
      }>(`/users/${id}`);
      
      console.log(`✅ User ${id} fetched successfully`);
      return response.data.data;
    } catch (error: any) {
      console.error(`❌ Error fetching user ${id}:`, error);
      throw new Error(error.message || `Failed to fetch user ${id}`);
    }
  },

  // Get active users count
  async getActiveUsersCount(): Promise<number> {
    try {
      console.log('📊 Getting active users count...');
      const response = await api.get<UsersResponse>('/users');
      const activeCount = response.data.allUsers.filter(user => user.isActive).length;
      console.log(`✅ Active users count: ${activeCount}`);
      return activeCount;
    } catch (error: any) {
      console.error('❌ Error fetching active users count:', error);
      throw new Error(error.message || 'Failed to fetch active users count');
    }
  },

  // Test user creation (for debugging)
  async testCreateUser(): Promise<User> {
    try {
      const testData: CreateUserData = {
        username: `testuser_${Date.now().toString().slice(-6)}`,
        email: `test${Date.now().toString().slice(-6)}@example.com`,
        password: 'test123456',
        role: 'employee',
        firstName: 'Test',
        lastName: 'User',
        department: 'IT',
        phone: '1234567890'
      };
      
      console.log('🧪 Testing user creation with:', testData);
      return await this.createUser(testData);
    } catch (error: any) {
      console.error('🧪 Test user creation failed:', error);
      throw error;
    }
  }
};

export default userService;