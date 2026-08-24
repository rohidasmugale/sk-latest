// hooks/useWorkQuery.ts
import { useState, useEffect, useCallback } from 'react';
import { workQueryApi, WorkQuery, Statistics, SuperadminStatistics, Category, Priority, Status, ServiceType, Pagination } from '@/services/workQueryApi';
import { toast } from 'sonner';

interface UseWorkQueryProps {
  supervisorId?: string; // optional now: undefined = superadmin mode
  autoFetch?: boolean;
  initialFilters?: {
    search?: string;
    status?: string;
    priority?: string;
    serviceType?: string;
    supervisorId?: string; // used only in superadmin mode, to filter by a specific supervisor
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
};

export const useWorkQuery = ({ supervisorId, autoFetch = true, initialFilters = {} }: UseWorkQueryProps) => {
  const [workQueries, setWorkQueries] = useState<WorkQuery[]>([]);
  const [statistics, setStatistics] = useState<Statistics | SuperadminStatistics | null>(null);
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

  // true = supervisor mode (scoped to one supervisor), false = superadmin mode (all queries)
  const isSupervisorMode = !!supervisorId;

  // ---- Fetch work queries ----
  const fetchWorkQueries = useCallback(async () => {
    setLoading(prev => ({ ...prev, queries: true }));
    try {
      const response = isSupervisorMode
        ? await workQueryApi.getAllWorkQueries({
            supervisorId: supervisorId!,
            ...filters,
            page: pagination.page,
            limit: pagination.limit
          })
        : await workQueryApi.getAllWorkQueriesForSuperadmin({
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
  }, [isSupervisorMode, supervisorId, filters, pagination.page, pagination.limit]);

  // ---- Fetch statistics ----
  const fetchStatistics = useCallback(async () => {
    setLoading(prev => ({ ...prev, statistics: true }));
    try {
      const response = isSupervisorMode
        ? await workQueryApi.getStatistics(supervisorId!)
        : await workQueryApi.getSuperadminStatistics();

      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(prev => ({ ...prev, statistics: false }));
    }
  }, [isSupervisorMode, supervisorId]);

  // ---- Fetch static lookups (categories/priorities/statuses/serviceTypes) ----
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

  // ---- Create work query (supervisor only, with optional image upload) ----
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
        const formData = new FormData();
        formData.append('data', JSON.stringify(data));
        files.forEach((file) => {
          formData.append('images', file);
        });

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

        response = await fetchResponse.json();
      } else {
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

  // ---- Delete work query (supervisor only) ----
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

  // ---- Respond to / resolve / reject a work query (superadmin only) ----
  const respondToWorkQuery = useCallback(async (
    id: string,
    status: WorkQuery['status'],
    superadminResponse: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(prev => ({ ...prev, updating: true }));
    try {
      const response = await workQueryApi.updateWorkQueryResponse(id, status, superadminResponse);
      if (response.success) {
        toast.success(`Query ${status} successfully`);
        await fetchWorkQueries();
        await fetchStatistics();
        return { success: true };
      } else {
        toast.error(response.message || 'Failed to update query');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Error responding to work query:', error);
      toast.error(getErrorMessage(error) || 'Failed to update query');
      return { success: false, error: getErrorMessage(error) };
    } finally {
      setLoading(prev => ({ ...prev, updating: false }));
    }
  }, [fetchWorkQueries, fetchStatistics]);

  // ---- Filters / pagination helpers ----
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const changePage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const changeLimit = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  // ---- Auto fetch ----
  // Runs once on mount (and whenever supervisorId flips between a value and undefined,
  // e.g. if the same page is reused across a role switch).
  useEffect(() => {
    if (autoFetch) {
      fetchStaticData();
      fetchWorkQueries();
      fetchStatistics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, isSupervisorMode, supervisorId]);

  // Runs whenever filters or pagination change (search, status filter, page click, etc.)
  useEffect(() => {
    if (autoFetch) {
      fetchWorkQueries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    respondToWorkQuery,
    fetchWorkQueries,
    fetchStatistics,
    updateFilters,
    changePage,
    changeLimit
  };
};