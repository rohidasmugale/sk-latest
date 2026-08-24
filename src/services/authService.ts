// services/authService.ts
import axios from 'axios'; // Assuming you have an axios instance

export interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
  createdBy?: string;
  updatedBy?: string;
   assignedSites?: string[];   // ✅ ADD THIS
  siteName?: string;  
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const authService = {
  // Get current user from backend
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await axios.get('/auth/me');
      return response.data.data || response.data.user || response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Get current manager (user with manager role)
  async getCurrentManager(): Promise<User | null> {
    try {
      const user = await this.getCurrentUser();
      if (user && (user.role === 'manager' || user.role === 'admin')) {
        return user;
      }
      return null;
    } catch (error) {
      console.error('Error getting current manager:', error);
      return null;
    }
  },

  // Check if user is logged in
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return !!token;
  },

  // Get user data from localStorage
  getUserFromStorage(): User | null {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
};

export default authService;