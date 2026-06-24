// Types
export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: string;
  salary: number;
}

export interface Deduction {
  id: string;
  employeeId: string;
  type: 'advance' | 'fine' | 'other';
  amount: number;
  description: string;
  deductionDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  repaymentMonths: number;
  installmentAmount: number;
  fineAmount: number;
  appliedMonth: string;
  employeeName?: string;
  employeeCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDeductionRequest {
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  type: 'advance' | 'fine' | 'other';
  amount: number;
  description?: string;
  deductionDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  repaymentMonths?: number;
  fineAmount?: number;
  appliedMonth: string;
}

export interface UpdateDeductionRequest {
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  type: 'advance' | 'fine' | 'other';
  amount: number;
  description?: string;
  deductionDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  repaymentMonths?: number;
  fineAmount?: number;
  appliedMonth: string;
}

export interface DeductionStats {
  totalDeductions: number;
  totalAdvances: number;
  totalFines: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  completedCount: number;
  monthlyStats?: {
    month: string;
    total: number;
    advances: number;
    fines: number;
  }[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface EmployeeResponse {
  success: boolean;
  data: Employee[];
  message?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

class DeductionService {
  // Cache implementation
  private cache: Record<string, { data: any; timestamp: number; ttl: number }> = {
    employees: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 }, // 5 minutes
    deductions: { data: null, timestamp: 0, ttl: 2 * 60 * 1000 }, // 2 minutes
    stats: { data: null, timestamp: 0, ttl: 1 * 60 * 1000 } // 1 minute
  };

  private abortControllers: Map<string, AbortController> = new Map();

  // Helper method to create cache key
  private createCacheKey(endpoint: string, params?: Record<string, any>): string {
    const key = endpoint + (params ? JSON.stringify(params) : '');
    return btoa(key); // Base64 encode to ensure valid cache key
  }

  // Helper method to get from cache
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache[key];
    if (cached && cached.data && (Date.now() - cached.timestamp) < cached.ttl) {
      console.log(`Using cached data for ${key}`);
      return cached.data;
    }
    return null;
  }

  // Helper method to set cache
  private setCache(key: string, data: any, ttl?: number): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.cache[key]?.ttl || 60 * 1000
    };
  }

  // Helper method to clear cache
  clearCache(key?: string): void {
    if (key) {
      this.cache[key] = { data: null, timestamp: 0, ttl: 0 };
    } else {
      Object.keys(this.cache).forEach(k => {
        this.cache[k] = { data: null, timestamp: 0, ttl: 0 };
      });
    }
  }

  // Helper method to abort previous requests
  private abortPreviousRequest(key: string): void {
    if (this.abortControllers.has(key)) {
      this.abortControllers.get(key)?.abort();
      this.abortControllers.delete(key);
    }
  }

  // Enhanced fetch method with comprehensive error handling
  private async fetchWithCache<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey: string,
    ttl: number,
    params?: Record<string, any>
  ): Promise<T | null> {
    // Check cache first
    const cachedData = this.getFromCache<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Abort previous request for this cache key
    this.abortPreviousRequest(cacheKey);

    // Create new abort controller
    const abortController = new AbortController();
    this.abortControllers.set(cacheKey, abortController);

    try {
      // Build URL with params
      const urlParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            urlParams.append(key, String(value));
          }
        });
      }
      
      // Add cache-busting timestamp if not already in params
      if (!params?._t) {
        urlParams.append('_t', Date.now().toString());
      }

      const queryString = urlParams.toString();
      const url = `${API_URL}/${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      console.log(`Fetching from: ${url}`);

      // Add timeout to the fetch request
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
      });

      const fetchPromise = fetch(url, {
        ...options,
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          ...options.headers
        },
        // Add credentials if needed for CORS
        credentials: 'same-origin'
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Check for network errors
      if (!response.ok) {
        let errorMessage = `http error! status: ${response.status}`;
        try {
          // Try to parse error response as JSON
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch (textError) {
            // Use status text as fallback
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      // Parse response
      let data: T;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error(`Failed to parse JSON response from ${endpoint}:`, parseError);
        throw new Error('Invalid JSON response from server');
      }

      // Only cache successful responses with data
      if (data && (data as any).success !== false) {
        this.setCache(cacheKey, data, ttl);
      }

      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted:', endpoint);
        return null;
      }
      
      // Handle specific error types
      if (error.message === 'Failed to fetch') {
        console.error(`Network error: Cannot connect to backend at ${API_URL}. Please ensure the server is running on port 5001.`);
        throw new Error(`Cannot connect to server. Please ensure backend is running on port 5001.`);
      }
      
      if (error.message === 'Request timeout') {
        console.error(`Timeout error: Request to ${endpoint} timed out after 10 seconds`);
        throw new Error('Request timeout. Please check your network connection.');
      }
      
      console.error(`Error fetching ${endpoint}:`, error.message || error);
      
      // For non-critical endpoints (stats, exports), return null instead of throwing
      if (endpoint.includes('stats') || endpoint.includes('export')) {
        return null;
      }
      
      throw error;
    } finally {
      this.abortControllers.delete(cacheKey);
    }
  }

  // Health check method
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }

  // Employees
  async getEmployees(params?: {
    status?: string;
    limit?: number;
    search?: string;
  }): Promise<EmployeeResponse> {
    try {
      // First check if backend is healthy
      const isHealthy = await this.checkBackendHealth();
      if (!isHealthy) {
        console.warn('Backend is not reachable, returning empty employees list');
        return {
          success: true,
          data: [],
          message: 'Backend server is not reachable'
        };
      }

      const cacheKey = this.createCacheKey('employees', params);
      const data = await this.fetchWithCache<EmployeeResponse>(
        'employees',
        {},
        cacheKey,
        5 * 60 * 1000, // 5 minutes cache
        params
      );

      if (!data) {
        return {
          success: true,
          data: []
        };
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      return {
        success: true,
        data: [],
        message: error.message || 'Failed to fetch employees'
      };
    }
  }

  // Deductions
  async getDeductions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Deduction>> {
    try {
      // Check backend health first
      const isHealthy = await this.checkBackendHealth();
      if (!isHealthy) {
        return {
          success: true,
          data: [],
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          message: 'Backend server is not reachable'
        };
      }

      const cacheKey = this.createCacheKey('deductions', params);
      const data = await this.fetchWithCache<PaginatedResponse<Deduction>>(
        'deductions',
        {},
        cacheKey,
        2 * 60 * 1000, // 2 minutes cache
        params
      );

      if (!data) {
        return {
          success: true,
          data: [],
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching deductions:', error);
      return {
        success: true,
        data: [],
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || 10,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        message: error.message || 'Failed to fetch deductions'
      };
    }
  }

  async getDeductionById(id: string): Promise<ApiResponse<Deduction>> {
    try {
      const response = await fetch(`${API_URL}/deductions/${id}?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`http error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`Error fetching deduction ${id}:`, error);
      throw error;
    }
  }

  async createDeduction(deductionData: CreateDeductionRequest): Promise<ApiResponse<Deduction>> {
    try {
      const response = await fetch(`${API_URL}/deductions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        },
        body: JSON.stringify(deductionData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `http error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear deductions cache since data has changed
      this.clearCache('deductions');
      this.clearCache('stats');

      return data;
    } catch (error: any) {
      console.error('Error creating deduction:', error);
      throw error;
    }
  }

  async updateDeduction(id: string, deductionData: UpdateDeductionRequest): Promise<ApiResponse<Deduction>> {
    try {
      const response = await fetch(`${API_URL}/deductions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        },
        body: JSON.stringify(deductionData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `http error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear deductions cache since data has changed
      this.clearCache('deductions');
      this.clearCache('stats');

      return data;
    } catch (error: any) {
      console.error(`Error updating deduction ${id}:`, error);
      throw error;
    }
  }

  async deleteDeduction(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_URL}/deductions/${id}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `http error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear deductions cache since data has changed
      this.clearCache('deductions');
      this.clearCache('stats');

      return data;
    } catch (error: any) {
      console.error(`Error deleting deduction ${id}:`, error);
      throw error;
    }
  }

  // Statistics - Updated with better error handling
  async getDeductionStats(params?: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    department?: string;
  }): Promise<ApiResponse<DeductionStats>> {
    try {
      console.log('Fetching deduction stats with params:', params);
      
      // Check backend health first
      const isHealthy = await this.checkBackendHealth();
      if (!isHealthy) {
        console.warn('Backend not reachable for stats, returning empty stats');
        return {
          success: true,
          data: {
            totalDeductions: 0,
            totalAdvances: 0,
            totalFines: 0,
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            completedCount: 0
          },
          message: 'Backend server is not reachable'
        };
      }

      const cacheKey = this.createCacheKey('deductions/stats', params);
      const data = await this.fetchWithCache<ApiResponse<DeductionStats>>(
        'deductions/stats',
        {},
        cacheKey,
        1 * 60 * 1000, // 1 minute cache
        params
      );

      if (!data) {
        console.log('No data returned for stats, using empty stats');
        return {
          success: true,
          data: {
            totalDeductions: 0,
            totalAdvances: 0,
            totalFines: 0,
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            completedCount: 0
          }
        };
      }

      console.log('Successfully fetched stats:', data);
      return data;
    } catch (error: any) {
      console.error('Error fetching deduction stats:', error);
      return {
        success: true,
        data: {
          totalDeductions: 0,
          totalAdvances: 0,
          totalFines: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          completedCount: 0
        },
        message: error.message || 'Failed to fetch deduction stats'
      };
    }
  }

  // Bulk operations
  async createBulkDeductions(deductions: CreateDeductionRequest[]): Promise<ApiResponse<Deduction[]>> {
    try {
      const response = await fetch(`${API_URL}/deductions/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ deductions })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `http error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear deductions cache since data has changed
      this.clearCache('deductions');
      this.clearCache('stats');

      return data;
    } catch (error: any) {
      console.error('Error creating bulk deductions:', error);
      throw error;
    }
  }

  async updateDeductionStatus(id: string, status: Deduction['status']): Promise<ApiResponse<Deduction>> {
    try {
      const response = await fetch(`${API_URL}/deductions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `http error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear deductions cache since data has changed
      this.clearCache('deductions');
      this.clearCache('stats');

      return data;
    } catch (error: any) {
      console.error(`Error updating deduction ${id} status:`, error);
      throw error;
    }
  }

  // Export data
  async exportDeductions(params?: {
    format?: 'csv' | 'excel' | 'pdf';
    startDate?: string;
    endDate?: string;
    status?: string;
    type?: string;
  }): Promise<Blob> {
    try {
      const urlParams = new URLSearchParams({
        format: params?.format || 'csv',
        ...params
      });

      const response = await fetch(`${API_URL}/deductions/export?${urlParams}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`http error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error: any) {
      console.error('Error exporting deductions:', error);
      throw error;
    }
  }

  // Utility methods
  calculateInstallmentAmount(amount: number, months: number): number {
    if (months <= 0 || amount <= 0) return amount;
    return parseFloat((amount / months).toFixed(2));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800',
      approved: 'bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800',
      rejected: 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800',
      completed: 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getTypeBadgeClass(type: string): string {
    const classes = {
      advance: 'bg-purple-100 text-purple-800 hover:bg-purple-100 hover:text-purple-800',
      fine: 'bg-orange-100 text-orange-800 hover:bg-orange-100 hover:text-orange-800',
      other: 'bg-gray-100 text-gray-800 hover:bg-gray-100 hover:text-gray-800'
    };
    return classes[type as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  // Transform MongoDB data to frontend format
  transformDeductionData(mongoData: any): Deduction {
    return {
      id: mongoData._id || mongoData.id,
      employeeId: mongoData.employeeId,
      type: mongoData.type,
      amount: mongoData.amount || 0,
      description: mongoData.description || '',
      deductionDate: mongoData.deductionDate 
        ? new Date(mongoData.deductionDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      status: mongoData.status || 'pending',
      repaymentMonths: mongoData.repaymentMonths || 0,
      installmentAmount: mongoData.installmentAmount || 0,
      fineAmount: mongoData.fineAmount || 0,
      appliedMonth: mongoData.appliedMonth || new Date().toISOString().slice(0, 7),
      employeeName: mongoData.employeeName,
      employeeCode: mongoData.employeeCode,
      createdAt: mongoData.createdAt,
      updatedAt: mongoData.updatedAt
    };
  }

  transformEmployeeData(mongoData: any): Employee {
    return {
      id: mongoData._id || mongoData.id,
      employeeId: mongoData.employeeId || `EMP${(mongoData._id || mongoData.id).toString().slice(-6)}`,
      name: mongoData.name,
      email: mongoData.email,
      phone: mongoData.phone,
      department: mongoData.department,
      position: mongoData.position,
      status: mongoData.status,
      salary: mongoData.salary || 0
    };
  }

  // Helper to check if API is reachable
  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const deductionService = new DeductionService();
export default deductionService;
