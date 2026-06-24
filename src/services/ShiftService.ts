// import { Shift, Employee, ApiResponse, AssignEmployeeRequest } from '../types/apiTypes';

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

// Define interfaces if not already in a separate file
export interface Shift {
  _id: string;
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  employees: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  status: string;
}

export interface CreateShiftRequest {
  name: string;
  startTime: string;
  endTime: string;
  employees: string[];
}

export interface AssignEmployeeRequest {
  employeeId: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Configuration


// Error handling utility
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// API Service Class
class ShiftService {
  // Generic fetch method with error handling
  private async fetchApi<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Handle non-JSON responses or empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`Non-JSON response from ${endpoint}, status: ${response.status}`);
        
        // For 204 No Content or empty responses
        if (response.status === 204) {
          return {} as T;
        }
        
        // Try to get text to see what we received
        const text = await response.text();
        console.warn(`Response text: ${text.substring(0, 200)}...`);
        
        throw new ApiError(
          `Invalid response format from ${endpoint}. Expected JSON but got ${contentType || 'unknown'}`,
          response.status
        );
      }

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || `http error! status: ${response.status}`,
          response.status,
          data
        );
      }

      if (!data.success) {
        throw new ApiError(
          data.message || 'Request failed',
          response.status,
          data
        );
      }

      // Handle undefined data property - return appropriate default
      if (data.data === undefined) {
        console.warn(`API returned undefined data for ${endpoint}`);
        
        // Return appropriate default based on expected return type
        if (endpoint.includes('/employees') || endpoint.includes('/shifts')) {
          // For endpoints that should return arrays, return empty array
          return [] as T;
        }
        
        // For other endpoints, return empty object
        return {} as T;
      }

      return data.data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        // Network errors, JSON parsing errors, etc.
        console.error(`fetchApi error for ${endpoint}:`, error.message);
        throw new ApiError(`Network error: ${error.message}`);
      }
      throw new ApiError('Unknown error occurred');
    }
  }

  // Shift-related methods
  async getAllShifts(): Promise<Shift[]> {
    try {
      const shifts = await this.fetchApi<Shift[]>('/shifts');
      return Array.isArray(shifts) ? shifts : [];
    } catch (error) {
      console.error('Error in getAllShifts:', error);
      return [];
    }
  }

  async getShiftById(shiftId: string): Promise<Shift> {
    return this.fetchApi<Shift>(`/shifts/${shiftId}`);
  }

  async createShift(shiftData: CreateShiftRequest): Promise<Shift> {
    return this.fetchApi<Shift>('/shifts', {
      method: 'POST',
      body: JSON.stringify(shiftData),
    });
  }

  async updateShift(shiftId: string, shiftData: Partial<CreateShiftRequest>): Promise<Shift> {
    return this.fetchApi<Shift>(`/shifts/${shiftId}`, {
      method: 'PUT',
      body: JSON.stringify(shiftData),
    });
  }

  async deleteShift(shiftId: string): Promise<{ success: boolean; message: string }> {
    return this.fetchApi<{ success: boolean; message: string }>(`/shifts/${shiftId}`, {
      method: 'DELETE',
    });
  }

  // Employee assignment methods
  async assignEmployeeToShift(shiftId: string, employeeId: string): Promise<Shift> {
    const requestData: AssignEmployeeRequest = { employeeId };
    return this.fetchApi<Shift>(`/shifts/${shiftId}/assign`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async removeEmployeeFromShift(shiftId: string, employeeId: string): Promise<Shift> {
    const requestData: AssignEmployeeRequest = { employeeId };
    return this.fetchApi<Shift>(`/shifts/${shiftId}/remove`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  // Employee-related methods
  async getAllEmployees(): Promise<Employee[]> {
    try {
      console.log('Fetching all employees from API...');
      const employees = await this.fetchApi<Employee[]>('/employees');
      
      // Ensure we always return an array
      if (!employees || !Array.isArray(employees)) {
        console.warn('API returned non-array for employees:', employees);
        return [];
      }
      
      console.log(`Retrieved ${employees.length} employees from API`);
      return employees;
    } catch (error) {
      console.error('Error fetching all employees:', error);
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
  }

  async getActiveEmployees(): Promise<Employee[]> {
    try {
      console.log('Getting active employees...');
      const employees = await this.getAllEmployees();
      
      // Add null/undefined check and array validation
      if (!employees || !Array.isArray(employees)) {
        console.warn('getAllEmployees returned non-array or undefined:', employees);
        return []; // Return empty array instead of undefined
      }
      
      const activeEmployees = employees.filter(emp => emp.status === 'active');
      console.log(`Found ${activeEmployees.length} active employees out of ${employees.length} total`);
      return activeEmployees;
    } catch (error) {
      console.error('Error in getActiveEmployees:', error);
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
  }

  async getEmployeeById(employeeId: string): Promise<Employee> {
    return this.fetchApi<Employee>(`/employees/${employeeId}`);
  }

  // Batch operations
  async batchAssignEmployees(shiftId: string, employeeIds: string[]): Promise<Shift> {
    return this.fetchApi<Shift>(`/shifts/${shiftId}/batch-assign`, {
      method: 'POST',
      body: JSON.stringify({ employeeIds }),
    });
  }

  // Utility methods
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Backend not reachable:', error);
      return false;
    }
  }

  async checkShiftConflicts(employeeId: string, startTime: string, endTime: string): Promise<boolean> {
    return this.fetchApi<boolean>('/shifts/check-conflicts', {
      method: 'POST',
      body: JSON.stringify({ employeeId, startTime, endTime }),
    });
  }

  // Statistics
  async getShiftStatistics(): Promise<{
    totalShifts: number;
    totalAssignedEmployees: number;
    shiftsPerDay: Record<string, number>;
  }> {
    return this.fetchApi('/shifts/statistics');
  }

  // Debug method to check what's happening
  async debugApiResponse(endpoint: string): Promise<any> {
    try {
      const url = `${API_URL}${endpoint}`;
      console.log(`Debug: Testing endpoint: ${url}`);
      
      const response = await fetch(url);
      console.log(`Debug: Response status: ${response.status}`);
      console.log(`Debug: Response headers:`, Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log(`Debug: Response text (first 500 chars):`, text.substring(0, 500));
      
      try {
        const json = JSON.parse(text);
        console.log(`Debug: Parsed JSON:`, json);
        return json;
      } catch (parseError) {
        console.error(`Debug: Failed to parse JSON:`, parseError);
        return { rawText: text };
      }
    } catch (error) {
      console.error(`Debug: Error testing endpoint ${endpoint}:`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const shiftService = new ShiftService();

// Alternative: Export class for testing/mocking purposes
export default ShiftService;
