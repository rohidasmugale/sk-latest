// src/lib/apiClient.ts
import axios from 'axios';

// Get the API URL based on environment
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.PROD) {
    return 'https://sk-backend-btbj.onrender.com/api';
  }
  return 'http://localhost:5001/api';
};

const API_URL = getApiUrl();

console.log('🔧 API Client using base URL:', API_URL);

// ---------------------------------------------------------------------------
// 1. GLOBAL axios defaults — this is what makes plain `axios.get(...)` work
// ---------------------------------------------------------------------------
axios.defaults.baseURL = API_URL;

// Attach JWT token to EVERY axios request, including plain `axios.get(...)`
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sk_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📡 [global axios] ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// 2. The `apiClient` instance — same behavior, for code that imports it
// ---------------------------------------------------------------------------
const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sk_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📡 [apiClient] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ [apiClient] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('❌ API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    }
    return Promise.reject(error);
  }
);

export default apiClient;