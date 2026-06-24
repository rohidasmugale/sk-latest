import axios from 'axios';

export interface Supervisor {
  role: string;
  _id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  // site: string;
  employees: number;
  tasks: number;
  assignedProjects: string[];
  reportsTo?: string;
  isActive: boolean;
  status: 'active' | 'inactive';
  joinDate: string;
  createdAt: string;
  updatedAt: string;
  assignedManagers?: string[]; // ADD THIS LINE
}

export interface CreateSupervisorData {
  name: string;
  email: string;
  phone: string;
  password: string;
  department?: string;
  // site?: string;
  reportsTo?: string;
  assignedManagers?: string[]; // ADD THIS LINE
}

export interface UpdateSupervisorData {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  // site?: string;
  reportsTo?: string;
  employees?: number;
  tasks?: number;
  assignedProjects?: string[];
  isActive?: boolean;
  assignedManagers?: string[]; // ADD THIS LINE
}

export interface SupervisorStats {
  total: number;
  active: number;
  inactive: number;
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');


const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const supervisorService = {
  // Get all supervisors (from Supervisor module only)
  async getAllSupervisors(): Promise<Supervisor[]> {
    try {
      const response = await api.get('/supervisors');
      return response.data.supervisors;
    } catch (error) {
      console.error('Error fetching supervisors:', error);
      throw error;
    }
  },

  // Get supervisor by ID
  async getSupervisorById(id: string): Promise<Supervisor> {
    try {
      const response = await api.get(`/supervisors/${id}`);
      return response.data.supervisor;
    } catch (error) {
      console.error(`Error fetching supervisor ${id}:`, error);
      throw error;
    }
  },

  // Create supervisor (will auto-sync to User Management)
  async createSupervisor(data: CreateSupervisorData): Promise<Supervisor> {
    try {
      const response = await api.post('/supervisors', data);
      return response.data.supervisor;
    } catch (error) {
      console.error('Error creating supervisor:', error);
      throw error;
    }
  },

  // Update supervisor (will auto-sync to User Management)
  async updateSupervisor(id: string, data: UpdateSupervisorData): Promise<Supervisor> {
    try {
      const response = await api.put(`/supervisors/${id}`, data);
      return response.data.supervisor;
    } catch (error) {
      console.error(`Error updating supervisor ${id}:`, error);
      throw error;
    }
  },

  // Delete supervisor (will auto-sync to User Management)
  async deleteSupervisor(id: string): Promise<void> {
    try {
      await api.delete(`/supervisors/${id}`);
    } catch (error) {
      console.error(`Error deleting supervisor ${id}:`, error);
      throw error;
    }
  },

  // Toggle supervisor status (will auto-sync to User Management)
  async toggleSupervisorStatus(id: string): Promise<Supervisor> {
    try {
      const response = await api.patch(`/supervisors/${id}/toggle-status`);
      return response.data.supervisor;
    } catch (error) {
      console.error(`Error toggling status for supervisor ${id}:`, error);
      throw error;
    }
  },

  // Search supervisors
  async searchSupervisors(query: string): Promise<Supervisor[]> {
    try {
      const response = await api.get('/supervisors/search', {
        params: { query }
      });
      return response.data.supervisors;
    } catch (error) {
      console.error('Error searching supervisors:', error);
      throw error;
    }
  },

  // Get supervisor statistics
  async getSupervisorStats(): Promise<SupervisorStats> {
    try {
      const response = await api.get('/supervisors/stats');
      return response.data.stats;
    } catch (error) {
      console.error('Error fetching supervisor stats:', error);
      throw error;
    }
  },

  // NEW: Get supervisors by manager ID
  async getSupervisorsByManager(managerId: string): Promise<Supervisor[]> {
    try {
      const response = await api.get(`/supervisors/manager/${managerId}`);
      return response.data.supervisors || [];
    } catch (error) {
      console.error(`Error fetching supervisors for manager ${managerId}:`, error);
      return [];
    }
  },

  // NEW: Assign supervisors to manager
  async assignSupervisorsToManager(managerId: string, supervisorIds: string[]): Promise<Supervisor[]> {
    try {
      const response = await api.post(`/supervisors/assign-to-manager/${managerId}`, {
        supervisorIds
      });
      return response.data.supervisors;
    } catch (error) {
      console.error(`Error assigning supervisors to manager ${managerId}:`, error);
      throw error;
    }
  },

  // NEW: Remove supervisors from manager
  async removeSupervisorsFromManager(managerId: string, supervisorIds: string[]): Promise<Supervisor[]> {
    try {
      const response = await api.post(`/supervisors/remove-from-manager/${managerId}`, {
        supervisorIds
      });
      return response.data.supervisors;
    } catch (error) {
      console.error(`Error removing supervisors from manager ${managerId}:`, error);
      throw error;
    }
  }
};

export default supervisorService;