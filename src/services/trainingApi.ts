import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sk_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Define types
interface TrainingSession {
  _id: string;
  id: string;
  title: string;
  description: string;
  type: 'safety' | 'technical' | 'soft_skills' | 'compliance' | 'other';
  date: string;
  time: string;
  duration: string;
  trainer: string;
  supervisor: string;
  site: string;
  department: string;
  attendees: string[];
  maxAttendees: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  attachments: any[];
  feedback: any[];
  location: string;
  objectives: string[];
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  trainings?: TrainingSession[];
  total?: number;
  page?: number;
  totalPages?: number;
}

// Training API calls
export const trainingApi = {
  // Get all trainings
  getAllTrainings: async (filters: any = {}): Promise<ApiResponse> => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') params.append(key, value.toString());
      });
      
      const response = await api.get(`/trainings?${params}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching trainings:', error);
      throw error;
    }
  },

  // Get training statistics
  getTrainingStats: async (): Promise<ApiResponse> => {
    try {
      const response = await api.get('/trainings/stats');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching training stats:', error);
      throw error;
    }
  },

  // Create new training
  createTraining: async (trainingData: any, files: File[] = []): Promise<ApiResponse> => {
    try {
      console.log('Training data to send:', trainingData);
      console.log('Number of files:', files.length);
      
      const formData = new FormData();
      
      console.log('Appending data:', trainingData);
      formData.append('data', JSON.stringify(trainingData));
      
      files.forEach((file, index) => {
        console.log(`File ${index + 1}:`, file.name, file.type, file.size);
        formData.append('attachments', file);
      });
      
      // Log FormData contents (for debugging)
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const response = await api.post('/trainings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating training:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      throw error;
    }
  },

  // Update training
  updateTraining: async (id: string, trainingData: any, files: File[] = []): Promise<ApiResponse> => {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(trainingData));
      
      files.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await api.put(`/trainings/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error updating training:', error);
      throw error;
    }
  },

  // Update training status
  updateTrainingStatus: async (id: string, status: string): Promise<ApiResponse> => {
    try {
      const response = await api.patch(`/trainings/${id}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error('Error updating training status:', error);
      throw error;
    }
  },

  // Delete training
  deleteTraining: async (id: string): Promise<ApiResponse> => {
    try {
      const response = await api.delete(`/trainings/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting training:', error);
      throw error;
    }
  },

  // Add feedback
  addFeedback: async (trainingId: string, feedback: any): Promise<ApiResponse> => {
    try {
      const response = await api.post(`/trainings/${trainingId}/feedback`, feedback);
      return response.data;
    } catch (error: any) {
      console.error('Error adding feedbacks:', error);
      throw error;
    }
  }
};