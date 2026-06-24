// src/services/machineService.ts
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');


export interface FrontendMachine {
  id: string;
  _id?: string;
  name: string;
  cost: number;
  purchaseDate: string;
  quantity: number;
  description?: string;
  status: 'operational' | 'maintenance' | 'out-of-service';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  location?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  department?: string;
  assignedTo?: string;
  photoUrls?: string[];
  maintenanceHistory?: Array<{
    date: string;
    type: string;
    description: string;
    cost: number;
    performedBy: string;
    status?: 'pending' | 'approved' | 'rejected';
    expenseId?: string;
    createdAt?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
  remark?: string;     // <-- add this line
}

export interface CreateMachineDTO {
  name: string;
  cost: number;
  purchaseDate: string;
  quantity: number;
  description?: string;
  status: 'operational' | 'maintenance' | 'out-of-service';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  location?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  department?: string;
  assignedTo?: string;
}

export interface MachineStats {
  totalMachines: number;
  totalMachineValue: number;
  operationalMachines: number;
  maintenanceMachines: number;
  outOfServiceMachines: number;
  averageMachineCost: number;
  machinesByDepartment: Record<string, number>;
  machinesByLocation: Record<string, number>;
  upcomingMaintenanceCount: number;
}

export interface MaintenanceRecordDTO {
  type: string;
  description: string;
  cost: number;
  performedBy: string;
  status?: 'pending' | 'approved' | 'rejected';
  date?: string;
}

// Helper function to calculate stats locally
const calculateLocalMachineStats = (machines: FrontendMachine[]): MachineStats => {
  const totalMachines = machines.length;
  const totalMachineValue = machines.reduce((sum, machine) => sum + (machine.cost * machine.quantity), 0);
  const operationalMachines = machines.filter(m => m.status === 'operational').length;
  const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
  const outOfServiceMachines = machines.filter(m => m.status === 'out-of-service').length;
  const averageMachineCost = totalMachines > 0 ? totalMachineValue / totalMachines : 0;
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const today = new Date();
  
  const upcomingMaintenanceCount = machines.filter(machine => {
    if (!machine.nextMaintenanceDate) return false;
    try {
      const nextMaintenanceDate = new Date(machine.nextMaintenanceDate);
      return nextMaintenanceDate <= thirtyDaysFromNow && nextMaintenanceDate >= today;
    } catch (error) {
      console.error('Error parsing maintenance date:', machine.nextMaintenanceDate, error);
      return false;
    }
  }).length;

  const machinesByDepartment = machines.reduce((acc, machine) => {
    const dept = machine.department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const machinesByLocation = machines.reduce((acc, machine) => {
    const location = machine.location || 'Unassigned';
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalMachines,
    totalMachineValue,
    operationalMachines,
    maintenanceMachines,
    outOfServiceMachines,
    averageMachineCost,
    machinesByDepartment,
    machinesByLocation,
    upcomingMaintenanceCount
  };
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Machine API Request] ${config.method?.toUpperCase()} ${config.url}`);
      if (config.params) {
        console.log('[Machine API Request Params]', config.params);
      }
      if (config.data) {
        console.log('[Machine API Request Data]', config.data);
      }
    }
    return config;
  },
  (error) => {
    console.error('[Machine API Request Error]', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Machine API Response] ${response.status} ${response.config.url}`);
      if (response.data && Array.isArray(response.data)) {
        console.log(`[Machine API Response Data Count] ${response.data.length} items`);
      }
    }
    return response;
  },
  (error) => {
    if (error.config?.url?.includes('/machines/stats')) {
      return Promise.reject(error);
    }
    
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code
    };
    
    if (error.response?.status >= 500) {
      console.error('[Machine API Server Error]', errorDetails);
    } else if (error.response?.status >= 400) {
      console.warn('[Machine API Client Error]', errorDetails);
    } else {
      console.error('[Machine API Network Error]', errorDetails);
    }
    
    return Promise.reject(error);
  }
);

export const machineService = {
  async getMachines(filters?: {
    search?: string;
    status?: string;
    department?: string;
    location?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    assignedTo?: string;
    [key: string]: any;
  }): Promise<FrontendMachine[]> {
    try {
      const params: Record<string, any> = {};
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            params[key] = value;
          }
        });
      }
      
      console.log('Fetching machines with filters:', filters);
      console.log('Request params:', params);
      
      const response = await api.get<FrontendMachine[]>('/machines', { params });
      
      const machines = response.data.map(machine => ({
        ...machine,
        id: machine.id || machine._id || `temp-${Date.now()}-${Math.random()}`,
        maintenanceHistory: machine.maintenanceHistory || []
      }));
      
      console.log(`Fetched ${machines.length} machines`);
      
      if (filters?.assignedTo && machines.length > 0) {
        const wrongMachines = machines.filter(machine => machine.assignedTo !== filters.assignedTo);
        if (wrongMachines.length > 0) {
          console.warn(`WARNING: Found ${wrongMachines.length} machines not assigned to ${filters.assignedTo}!`);
        }
      }
      
      return machines;
    } catch (error: any) {
      console.error('Error fetching machines:', error);
      
      if (error.code === 'ECONNREFUSED') {
        console.error('Backend server is not running. Please start the backend server on port 5001.');
      }
      
      return [];
    }
  },

  async getMachineById(id: string): Promise<FrontendMachine> {
    try {
      if (!id || id === 'undefined') {
        throw new Error('Invalid machine ID');
      }
      
      let response;
      try {
        response = await api.get<FrontendMachine>(`/machines/${id}`);
      } catch (error: any) {
        if (error.response?.status === 404 || error.response?.status === 500) {
          const allMachines = await this.getMachines();
          const foundMachine = allMachines.find(m => 
            m.id === id || 
            m._id === id || 
            (m as any)._id?.toString() === id
          );
          
          if (foundMachine) {
            return foundMachine;
          }
          throw new Error(`Machine not found with ID: ${id}`);
        }
        throw error;
      }
      
      const machine = response.data;
      
      if (!machine.id) {
        machine.id = machine._id || id;
      }
      
      return machine;
    } catch (error: any) {
      console.error(`Error fetching machine ${id}:`, error);
      
      let errorMessage = 'Failed to fetch machine';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 404) {
        errorMessage = `Machine not found with ID: ${id}`;
      } else if (error.response?.status === 500) {
        errorMessage = `Server error while fetching machine with ID: ${id}. Check backend logs.`;
      }
      
      throw new Error(errorMessage);
    }
  },

  async createMachine(data: CreateMachineDTO): Promise<FrontendMachine> {
    try {
      if (!data.name || !data.cost || !data.purchaseDate) {
        throw new Error('Missing required fields: name, cost, purchaseDate');
      }

      const machineData = {
        name: data.name,
        cost: Number(data.cost),
        purchaseDate: data.purchaseDate,
        quantity: Number(data.quantity) || 1,
        description: data.description || '',
        status: data.status || 'operational',
        location: data.location || '',
        manufacturer: data.manufacturer || '',
        model: data.model || '',
        serialNumber: data.serialNumber || '',
        department: data.department || '',
        assignedTo: data.assignedTo || '',
        lastMaintenanceDate: data.lastMaintenanceDate || undefined,
        nextMaintenanceDate: data.nextMaintenanceDate || undefined,
        maintenanceHistory: []
      };

      console.log('Creating machine with data:', machineData);

      const response = await api.post<FrontendMachine>('/machines', machineData);
      
      const createdMachine = response.data;
      if (!createdMachine.id && createdMachine._id) {
        createdMachine.id = createdMachine._id;
      }
      
      console.log('Machine created successfully:', createdMachine);
      
      return createdMachine;
    } catch (error: any) {
      console.error('Error creating machine:', error);
      
      let errorMessage = 'Failed to create machine';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  async updateMachine(id: string, data: Partial<CreateMachineDTO> | any): Promise<FrontendMachine> {
    try {
      if (!id || id === 'undefined') {
        throw new Error('Invalid machine ID for update');
      }
      
      const updateData = { ...data };
      
      console.log(`Updating machine ${id} with data:`, updateData);
      
      const response = await api.put<FrontendMachine>(`/machines/${id}`, updateData);
      
      const updatedMachine = response.data;
      if (!updatedMachine.id && updatedMachine._id) {
        updatedMachine.id = updatedMachine._id;
      }
      
      console.log('Machine updated successfully:', updatedMachine);
      
      return updatedMachine;
    } catch (error: any) {
      console.error(`Error updating machine ${id}:`, error);
      
      let errorMessage = 'Failed to update machine';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  async deleteMachine(id: string): Promise<void> {
    try {
      if (!id || id === 'undefined') {
        throw new Error('Invalid machine ID for deletion');
      }
      
      console.log(`Deleting machine ${id}`);
      
      await api.delete(`/machines/${id}`);
      
      console.log('Machine deleted successfully');
    } catch (error: any) {
      console.error(`Error deleting machine ${id}:`, error);
      
      let errorMessage = 'Failed to delete machine';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  async getMachineStats(): Promise<MachineStats> {
    try {
      console.log('Fetching machine stats from backend...');
      const response = await api.get<MachineStats>('/machines/stats');
      
      console.log('Machine stats fetched from backend:', response.data);
      return response.data;
      
    } catch (error: any) {
      console.warn('Backend stats endpoint failed, using local calculation:', error.message);
      
      try {
        const machines = await this.getMachines();
        
        if (machines.length === 0) {
          return {
            totalMachines: 0,
            totalMachineValue: 0,
            operationalMachines: 0,
            maintenanceMachines: 0,
            outOfServiceMachines: 0,
            averageMachineCost: 0,
            machinesByDepartment: {},
            machinesByLocation: {},
            upcomingMaintenanceCount: 0
          };
        }
        
        const localStats = calculateLocalMachineStats(machines);
        console.log('Machine stats calculated locally:', localStats);
        return localStats;
        
      } catch (localError) {
        console.error('Failed to calculate local machine stats:', localError);
        
        return {
          totalMachines: 0,
          totalMachineValue: 0,
          operationalMachines: 0,
          maintenanceMachines: 0,
          outOfServiceMachines: 0,
          averageMachineCost: 0,
          machinesByDepartment: {},
          machinesByLocation: {},
          upcomingMaintenanceCount: 0
        };
      }
    }
  },

  async addMaintenanceRecord(machineId: string, record: MaintenanceRecordDTO): Promise<FrontendMachine> {
    try {
      if (!machineId || machineId === 'undefined') {
        throw new Error('Invalid machine ID for maintenance');
      }
      
      // IMPORTANT: Ensure status is explicitly set to 'pending'
      const today = new Date().toISOString().split('T')[0];
      
      const maintenanceData = {
        type: record.type,
        description: record.description,
        cost: Number(record.cost),
        performedBy: record.performedBy,
        status: 'pending',  // Explicitly set status to 'pending'
        date: record.date || today,
        createdAt: new Date().toISOString()
      };
      
      console.log(`Adding maintenance record for machine ${machineId}:`, maintenanceData);
      
      const response = await api.post<FrontendMachine>(
        `/machines/${machineId}/maintenance`,
        maintenanceData
      );
      
      const updatedMachine = response.data;
      if (!updatedMachine.id && updatedMachine._id) {
        updatedMachine.id = updatedMachine._id;
      }
      
      console.log('Maintenance record added successfully with status: pending');
      
      return updatedMachine;
    } catch (error: any) {
      console.error(`Error adding maintenance record for machine ${machineId}:`, error);
      
      let errorMessage = 'Failed to add maintenance record';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 404) {
        errorMessage = `Machine not found with ID: ${machineId}`;
      } else if (error.response?.status === 500) {
        errorMessage = `Server error while adding maintenance. Check backend logs.`;
      }
      
      throw new Error(errorMessage);
    }
  },

  async getPendingMaintenanceRecords(): Promise<Array<{
    machine: FrontendMachine;
    maintenanceIndex: number;
    record: any;
  }>> {
    try {
      const machines = await this.getMachines();
      const pendingRecords: Array<{
        machine: FrontendMachine;
        maintenanceIndex: number;
        record: any;
      }> = [];
      
      machines.forEach(machine => {
        if (machine.maintenanceHistory && Array.isArray(machine.maintenanceHistory)) {
          machine.maintenanceHistory.forEach((record, index) => {
            // Check for pending status (including undefined for backward compatibility)
            if (record.status === 'pending') {
              pendingRecords.push({
                machine,
                maintenanceIndex: index,
                record
              });
              console.log(`Found pending record for machine ${machine.name}:`, record);
            }
          });
        }
      });
      
      console.log(`Found ${pendingRecords.length} pending maintenance records`);
      return pendingRecords;
    } catch (error) {
      console.error('Error fetching pending maintenance records:', error);
      return [];
    }
  },

  async approveMaintenanceRecord(machineId: string, maintenanceIndex: number, expenseData?: any): Promise<FrontendMachine> {
    try {
      console.log(`Approving maintenance record ${maintenanceIndex} for machine ${machineId}`);
      
      const machine = await this.getMachineById(machineId);
      
      if (!machine.maintenanceHistory || !machine.maintenanceHistory[maintenanceIndex]) {
        throw new Error('Maintenance record not found');
      }
      
      const updatedMaintenanceHistory = [...machine.maintenanceHistory];
      updatedMaintenanceHistory[maintenanceIndex] = {
        ...updatedMaintenanceHistory[maintenanceIndex],
        status: 'approved',
        expenseId: expenseData?.expenseId
      };
      
      const updatedMachine = await this.updateMachine(machineId, {
        maintenanceHistory: updatedMaintenanceHistory
      });
      
      console.log('Maintenance record approved successfully');
      return updatedMachine;
    } catch (error: any) {
      console.error('Error approving maintenance record:', error);
      throw new Error(error.response?.data?.message || 'Failed to approve maintenance record');
    }
  },

  async rejectMaintenanceRecord(machineId: string, maintenanceIndex: number, reason?: string): Promise<FrontendMachine> {
    try {
      console.log(`Rejecting maintenance record ${maintenanceIndex} for machine ${machineId}`);
      
      const machine = await this.getMachineById(machineId);
      
      if (!machine.maintenanceHistory || !machine.maintenanceHistory[maintenanceIndex]) {
        throw new Error('Maintenance record not found');
      }
      
      const updatedMaintenanceHistory = [...machine.maintenanceHistory];
      updatedMaintenanceHistory[maintenanceIndex] = {
        ...updatedMaintenanceHistory[maintenanceIndex],
        status: 'rejected'
      };
      
      const updatedMachine = await this.updateMachine(machineId, {
        maintenanceHistory: updatedMaintenanceHistory
      });
      
      console.log('Maintenance record rejected');
      return updatedMachine;
    } catch (error: any) {
      console.error('Error rejecting maintenance record:', error);
      throw new Error(error.response?.data?.message || 'Failed to reject maintenance record');
    }
  },

  async searchMachines(query: string): Promise<FrontendMachine[]> {
    try {
      if (!query || query.trim() === '') {
        return await this.getMachines();
      }
      
      console.log(`Searching machines with query: ${query}`);
      
      const response = await api.get<FrontendMachine[]>(`/machines/search`, {
        params: { q: query }
      });
      
      const machines = response.data.map(machine => ({
        ...machine,
        id: machine.id || machine._id || `temp-${Date.now()}-${Math.random()}`
      }));
      
      console.log(`Found ${machines.length} machines matching search`);
      
      return machines;
    } catch (error: any) {
      console.error('Error searching machines:', error);
      
      try {
        const allMachines = await this.getMachines();
        const lowerQuery = query.toLowerCase();
        const filtered = allMachines.filter(machine => 
          machine.name.toLowerCase().includes(lowerQuery) ||
          (machine.model && machine.model.toLowerCase().includes(lowerQuery)) ||
          (machine.location && machine.location.toLowerCase().includes(lowerQuery)) ||
          (machine.department && machine.department.toLowerCase().includes(lowerQuery))
        );
        console.log(`Fallback search found ${filtered.length} machines`);
        return filtered;
      } catch (fallbackError) {
        return [];
      }
    }
  },

  async testConnection(): Promise<boolean> {
    try {
      await api.get('/health', { timeout: 5000 });
      console.log('Backend connection successful');
      return true;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  },

  getMachineFromCache(machineId: string, machines: FrontendMachine[]): FrontendMachine | undefined {
    return machines.find(m => 
      m.id === machineId || 
      m._id === machineId || 
      (m as any)._id?.toString() === machineId
    );
  },

  async checkStatsEndpoint(): Promise<{ working: boolean; error?: string }> {
    try {
      const response = await api.get('/machines/stats');
      return { working: true };
    } catch (error: any) {
      return { 
        working: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  },

  async bulkImportMachines(machines: CreateMachineDTO[]): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      console.log(`Bulk importing ${machines.length} machines`);
      
      let success = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (const machine of machines) {
        try {
          await this.createMachine(machine);
          success++;
        } catch (error: any) {
          failed++;
          errors.push(`Failed to import ${machine.name}: ${error.message}`);
        }
      }
      
      console.log(`Bulk import complete: ${success} success, ${failed} failed`);
      
      return { success, failed, errors };
    } catch (error: any) {
      console.error('Error in bulk import:', error);
      throw new Error(`Bulk import failed: ${error.message}`);
    }
  },

  exportToCSV(machines: FrontendMachine[]): string {
    if (machines.length === 0) return '';
    
    const headers = [
      'Name', 'Model', 'Cost', 'Purchase Date', 'Quantity', 'Status', 
      'Location', 'Department', 'Assigned To', 'Last Maintenance', 
      'Next Maintenance', 'Description'
    ];
    
    const rows = machines.map(machine => [
      `"${machine.name.replace(/"/g, '""')}"`,
      `"${(machine.model || '').replace(/"/g, '""')}"`,
      machine.cost.toString(),
      machine.purchaseDate,
      machine.quantity.toString(),
      machine.status,
      `"${(machine.location || '').replace(/"/g, '""')}"`,
      `"${(machine.department || '').replace(/"/g, '""')}"`,
      `"${(machine.assignedTo || '').replace(/"/g, '""')}"`,
      machine.lastMaintenanceDate || '',
      machine.nextMaintenanceDate || '',
      `"${(machine.description || '').replace(/"/g, '""')}"`
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  },

  validateMachineData(data: Partial<CreateMachineDTO>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.name || data.name.trim() === '') {
      errors.push('Machine name is required');
    }
    
    if (data.cost === undefined || data.cost === null || data.cost < 0) {
      errors.push('Valid cost is required');
    }
    
    if (!data.purchaseDate) {
      errors.push('Purchase date is required');
    }
    
    if (data.quantity === undefined || data.quantity === null || data.quantity < 1) {
      errors.push('Quantity must be at least 1');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};