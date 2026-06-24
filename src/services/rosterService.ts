import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Add request interceptor to log requests
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
      console.log("📦 Request data:", config.data);
    }
    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor to log responses
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(
      "❌ Response error:",
      error.response?.status,
      error.config?.url
    );
    console.error("Error details:", error.response?.data);
    return Promise.reject(error);
  }
);

export interface RosterEntryData {
  date: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  shift: string;
  shiftTiming: string;
  assignedTask: string;
  hours: number;
  remark: string;
  type: "daily" | "weekly" | "fortnightly" | "monthly";
  siteClient: string;
  supervisor: string;
}

export interface GetRosterParams {
  startDate?: string;
  endDate?: string;
  type?: string;
  employeeId?: string;
  page?: number;
  limit?: number;
}

export const rosterService = {
  // Get all roster entries
  async getRosterEntries(params?: GetRosterParams) {
    const response = await api.get("/roster", { params });
    return response.data;
  },

  // Get roster by ID
  async getRosterById(id: string) {
    const response = await api.get(`/roster/${id}`);
    return response.data;
  },

  // Create new roster entry
  async createRosterEntry(data: RosterEntryData) {
    console.log("Creating roster entry with data:", data);
    const response = await api.post("/roster", data);
    return response.data;
  },

  // Create multiple roster entries
  async bulkCreateRosterEntries(entries: RosterEntryData[]) {
    const response = await api.post("/roster/bulk", { entries });
    return response.data;
  },

  // Update roster entry
  async updateRosterEntry(id: string, data: Partial<RosterEntryData>) {
    const response = await api.put(`/roster/${id}`, data);
    return response.data;
  },

  // Delete roster entry
  async deleteRosterEntry(id: string) {
    const response = await api.delete(`/roster/${id}`);
    return response.data;
  },

  // Get roster statistics
  async getRosterStats(startDate?: string, endDate?: string) {
    const params = { startDate, endDate };
    const response = await api.get("/roster/stats", { params });
    return response.data;
  },

  // Get calendar view data
  async getCalendarView(month?: number, year?: number) {
    const params = month && year ? { month, year } : {};
    const response = await api.get("/roster/calendar", { params });
    return response.data;
  },

  // Test API connection
  async testConnection() {
    try {
      const response = await api.get("/health");
      return response.data;
    } catch (error) {
      console.error("API connection test failed:", error);
      throw error;
    }
  },
};
