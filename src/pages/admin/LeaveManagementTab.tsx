import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Paperclip, 
  Download, 
  Eye, 
  Building, 
  User, 
  Calendar, 
  Clock, 
  Filter, 
  Loader2, 
  AlertCircle,
  Search,
  RefreshCw,
  FileText,
  Users,
  Check,
  X,
  Shield,
  Crown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Save,
  RotateCcw,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  UserCog,
  Menu,
  MoreVertical,
  LogOut
} from "lucide-react";
import { toast } from "sonner";
import { LeaveRequest } from "./types";
import StatCard from "./StatCard";
import Pagination from "./Pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRole } from "@/context/RoleContext";

interface LeaveManagementTabProps {
  leaveRequests: LeaveRequest[];
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
}

interface ApiLeaveRequest {
  _id: string;
  id?: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedBy: string;
  appliedFor: string;
  createdAt: string;
  contactNumber: string;
  remarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  managerRemarks?: string;
  emergencyContact?: string;
  handoverTo?: string;
  handoverCompleted?: boolean;
  handoverRemarks?: string;
  attachmentUrl?: string;
  requestType?: 'employee' | 'supervisor' | 'manager' | 'admin-leave';
  isManagerLeave?: boolean;
  isSupervisorLeave?: boolean;
  isAdminLeave?: boolean;
  managerId?: string;
  managerName?: string;
  managerDepartment?: string;
  managerContact?: string;
  managerEmail?: string;
  managerPosition?: string;
  supervisorId?: string;
  adminId?: string;
  adminName?: string;
  adminDepartment?: string;
  adminContact?: string;
  adminEmail?: string;
  adminPosition?: string;
}

interface ApiManagerLeaveRequest {
  _id: string;
  id?: string;
  managerId: string;
  managerName: string;
  managerDepartment: string;
  managerPosition: string;
  managerEmail: string;
  managerContact: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  appliedBy: string;
  appliedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  superadminRemarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  requestType: 'manager-leave';
  isManagerLeave: boolean;
  isAdminLeave?: boolean;
}

interface ApiAdminLeaveRequest {
  _id: string;
  id?: string;
  adminId: string;
  adminName: string;
  adminDepartment: string;
  adminPosition: string;
  adminEmail: string;
  adminContact: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  appliedBy: string;
  appliedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  superadminRemarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  requestType: 'admin-leave';
  isAdminLeave: boolean;
}

interface AdminInfo {
  adminId: string;
  adminName: string;
  adminDepartment: string;
  adminPosition: string;
  adminEmail: string;
  adminContact: string;
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const LeaveManagementTab = ({ leaveRequests, setLeaveRequests }: LeaveManagementTabProps) => {
  const { user } = useRole();
  const [activeTab, setActiveTab] = useState<string>("supervisor-employee");
  
  // Admin info for applying leave
  const [adminInfo, setAdminInfo] = useState<AdminInfo>({
    adminId: '',
    adminName: '',
    adminDepartment: '',
    adminPosition: '',
    adminEmail: '',
    adminContact: ''
  });
  
  // For supervisor/employee leaves
  const [supervisorEmployeeLeaves, setSupervisorEmployeeLeaves] = useState<ApiLeaveRequest[]>([]);
  const [supervisorEmployeeStats, setSupervisorEmployeeStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  });
  
  // For manager leaves
  const [managerLeaves, setManagerLeaves] = useState<ApiManagerLeaveRequest[]>([]);
  const [managerStats, setManagerStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  });
  
  // For admin leaves
  const [adminLeaves, setAdminLeaves] = useState<ApiAdminLeaveRequest[]>([]);
  const [adminStats, setAdminStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<(ApiLeaveRequest | ApiManagerLeaveRequest | ApiAdminLeaveRequest) | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLeaveForEdit, setSelectedLeaveForEdit] = useState<ApiAdminLeaveRequest | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Apply form state
  const [applyFormData, setApplyFormData] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [applyFormErrors, setApplyFormErrors] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [editFormErrors, setEditFormErrors] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile view state
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Initialize admin info from user context
  useEffect(() => {
    if (user) {
      setAdminInfo({
        adminId: user._id || user.id || '',
        adminName: user.name || 'Admin',
        adminDepartment: user.department || 'Administration',
        adminPosition: user.position || 'Admin',
        adminEmail: user.email || '',
        adminContact: user.phone || user.contactNumber || ''
      });
      
      setApplyFormData(prev => ({
        ...prev,
        appliedBy: user.name || 'Admin'
      }));
    }
  }, [user]);

  // Helper function to extract array from API response
  const extractArrayFromResponse = (data: any): any[] => {
    if (Array.isArray(data)) {
      return data;
    } else if (data?.data && Array.isArray(data.data)) {
      return data.data;
    } else if (data?.leaves && Array.isArray(data.leaves)) {
      return data.leaves;
    } else if (data?.results && Array.isArray(data.results)) {
      return data.results;
    } else if (data?.items && Array.isArray(data.items)) {
      return data.items;
    } else if (data && typeof data === 'object') {
      // Try to find any array property
      for (const key in data) {
        if (Array.isArray(data[key])) {
          return data[key];
        }
      }
    }
    return [];
  };

  // IMPROVED: Helper functions to identify leave types with better detection
  const isManagerLeave = (leave: any): boolean => {
    // Check by explicit flags first
    if (leave.isManagerLeave === true) return true;
    if (leave.requestType === 'manager-leave') return true;
    
    // Check by presence of manager-specific fields
    if (leave.managerId) return true;
    if (leave.managerName) return true;
    
    // Check if it's from manager collection (has manager-specific fields)
    if (leave.managerDepartment && leave.managerPosition) return true;
    
    return false;
  };

  const isAdminLeave = (leave: any): boolean => {
    // Check by explicit flags first
    if (leave.isAdminLeave === true) return true;
    if (leave.requestType === 'admin-leave') return true;
    
    // Check by presence of admin-specific fields
    if (leave.adminId) return true;
    if (leave.adminName) return true;
    
    // Check if it's from admin collection
    if (leave.adminDepartment && leave.adminPosition) return true;
    
    return false;
  };

  const isSupervisorLeave = (leave: any): boolean => {
    // Check by explicit flags
    if (leave.isSupervisorLeave === true) return true;
    
    // Check if applied by supervisor
    if (leave.appliedBy && leave.appliedBy.toLowerCase().includes('supervisor')) return true;
    if (leave.employeeName && leave.employeeName.toLowerCase().includes('supervisor')) return true;
    
    // Check by supervisor field
    if (leave.supervisorId) return true;
    
    return false;
  };

  const isEmployeeLeave = (leave: any): boolean => {
    // If it's not manager, not admin, and not supervisor, it's an employee
    return !isManagerLeave(leave) && !isAdminLeave(leave) && !isSupervisorLeave(leave);
  };

  // Check if the leave belongs to the current admin
  const isOwnLeave = (leave: any): boolean => {
    if (isAdminLeave(leave)) {
      return leave.adminId === adminInfo.adminId;
    }
    return false;
  };

  // Fetch supervisor and employee leaves
  const fetchSupervisorEmployeeLeaves = async (page = 1) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/leaves?limit=1000`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leave requests');
      }
      
      const data = await response.json();
      console.log('Supervisor/Employee API response:', data);
      
      // Extract array from response
      const allLeaves = extractArrayFromResponse(data);
      
      // Filter for supervisor/employee leaves (not manager, not admin)
      const filteredLeaves = allLeaves.filter((leave: any) => {
        // Skip manager and admin leaves
        if (isManagerLeave(leave)) return false;
        if (isAdminLeave(leave)) return false;
        
        // Apply status filter
        if (statusFilter !== 'all' && leave.status !== statusFilter) return false;
        
        // Apply department filter
        if (departmentFilter !== 'all' && leave.department !== departmentFilter) return false;
        
        // Apply search filter
        if (searchQuery) {
          const matchesId = leave.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesName = leave.employeeName?.toLowerCase().includes(searchQuery.toLowerCase());
          if (!matchesId && !matchesName) return false;
        }
        
        return true;
      });
      
      // Apply pagination client-side
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);
      
      setSupervisorEmployeeLeaves(paginatedLeaves);
      
      // Calculate stats
      const stats = {
        total: filteredLeaves.length,
        pending: filteredLeaves.filter((l: any) => l.status === 'pending').length,
        approved: filteredLeaves.filter((l: any) => l.status === 'approved').length,
        rejected: filteredLeaves.filter((l: any) => l.status === 'rejected').length,
        cancelled: filteredLeaves.filter((l: any) => l.status === 'cancelled').length
      };
      
      setSupervisorEmployeeStats(stats);
      setTotalItems(filteredLeaves.length);
      setTotalPages(Math.ceil(filteredLeaves.length / itemsPerPage));
      setCurrentPage(page);
      
    } catch (error) {
      console.error("Error fetching supervisor/employee leaves:", error);
      toast.error("Failed to load leave requests");
      setSupervisorEmployeeLeaves([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch manager leaves
 // Fetch manager leaves
const fetchManagerLeaves = async (page = 1) => {
  try {
    setIsLoading(true);
    
    const response = await fetch(
      `${API_URL}/manager-leaves/admin/all?status=${
        statusFilter === 'all' ? '' : statusFilter
      }&page=${page}&limit=${itemsPerPage}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch manager leaves');
    }
    
    const data = await response.json();
    console.log('Manager leaves API response:', data);
    
    if (data.success) {
      const transformedLeaves = (data.leaves || []).map((leave: any) => ({
        ...leave,
        type: 'manager',
        appliedDate: leave.appliedDate || leave.createdAt,
        contactNumber: leave.managerContact || leave.contactNumber || 'N/A',
        employeeId: leave.managerId || leave.employeeId,
        employeeName: leave.managerName || leave.employeeName,
        department: leave.managerDepartment || leave.department,
        isManagerLeave: true,
        // Map adminRemarks to a consistent field
        remarks: leave.adminRemarks || leave.remarks
      }));
      
      // Apply filters
      let filteredLeaves = transformedLeaves;
      
      if (searchQuery) {
        filteredLeaves = filteredLeaves.filter((leave: any) => 
          leave.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          leave.managerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          leave.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          leave.managerId?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      if (departmentFilter !== 'all') {
        filteredLeaves = filteredLeaves.filter((leave: any) => 
          leave.managerDepartment === departmentFilter || leave.department === departmentFilter
        );
      }
      
      if (statusFilter !== 'all') {
        filteredLeaves = filteredLeaves.filter((leave: any) => leave.status === statusFilter);
      }
      
      setManagerLeaves(filteredLeaves);
      setManagerStats(data.stats || {
        total: filteredLeaves.length,
        pending: filteredLeaves.filter((l: any) => l.status === 'pending').length,
        approved: filteredLeaves.filter((l: any) => l.status === 'approved').length,
        rejected: filteredLeaves.filter((l: any) => l.status === 'rejected').length,
        cancelled: filteredLeaves.filter((l: any) => l.status === 'cancelled').length
      });
      setTotalItems(data.pagination?.total || filteredLeaves.length);
      setTotalPages(data.pagination?.pages || Math.ceil(filteredLeaves.length / itemsPerPage));
      setCurrentPage(page);
    } else {
      throw new Error(data.message || 'Failed to fetch manager leaves');
    }
    
  } catch (error) {
    console.error("Error fetching manager leaves:", error);
    toast.error("Failed to load manager leaves");
    setManagerLeaves([]);
  } finally {
    setIsLoading(false);
  }
};

// Fetch admin leaves
const fetchAdminLeaves = async (page = 1) => {
  try {
    setIsLoading(true);
    
    const response = await fetch(
      `${API_URL}/admin-leaves/admin/all?status=${
        statusFilter === 'all' ? '' : statusFilter
      }&page=${page}&limit=${itemsPerPage}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch admin leaves');
    }
    
    const data = await response.json();
    console.log('Admin leaves API response:', data);
    
    if (data.success) {
      const transformedLeaves = (data.leaves || []).map((leave: any) => ({
        ...leave,
        type: 'admin',
        appliedDate: leave.appliedDate || leave.createdAt,
        contactNumber: leave.adminContact || leave.contactNumber || 'N/A',
        employeeId: leave.adminId || leave.employeeId,
        employeeName: leave.adminName || leave.employeeName,
        department: leave.adminDepartment || leave.department,
        isAdminLeave: true,
        // Map adminRemarks to a consistent field
        remarks: leave.adminRemarks || leave.remarks
      }));
      
      // Apply filters
      let filteredLeaves = transformedLeaves;
      
      if (searchQuery) {
        filteredLeaves = filteredLeaves.filter((leave: any) => 
          leave.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          leave.adminName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          leave.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          leave.adminId?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      if (departmentFilter !== 'all') {
        filteredLeaves = filteredLeaves.filter((leave: any) => 
          leave.adminDepartment === departmentFilter || leave.department === departmentFilter
        );
      }
      
      if (statusFilter !== 'all') {
        filteredLeaves = filteredLeaves.filter((leave: any) => leave.status === statusFilter);
      }
      
      setAdminLeaves(filteredLeaves);
      setAdminStats(data.stats || {
        total: filteredLeaves.length,
        pending: filteredLeaves.filter((l: any) => l.status === 'pending').length,
        approved: filteredLeaves.filter((l: any) => l.status === 'approved').length,
        rejected: filteredLeaves.filter((l: any) => l.status === 'rejected').length,
        cancelled: filteredLeaves.filter((l: any) => l.status === 'cancelled').length
      });
      setTotalItems(data.pagination?.total || filteredLeaves.length);
      setTotalPages(data.pagination?.pages || Math.ceil(filteredLeaves.length / itemsPerPage));
      setCurrentPage(page);
    } else {
      throw new Error(data.message || 'Failed to fetch admin leaves');
    }
    
  } catch (error) {
    console.error("Error fetching admin leaves:", error);
    toast.error("Failed to load admin leaves");
    setAdminLeaves([]);
  } finally {
    setIsLoading(false);
  }
};

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "supervisor-employee") {
      fetchSupervisorEmployeeLeaves(1);
    } else if (activeTab === "manager") {
      fetchManagerLeaves(1);
    } else if (activeTab === "admin") {
      fetchAdminLeaves(1);
    }
  }, [activeTab, itemsPerPage]);

  // Handle filter changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "supervisor-employee") {
        fetchSupervisorEmployeeLeaves(1);
      } else if (activeTab === "manager") {
        fetchManagerLeaves(1);
      } else if (activeTab === "admin") {
        fetchAdminLeaves(1);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [statusFilter, departmentFilter, searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (activeTab === "supervisor-employee") {
      fetchSupervisorEmployeeLeaves(page);
    } else if (activeTab === "manager") {
      fetchManagerLeaves(page);
    } else if (activeTab === "admin") {
      fetchAdminLeaves(page);
    }
  };

  // Handle leave action (approve/reject) - Only for non-admin leaves
  const handleLeaveAction = async (leave: any, action: "approved" | "rejected") => {
    // Prevent admin from approving/rejecting their own leave
    if (isOwnLeave(leave)) {
      toast.error("You cannot approve or reject your own leave request");
      return;
    }

    try {
      setIsUpdating(true);
      setSelectedLeave(leave);
      
      let response;
      let endpoint = '';
      let requestBody = {};
      
      const leaveId = leave._id || leave.id || '';
      
      // Determine correct endpoint based on leave type
    // In handleLeaveAction function, update the requestBody for manager and admin leaves:

if (isAdminLeave(leave)) {
  endpoint = `${API_URL}/admin-leaves/admin/${leaveId}/status`; // Changed from superadmin
  requestBody = {
    status: action,
    [action === 'approved' ? 'approvedBy' : 'rejectedBy']: adminInfo.adminName || 'Admin',
    adminRemarks: remarks || `${action} by ${adminInfo.adminName || 'Admin'}`
  };
} else if (isManagerLeave(leave)) {
  endpoint = `${API_URL}/manager-leaves/admin/${leaveId}/status`; // Changed from superadmin
  requestBody = {
    status: action,
    [action === 'approved' ? 'approvedBy' : 'rejectedBy']: adminInfo.adminName || 'Admin',
    adminRemarks: remarks || `${action} by ${adminInfo.adminName || 'Admin'}`
  };
} else {
  endpoint = `${API_URL}/leaves/${leaveId}/status`;
  requestBody = { 
    status: action,
    approvedBy: action === 'approved' ? adminInfo.adminName || 'Admin' : undefined,
    rejectedBy: action === 'rejected' ? adminInfo.adminName || 'Admin' : undefined,
    remarks: remarks || `${action} by ${adminInfo.adminName || 'Admin'}`
  };
}

      console.log(`Updating leave at ${endpoint}`, requestBody);
      console.log('Leave type:', isAdminLeave(leave) ? 'Admin' : isManagerLeave(leave) ? 'Manager' : 'Employee/Supervisor');
      
      response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to update leave status';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Update local state based on active tab and leave type
      if (activeTab === "supervisor-employee") {
        setSupervisorEmployeeLeaves(prev => 
          prev.map(l => {
            const lId = l._id || l.id;
            if (lId === leaveId) {
              return { 
                ...l, 
                status: action,
                approvedBy: action === 'approved' ? adminInfo.adminName || 'Admin' : undefined,
                rejectedBy: action === 'rejected' ? adminInfo.adminName || 'Admin' : undefined,
                approvedAt: action === 'approved' ? new Date().toISOString() : undefined,
                rejectedAt: action === 'rejected' ? new Date().toISOString() : undefined,
                remarks: remarks || `${action} by ${adminInfo.adminName || 'Admin'}`
              };
            }
            return l;
          })
        );
        
        setSupervisorEmployeeStats(prev => {
          const newStats = { ...prev };
          if (action === 'approved') {
            newStats.approved++;
            newStats.pending--;
          } else if (action === 'rejected') {
            newStats.rejected++;
            newStats.pending--;
          }
          return newStats;
        });
      } else if (activeTab === "manager") {
        setManagerLeaves(prev => 
          prev.map(l => {
            const lId = l._id || l.id;
            if (lId === leaveId) {
              return { 
                ...l, 
                status: action,
                approvedBy: action === 'approved' ? adminInfo.adminName || 'Admin' : undefined,
                rejectedBy: action === 'rejected' ? adminInfo.adminName || 'Admin' : undefined,
                approvedAt: action === 'approved' ? new Date().toISOString() : undefined,
                rejectedAt: action === 'rejected' ? new Date().toISOString() : undefined,
                superadminRemarks: remarks || `${action} by ${adminInfo.adminName || 'Admin'}`
              };
            }
            return l;
          })
        );
        
        setManagerStats(prev => {
          const newStats = { ...prev };
          if (action === 'approved') {
            newStats.approved++;
            newStats.pending--;
          } else if (action === 'rejected') {
            newStats.rejected++;
            newStats.pending--;
          }
          return newStats;
        });
      } else if (activeTab === "admin") {
        // When in admin tab, update adminLeaves
        setAdminLeaves(prev => 
          prev.map(l => {
            const lId = l._id || l.id;
            if (lId === leaveId) {
              return { 
                ...l, 
                status: action,
                approvedBy: action === 'approved' ? adminInfo.adminName || 'Admin' : undefined,
                rejectedBy: action === 'rejected' ? adminInfo.adminName || 'Admin' : undefined,
                approvedAt: action === 'approved' ? new Date().toISOString() : undefined,
                rejectedAt: action === 'rejected' ? new Date().toISOString() : undefined,
                superadminRemarks: remarks || `${action} by ${adminInfo.adminName || 'Admin'}`
              };
            }
            return l;
          })
        );
        
        setAdminStats(prev => {
          const newStats = { ...prev };
          if (action === 'approved') {
            newStats.approved++;
            newStats.pending--;
          } else if (action === 'rejected') {
            newStats.rejected++;
            newStats.pending--;
          }
          return newStats;
        });
      }

      toast.success(data.message || `Leave request ${action} successfully!`);
      setViewDialogOpen(false);
      setRemarks("");
      
      // Refresh the list
      if (activeTab === "supervisor-employee") {
        fetchSupervisorEmployeeLeaves(currentPage);
      } else if (activeTab === "manager") {
        fetchManagerLeaves(currentPage);
      } else if (activeTab === "admin") {
        fetchAdminLeaves(currentPage);
      }
    } catch (error: any) {
      console.error("Error updating leave status:", error);
      toast.error(error.message || "Failed to update leave status");
    } finally {
      setIsUpdating(false);
      setSelectedLeave(null);
    }
  };

  // Handle revert to pending - Only for non-admin leaves
  const handleRevertToPending = async (leave: any) => {
    // Prevent admin from reverting their own leave
    if (isOwnLeave(leave)) {
      toast.error("You cannot revert your own leave request");
      return;
    }

    try {
      setIsUpdating(true);
      setSelectedLeave(leave);
      
      let response;
      let endpoint = '';
      let requestBody = {};
      
      const leaveId = leave._id || leave.id || '';
      
      // Determine correct endpoint based on leave type
      // In handleRevertToPending function:
if (isAdminLeave(leave)) {
  endpoint = `${API_URL}/admin-leaves/admin/${leaveId}/revert`; // Changed from superadmin
  requestBody = {
    remarks: remarks || 'Reverted to pending',
    revertedBy: adminInfo.adminName || 'Admin'
  };
} else if (isManagerLeave(leave)) {
  endpoint = `${API_URL}/manager-leaves/admin/${leaveId}/revert`; // Changed from superadmin
  requestBody = {
    remarks: remarks || 'Reverted to pending',
    revertedBy: adminInfo.adminName || 'Admin'
  };
} else {
  endpoint = `${API_URL}/leaves/${leaveId}/status`;
  requestBody = { 
    status: 'pending',
    remarks: remarks || `Reverted to pending by ${adminInfo.adminName || 'Admin'}`,
    revertedBy: adminInfo.adminName || 'Admin'
  };
}
      console.log(`Reverting leave at ${endpoint}`, requestBody);
      
      response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to revert leave status';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Update local state based on active tab
      if (activeTab === "supervisor-employee") {
        setSupervisorEmployeeLeaves(prev => 
          prev.map(l => {
            const lId = l._id || l.id;
            if (lId === leaveId) {
              return { 
                ...l, 
                status: 'pending',
                approvedBy: undefined,
                rejectedBy: undefined,
                approvedAt: undefined,
                rejectedAt: undefined,
                remarks: remarks || `Reverted to pending by ${adminInfo.adminName || 'Admin'}`
              };
            }
            return l;
          })
        );
        
        setSupervisorEmployeeStats(prev => {
          const newStats = { ...prev };
          if (leave.status === 'approved') {
            newStats.approved--;
            newStats.pending++;
          } else if (leave.status === 'rejected') {
            newStats.rejected--;
            newStats.pending++;
          }
          return newStats;
        });
      } else if (activeTab === "manager") {
        setManagerLeaves(prev => 
          prev.map(l => {
            const lId = l._id || l.id;
            if (lId === leaveId) {
              return { 
                ...l, 
                status: 'pending',
                approvedBy: undefined,
                rejectedBy: undefined,
                approvedAt: undefined,
                rejectedAt: undefined,
                superadminRemarks: remarks || `Reverted to pending by ${adminInfo.adminName || 'Admin'}`
              };
            }
            return l;
          })
        );
        
        setManagerStats(prev => {
          const newStats = { ...prev };
          if (leave.status === 'approved') {
            newStats.approved--;
            newStats.pending++;
          } else if (leave.status === 'rejected') {
            newStats.rejected--;
            newStats.pending++;
          }
          return newStats;
        });
      } else if (activeTab === "admin") {
        setAdminLeaves(prev => 
          prev.map(l => {
            const lId = l._id || l.id;
            if (lId === leaveId) {
              return { 
                ...l, 
                status: 'pending',
                approvedBy: undefined,
                rejectedBy: undefined,
                approvedAt: undefined,
                rejectedAt: undefined,
                superadminRemarks: remarks || `Reverted to pending by ${adminInfo.adminName || 'Admin'}`
              };
            }
            return l;
          })
        );
        
        setAdminStats(prev => {
          const newStats = { ...prev };
          if (leave.status === 'approved') {
            newStats.approved--;
            newStats.pending++;
          } else if (leave.status === 'rejected') {
            newStats.rejected--;
            newStats.pending++;
          }
          return newStats;
        });
      }

      toast.success(data.message || 'Leave request reverted to pending successfully!');
      setViewDialogOpen(false);
      setRemarks("");
      
      // Refresh the list
      if (activeTab === "supervisor-employee") {
        fetchSupervisorEmployeeLeaves(currentPage);
      } else if (activeTab === "manager") {
        fetchManagerLeaves(currentPage);
      } else if (activeTab === "admin") {
        fetchAdminLeaves(currentPage);
      }
    } catch (error: any) {
      console.error("Error reverting leave:", error);
      toast.error(error.message || "Failed to revert leave status");
    } finally {
      setIsUpdating(false);
      setSelectedLeave(null);
    }
  };

  // Handle apply for admin leave
  const validateApplyForm = (): boolean => {
    const errors = {
      leaveType: '',
      fromDate: '',
      toDate: '',
      reason: ''
    };
    
    let isValid = true;
    
    if (!applyFormData.leaveType) {
      errors.leaveType = 'Please select leave type';
      isValid = false;
    }
    
    if (!applyFormData.fromDate) {
      errors.fromDate = 'Please select from date';
      isValid = false;
    }
    
    if (!applyFormData.toDate) {
      errors.toDate = 'Please select to date';
      isValid = false;
    }
    
    if (!applyFormData.reason.trim()) {
      errors.reason = 'Please enter reason for leave';
      isValid = false;
    }
    
    setApplyFormErrors(errors);
    return isValid;
  };

  const calculateDaysBetween = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff + 1;
  };

  const handleApplyAdminLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateApplyForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const fromDate = new Date(applyFormData.fromDate);
    const toDate = new Date(applyFormData.toDate);
    
    if (fromDate > toDate) {
      toast.error('From date must be before to date');
      return;
    }

    const totalDays = calculateDaysBetween(applyFormData.fromDate, applyFormData.toDate);

    setIsSubmitting(true);
    
    try {
      const leaveData = {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminName,
        adminDepartment: adminInfo.adminDepartment,
        adminPosition: adminInfo.adminPosition,
        adminEmail: adminInfo.adminEmail,
        adminContact: adminInfo.adminContact || '0000000000',
        leaveType: applyFormData.leaveType,
        fromDate: applyFormData.fromDate,
        toDate: applyFormData.toDate,
        totalDays,
        reason: applyFormData.reason.trim(),
        appliedBy: adminInfo.adminName,
        appliedDate: new Date().toISOString()
      };

      console.log('📤 Submitting admin leave:', leaveData);

      const response = await fetch(`${API_URL}/admin-leaves/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Admin leave request submitted successfully!');
        setApplyDialogOpen(false);
        setApplyFormData({
          leaveType: '',
          fromDate: '',
          toDate: '',
          reason: ''
        });
        
        // Refresh admin leaves if on that tab
        if (activeTab === 'admin') {
          fetchAdminLeaves(currentPage);
        }
      } else {
        toast.error(data.message || 'Failed to apply for leave');
      }
    } catch (error: any) {
      console.error('❌ Error applying for admin leave:', error);
      toast.error('Failed to apply for leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit admin leave (only for own leaves)
  const handleEditAdminLeave = (leave: ApiAdminLeaveRequest) => {
    if (!isOwnLeave(leave)) {
      toast.error("You can only edit your own leave requests");
      return;
    }
    setSelectedLeaveForEdit(leave);
    setEditFormData({
      leaveType: leave.leaveType,
      fromDate: leave.fromDate.split('T')[0],
      toDate: leave.toDate.split('T')[0],
      reason: leave.reason
    });
    setEditDialogOpen(true);
  };

  const validateEditForm = (): boolean => {
    const errors = {
      leaveType: '',
      fromDate: '',
      toDate: '',
      reason: ''
    };
    
    let isValid = true;
    
    if (!editFormData.leaveType) {
      errors.leaveType = 'Please select leave type';
      isValid = false;
    }
    
    if (!editFormData.fromDate) {
      errors.fromDate = 'Please select from date';
      isValid = false;
    }
    
    if (!editFormData.toDate) {
      errors.toDate = 'Please select to date';
      isValid = false;
    }
    
    if (!editFormData.reason.trim()) {
      errors.reason = 'Please enter reason for leave';
      isValid = false;
    }
    
    setEditFormErrors(errors);
    return isValid;
  };

  const handleUpdateAdminLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLeaveForEdit) return;
    
    if (!validateEditForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const fromDate = new Date(editFormData.fromDate);
    const toDate = new Date(editFormData.toDate);
    
    if (fromDate > toDate) {
      toast.error('From date must be before to date');
      return;
    }

    const totalDays = calculateDaysBetween(editFormData.fromDate, editFormData.toDate);

    setIsSubmittingEdit(true);
    
    try {
      const response = await fetch(`${API_URL}/admin-leaves/${selectedLeaveForEdit._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType: editFormData.leaveType,
          fromDate: editFormData.fromDate,
          toDate: editFormData.toDate,
          totalDays,
          reason: editFormData.reason.trim(),
          updatedBy: adminInfo.adminName
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Leave request updated successfully!');
        setEditDialogOpen(false);
        fetchAdminLeaves(currentPage);
      } else {
        toast.error(data.message || 'Failed to update leave');
      }
    } catch (error: any) {
      console.error('Error updating leave:', error);
      toast.error('Failed to update leave');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle delete admin leave (only for own leaves)
  const handleDeleteAdminLeave = async (leaveId: string) => {
    if (!leaveId) return;
    
    setIsSubmittingDelete(true);
    
    try {
      const response = await fetch(`${API_URL}/admin-leaves/${leaveId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deletedBy: adminInfo.adminName
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Leave request deleted successfully!');
        setDeleteDialogOpen(false);
        fetchAdminLeaves(currentPage);
      } else {
        toast.error(data.message || 'Failed to delete leave');
      }
    } catch (error: any) {
      console.error('Error deleting leave:', error);
      toast.error('Failed to delete leave');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "approved": return "default";
      case "rejected": return "destructive";
      case "pending": return "secondary";
      case "cancelled": return "outline";
      default: return "outline";
    }
  };

  const getRequestTypeBadge = (leave: any) => {
    if (isAdminLeave(leave)) {
      return (
        <Badge variant="default" className="bg-purple-600 text-xs sm:text-sm">
          <Crown className="h-3 w-3 mr-1 inline-block" />
          <span className="hidden sm:inline">Admin</span>
          <span className="sm:hidden">A</span>
        </Badge>
      );
    }
    
    if (isManagerLeave(leave)) {
      return (
        <Badge variant="default" className="bg-blue-600 text-xs sm:text-sm">
          <Shield className="h-3 w-3 mr-1 inline-block" />
          <span className="hidden sm:inline">Manager</span>
          <span className="sm:hidden">M</span>
        </Badge>
      );
    }
    
    if (isSupervisorLeave(leave)) {
      return (
        <Badge variant="default" className="bg-green-600 text-xs sm:text-sm">
          <User className="h-3 w-3 mr-1 inline-block" />
          <span className="hidden sm:inline">Supervisor</span>
          <span className="sm:hidden">S</span>
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="bg-gray-600 text-xs sm:text-sm">
        <Users className="h-3 w-3 mr-1 inline-block" />
        <span className="hidden sm:inline">Employee</span>
        <span className="sm:hidden">E</span>
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleViewDetails = (leave: any) => {
    setSelectedLeave(leave);
    setRemarks(
      isAdminLeave(leave) 
        ? leave.superadminRemarks || "" 
        : isManagerLeave(leave)
        ? leave.superadminRemarks || ""
        : leave.remarks || ""
    );
    setViewDialogOpen(true);
  };

  const handleClearFilters = () => {
    setDepartmentFilter('all');
    setStatusFilter('pending');
    setSearchQuery('');
    if (activeTab === "supervisor-employee") {
      fetchSupervisorEmployeeLeaves(1);
    } else if (activeTab === "manager") {
      fetchManagerLeaves(1);
    } else if (activeTab === "admin") {
      fetchAdminLeaves(1);
    }
  };

  const handleRefresh = () => {
    if (activeTab === "supervisor-employee") {
      fetchSupervisorEmployeeLeaves(1);
    } else if (activeTab === "manager") {
      fetchManagerLeaves(1);
    } else if (activeTab === "admin") {
      fetchAdminLeaves(1);
    }
  };

  // Get current data based on active tab
  const getCurrentLeaves = () => {
    if (activeTab === "supervisor-employee") {
      return supervisorEmployeeLeaves;
    } else if (activeTab === "manager") {
      return managerLeaves;
    } else if (activeTab === "admin") {
      return adminLeaves;
    }
    return [];
  };

  // Get current stats based on active tab
  const getCurrentStats = () => {
    if (activeTab === "supervisor-employee") {
      return supervisorEmployeeStats;
    } else if (activeTab === "manager") {
      return managerStats;
    } else if (activeTab === "admin") {
      return adminStats;
    }
    return { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  };

  // Get display name for leave
  const getDisplayName = (leave: any) => {
    if (isManagerLeave(leave) && leave.managerName) {
      return leave.managerName;
    }
    if (isAdminLeave(leave) && leave.adminName) {
      return leave.adminName;
    }
    return leave.employeeName || leave.name || 'N/A';
  };

  // Get display ID for leave
  const getDisplayId = (leave: any) => {
    if (isManagerLeave(leave) && leave.managerId) {
      return leave.managerId;
    }
    if (isAdminLeave(leave) && leave.adminId) {
      return leave.adminId;
    }
    return leave.employeeId || leave.id || 'N/A';
  };

  // Get display department for leave
  const getDisplayDepartment = (leave: any) => {
    if (isManagerLeave(leave) && leave.managerDepartment) {
      return leave.managerDepartment;
    }
    if (isAdminLeave(leave) && leave.adminDepartment) {
      return leave.adminDepartment;
    }
    return leave.department || 'N/A';
  };

  // Toggle row expansion on mobile
  const toggleRowExpansion = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Render mobile card view
  const renderMobileLeaveCard = (leave: any) => {
    const isExpanded = expandedRow === (leave._id || leave.id);
    const leaveId = leave._id || leave.id || '';
    const isOwnAdminLeave = isAdminLeave(leave) && leave.adminId === adminInfo.adminId;
    const canRevert = (leave.status === 'approved' || leave.status === 'rejected') && !isOwnLeave(leave);
    const canApproveReject = leave.status === 'pending' && !isOwnLeave(leave);
    
    return (
      <div key={leaveId} className="border rounded-lg p-4 mb-3 bg-white shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {getRequestTypeBadge(leave)}
            <Badge variant={getStatusColor(leave.status)} className="capitalize text-xs">
              {leave.status}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => toggleRowExpansion(leaveId)}
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{getDisplayName(leave)}</p>
              <p className="text-xs text-muted-foreground">ID: {getDisplayId(leave)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate">{getDisplayDepartment(leave)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">{formatDate(leave.fromDate)} - {formatDate(leave.toDate)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">{leave.totalDays} days</span>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 pt-3 border-t space-y-3">
            <div className="text-sm">
              <span className="font-medium">Leave Type:</span>{" "}
              <Badge variant="outline" className="capitalize ml-1">
                {leave.leaveType}
              </Badge>
            </div>
            
            <div className="text-sm">
              <span className="font-medium">Applied by:</span> {leave.appliedBy || 'N/A'}
            </div>
            
            {leave.reason && (
              <div className="text-sm">
                <span className="font-medium">Reason:</span>
                <p className="mt-1 text-muted-foreground bg-muted/30 p-2 rounded">
                  {leave.reason.length > 100 
                    ? `${leave.reason.substring(0, 100)}...` 
                    : leave.reason}
                </p>
              </div>
            )}
            
            <div className="flex flex-col gap-2 mt-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleViewDetails(leave)}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              
              {canApproveReject && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => handleLeaveAction(leave, "approved")}
                    disabled={isUpdating}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isUpdating && selectedLeave && (selectedLeave._id || selectedLeave.id) === leaveId ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleLeaveAction(leave, "rejected")}
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    {isUpdating && selectedLeave && (selectedLeave._id || selectedLeave.id) === leaveId ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <X className="mr-1 h-3 w-3" />
                    )}
                    Reject
                  </Button>
                </div>
              )}
              
              {canRevert && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRevertToPending(leave)}
                  disabled={isUpdating}
                  className="w-full bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-800"
                >
                  {isUpdating && selectedLeave && (selectedLeave._id || selectedLeave.id) === leaveId ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1 h-3 w-3" />
                  )}
                  Revert to Pending
                </Button>
              )}
              
              {isOwnAdminLeave && leave.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditAdminLeave(leave)}
                    className="flex-1 text-blue-600"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedLeaveForEdit(leave);
                      setDeleteDialogOpen(true);
                    }}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Admin Info and Apply Button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                {adminInfo.adminName}
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="default" className="text-sm capitalize">
                  Admin
                </Badge>
                {adminInfo.adminDepartment && (
                  <Badge variant="outline" className="text-sm">
                    <Building className="h-3 w-3 mr-1" />
                    {adminInfo.adminDepartment}
                  </Badge>
                )}
                {adminInfo.adminEmail && (
                  <Badge variant="outline" className="text-sm">
                    <Mail className="h-3 w-3 mr-1" />
                    {adminInfo.adminEmail}
                  </Badge>
                )}
                {adminInfo.adminContact && (
                  <Badge variant="outline" className="text-sm">
                    <Phone className="h-3 w-3 mr-1" />
                    {adminInfo.adminContact}
                  </Badge>
                )}
              </div>
            </div>
            
            <Button 
              variant="default" 
              size="lg" 
              onClick={() => setApplyDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Apply for Leave
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for switching between leave types */}
      <Tabs defaultValue="supervisor-employee" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="supervisor-employee" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Employees & Supervisors</span>
            <span className="xs:hidden">E&S</span>
            <Badge variant="secondary" className="ml-0 sm:ml-2 text-xs">
              {supervisorEmployeeStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="manager" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Managers</span>
            <span className="xs:hidden">M</span>
            <Badge variant="secondary" className="ml-0 sm:ml-2 text-xs">
              {managerStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3">
            <Crown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Admins</span>
            <span className="xs:hidden">A</span>
            <Badge variant="secondary" className="ml-0 sm:ml-2 text-xs">
              {adminStats.total}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Stats Cards for each tab */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
          <StatCard 
            title="Total" 
            value={getCurrentStats().total}
            icon={<Users className="h-3 w-3 sm:h-4 sm:w-4" />}
            className="text-xs sm:text-sm"
          />
          <StatCard 
            title="Pending" 
            value={getCurrentStats().pending} 
            className="text-yellow-600 text-xs sm:text-sm" 
            icon={<AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
          />
          <StatCard 
            title="Approved" 
            value={getCurrentStats().approved} 
            className="text-green-600 text-xs sm:text-sm" 
            icon={<CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
          />
          <StatCard 
            title="Rejected" 
            value={getCurrentStats().rejected} 
            className="text-red-600 text-xs sm:text-sm" 
            icon={<XCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
          />
          <StatCard 
            title="Cancelled" 
            value={getCurrentStats().cancelled} 
            className="text-gray-600 text-xs sm:text-sm col-span-2 sm:col-span-1" 
            icon={<XCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
          />
        </div>
      </Tabs>

      {/* Filters Card */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <CardTitle className="text-sm sm:text-base">
              {activeTab === "supervisor-employee" 
                ? "Employee & Supervisor Leave Requests" 
                : activeTab === "manager"
                ? "Manager Leave Requests"
                : "Admin Leave Requests"}
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-8 sm:h-9"
              >
                {isLoading ? (
                  <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                )}
                <span className="hidden xs:inline">Refresh</span>
                <span className="xs:hidden">Sync</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearFilters}
                className="flex-1 sm:flex-initial text-xs sm:text-sm h-8 sm:h-9"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={
                  activeTab === "supervisor-employee" 
                    ? "Search by Employee ID or Name..." 
                    : activeTab === "manager"
                    ? "Search by Manager Name..."
                    : "Search by Admin Name..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-xs sm:text-sm h-8 sm:h-10"
              />
              <Button 
                size="sm" 
                className="h-8 sm:h-10 px-2 sm:px-4"
                onClick={() => {
                  if (activeTab === "supervisor-employee") {
                    fetchSupervisorEmployeeLeaves(1);
                  } else if (activeTab === "manager") {
                    fetchManagerLeaves(1);
                  } else if (activeTab === "admin") {
                    fetchAdminLeaves(1);
                  }
                }}
              >
                <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {activeTab === "supervisor-employee" && (
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="department" className="text-xs sm:text-sm">Department</Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Consumables Management">Consumables Management</SelectItem>
                      <SelectItem value="Housekeeping Management">Housekeeping Management</SelectItem>
                      <SelectItem value="Security Management">Security Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeTab === "manager" && (
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="department" className="text-xs sm:text-sm">Manager Department</Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Consumables Management">Consumables Management</SelectItem>
                      <SelectItem value="Housekeeping Management">Housekeeping Management</SelectItem>
                      <SelectItem value="Security Management">Security Management</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeTab === "admin" && (
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="department" className="text-xs sm:text-sm">Admin Department</Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="status" className="text-xs sm:text-sm">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="all">All Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table/Cards */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <CardTitle className="text-sm sm:text-base">
              {activeTab === "supervisor-employee" 
                ? "Employee & Supervisor Leave Requests" 
                : activeTab === "manager"
                ? "Manager Leave Requests"
                : "Admin Leave Requests"}
            </CardTitle>
            <div className="text-xs sm:text-sm text-muted-foreground">
              Showing {getCurrentLeaves().length} of {totalItems} requests
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
            </div>
          ) : getCurrentLeaves().length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="font-medium text-base sm:text-lg mb-1 sm:mb-2">No Leave Requests Found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Type</TableHead>
                      <TableHead className="text-xs sm:text-sm">Name/ID</TableHead>
                      <TableHead className="text-xs sm:text-sm">Department</TableHead>
                      <TableHead className="text-xs sm:text-sm">Leave Type</TableHead>
                      <TableHead className="text-xs sm:text-sm">Dates</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getCurrentLeaves().map((leave) => {
                      const leaveId = leave._id || leave.id || '';
                      const isOwnAdminLeave = isAdminLeave(leave) && leave.adminId === adminInfo.adminId;
                      const canRevert = (leave.status === 'approved' || leave.status === 'rejected') && !isOwnLeave(leave);
                      const canApproveReject = leave.status === 'pending' && !isOwnLeave(leave);
                      
                      return (
                        <TableRow key={leaveId}>
                          <TableCell className="text-xs sm:text-sm">
                            {getRequestTypeBadge(leave)}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium">{getDisplayName(leave)}</span>
                              <span className="text-xs text-muted-foreground">
                                ID: {getDisplayId(leave)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                By: {leave.appliedBy || 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <Building className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[100px]">{getDisplayDepartment(leave)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <Badge variant="outline" className="capitalize text-xs">
                              {leave.leaveType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span>{formatDate(leave.fromDate)}</span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span>{formatDate(leave.toDate)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {leave.totalDays} days
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(leave.status)} className="capitalize text-xs">
                              {leave.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 sm:gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewDetails(leave)}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                          
                              {canApproveReject && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => handleLeaveAction(leave, "approved")}
                                    disabled={isUpdating}
                                    className="h-7 sm:h-8 px-1 sm:px-2 text-xs bg-green-600 hover:bg-green-700"
                                  >
                                    {isUpdating && selectedLeave && (selectedLeave._id || selectedLeave.id) === leaveId ? (
                                      <Loader2 className="mr-0 sm:mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="mr-0 sm:mr-1 h-3 w-3" />
                                    )}
                                    <span className="hidden sm:inline">Approve</span>
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleLeaveAction(leave, "rejected")}
                                    disabled={isUpdating}
                                    className="h-7 sm:h-8 px-1 sm:px-2 text-xs"
                                  >
                                    {isUpdating && selectedLeave && (selectedLeave._id || selectedLeave.id) === leaveId ? (
                                      <Loader2 className="mr-0 sm:mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="mr-0 sm:mr-1 h-3 w-3" />
                                    )}
                                    <span className="hidden sm:inline">Reject</span>
                                  </Button>
                                </>
                              )}
                              
                              {canRevert && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRevertToPending(leave)}
                                  disabled={isUpdating}
                                  className="h-7 sm:h-8 w-7 sm:w-8 p-0 bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-800"
                                  title="Revert to Pending"
                                >
                                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              )}
                              
                              {isOwnAdminLeave && leave.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditAdminLeave(leave)}
                                    className="h-7 sm:h-8 w-7 sm:w-8 p-0 text-blue-600"
                                  >
                                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedLeaveForEdit(leave);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {getCurrentLeaves().map((leave) => renderMobileLeaveCard(leave))}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 sm:mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Apply for Leave Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Apply for Leave (Admin)
            </DialogTitle>
            <DialogDescription>
              Submit a leave request for yourself. This will be sent to superadmin for approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyAdminLeave} className="space-y-4">
            {/* Admin Info Display */}
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Name:</span>
                  <p className="font-medium">{adminInfo.adminName}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">ID:</span>
                  <p className="font-medium">{adminInfo.adminId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Department:</span>
                  <p className="font-medium">{adminInfo.adminDepartment}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Position:</span>
                  <p className="font-medium">{adminInfo.adminPosition}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select
                value={applyFormData.leaveType}
                onValueChange={(value) => setApplyFormData(prev => ({ ...prev, leaveType: value }))}
              >
                <SelectTrigger className={applyFormErrors.leaveType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="emergency">Emergency Leave</SelectItem>
                  <SelectItem value="maternity">Maternity Leave</SelectItem>
                  <SelectItem value="paternity">Paternity Leave</SelectItem>
                  <SelectItem value="bereavement">Bereavement Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {applyFormErrors.leaveType && (
                <p className="text-xs text-red-500">{applyFormErrors.leaveType}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromDate">From Date *</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={applyFormData.fromDate}
                  onChange={(e) => setApplyFormData(prev => ({ ...prev, fromDate: e.target.value }))}
                  className={applyFormErrors.fromDate ? 'border-red-500' : ''}
                />
                {applyFormErrors.fromDate && (
                  <p className="text-xs text-red-500">{applyFormErrors.fromDate}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">To Date *</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={applyFormData.toDate}
                  onChange={(e) => setApplyFormData(prev => ({ ...prev, toDate: e.target.value }))}
                  min={applyFormData.fromDate}
                  className={applyFormErrors.toDate ? 'border-red-500' : ''}
                />
                {applyFormErrors.toDate && (
                  <p className="text-xs text-red-500">{applyFormErrors.toDate}</p>
                )}
              </div>
            </div>

            {applyFormData.fromDate && applyFormData.toDate && (
              <div className="text-sm text-muted-foreground">
                Total Days: {calculateDaysBetween(applyFormData.fromDate, applyFormData.toDate)} days
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={applyFormData.reason}
                onChange={(e) => setApplyFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Please provide a reason for leave"
                className={applyFormErrors.reason ? 'border-red-500' : ''}
                rows={3}
              />
              {applyFormErrors.reason && (
                <p className="text-xs text-red-500">{applyFormErrors.reason}</p>
              )}
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setApplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Leave Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader className="space-y-1 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg">
              {selectedLeave && isAdminLeave(selectedLeave) 
                ? "Admin Leave Request Details" 
                : selectedLeave && isManagerLeave(selectedLeave)
                ? "Manager Leave Request Details"
                : selectedLeave && isSupervisorLeave(selectedLeave)
                ? "Supervisor Leave Request Details"
                : "Employee Leave Request Details"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLeave && (
            <div className="space-y-4 sm:space-y-6">
              {/* Header with basic info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1 w-full sm:w-auto">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-sm sm:text-base">{getDisplayName(selectedLeave)}</h3>
                    {getRequestTypeBadge(selectedLeave)}
                    <Badge variant={getStatusColor(selectedLeave.status)} className="capitalize text-xs">
                      {selectedLeave.status}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground">
                    <span>ID: {getDisplayId(selectedLeave)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Dept: {getDisplayDepartment(selectedLeave)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>By: {selectedLeave.appliedBy || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h4 className="font-medium text-sm sm:text-base mb-2 flex items-center gap-2">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      Leave Dates
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">From Date:</span>
                        <span className="font-medium">{formatDate(selectedLeave.fromDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To Date:</span>
                        <span className="font-medium">{formatDate(selectedLeave.toDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Days:</span>
                        <span className="font-medium">{selectedLeave.totalDays} days</span>
                      </div>
                      {'appliedDate' in selectedLeave && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Applied Date:</span>
                          <span className="font-medium">{formatDate(selectedLeave.appliedDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin/Manager/Supervisor Specific Info */}
                  {isAdminLeave(selectedLeave) && (
                    <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                      <h4 className="font-medium text-purple-800 text-xs sm:text-sm mb-2">Admin Information</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-purple-700">Admin ID:</span>
                          <span className="font-medium">{getDisplayId(selectedLeave)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-700">Position:</span>
                          <span className="font-medium">{selectedLeave.adminPosition || 'Admin'}</span>
                        </div>
                        {selectedLeave.adminContact && (
                          <div className="flex justify-between">
                            <span className="text-purple-700">Contact:</span>
                            <span className="font-medium">{selectedLeave.adminContact}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isManagerLeave(selectedLeave) && (
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 text-xs sm:text-sm mb-2">Manager Information</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Manager ID:</span>
                          <span className="font-medium">{getDisplayId(selectedLeave)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Position:</span>
                          <span className="font-medium">{selectedLeave.managerPosition || 'Manager'}</span>
                        </div>
                        {selectedLeave.managerContact && (
                          <div className="flex justify-between">
                            <span className="text-blue-700">Contact:</span>
                            <span className="font-medium">{selectedLeave.managerContact}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isSupervisorLeave(selectedLeave) && (
                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                      <h4 className="font-medium text-green-800 text-xs sm:text-sm mb-2">Supervisor Information</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-green-700">Supervisor ID:</span>
                          <span className="font-medium">{selectedLeave.supervisorId || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h4 className="font-medium text-sm sm:text-base mb-2">Leave Information</h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Leave Type:</span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {selectedLeave.leaveType}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Applied Date:</span>
                        <span className="font-medium">
                          {'appliedDate' in selectedLeave 
                            ? formatDate(selectedLeave.appliedDate) 
                            : formatDate(selectedLeave.createdAt)}
                        </span>
                      </div>
                      {selectedLeave.approvedBy && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Approved By:</span>
                          <span className="font-medium">{selectedLeave.approvedBy}</span>
                        </div>
                      )}
                      {selectedLeave.rejectedBy && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rejected By:</span>
                          <span className="font-medium">{selectedLeave.rejectedBy}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Remarks */}
                  {(selectedLeave.superadminRemarks || selectedLeave.remarks) && (
                    <div className="mt-2">
                      <h4 className="font-medium text-xs sm:text-sm mb-1">
                        {isAdminLeave(selectedLeave) || isManagerLeave(selectedLeave) ? 'Admin Remarks:' : 'Admin Remarks:'}
                      </h4>
                      <p className="text-xs sm:text-sm p-2 bg-yellow-50 rounded border border-yellow-200">
                        {selectedLeave.superadminRemarks || selectedLeave.remarks}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reason Section */}
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h4 className="font-medium text-sm sm:text-base mb-2">Reason for Leave</h4>
                  <div className="p-2 sm:p-3 bg-muted/30 rounded-lg text-xs sm:text-sm">
                    {selectedLeave.reason || 'No reason provided'}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Pending Requests - Only show if not own leave */}
              {selectedLeave.status === "pending" && !isOwnLeave(selectedLeave) && (
                <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t">
                  <div>
                    <Label htmlFor="remarks" className="text-xs sm:text-sm">Remarks (Optional)</Label>
                    <Textarea
                      id="remarks"
                      placeholder="Add remarks for approval/rejection..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="mt-1 text-xs sm:text-sm min-h-[80px] sm:min-h-[100px]"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button 
                      variant="outline" 
                      className="w-full sm:flex-1 order-3 sm:order-1 text-xs sm:text-sm h-8 sm:h-10"
                      onClick={() => setViewDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full sm:flex-1 order-2 text-xs sm:text-sm h-8 sm:h-10"
                      onClick={() => handleLeaveAction(selectedLeave, "rejected")}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <X className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      Reject
                    </Button>
                    <Button 
                      className="w-full sm:flex-1 order-1 sm:order-3 bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-8 sm:h-10"
                      onClick={() => handleLeaveAction(selectedLeave, "approved")}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              )}

              {/* For own pending leaves, just show close button */}
              {selectedLeave.status === "pending" && isOwnLeave(selectedLeave) && (
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={() => setViewDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Admin Leave Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Leave Request
            </DialogTitle>
            <DialogDescription>
              Update your leave request details. Only pending requests can be edited.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateAdminLeave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-leaveType">Leave Type *</Label>
              <Select
                value={editFormData.leaveType}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, leaveType: value }))}
              >
                <SelectTrigger className={editFormErrors.leaveType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="emergency">Emergency Leave</SelectItem>
                  <SelectItem value="maternity">Maternity Leave</SelectItem>
                  <SelectItem value="paternity">Paternity Leave</SelectItem>
                  <SelectItem value="bereavement">Bereavement Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {editFormErrors.leaveType && (
                <p className="text-xs text-red-500">{editFormErrors.leaveType}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fromDate">From Date *</Label>
                <Input
                  id="edit-fromDate"
                  type="date"
                  value={editFormData.fromDate}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, fromDate: e.target.value }))}
                  className={editFormErrors.fromDate ? 'border-red-500' : ''}
                />
                {editFormErrors.fromDate && (
                  <p className="text-xs text-red-500">{editFormErrors.fromDate}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-toDate">To Date *</Label>
                <Input
                  id="edit-toDate"
                  type="date"
                  value={editFormData.toDate}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, toDate: e.target.value }))}
                  min={editFormData.fromDate}
                  className={editFormErrors.toDate ? 'border-red-500' : ''}
                />
                {editFormErrors.toDate && (
                  <p className="text-xs text-red-500">{editFormErrors.toDate}</p>
                )}
              </div>
            </div>

            {editFormData.fromDate && editFormData.toDate && (
              <div className="text-sm text-muted-foreground">
                Total Days: {calculateDaysBetween(editFormData.fromDate, editFormData.toDate)} days
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-reason">Reason *</Label>
              <Textarea
                id="edit-reason"
                value={editFormData.reason}
                onChange={(e) => setEditFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Please provide a reason for leave"
                className={editFormErrors.reason ? 'border-red-500' : ''}
                rows={3}
              />
              {editFormErrors.reason && (
                <p className="text-xs text-red-500">{editFormErrors.reason}</p>
              )}
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingEdit} className="bg-purple-600 hover:bg-purple-700">
                {isSubmittingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Update Leave
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Leave Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this leave request? This action cannot be undone.
              {selectedLeaveForEdit && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium">{selectedLeaveForEdit.adminName || selectedLeaveForEdit.employeeName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLeaveForEdit.leaveType} • {selectedLeaveForEdit.totalDays} days
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(selectedLeaveForEdit.fromDate)} to {formatDate(selectedLeaveForEdit.toDate)}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteAdminLeave(selectedLeaveForEdit?._id || '')}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmittingDelete}
            >
              {isSubmittingDelete && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeaveManagementTab;