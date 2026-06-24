import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data && !(config.data instanceof FormData)) {
      console.log("📦 Request data:", config.data);
    }
    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("❌ Response error:", error.response?.status, error.config?.url);
    console.error("Error details:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface BriefingData {
  date: string;
  time: string;
  conductedBy: string;
  site: string;
  department: string;
  attendeesCount: number;
  topics: string[];
  keyPoints: string[];
  actionItems: Array<{
    description: string;
    assignedTo: string;
    dueDate: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
  }>;
  notes: string;
  shift: 'morning' | 'evening' | 'night';
  supervisors?: Array<{ id: string; name: string }>;
  managers?: Array<{ id: string; name: string }>;
  attachments?: any[];
}

export interface GetBriefingsParams {
  department?: string;
  shift?: string;
  site?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const briefingApi = {
  getAllBriefings: async (params?: GetBriefingsParams) => {
    try {
      const response = await api.get("/briefings", { params });
      return response.data;
    } catch (error: any) {
      console.error("Error in getAllBriefings:", error.message);
      throw error;
    }
  },

  getBriefingById: async (id: string) => {
    try {
      const response = await api.get(`/briefings/${id}`);
      return response.data;
    } catch (error: any) {
      console.error("Error in getBriefingById:", error.message);
      throw error;
    }
  },

  createBriefing: async (data: BriefingData, files?: File[]) => {
    try {
      const formData = new FormData();
      
      const briefingData = {
        date: data.date,
        time: data.time || '',
        conductedBy: data.conductedBy,
        site: data.site,
        department: data.department || '',
        attendeesCount: data.attendeesCount || 0,
        topics: data.topics || [],
        keyPoints: data.keyPoints || [],
        actionItems: data.actionItems || [],
        notes: data.notes || '',
        shift: data.shift || 'morning',
        supervisors: data.supervisors || [],
        managers: data.managers || []
      };
      
      formData.append("data", JSON.stringify(briefingData));
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append("attachments", file);
        });
      }
      
      const response = await api.post("/briefings", formData, { 
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000
      });
      return response.data;
    } catch (error: any) {
      console.error("Error in createBriefing:", error.message);
      if (error.response?.data?.error === "DUPLICATE_KEY_ERROR") {
        throw new Error("A briefing with similar data already exists. Please check for duplicates.");
      }
      throw error;
    }
  },

  updateBriefing: async (id: string, data: Partial<BriefingData>, files?: File[]) => {
    try {
      const formData = new FormData();
      
      const updateData = {
        date: data.date,
        time: data.time,
        conductedBy: data.conductedBy,
        site: data.site,
        department: data.department,
        attendeesCount: data.attendeesCount,
        topics: data.topics,
        keyPoints: data.keyPoints,
        actionItems: data.actionItems,
        notes: data.notes,
        shift: data.shift,
        supervisors: data.supervisors,
        managers: data.managers,
        attachments: data.attachments
      };
      
      formData.append("data", JSON.stringify(updateData));
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append("newAttachments", file);
        });
      }
      
      const response = await api.put(`/briefings/${id}`, formData, { 
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000
      });
      return response.data;
    } catch (error: any) {
      console.error("Error in updateBriefing:", error.message);
      throw error;
    }
  },

  updateActionItemStatus: async (briefingId: string, actionItemId: string, status: string) => {
    try {
      const response = await api.put(`/briefings/${briefingId}/actions/${actionItemId}`, { status });
      return response.data;
    } catch (error: any) {
      console.error("Error in updateActionItemStatus:", error.message);
      throw error;
    }
  },

  deleteBriefing: async (id: string) => {
    try {
      const response = await api.delete(`/briefings/${id}`);
      return response.data;
    } catch (error: any) {
      console.error("Error in deleteBriefing:", error.message);
      throw error;
    }
  },

  getBriefingStats: async () => {
    try {
      const response = await api.get("/briefings/stats");
      return response.data;
    } catch (error: any) {
      console.error("Error in getBriefingStats:", error.message);
      throw error;
    }
  },
};

export default briefingApi;