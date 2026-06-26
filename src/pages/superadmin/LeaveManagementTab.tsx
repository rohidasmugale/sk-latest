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
  adminRemarks?: string;
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
  adminRemarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  requestType: 'admin-leave';
  isAdminLeave: boolean;
}

interface SuperAdminInfo {
  superAdminId: string;
  superAdminName: string;
  superAdminDepartment: string;
  superAdminPosition: string;
  superAdminEmail: string;
  superAdminContact: string;
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const LeaveManagementTab = ({ leaveRequests, setLeaveRequests }: LeaveManagementTabProps) => {
  const { user } = useRole();
  const [activeTab, setActiveTab] = useState<string>("supervisor-employee");
  
  // SuperAdmin info
  const [superAdminInfo, setSuperAdminInfo] = useState<SuperAdminInfo>({
    superAdminId: '',
    superAdminName: '',
    superAdminDepartment: '',
    superAdminPosition: '',
    superAdminEmail: '',
    superAdminContact: ''
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
  const [remarks, setRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile view state for table
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Initialize superAdmin info from user context
  useEffect(() => {
    if (user) {
      setSuperAdminInfo({
        superAdminId: user._id || user.id || '',
        superAdminName: user.name || 'Super Admin',
        superAdminDepartment: user.department || 'Administration',
        superAdminPosition: user.position || 'Super Admin',
        superAdminEmail: user.email || '',
        superAdminContact: user.phone || user.contactNumber || ''
      });
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

  // Helper functions to identify leave types
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
    return !isManagerLeave(leave) && !isAdminLeave(leave) && !isSupervisorLeave(leave);
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
// Fetch manager leaves - FIXED
const fetchManagerLeaves = async (page = 1) => {
  try {
    setIsLoading(true);
    
    // Try the admin endpoint first (since superadmin is viewing)
    const response = await fetch(
      `${API_URL}/manager-leaves/admin/all?status=${
        statusFilter === 'all' ? '' : statusFilter
      }&page=${page}&limit=${itemsPerPage}`
    );
    
    if (!response.ok) {
      console.warn('Manager leaves admin endpoint failed, trying fallback...');
      
      // Fallback to regular leaves endpoint with manager flag
      const fallbackResponse = await fetch(`${API_URL}/leaves?isManagerLeave=true&limit=1000`);
      
      if (!fallbackResponse.ok) {
        throw new Error('Failed to fetch manager leaves');
      }
      
      const fallbackData = await fallbackResponse.json();
      const allLeaves = extractArrayFromResponse(fallbackData);
      
      // Filter for manager leaves
      const managerLeaves = allLeaves
        .filter((leave: any) => leave.isManagerLeave === true)
        .map((leave: any) => ({
          ...leave,
          type: 'manager',
          appliedDate: leave.appliedDate || leave.createdAt,
          contactNumber: leave.managerContact || leave.contactNumber || 'N/A',
          employeeId: leave.managerId || leave.employeeId,
          employeeName: leave.managerName || leave.employeeName,
          department: leave.managerDepartment || leave.department,
          isManagerLeave: true,
          managerId: leave.managerId || leave.employeeId,
          managerName: leave.managerName || leave.employeeName,
          managerDepartment: leave.managerDepartment || leave.department,
          managerContact: leave.managerContact || leave.contactNumber || 'N/A',
          managerPosition: leave.managerPosition || 'Manager',
          managerEmail: leave.managerEmail || leave.email || '',
          adminRemarks: leave.adminRemarks || leave.remarks
        }));
      
      // Apply filters
      let filteredLeaves = managerLeaves;
      
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
      
      // Calculate stats
      const stats = {
        total: filteredLeaves.length,
        pending: filteredLeaves.filter((l: any) => l.status === 'pending').length,
        approved: filteredLeaves.filter((l: any) => l.status === 'approved').length,
        rejected: filteredLeaves.filter((l: any) => l.status === 'rejected').length,
        cancelled: filteredLeaves.filter((l: any) => l.status === 'cancelled').length
      };
      
      setManagerStats(stats);
      setTotalItems(filteredLeaves.length);
      setTotalPages(Math.ceil(filteredLeaves.length / itemsPerPage));
      setCurrentPage(page);
      
      return;
    }
    
    const data = await response.json();
    console.log('Manager leaves API response:', data);
    
    let leaves: any[] = [];
    
    if (data.success) {
      leaves = data.leaves || [];
    } else {
      leaves = extractArrayFromResponse(data);
    }
    
    const transformedLeaves = leaves.map((leave: any) => ({
      ...leave,
      type: 'manager',
      appliedDate: leave.appliedDate || leave.createdAt,
      contactNumber: leave.managerContact || leave.contactNumber || 'N/A',
      employeeId: leave.managerId || leave.employeeId,
      employeeName: leave.managerName || leave.employeeName,
      department: leave.managerDepartment || leave.department,
      isManagerLeave: true,
      managerId: leave.managerId || leave.employeeId,
      managerName: leave.managerName || leave.employeeName,
      managerDepartment: leave.managerDepartment || leave.department,
      managerContact: leave.managerContact || leave.contactNumber || 'N/A',
      managerPosition: leave.managerPosition || 'Manager',
      managerEmail: leave.managerEmail || leave.email || '',
      adminRemarks: leave.adminRemarks || leave.remarks
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
    
    // Calculate stats
    const stats = {
      total: filteredLeaves.length,
      pending: filteredLeaves.filter((l: any) => l.status === 'pending').length,
      approved: filteredLeaves.filter((l: any) => l.status === 'approved').length,
      rejected: filteredLeaves.filter((l: any) => l.status === 'rejected').length,
      cancelled: filteredLeaves.filter((l: any) => l.status === 'cancelled').length
    };
    
    setManagerStats(stats);
    setTotalItems(filteredLeaves.length);
    setTotalPages(Math.ceil(filteredLeaves.length / itemsPerPage));
    setCurrentPage(page);
    
  } catch (error) {
    console.error("Error fetching manager leaves:", error);
    toast.error("Failed to load manager leaves");
    setManagerLeaves([]);
  } finally {
    setIsLoading(false);
  }
};

// Fetch admin leaves - FIXED
const fetchAdminLeaves = async (page = 1) => {
  try {
    setIsLoading(true);
    
    // Try the admin endpoint first
    const response = await fetch(
      `${API_URL}/admin-leaves/admin/all?status=${
        statusFilter === 'all' ? '' : statusFilter
      }&page=${page}&limit=${itemsPerPage}`
    );
    
    if (!response.ok) {
      console.warn('Admin leaves admin endpoint failed, trying fallback...');
      
      // Fallback to regular leaves endpoint with admin flag
      const fallbackResponse = await fetch(`${API_URL}/leaves?isAdminLeave=true&limit=1000`);
      
      if (!fallbackResponse.ok) {
        throw new Error('Failed to fetch admin leaves');
      }
      
      const fallbackData = await fallbackResponse.json();
      const allLeaves = extractArrayFromResponse(fallbackData);
      
      // Filter for admin leaves
      const adminLeaves = allLeaves
        .filter((leave: any) => leave.isAdminLeave === true || leave.requestType === 'admin-leave')
        .map((leave: any) => ({
          ...leave,
          type: 'admin',
          appliedDate: leave.appliedDate || leave.createdAt,
          contactNumber: leave.adminContact || leave.contactNumber || 'N/A',
          employeeId: leave.adminId || leave.employeeId,
          employeeName: leave.adminName || leave.employeeName,
          department: leave.adminDepartment || leave.department,
          isAdminLeave: true,
          adminId: leave.adminId || leave.employeeId,
          adminName: leave.adminName || leave.employeeName,
          adminDepartment: leave.adminDepartment || leave.department,
          adminContact: leave.adminContact || leave.contactNumber || 'N/A',
          adminPosition: leave.adminPosition || 'Admin',
          adminEmail: leave.adminEmail || leave.email || '',
          adminRemarks: leave.adminRemarks || leave.remarks
        }));
      
      // Apply filters
      let filteredLeaves = adminLeaves;
      
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
      
      // Calculate stats
      const stats = {
        total: filteredLeaves.length,
        pending: filteredLeaves.filter((l: any) => l.status === 'pending').length,
        approved: filteredLeaves.filter((l: any) => l.status === 'approved').length,
        rejected: filteredLeaves.filter((l: any) => l.status === 'rejected').length,
        cancelled: filteredLeaves.filter((l: any) => l.status === 'cancelled').length
      };
      
      setAdminStats(stats);
      setTotalItems(filteredLeaves.length);
      setTotalPages(Math.ceil(filteredLeaves.length / itemsPerPage));
      setCurrentPage(page);
      
      return;
    }
    
    const data = await response.json();
    console.log('Admin leaves API response:', data);
    
    let leaves: any[] = [];
    
    if (data.success) {
      leaves = data.leaves || [];
    } else {
      leaves = extractArrayFromResponse(data);
    }
    
    const transformedLeaves = leaves.map((leave: any) => ({
      ...leave,
      type: 'admin',
      appliedDate: leave.appliedDate || leave.createdAt,
      contactNumber: leave.adminContact || leave.contactNumber || 'N/A',
      employeeId: leave.adminId || leave.employeeId,
      employeeName: leave.adminName || leave.employeeName,
      department: leave.adminDepartment || leave.department,
      isAdminLeave: true,
      adminId: leave.adminId || leave.employeeId,
      adminName: leave.adminName || leave.employeeName,
      adminDepartment: leave.adminDepartment || leave.department,
      adminContact: leave.adminContact || leave.contactNumber || 'N/A',
      adminPosition: leave.adminPosition || 'Admin',
      adminEmail: leave.adminEmail || leave.email || '',
      adminRemarks: leave.adminRemarks || leave.remarks
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
    
    // Calculate stats
    const stats = {
      total: filteredLeaves.length,
      pending: filteredLeaves.filter((l: any) => l.status === 'pending').length,
      approved: filteredLeaves.filter((l: any) => l.status === 'approved').length,
      rejected: filteredLeaves.filter((l: any) => l.status === 'rejected').length,
      cancelled: filteredLeaves.filter((l: any) => l.status === 'cancelled').length
    };
    
    setAdminStats(stats);
    setTotalItems(filteredLeaves.length);
    setTotalPages(Math.ceil(filteredLeaves.length / itemsPerPage));
    setCurrentPage(page);
    
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

  // Handle leave action (approve/reject)
const handleLeaveAction = async (leave: any, action: "approved" | "rejected") => {
  try {
    setIsUpdating(true);
    setSelectedLeave(leave);
    
    let response;
    let endpoint = '';
    let requestBody = {};
    
    const leaveId = leave._id || leave.id || '';
    
    if (!leaveId) {
      toast.error("Leave ID is missing");
      setIsUpdating(false);
      return;
    }

    console.log(`Processing leave action for:`, {
      leaveId,
      action,
      leaveType: isAdminLeave(leave) ? 'Admin' : isManagerLeave(leave) ? 'Manager' : 'Employee/Supervisor'
    });
    
    // Determine correct endpoint based on leave type
    if (isAdminLeave(leave)) {
      endpoint = `${API_URL}/admin-leaves/superadmin/${leaveId}/status`;
      requestBody = {
        status: action,
        [action === 'approved' ? 'approvedBy' : 'rejectedBy']: superAdminInfo.superAdminName || 'Super Admin',
        adminRemarks: remarks || `${action} by ${superAdminInfo.superAdminName || 'Super Admin'}`
      };
    } else if (isManagerLeave(leave)) {
      endpoint = `${API_URL}/manager-leaves/superadmin/${leaveId}/status`;
      requestBody = {
        status: action,
        [action === 'approved' ? 'approvedBy' : 'rejectedBy']: superAdminInfo.superAdminName || 'Super Admin',
        adminRemarks: remarks || `${action} by ${superAdminInfo.superAdminName || 'Super Admin'}`
      };
    } else {
      endpoint = `${API_URL}/leaves/${leaveId}/status`;
      requestBody = { 
        status: action,
        approvedBy: action === 'approved' ? superAdminInfo.superAdminName || 'Super Admin' : undefined,
        rejectedBy: action === 'rejected' ? superAdminInfo.superAdminName || 'Super Admin' : undefined,
        remarks: remarks || `${action} by ${superAdminInfo.superAdminName || 'Super Admin'}`
      };
    }

    console.log(`Updating leave at ${endpoint}`, requestBody);
    
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
              approvedBy: action === 'approved' ? superAdminInfo.superAdminName || 'Super Admin' : undefined,
              rejectedBy: action === 'rejected' ? superAdminInfo.superAdminName || 'Super Admin' : undefined,
              approvedAt: action === 'approved' ? new Date().toISOString() : undefined,
              rejectedAt: action === 'rejected' ? new Date().toISOString() : undefined,
              remarks: remarks || `${action} by ${superAdminInfo.superAdminName || 'Super Admin'}`
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
              approvedBy: action === 'approved' ? superAdminInfo.superAdminName || 'Super Admin' : undefined,
              rejectedBy: action === 'rejected' ? superAdminInfo.superAdminName || 'Super Admin' : undefined,
              approvedAt: action === 'approved' ? new Date().toISOString() : undefined,
              rejectedAt: action === 'rejected' ? new Date().toISOString() : undefined,
              adminRemarks: remarks || `${action} by ${superAdminInfo.superAdminName || 'Super Admin'}`
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
      setAdminLeaves(prev => 
        prev.map(l => {
          const lId = l._id || l.id;
          if (lId === leaveId) {
            return { 
              ...l, 
              status: action,
              approvedBy: action === 'approved' ? superAdminInfo.superAdminName || 'Super Admin' : undefined,
              rejectedBy: action === 'rejected' ? superAdminInfo.superAdminName || 'Super Admin' : undefined,
              approvedAt: action === 'approved' ? new Date().toISOString() : undefined,
              rejectedAt: action === 'rejected' ? new Date().toISOString() : undefined,
              adminRemarks: remarks || `${action} by ${superAdminInfo.superAdminName || 'Super Admin'}`
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

    // ✅ Dispatch leave-update event
    const leaveName = leave.employeeName || leave.managerName || leave.adminName || 'Employee';
    const leaveType = leave.leaveType || 'leave';
    
    window.dispatchEvent(new CustomEvent('leave-update', {
      detail: {
        leaveId: leaveId,
        title: action === 'approved' ? '✅ Leave Approved' : '❌ Leave Rejected',
        message: `${leaveName}'s ${leaveType} leave has been ${action} by ${superAdminInfo.superAdminName || 'Super Admin'}`,
        notificationType: action === 'approved' ? 'leave_approved' : 'leave_rejected',
        employeeName: leaveName,
        leaveType: leaveType,
        actionBy: superAdminInfo.superAdminName || 'Super Admin'
      }
    }));

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
// Handle revert to pending
const handleRevertToPending = async (leave: any) => {
  try {
    setIsUpdating(true);
    setSelectedLeave(leave);
    
    let response;
    let endpoint = '';
    let requestBody = {};
    
    const leaveId = leave._id || leave.id || '';
    
    if (!leaveId) {
      toast.error("Leave ID is missing");
      setIsUpdating(false);
      return;
    }

    console.log(`Reverting leave:`, {
      leaveId,
      leaveType: isAdminLeave(leave) ? 'Admin' : isManagerLeave(leave) ? 'Manager' : 'Employee/Supervisor'
    });
    
    // Determine correct endpoint based on leave type
    if (isAdminLeave(leave)) {
      endpoint = `${API_URL}/admin-leaves/superadmin/${leaveId}/revert`;
      requestBody = {
        remarks: remarks || 'Reverted to pending',
        revertedBy: superAdminInfo.superAdminName || 'Super Admin'
      };
    } else if (isManagerLeave(leave)) {
      endpoint = `${API_URL}/manager-leaves/superadmin/${leaveId}/revert`;
      requestBody = {
        remarks: remarks || 'Reverted to pending',
        revertedBy: superAdminInfo.superAdminName || 'Super Admin'
      };
    } else {
      endpoint = `${API_URL}/leaves/${leaveId}/status`;
      requestBody = { 
        status: 'pending',
        remarks: remarks || `Reverted to pending by ${superAdminInfo.superAdminName || 'Super Admin'}`,
        revertedBy: superAdminInfo.superAdminName || 'Super Admin'
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
              remarks: remarks || `Reverted to pending by ${superAdminInfo.superAdminName || 'Super Admin'}`
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
              adminRemarks: remarks || `Reverted to pending by ${superAdminInfo.superAdminName || 'Super Admin'}`
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
              adminRemarks: remarks || `Reverted to pending by ${superAdminInfo.superAdminName || 'Super Admin'}`
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

    // ✅ Dispatch leave-update event
    const leaveName = leave.employeeName || leave.managerName || leave.adminName || 'Employee';
    const leaveType = leave.leaveType || 'leave';
    
    window.dispatchEvent(new CustomEvent('leave-update', {
      detail: {
        leaveId: leaveId,
        title: '🔄 Leave Reverted to Pending',
        message: `${leaveName}'s ${leaveType} leave has been reverted to pending by ${superAdminInfo.superAdminName || 'Super Admin'}`,
        notificationType: 'leave_pending',
        employeeName: leaveName,
        leaveType: leaveType,
        actionBy: superAdminInfo.superAdminName || 'Super Admin'
      }
    }));

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
        ? leave.adminRemarks || "" 
        : isManagerLeave(leave)
        ? leave.adminRemarks || ""
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
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

  // Render mobile card view for a leave request
  const renderMobileLeaveCard = (leave: any) => {
    const isExpanded = expandedRow === (leave._id || leave.id);
    const leaveId = leave._id || leave.id || '';
    const canRevert = leave.status === 'approved' || leave.status === 'rejected';
    
    return (
      <div key={leaveId} className="border rounded-lg p-4 mb-3 bg-white shadow-sm">
        {/* Header with basic info */}
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
        
        {/* Always visible info */}
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
        
        {/* Expandable section with actions */}
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
            
            {/* Show remarks if available */}
            {(leave.remarks || leave.adminRemarks) && (
              <div className="text-sm p-2 bg-yellow-50 rounded border border-yellow-200">
                <span className="font-medium">Remarks:</span>
                <p className="mt-1">{leave.remarks || leave.adminRemarks}</p>
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
              
              {leave.status === "pending" && (
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
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* SuperAdmin Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                {superAdminInfo.superAdminName}
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="default" className="text-sm capitalize">
                  Super Admin
                </Badge>
                {superAdminInfo.superAdminDepartment && (
                  <Badge variant="outline" className="text-sm">
                    <Building className="h-3 w-3 mr-1" />
                    {superAdminInfo.superAdminDepartment}
                  </Badge>
                )}
                {superAdminInfo.superAdminEmail && (
                  <Badge variant="outline" className="text-sm">
                    <Mail className="h-3 w-3 mr-1" />
                    {superAdminInfo.superAdminEmail}
                  </Badge>
                )}
              </div>
            </div>
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
            <form onSubmit={handleSearch} className="flex gap-2">
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
              <Button type="submit" size="sm" className="h-8 sm:h-10 px-2 sm:px-4">
                <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                      const canRevert = leave.status === 'approved' || leave.status === 'rejected';
                      
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
                          
                              {leave.status === "pending" && (
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

                  {/* SuperAdmin Remarks */}
                  {(selectedLeave.adminRemarks || selectedLeave.remarks) && (
                    <div className="mt-2">
                      <h4 className="font-medium text-xs sm:text-sm mb-1">SuperAdmin Remarks:</h4>
                      <p className="text-xs sm:text-sm p-2 bg-yellow-50 rounded border border-yellow-200">
                        {selectedLeave.adminRemarks || selectedLeave.remarks}
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

              {/* Action Buttons for Pending Requests */}
              {selectedLeave.status === "pending" && (
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagementTab;