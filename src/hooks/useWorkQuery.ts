// hooks/useWorkQuery.ts
import { useState, useEffect, useCallback } from 'react';
import { workQueryApi, WorkQuery, Statistics, Category, Priority, Status, ServiceType, Pagination } from '@/services/workQueryApi';
import { toast } from 'sonner';

interface UseWorkQueryProps {
  supervisorId: string;
  autoFetch?: boolean;
  initialFilters?: {
    search?: string;
    status?: string;
    priority?: string;
    serviceType?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

// Helper to get error message from unknown error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
};

export const useWorkQuery = ({ supervisorId, autoFetch = true, initialFilters = {} }: UseWorkQueryProps) => {
  const [workQueries, setWorkQueries] = useState<WorkQuery[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: initialFilters.page || 1,
    limit: initialFilters.limit || 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState(initialFilters);
  
  const [loading, setLoading] = useState({
    queries: false,
    statistics: false,
    creating: false,
    deleting: false,
    updating: false
  });

  // Fetch work queries
  const fetchWorkQueries = useCallback(async () => {
    if (!supervisorId) return;
    
    setLoading(prev => ({ ...prev, queries: true }));
    try {
      const response = await workQueryApi.getAllWorkQueries({
        supervisorId,
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      if (response.success) {
        setWorkQueries(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        toast.error(response.message || 'Failed to fetch work queries');
      }
    } catch (error) {
      console.error('Error fetching work queries:', error);
      toast.error(getErrorMessage(error) || 'Failed to fetch work queries');
    } finally {
      setLoading(prev => ({ ...prev, queries: false }));
    }
  }, [supervisorId, filters, pagination.page, pagination.limit]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    if (!supervisorId) return;
    
    setLoading(prev => ({ ...prev, statistics: true }));
    try {
      const response = await workQueryApi.getStatistics(supervisorId);
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(prev => ({ ...prev, statistics: false }));
    }
  }, [supervisorId]);

  // Fetch static data
  const fetchStaticData = useCallback(async () => {
    try {
      const [categoriesRes, prioritiesRes, statusesRes, serviceTypesRes] = await Promise.all([
        workQueryApi.getCategories(),
        workQueryApi.getPriorities(),
        workQueryApi.getStatuses(),
        workQueryApi.getServiceTypes()
      ]);
      
      if (categoriesRes.success) setCategories(categoriesRes.data);
      if (prioritiesRes.success) setPriorities(prioritiesRes.data);
      if (statusesRes.success) setStatuses(statusesRes.data);
      if (serviceTypesRes.success) setServiceTypes(serviceTypesRes.data);
    } catch (error) {
      console.error('Error fetching static data:', error);
    }
  }, []);

  // Create work query with image upload support
  const createWorkQuery = useCallback(async (
    data: {
      title: string;
      description: string;
      serviceId: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      category: string;
      supervisorId: string;
      supervisorName: string;
      serviceTitle?: string;
      serviceType?: string;
    },
    files: File[] = []
  ): Promise<{ success: boolean; data?: WorkQuery; error?: string }> => {
    setLoading(prev => ({ ...prev, creating: true }));
    
    try {
      let response;
      
      if (files.length > 0) {
        // Use FormData for multipart upload
        const formData = new FormData();
        
        // Append text data as JSON string
        formData.append('data', JSON.stringify(data));
        
        // Append files
        files.forEach((file) => {
          formData.append('images', file);
        });
        
        // Make custom fetch request
   const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        
        const fetchResponse = await fetch(`${API_URL}/work-queries`, {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData
        });
        
        const result = await fetchResponse.json();
        response = result;
      } else {
        // No files, use regular JSON request
        response = await workQueryApi.createWorkQuery(data);
      }
      
      if (response.success) {
        toast.success('Work query created successfully');
        await fetchWorkQueries();
        await fetchStatistics();
        return { success: true, data: response.data };
      } else {
        toast.error(response.message || 'Failed to create work query');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Error creating work query:', error);
      toast.error(getErrorMessage(error) || 'Failed to create work query');
      return { success: false, error: getErrorMessage(error) };
    } finally {
      setLoading(prev => ({ ...prev, creating: false }));
    }
  }, [fetchWorkQueries, fetchStatistics]);

  // Delete work query
  const deleteWorkQuery = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(prev => ({ ...prev, deleting: true }));
    try {
      const response = await workQueryApi.deleteWorkQuery(id);
      if (response.success) {
        toast.success('Work query deleted successfully');
        await fetchWorkQueries();
        await fetchStatistics();
        return { success: true };
      } else {
        toast.error(response.message || 'Failed to delete work query');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Error deleting work query:', error);
      toast.error(getErrorMessage(error) || 'Failed to delete work query');
      return { success: false, error: getErrorMessage(error) };
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  }, [fetchWorkQueries, fetchStatistics]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // Change page
  const changePage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  // Change limit
  const changeLimit = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  // Auto fetch
  useEffect(() => {
    if (autoFetch && supervisorId) {
      fetchStaticData();
      fetchWorkQueries();
      fetchStatistics();
    }
  }, [autoFetch, supervisorId]);

  useEffect(() => {
    if (autoFetch && supervisorId) {
      fetchWorkQueries();
    }
  }, [filters, pagination.page, pagination.limit]);

  return {
    workQueries,
    statistics,
    categories,
    priorities,
    statuses,
    serviceTypes,
    pagination,
    loading,
    filters,
    createWorkQuery,
    deleteWorkQuery,
    fetchWorkQueries,
    fetchStatistics,
    updateFilters,
    changePage,
    changeLimit
  };
};