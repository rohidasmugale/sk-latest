// src/services/document.service.ts
import axios, { AxiosError } from 'axios';

// Use absolute URL - make sure this matches your backend
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  data: {
    url: string;
    public_id: string;
    format: string;
    size: number;
    originalname: string;
    documentId: string;
    mimetype: string;
    category: string;
  };
}

export interface DocumentData {
  name: string;
  id: string;
  date: string;
  _id: string;
  url: string;
  public_id: string;
  originalname: string;
  mimetype: string;
  size: number;
  folder: string;
  category: 'image' | 'document' | 'spreadsheet' | 'presentation' | 'other' | 'uploaded' | 'generated' | 'template';
  uploadedBy?: string;
  description?: string;
  tags?: string[];
  isArchived: boolean;
  uploadedAt: string;
  lastAccessed: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  count?: number;
  total?: number;
  pages?: number;
  currentPage?: number;
}

class DocumentService {
  private api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
    withCredentials: true,
  });

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing backend connection...');
      const response = await axios.get(
      API_URL.replace('/api', '') + '/health', { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });
      console.log('✅ Backend connection successful:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      return false;
    }
  }

  // Upload single document - FIXED ENDPOINT
  async uploadDocument(file: File, folder: string = 'documents', description?: string, category?: string): Promise<ApiResponse<DocumentUploadResponse['data']>> {
    try {
      console.log('📤 Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        folder: folder,
        category: category,
        description: description
      });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      if (description) {
        formData.append('description', description);
      }
      if (category) {
        formData.append('category', category);
      }

      // FIXED: Changed from '/upload/single' to '/documents/upload'
      console.log('🔄 Sending upload request to:', `${this.api.defaults.baseURL}/documents/upload`);
      
      const response = await this.api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for upload
      });

      console.log('✅ Upload successful:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Upload failed:', error);
      return this.handleApiError(error);
    }
  }

  // Get all documents
  async getDocuments(category?: string, page: number = 1, limit: number = 20): Promise<ApiResponse<DocumentData[]>> {
    try {
      console.log('📥 Fetching documents with params:', { category, page, limit });
      
      const params: any = { page, limit };
      if (category) {
        params.category = category;
      }
      
      console.log('🔄 Making request to:', `${this.api.defaults.baseURL}/documents`);
      
      const response = await this.api.get('/documents', { params });
      
      console.log('✅ Documents fetched:', {
        count: response.data.count,
        total: response.data.total,
        dataLength: response.data.data?.length,
        message: response.data.message
      });
      
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Failed to fetch documents:', error);
      return this.handleApiError(error);
    }
  }

  // Get document by ID
  async getDocumentById(id: string): Promise<ApiResponse<DocumentData>> {
    try {
      console.log('📄 Fetching document by ID:', id);
      
      // Check if it's a valid MongoDB ObjectId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      
      if (!isValidObjectId) {
        return {
          success: false,
          message: 'Invalid document ID format. Must be a valid MongoDB ObjectId (24 characters)',
          data: undefined
        };
      }
      
      const response = await this.api.get(`/documents/${id}`);
      console.log('✅ Document fetched:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Failed to fetch document:', error);
      return this.handleApiError(error);
    }
  }

  // Save document metadata
  async saveDocumentMetadata(documentData: {
    name: string;
    url: string;
    publicId: string;
    format: string;
    size: string;
    category: "uploaded" | "generated" | "template";
    description?: string;
    folder?: string;
  }): Promise<ApiResponse<DocumentData>> {
    try {
      console.log('📝 Saving document metadata:', documentData);
      
      // Map frontend category to backend category
      const categoryMap: Record<string, string> = {
        'uploaded': 'document',
        'generated': 'document', 
        'template': 'template'
      };
      
      const backendCategory = categoryMap[documentData.category] || 'document';
      
      console.log('🔄 Category mapping:', {
        frontend: documentData.category,
        backend: backendCategory
      });
      
      const response = await this.api.post('/documents', {
        originalname: documentData.name,
        url: documentData.url,
        public_id: documentData.publicId,
        mimetype: this.getMimeTypeFromFormat(documentData.format),
        size: this.parseFileSize(documentData.size),
        folder: documentData.folder || 'documents',
        category: backendCategory,
        description: documentData.description,
        tags: documentData.category === 'template' ? ['template'] : []
      });
      
      console.log('✅ Metadata saved:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Failed to save metadata:', error);
      return this.handleApiError(error);
    }
  }

  // Delete document
  async deleteDocument(id: string): Promise<ApiResponse<any>> {
    try {
      console.log('🗑️ Deleting document with ID:', id);
      
      // Check if it's a valid MongoDB ObjectId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      
      if (!isValidObjectId) {
        return {
          success: false,
          message: 'Invalid document ID format. Must be a valid MongoDB ObjectId (24 characters)',
          data: null
        };
      }
      
      const response = await this.api.delete(`/documents/${id}`);
      console.log('✅ Document deleted:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Failed to delete document:', error);
      return this.handleApiError(error);
    }
  }

  // Search documents
  async searchDocuments(query: string): Promise<ApiResponse<DocumentData[]>> {
    try {
      console.log('🔍 Searching documents for:', query);
      const response = await this.api.get('/documents/search/all', {
        params: { q: query }
      });
      console.log('✅ Search results:', {
        count: response.data.data?.length,
        message: response.data.message
      });
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Search failed:', error);
      return this.handleApiError(error);
    }
  }

  // Helper methods
  private handleApiError(error: unknown): ApiResponse<any> {
    console.error('API Error Details:', error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      let errorMessage = 'Network error occurred';
      
      if (axiosError.response) {
        console.error('Response error:', {
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          data: axiosError.response.data
        });
        
        if (axiosError.response.status === 404) {
          errorMessage = 'API endpoint not found. Check if backend server is running.';
        } else if (axiosError.response.status === 500) {
          errorMessage = 'Backend server error. Check server logs.';
        } else if (axiosError.response.data && typeof axiosError.response.data === 'object') {
          const data = axiosError.response.data as any;
          errorMessage = data.message || JSON.stringify(data);
        }
      } else if (axiosError.request) {
        errorMessage = 'No response received from server. Check if backend is running at ' + API_URL;
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
      
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
    
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
    
    return {
      success: false,
      message: 'An unknown error occurred',
      data: null,
    };
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() || 'UNKNOWN';
  }

  getFileType(extension: string): "PDF" | "XLSX" | "DOCX" | "JPG" | "PNG" | "OTHER" {
    const ext = extension.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      return 'JPG';
    }
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      return 'DOCX';
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return 'XLSX';
    }
    if (ext === 'pdf') {
      return 'PDF';
    }
    
    return 'OTHER';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private parseFileSize(sizeString: string): number {
    const units: { [key: string]: number } = {
      'bytes': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024,
    };
    
    const match = sizeString.toLowerCase().match(/^([\d.]+)\s*(\w+)$/);
    if (!match) return 0;
    
    const [, value, unit] = match;
    const baseUnit = unit.replace(/s$/, '');
    return parseFloat(value) * (units[baseUnit] || 1);
  }

  private getMimeTypeFromFormat(format: string): string {
    const mimeTypes: { [key: string]: string } = {
      'PDF': 'application/pdf',
      'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'DOC': 'application/msword',
      'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'XLS': 'application/vnd.ms-excel',
      'JPG': 'image/jpeg',
      'JPEG': 'image/jpeg',
      'PNG': 'image/png',
      'GIF': 'image/gif',
      'WEBP': 'image/webp',
      'SVG': 'image/svg+xml',
      'TXT': 'text/plain',
    };
    return mimeTypes[format.toUpperCase()] || 'application/octet-stream';
  }
}

const documentService = new DocumentService();
export default documentService;