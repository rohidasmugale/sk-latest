// frontend/src/services/employeeService.ts
import apiClient from '@/lib/apiClient';
import { Employee } from '@/types/employee';

export interface EmployeeResponse {
  success: boolean;
  count: number;
  employees: Employee[];
  message?: string;
}

export interface EmployeeSingleResponse {
  success: boolean;
  employee: Employee;
  message?: string;
}

const employeeService = {
  // Get all employees with pagination
  getEmployees: async (page = 1, limit = 100): Promise<EmployeeResponse> => {
    try {
      console.log('🔵 Fetching employees from API...');
      const response = await apiClient.get(`/employees?page=${page}&limit=${limit}`);
      console.log('🟢 Employees fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔴 Failed to fetch employees:', error);
      throw error;
    }
  },

  // Get employee by ID or employeeId
  getEmployeeById: async (id: string): Promise<EmployeeSingleResponse> => {
    try {
      const response = await apiClient.get(`/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch employee:', error);
      throw error;
    }
  },

  // Create new employee
  createEmployee: async (data: FormData): Promise<EmployeeSingleResponse> => {
    try {
      const response = await apiClient.post('/employees', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create employee:', error);
      throw error;
    }
  },

  // Update employee
  updateEmployee: async (id: string, data: FormData): Promise<EmployeeSingleResponse> => {
    try {
      const response = await apiClient.put(`/employees/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update employee:', error);
      throw error;
    }
  },

  // Delete employee
  deleteEmployee: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.delete(`/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete employee:', error);
      throw error;
    }
  },

  // Update employee status
  updateEmployeeStatus: async (id: string, status: string): Promise<EmployeeSingleResponse> => {
    try {
      const response = await apiClient.patch(`/employees/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Failed to update employee status:', error);
      throw error;
    }
  },

  // Get employee statistics
  getEmployeeStats: async (): Promise<{
    total: number;
    active: number;
    inactive: number;
    byDepartment: Record<string, number>;
  }> => {
    try {
      const response = await apiClient.get('/employees/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch employee stats:', error);
      throw error;
    }
  },
};

export default employeeService;