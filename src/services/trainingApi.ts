// api/trainingApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000, // Increase timeout to 30 seconds
});

api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) console.log("📦 Request data:", config.data);
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

export interface TrainingSessionData {
  title: string;
  description: string;
  type: 'safety' | 'technical' | 'soft_skills' | 'compliance' | 'other';
  date: string;
  time: string;
  duration: string;
  trainer: string;
  supervisor?: string;
  site: string;
  department: string;
  maxAttendees: number;
  location: string;
  objectives: string[];
  supervisors?: Array<{ id: string; name: string }>;
  managers?: Array<{ id: string; name: string }>;
  attendees?: string[];
  attachments?: any[];
}

export interface GetTrainingsParams {
  department?: string;
  status?: string;
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const trainingApi = {
  getAllTrainings: async (params?: GetTrainingsParams) => {
    try {
      const response = await api.get("/trainings", { params });
      return response.data;
    } catch (error: any) {
      console.error("Error in getAllTrainings:", error.message);
      throw error;
    }
  },
  
  getTrainingById: async (id: string) => {
    try {
      const response = await api.get(`/trainings/${id}`);
      return response.data;
    } catch (error: any) {
      console.error("Error in getTrainingById:", error.message);
      throw error;
    }
  },
  
  createTraining: async (data: TrainingSessionData, files?: File[]) => {
    try {
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append("attachments", file);
        });
      }
      const response = await api.post("/trainings", formData, { 
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000 // Longer timeout for file uploads
      });
      return response.data;
    } catch (error: any) {
      console.error("Error in createTraining:", error.message);
      throw error;
    }
  },
  
  updateTraining: async (id: string, data: Partial<TrainingSessionData>, files?: File[]) => {
    try {
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append("newAttachments", file);
        });
      }
      const response = await api.put(`/trainings/${id}`, formData, { 
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000
      });
      return response.data;
    } catch (error: any) {
      console.error("Error in updateTraining:", error.message);
      throw error;
    }
  },
  
  updateTrainingStatus: async (id: string, status: string) => {
    try {
      const response = await api.put(`/trainings/${id}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error("Error in updateTrainingStatus:", error.message);
      throw error;
    }
  },
  
  addAttendee: async (id: string, employeeId: string, employeeName: string) => {
    try {
      const response = await api.post(`/trainings/${id}/attendees`, { employeeId, employeeName });
      return response.data;
    } catch (error: any) {
      console.error("Error in addAttendee:", error.message);
      throw error;
    }
  },
  
  addFeedback: async (id: string, employeeId: string, employeeName: string, rating: number, comment: string) => {
    try {
      const response = await api.post(`/trainings/${id}/feedback`, { employeeId, employeeName, rating, comment });
      return response.data;
    } catch (error: any) {
      console.error("Error in addFeedback:", error.message);
      throw error;
    }
  },
  
  deleteTraining: async (id: string) => {
    try {
      const response = await api.delete(`/trainings/${id}`);
      return response.data;
    } catch (error: any) {
      console.error("Error in deleteTraining:", error.message);
      throw error;
    }
  },
  
  getTrainingStats: async () => {
    try {
      const response = await api.get("/trainings/stats");
      return response.data;
    } catch (error: any) {
      console.error("Error in getTrainingStats:", error.message);
      throw error;
    }
  },
};

export default trainingApi;