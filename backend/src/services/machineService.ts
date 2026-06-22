import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5001/api';

// ✅ Use the same key as RoleContext
const getAuthToken = (): string | null => {
 return process.env.SK_TOKEN || '';
};

const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    if (config.headers) {
  config.headers.Authorization = `Bearer ${token}`;
}
  }
  return config;
});

export interface FrontendMachine {
  _id: string;
  id?: string;
  name: string;
  cost: number;
  purchaseDate: string;
  quantity: number;
  description?: string;
  status: 'operational' | 'maintenance' | 'out-of-service';
  machineModel?: string;
  serialNumber?: string;
  department?: string;
  assignedTo?: string;
  maintenanceHistory?: Array<{
    date: string;
    type: string;
    description: string;
    cost: number;
    performedBy: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
  location?: string;
  model?: string;
}

export interface CreateMachineDTO {
  name: string;
  cost: number;
  purchaseDate: string;
  quantity: number;
  description?: string;
  status: 'operational' | 'maintenance' | 'out-of-service';
  machineModel?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  location?: string;
  manufacturer?: string;
  serialNumber?: string;
  department?: string;
  assignedTo?: string;
}

export interface MaintenanceRecordDTO {
  type: string;
  description: string;
  cost: number;
  performedBy: string;
}

export const machineService = {
  async getMachines(filters?: any): Promise<FrontendMachine[]> {
    const response = await apiClient.get<FrontendMachine[]>('/machines', { params: filters });
    return response.data.map(m => ({ ...m, id: m._id }));
  },

  async getMachineById(id: string): Promise<FrontendMachine> {
    const response = await apiClient.get<FrontendMachine>(`/machines/${id}`);
    return { ...response.data, id: response.data._id };
  },

  async createMachine(data: CreateMachineDTO): Promise<FrontendMachine> {
    const response = await apiClient.post<FrontendMachine>('/machines', data);
    return { ...response.data, id: response.data._id };
  },

  async updateMachine(id: string, data: Partial<CreateMachineDTO>): Promise<FrontendMachine> {
    const response = await apiClient.put<FrontendMachine>(`/machines/${id}`, data);
    return { ...response.data, id: response.data._id };
  },

  async deleteMachine(id: string): Promise<void> {
    await apiClient.delete(`/machines/${id}`);
  },

  async addMaintenanceRecord(machineId: string, record: MaintenanceRecordDTO): Promise<FrontendMachine> {
    const response = await apiClient.post<FrontendMachine>(`/machines/${machineId}/maintenance`, record);
    return { ...response.data, id: response.data._id };
  },

  // ✅ NEW method for supervisor
  async getMachinesForSupervisor(): Promise<{ success: boolean; data: FrontendMachine[] }> {
    const response = await apiClient.get<{ success: boolean; data: FrontendMachine[] }>('/machines/supervisor');
    if (response.data.success && response.data.data) {
      response.data.data = response.data.data.map(m => ({ ...m, id: m._id }));
    }
    return response.data;
  },

  async getMachineStats(): Promise<any> {
    const response = await apiClient.get('/machines/stats');
    return response.data;
  },
};