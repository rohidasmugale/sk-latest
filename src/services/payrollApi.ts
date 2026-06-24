import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

// Create axios instance with minimal headers for CORS compatibility
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - minimal headers for CORS
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Remove any headers that might cause CORS issues
    // Add cache busting only as query parameter, not as headers
    if (config.method?.toLowerCase() === "get") {
      config.params = {
        ...config.params,
        _: Date.now(), // Simple cache busting
      };
    }

    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Enhanced error logging
    console.error("API Error Details:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code,
    });

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// Simple cache busting params
const getCacheBustingParams = (params: any = {}) => {
  return {
    ...params,
    _: Date.now(),
  };
};

// Salary Structure API
export const salaryStructureApi = {
  getAll: (params?: any) =>
    api.get("/salary-structures", { params }).then((res) => res.data),

  getById: (id: string) =>
    api.get(`/salary-structures/${id}`).then((res) => res.data),

  getByEmployeeId: (employeeId: string) =>
    api.get(`/salary-structures/employee/${employeeId}`).then((res) => res.data),

  create: (data: any) =>
    api.post("/salary-structures", data).then((res) => res.data),

  update: (id: string, data: any) =>
    api.put(`/salary-structures/${id}`, data).then((res) => res.data),

  delete: (id: string) =>
    api.delete(`/salary-structures/${id}`).then((res) => res.data),

  deactivate: (id: string) =>
    api.patch(`/salary-structures/${id}/deactivate`).then((res) => res.data),

  getEmployeesWithoutStructure: (params?: any) =>
    api.get("/salary-structures/employees/without", { params }).then((res) => res.data),
};

// Payroll API
export const payrollApi = {
  getAll: (params?: any) =>
    api.get("/payroll", { params }).then((res) => res.data),

  getById: (id: string) =>
    api.get(`/payroll/${id}`).then((res) => res.data),

  getByEmployeeAndMonth: (employeeId: string, month: string) =>
    api.get(`/payroll/${employeeId}/${month}`).then((res) => res.data),

  process: (data: any) =>
    api.post("/payroll/process", data).then((res) => res.data),

  bulkProcess: (data: any) =>
    api.post("/payroll/bulk-process", data).then((res) => res.data),

  updatePaymentStatus: (id: string, data: any) =>
    api.put(`/payroll/${id}/payment-status`, data).then((res) => res.data),

  delete: (id: string) =>
    api.delete(`/payroll/${id}`).then((res) => res.data),

  getSummary: (params?: any) =>
    api
      .get("/payroll/summary", {
        params: getCacheBustingParams(params),
      })
      .then((res) => {
        console.log("Payroll Summary API Response:", res.data);
        return res.data;
      })
      .catch((error) => {
        console.error("Payroll Summary API Error:", error);
        // Return default summary structure on network error
        return {
          success: false,
          data: {
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            holdAmount: 0,
            partPaidAmount: 0,
            processedCount: 0,
            pendingCount: 0,
            paidCount: 0,
            holdCount: 0,
            partPaidCount: 0,
            totalEmployees: 0,
            totalRecords: 0,
            activeEmployees: 0,
            employeesWithStructure: 0,
            employeesWithoutStructure: 0,
            payrollMonth: params?.month || "",
          },
          message: error.message || "Failed to fetch summary",
        };
      }),

  export: (params: any) =>
    api
      .get("/payroll/export", {
        params: getCacheBustingParams(params),
        responseType: "blob",
      })
      .then((res) => res.data)
      .catch((error) => {
        console.error("Payroll Export API Error:", error);
        throw error;
      }),
};

// Salary Slip API
export const salarySlipApi = {
  getAll: (params?: any) =>
    api.get("/salary-slips", { params }).then((res) => res.data),

  getById: (id: string) =>
    api.get(`/salary-slips/${id}`).then((res) => res.data),

  getBySlipNumber: (slipNumber: string) =>
    api.get(`/salary-slips/slip/${slipNumber}`).then((res) => res.data),

  getByEmployeeAndMonth: (employeeId: string, month: string) =>
    api.get(`/salary-slips/${employeeId}/${month}`).then((res) => res.data),

  generate: (data: { payrollId: string }) =>
    api.post("/salary-slips", data).then((res) => res.data),

  update: (id: string, data: any) =>
    api.put(`/salary-slips/${id}`, data).then((res) => res.data),

  delete: (id: string) =>
    api.delete(`/salary-slips/${id}`).then((res) => res.data),

  markAsEmailed: (id: string) =>
    api.patch(`/salary-slips/${id}/email`).then((res) => res.data),

  getPrintData: (id: string) =>
    api.get(`/salary-slips/${id}/print`).then((res) => res.data),
};

// Employee API
export const employeeApi = {
  getAll: (params?: any) =>
    api.get("/employees", { params }).then((res) => res.data),

  getById: (id: string) =>
    api.get(`/employees/${id}`).then((res) => res.data),

  getAttendance: (employeeId: string, month: string) =>
    api.get(`/attendance/${employeeId}/${month}`).then((res) => res.data),

  getLeaves: (employeeId: string, month: string) =>
    api.get(`/leaves/${employeeId}/${month}`).then((res) => res.data),
};

export default {
  salaryStructure: salaryStructureApi,
  payroll: payrollApi,
  salarySlip: salarySlipApi,
  employee: employeeApi,
};
