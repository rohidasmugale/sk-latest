import { toast } from "sonner";

// Base URL for your backend
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

// Interfaces
export interface Client {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: "active" | "inactive";
  value: string;
  industry: string;
  contactPerson: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed-won" | "closed-lost";
  value: string;
  assignedTo: string;
  followUpDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Communication {
  _id: string;
  clientName: string;
  clientId: {
    _id: string;
    name: string;
    company: string;
    email: string;
  } | string;
  type: "call" | "email" | "meeting" | "demo";
  date: string;
  notes: string;
  followUpRequired: boolean;
  followUpDate?: string;
  createdAt: string;
}

export interface CRMStats {
  totalClients: number;
  activeLeads: number;
  totalCommunications: number;
  totalValue: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Helper function for API calls
const fetchApi = async <T>(
  url: string, 
  options?: RequestInit
): Promise<T> => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `http error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// CRM Stats Service
export const crmStatsService = {
  async getStats(): Promise<CRMStats> {
    try {
      const response = await fetchApi<ApiResponse<CRMStats>>(`${API_URL}/crm/clients/crm-stats`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch stats');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch CRM statistics');
      throw error;
    }
  },
};

// Client Service
export const clientService = {
  async getAll(search?: string): Promise<Client[]> {
    try {
      const url = search 
        ? `${API_URL}/crm/clients?search=${encodeURIComponent(search)}` 
        : `${API_URL}/crm/clients`;
      
      const response = await fetchApi<ApiResponse<Client[]>>(url);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch clients');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch clients');
      throw error;
    }
  },

  async getById(id: string): Promise<Client> {
    try {
      const response = await fetchApi<ApiResponse<Client>>(`${API_URL}/crm/clients/${id}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Client not found');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch client');
      throw error;
    }
  },

  async create(clientData: Omit<Client, '_id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    try {
      console.log('Creating client with data:', clientData);
      
      const response = await fetchApi<ApiResponse<Client>>(`${API_URL}/crm/clients`, {
        method: 'POST',
        body: JSON.stringify(clientData),
      });
      
      if (response.success) {
        toast.success('Client created successfully!');
        return response.data;
      }
      throw new Error(response.message || 'Failed to create client');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create client');
      throw error;
    }
  },

  async update(id: string, clientData: Partial<Client>): Promise<Client> {
    try {
      console.log('Updating client with data:', clientData);
      
      const response = await fetchApi<ApiResponse<Client>>(`${API_URL}/crm/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(clientData),
      });
      
      if (response.success) {
        toast.success('Client updated successfully!');
        return response.data;
      }
      throw new Error(response.message || 'Failed to update client');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update client');
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const response = await fetchApi<ApiResponse<void>>(`${API_URL}/crm/clients/${id}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        toast.success('Client deleted successfully!');
        return;
      }
      throw new Error(response.message || 'Failed to delete client');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete client');
      throw error;
    }
  },
};

// Lead Service
export const leadService = {
  async getAll(search?: string): Promise<Lead[]> {
    try {
      const url = search 
        ? `${API_URL}/crm/leads?search=${encodeURIComponent(search)}` 
        : `${API_URL}/crm/leads`;
      
      const response = await fetchApi<ApiResponse<Lead[]>>(url);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch leads');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch leads');
      throw error;
    }
  },

  async getById(id: string): Promise<Lead> {
    try {
      const response = await fetchApi<ApiResponse<Lead>>(`${API_URL}/crm/leads/${id}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Lead not found');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch lead');
      throw error;
    }
  },

  async create(leadData: Omit<Lead, '_id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    try {
      const response = await fetchApi<ApiResponse<Lead>>(`${API_URL}/crm/leads`, {
        method: 'POST',
        body: JSON.stringify(leadData),
      });
      
      if (response.success) {
        toast.success('Lead created successfully!');
        return response.data;
      }
      throw new Error(response.message || 'Failed to create lead');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create lead');
      throw error;
    }
  },

  async bulkCreate(leadsData: Omit<Lead, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<Lead[]> {
    try {
      const response = await fetchApi<ApiResponse<Lead[]>>(`${API_URL}/crm/leads/bulk`, {
        method: 'POST',
        body: JSON.stringify(leadsData),
      });
      
      if (response.success) {
        toast.success(`${leadsData.length} leads imported successfully!`);
        return response.data;
      }
      throw new Error(response.message || 'Failed to import leads');
    } catch (error: any) {
      toast.error(error.message || 'Failed to import leads');
      throw error;
    }
  },

  async update(id: string, leadData: Partial<Lead>): Promise<Lead> {
    try {
      const response = await fetchApi<ApiResponse<Lead>>(`${API_URL}/crm/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(leadData),
      });
      
      if (response.success) {
        toast.success('Lead updated successfully!');
        return response.data;
      }
      throw new Error(response.message || 'Failed to update lead');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update lead');
      throw error;
    }
  },

  async updateStatus(id: string, status: Lead['status']): Promise<Lead> {
    try {
      const response = await fetchApi<ApiResponse<Lead>>(`${API_URL}/crm/leads/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      
      if (response.success) {
        toast.success('Lead status updated!');
        return response.data;
      }
      throw new Error(response.message || 'Failed to update lead status');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update lead status');
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const response = await fetchApi<ApiResponse<void>>(`${API_URL}/crm/leads/${id}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        toast.success('Lead deleted successfully!');
        return;
      }
      throw new Error(response.message || 'Failed to delete lead');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete lead');
      throw error;
    }
  },
};

// Communication Service
export const communicationService = {
  async getAll(search?: string): Promise<Communication[]> {
    try {
      const url = search 
        ? `${API_URL}/crm/communications?search=${encodeURIComponent(search)}` 
        : `${API_URL}/crm/communications`;
      
      const response = await fetchApi<ApiResponse<Communication[]>>(url);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch communications');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch communications');
      throw error;
    }
  },

  async create(commData: Omit<Communication, '_id' | 'createdAt'>): Promise<Communication> {
    try {
      const response = await fetchApi<ApiResponse<Communication>>(`${API_URL}/crm/communications`, {
        method: 'POST',
        body: JSON.stringify(commData),
      });
      
      if (response.success) {
        toast.success('Communication logged successfully!');
        return response.data;
      }
      throw new Error(response.message || 'Failed to create communication');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create communication');
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const response = await fetchApi<ApiResponse<void>>(`${API_URL}/crm/communications/${id}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        toast.success('Communication deleted!');
        return;
      }
      throw new Error(response.message || 'Failed to delete communication');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete communication');
      throw error;
    }
  },
};

// Combined CRM Service
export const crmService = {
  ...crmStatsService,
  clients: clientService,
  leads: leadService,
  communications: communicationService,
  
  async fetchAllData(search?: string): Promise<{
    stats: CRMStats;
    clients: Client[];
    leads: Lead[];
    communications: Communication[];
  }> {
    try {
      const [stats, clients, leads, communications] = await Promise.all([
        crmStatsService.getStats(),
        clientService.getAll(search),
        leadService.getAll(search),
        communicationService.getAll(search),
      ]);
      
      return { stats, clients, leads, communications };
    } catch (error) {
      console.error('Failed to fetch all CRM data:', error);
      throw error;
    }
  },
};

export default crmService;