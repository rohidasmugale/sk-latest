// src/lib/apiClient.ts
import axios from 'axios';

// Get the API URL based on environment
const getApiUrl = () => {
  // If VITE_API_URL is set in environment variables (Vercel)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For production (if VITE_API_URL is not set)
  if (import.meta.env.PROD) {
    return 'https://sk-backend-btbj.onrender.com/api';
  }
  
  // For development (localhost)
  return 'http://localhost:5001/api';
};

const API_URL = getApiUrl();

console.log('🔧 API Client using base URL:', API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sk_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('❌ API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
    } else if (error.request) {
      console.error('❌ API No Response:', error.request);
    } else {
      console.error('❌ API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;