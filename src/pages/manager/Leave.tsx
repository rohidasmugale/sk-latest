import { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  Filter, 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  User, 
  Loader2, 
  Coffee, 
  Timer, 
  Users, 
  Building, 
  Eye, 
  UserCheck, 
  UserX, 
  Crown,
  ArrowLeft,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Briefcase,
  Percent,
  UserCog,
  Mail,
  Phone,
  UserCircle,
  LogIn,
  LogOut,
  CalendarDays,
  Shield,
  UserMinus,
  UserPlus,
  CheckSquare,
  XSquare,
  ChevronDown,
  ChevronUp,
  Plus,
  Send,
  RotateCcw,
  Info,
  Home,
  Heart,
  Umbrella,
  Edit,
  Trash2,
  Save
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import userService from "@/services/userService";
import { useRole } from "@/context/RoleContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { format } from "date-fns";

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// Interface for Leave Request (Employee & Supervisor)
interface LeaveRequest {
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
  updatedAt: string;
  contactNumber: string;
  remarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancellationReason?: string;
  managerRemarks?: string;
  emergencyContact?: string;
  handoverTo?: string;
  handoverCompleted?: boolean;
  handoverRemarks?: string;
  attachmentUrl?: string;
  isManagerLeave?: boolean;
  isSupervisorLeave?: boolean;
  managerId?: string;
  supervisorId?: string;
  site?: string;
  siteId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  position?: string;
  email?: string;
}

// Interface for Manager Leave Request
interface ManagerLeaveRequest {
  _id: string;
  id?: string;
  managerId: string;
  managerName: string;
  managerDepartment: string;
  managerPosition: string;
  managerEmail: string;
  managerContact: string;
  leaveType: 'annual' | 'sick' | 'casual' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid' | 'other';
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  appliedBy: string;
  appliedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  remarks?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  superadminRemarks?: string;
  cancellationReason?: string;
  requestType: 'manager-leave';
  createdAt: string;
  updatedAt: string;
}

// Interface for Employee
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  contactNumber: string;
  position: string;
  email: string;
  isActive?: boolean;
  site?: string;
  isSupervisor?: boolean;
  role?: string;
}

// Interface for Manager Info
interface ManagerInfo {
  _id: string;
  employeeId?: string;
  name: string;
  department: string;
  contactNumber?: string;
  email?: string;
  role: string;
  phone?: string;
  position?: string;
  site?: string;
  sites?: string[];
}

// Interface for Site
interface Site {
  _id: string;
  name: string;
  clientName?: string;
  location?: string;
  status?: string;
  managerCount?: number;
  supervisorCount?: number;
  employeeCount?: number;
}

// Interface for Site Leave Data
interface SiteLeaveData {
  id: string;
  siteId: string;
  name: string;
  siteName: string;
  clientName?: string;
  location?: string;
  totalEmployees: number;
  pendingLeaves: number;
  approvedLeaves: number;
  rejectedLeaves: number;
  cancelledLeaves: number;
  supervisorLeaves: number;
  employeeLeaves: number;
  managerLeaves: number;
  date: string;
  employees: Employee[];
  isRealData: boolean;
  leaves: LeaveRequest[];
}

// Interface for Leave Statistics
interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  supervisorLeaves: number;
  employeeLeaves: number;
  managerLeaves: number;
  totalDays: number;
}

// Interface for Action Dialog
interface ActionDialogState {
  open: boolean;
  type: 'approve' | 'reject' | 'pending' | null;
  leaveId: string | null;
  leaveDetails: LeaveRequest | null;
  remarks: string;
}

// Helper function to format date
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTimeDisplay = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Calculate days between dates
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff + 1;
};

// Fetch all leave requests (employee and supervisor)
const fetchAllLeaveRequests = async (date?: string): Promise<LeaveRequest[]> => {
  try {
    console.log('🔄 Fetching all leave requests from API...');
    
    let url = `${API_URL}/leaves?limit=1000`;
    if (date) {
      url += `&date=${date}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`http error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📥 Leave API response:', data);
    
    let leavesData = [];
    
    if (Array.isArray(data)) {
      leavesData = data;
    } else if (data?.success && Array.isArray(data.data)) {
      leavesData = data.data;
    } else if (data?.data && Array.isArray(data.data)) {
      leavesData = data.data;
    } else if (data?.leaves && Array.isArray(data.leaves)) {
      leavesData = data.leaves;
    } else if (data?.results && Array.isArray(data.results)) {
      leavesData = data.results;
    }
    
    console.log(`📊 Raw leaves data count: ${leavesData.length}`);
    
    const transformedLeaves: LeaveRequest[] = leavesData.map((leave: any) => ({
      _id: leave._id || leave.id || `leave_${Math.random()}`,
      id: leave._id || leave.id,
      employeeId: leave.employeeId || leave.employeeID || leave.empId || '',
      employeeName: leave.employeeName || leave.name || leave.empName || 'Unknown',
      department: leave.department || leave.dept || 'Unknown',
      leaveType: leave.leaveType || leave.type || 'casual',
      fromDate: leave.fromDate || leave.startDate || '',
      toDate: leave.toDate || leave.endDate || '',
      totalDays: leave.totalDays || leave.days || 1,
      reason: leave.reason || leave.description || '',
      status: leave.status || leave.leaveStatus || 'pending',
      appliedBy: leave.appliedBy || leave.applicant || '',
      appliedFor: leave.appliedFor || leave.employeeId || '',
      createdAt: leave.createdAt || leave.created || leave.appliedDate || new Date().toISOString(),
      updatedAt: leave.updatedAt || leave.updated || new Date().toISOString(),
      contactNumber: leave.contactNumber || leave.phone || '',
      remarks: leave.remarks || leave.comments || '',
      approvedBy: leave.approvedBy,
      rejectedBy: leave.rejectedBy,
      approvedAt: leave.approvedAt,
      rejectedAt: leave.rejectedAt,
      cancellationReason: leave.cancellationReason,
      managerRemarks: leave.managerRemarks,
      emergencyContact: leave.emergencyContact,
      handoverTo: leave.handoverTo,
      handoverCompleted: leave.handoverCompleted,
      handoverRemarks: leave.handoverRemarks,
      attachmentUrl: leave.attachmentUrl,
      isManagerLeave: leave.isManagerLeave === true || leave.managerId ? true : false,
      isSupervisorLeave: leave.isSupervisorLeave === true,
      managerId: leave.managerId,
      supervisorId: leave.supervisorId,
      site: leave.site || leave.location || 'Main Site',
      siteId: leave.siteId,
      priority: leave.priority || 'medium',
      position: leave.position,
      email: leave.email
    }));
    
    console.log(`✅ Transformed ${transformedLeaves.length} leave requests`);
    return transformedLeaves;
  } catch (error: any) {
    console.error('❌ Error fetching leaves:', error);
    toast.error(`Failed to fetch leaves: ${error.message}`);
    return [];
  }
};

// Fetch manager's own leaves
const fetchMyManagerLeaves = async (managerId: string): Promise<ManagerLeaveRequest[]> => {
  if (!managerId) {
    console.log('❌ No manager ID provided');
    return [];
  }
  
  try {
    console.log('🔄 Fetching manager leaves for:', managerId);
    console.log('📍 Endpoint:', `${API_URL}/manager-leaves?managerId=${managerId}`);
    
    const response = await fetch(`${API_URL}/manager-leaves?managerId=${managerId}&limit=100`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('⚠️ Manager leaves endpoint not found. Make sure backend is running and routes are configured.');
        toast.warning('Manager leaves API not available. Some features may be limited.');
        return [];
      }
      throw new Error(`http error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📥 Manager leaves API response:', data);
    
    let leavesData = [];
    
    if (data?.success && Array.isArray(data.data)) {
      leavesData = data.data;
    } else if (Array.isArray(data)) {
      leavesData = data;
    } else if (data?.leaves && Array.isArray(data.leaves)) {
      leavesData = data.leaves;
    }
    
    console.log(`✅ Found ${leavesData.length} manager leaves`);
    return leavesData;
  } catch (error: any) {
    console.error('❌ Error fetching manager leaves:', error);
    toast.error(`Failed to fetch manager leaves: ${error.message}`);
    return [];
  }
};

// Fetch employees from API
const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    console.log('🔄 Fetching employees from API...');
    
    const response = await fetch(`${API_URL}/employees?limit=1000`);
    
    if (!response.ok) {
      throw new Error(`http error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    let employeesData = [];
    
    if (Array.isArray(data)) {
      employeesData = data;
    } else if (data?.success && Array.isArray(data.data)) {
      employeesData = data.data;
    } else if (data?.employees && Array.isArray(data.employees)) {
      employeesData = data.employees;
    } else if (data?.data && Array.isArray(data.data.employees)) {
      employeesData = data.data.employees;
    }
    
    console.log(`📊 Raw employees data count: ${employeesData.length}`);
    
    const transformedEmployees: Employee[] = employeesData.map((emp: any) => ({
      _id: emp._id || emp.id,
      employeeId: emp.employeeId || emp.employeeID || emp.empId || `EMP${String(Math.random()).slice(2, 6)}`,
      name: emp.name || emp.employeeName || emp.fullName || "Unknown Employee",
      email: emp.email || "",
      contactNumber: emp.phone || emp.mobile || emp.contactNumber || "",
      department: emp.department || emp.dept || "Unknown Department",
      position: emp.position || emp.designation || emp.role || "Employee",
      site: emp.site || emp.siteName || emp.location || "Main Site",
      isActive: emp.status === 'active' || emp.isActive === true,
      isSupervisor: emp.role === 'supervisor' || emp.isSupervisor === true || emp.position?.toLowerCase().includes('supervisor'),
      role: emp.role || 'employee'
    }));
    
    console.log(`✅ Transformed ${transformedEmployees.length} employees`);
    return transformedEmployees;
  } catch (error: any) {
    console.error('❌ Error fetching employees:', error);
    toast.error(`Failed to fetch employees: ${error.message}`);
    return [];
  }
};

// Fetch sites where manager is assigned
const fetchManagerSites = async (managerId: string): Promise<Site[]> => {
  try {
    console.log('🔄 Fetching sites for manager:', managerId);
    
    const response = await fetch(`${API_URL}/sites?limit=100`);
    
    if (!response.ok) {
      throw new Error(`http error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    let sitesData = [];
    
    if (Array.isArray(data)) {
      sitesData = data;
    } else if (data?.success && Array.isArray(data.data)) {
      sitesData = data.data;
    } else if (data?.sites && Array.isArray(data.sites)) {
      sitesData = data.sites;
    } else if (data?.data && Array.isArray(data.data.sites)) {
      sitesData = data.data.sites;
    }
    
    console.log(`📊 Raw sites data count: ${sitesData.length}`);
    
    const transformedSites: Site[] = sitesData.map((site: any) => ({
      _id: site._id || site.id,
      name: site.name || site.siteName || 'Unknown Site',
      clientName: site.clientName || site.client || '',
      location: site.location || site.address || '',
      status: site.status || 'active',
      managerCount: site.managerCount || 0,
      supervisorCount: site.supervisorCount || 0,
      employeeCount: site.employeeCount || 0
    }));
    
    console.log(`✅ Transformed ${transformedSites.length} sites`);
    return transformedSites.slice(0, 10);
  } catch (error: any) {
    console.error('❌ Error fetching sites:', error);
    return [];
  }
};

// Generate site leave data
const generateSiteLeaveData = async (site: Site, date: string, allLeaves: LeaveRequest[]): Promise<SiteLeaveData> => {
  try {
    const allEmployees = await fetchEmployees();
    
    const siteEmployees = allEmployees.filter(emp => 
      emp.site === site.name || emp.site === site._id
    );
    
    const employeeIds = new Set(siteEmployees.map(emp => emp._id));
    const employeeNames = new Set(siteEmployees.map(emp => emp.name));
    
    const siteLeaves = allLeaves.filter(leave => 
      employeeIds.has(leave.employeeId) || 
      employeeNames.has(leave.employeeName) ||
      leave.site === site.name ||
      leave.siteId === site._id
    );
    
    const pendingLeaves = siteLeaves.filter(l => l.status === 'pending').length;
    const approvedLeaves = siteLeaves.filter(l => l.status === 'approved').length;
    const rejectedLeaves = siteLeaves.filter(l => l.status === 'rejected').length;
    const cancelledLeaves = siteLeaves.filter(l => l.status === 'cancelled').length;
    const supervisorLeaves = siteLeaves.filter(l => l.isSupervisorLeave).length;
    const managerLeaves = siteLeaves.filter(l => l.isManagerLeave).length;
    const employeeLeaves = siteLeaves.filter(l => !l.isSupervisorLeave && !l.isManagerLeave).length;
    
    return {
      id: site._id,
      siteId: site._id,
      name: site.name,
      siteName: site.name,
      clientName: site.clientName,
      location: site.location,
      totalEmployees: siteEmployees.length,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      cancelledLeaves,
      supervisorLeaves,
      employeeLeaves,
      managerLeaves,
      date,
      employees: siteEmployees,
      isRealData: siteEmployees.length > 0,
      leaves: siteLeaves
    };
  } catch (error) {
    console.error('Error generating site leave data:', error);
    return {
      id: site._id,
      siteId: site._id,
      name: site.name,
      siteName: site.name,
      clientName: site.clientName,
      location: site.location,
      totalEmployees: 0,
      pendingLeaves: 0,
      approvedLeaves: 0,
      rejectedLeaves: 0,
      cancelledLeaves: 0,
      supervisorLeaves: 0,
      employeeLeaves: 0,
      managerLeaves: 0,
      date,
      employees: [],
      isRealData: false,
      leaves: []
    };
  }
};

// View Leave Details Dialog Component
interface ViewLeaveDialogProps {
  leave: LeaveRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (leaveId: string, remarks: string) => Promise<void>;
  onReject?: (leaveId: string, remarks: string) => Promise<void>;
  onRevertToPending?: (leaveId: string, remarks: string) => Promise<void>;
}

const ViewLeaveDialog: React.FC<ViewLeaveDialogProps> = ({ 
  leave, 
  open, 
  onOpenChange,
  onApprove,
  onReject,
  onRevertToPending
}) => {
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    open: false,
    type: null,
    leaveId: null,
    leaveDetails: null,
    remarks: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!leave) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return "bg-green-100 text-green-800 border-green-200";
      case 'rejected':
        return "bg-red-100 text-red-800 border-red-200";
      case 'pending':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'cancelled':
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'annual':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'sick':
        return "bg-red-100 text-red-800 border-red-200";
      case 'casual':
        return "bg-green-100 text-green-800 border-green-200";
      case 'maternity':
        return "bg-purple-100 text-purple-800 border-purple-200";
      case 'paternity':
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case 'bereavement':
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleBadge = () => {
    if (leave.isManagerLeave) {
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Manager</Badge>;
    } else if (leave.isSupervisorLeave) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Supervisor</Badge>;
    } else {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Employee</Badge>;
    }
  };

  const handleAction = async () => {
    setIsProcessing(true);
    try {
      if (actionDialog.type === 'approve' && onApprove) {
        await onApprove(actionDialog.leaveId!, actionDialog.remarks);
      } else if (actionDialog.type === 'reject' && onReject) {
        await onReject(actionDialog.leaveId!, actionDialog.remarks);
      } else if (actionDialog.type === 'pending' && onRevertToPending) {
        await onRevertToPending(actionDialog.leaveId!, actionDialog.remarks);
      }
      setActionDialog({ open: false, type: null, leaveId: null, leaveDetails: null, remarks: '' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Failed to perform action');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-primary" />
              Leave Request Details
            </DialogTitle>
            <DialogDescription>
              Detailed information for {leave.employeeName}'s leave request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`p-4 rounded-lg border ${
              leave.status === 'approved' ? 'bg-green-50 border-green-200' :
              leave.status === 'rejected' ? 'bg-red-50 border-red-200' :
              leave.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {leave.status === 'approved' && <CheckCircle className="h-6 w-6 text-green-600" />}
                  {leave.status === 'rejected' && <XCircle className="h-6 w-6 text-red-600" />}
                  {leave.status === 'pending' && <Clock className="h-6 w-6 text-yellow-600" />}
                  {leave.status === 'cancelled' && <XCircle className="h-6 w-6 text-gray-600" />}
                  <div>
                    <p className="font-semibold text-lg capitalize">{leave.status}</p>
                    {leave.approvedBy && (
                      <p className="text-sm text-muted-foreground">
                        by {leave.approvedBy} on {formatDateTimeDisplay(leave.approvedAt || '')}
                      </p>
                    )}
                    {leave.rejectedBy && (
                      <p className="text-sm text-muted-foreground">
                        by {leave.rejectedBy} on {formatDateTimeDisplay(leave.rejectedAt || '')}
                      </p>
                    )}
                  </div>
                </div>
                {getRoleBadge()}
              </div>
            </div>

            {/* Employee Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Employee Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium">{leave.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">ID:</span>
                    <span className="text-sm font-medium">{leave.employeeId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Department:</span>
                    <span className="text-sm font-medium">{leave.department}</span>
                  </div>
                  {leave.position && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Position:</span>
                      <span className="text-sm font-medium">{leave.position}</span>
                    </div>
                  )}
                  {leave.email && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="text-sm font-medium">{leave.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Contact:</span>
                    <span className="text-sm font-medium">{leave.contactNumber}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Leave Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Leave Type:</span>
                    <Badge className={getLeaveTypeBadge(leave.leaveType)}>
                      {leave.leaveType}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">From Date:</span>
                    <span className="text-sm font-medium">{formatDateDisplay(leave.fromDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">To Date:</span>
                    <span className="text-sm font-medium">{formatDateDisplay(leave.toDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Days:</span>
                    <span className="text-sm font-bold">{leave.totalDays}</span>
                  </div>
                  {leave.handoverTo && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Handover To:</span>
                      <span className="text-sm font-medium">{leave.handoverTo}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Reason */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm bg-muted/30 p-3 rounded-lg">{leave.reason}</p>
              </CardContent>
            </Card>

            {/* Remarks */}
            {leave.remarks && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Manager Remarks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg">{leave.remarks}</p>
                </CardContent>
              </Card>
            )}

            {/* Additional Information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Applied By:</span>
                  <span className="text-sm font-medium">{leave.appliedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Applied On:</span>
                  <span className="text-sm font-medium">{formatDateTimeDisplay(leave.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated:</span>
                  <span className="text-sm font-medium">{formatDateTimeDisplay(leave.updatedAt)}</span>
                </div>
                {leave.site && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Site:</span>
                    <span className="text-sm font-medium">{leave.site}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {leave.status === 'pending' && (
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setActionDialog({
                    open: true,
                    type: 'reject',
                    leaveId: leave._id,
                    leaveDetails: leave,
                    remarks: ''
                  })}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setActionDialog({
                    open: true,
                    type: 'approve',
                    leaveId: leave._id,
                    leaveDetails: leave,
                    remarks: ''
                  })}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </div>
            )}

            {(leave.status === 'approved' || leave.status === 'rejected') && (
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
                  onClick={() => setActionDialog({
                    open: true,
                    type: 'pending',
                    leaveId: leave._id,
                    leaveDetails: leave,
                    remarks: ''
                  })}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Revert to Pending
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Remarks Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === 'approve' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {actionDialog.type === 'reject' && <XCircle className="h-5 w-5 text-red-600" />}
              {actionDialog.type === 'pending' && <RotateCcw className="h-5 w-5 text-yellow-600" />}
              {actionDialog.type === 'approve' && 'Approve Leave Request'}
              {actionDialog.type === 'reject' && 'Reject Leave Request'}
              {actionDialog.type === 'pending' && 'Revert to Pending'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' && 'Add remarks for approving this leave request'}
              {actionDialog.type === 'reject' && 'Please provide a reason for rejecting this leave request'}
              {actionDialog.type === 'pending' && 'Add remarks for reverting this leave request to pending'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={actionDialog.remarks}
                onChange={(e) => setActionDialog(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder={actionDialog.type === 'reject' ? "Required: Reason for rejection" : "Optional remarks"}
                rows={4}
                required={actionDialog.type === 'reject'}
              />
              {actionDialog.type === 'reject' && !actionDialog.remarks && (
                <p className="text-xs text-red-500">Reason is required for rejection</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setActionDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isProcessing || (actionDialog.type === 'reject' && !actionDialog.remarks)}
              className={
                actionDialog.type === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                actionDialog.type === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                'bg-yellow-600 hover:bg-yellow-700'
              }
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionDialog.type === 'approve' && 'Approve'}
              {actionDialog.type === 'reject' && 'Reject'}
              {actionDialog.type === 'pending' && 'Revert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// View Manager Leave Details Dialog Component - FIXED VERSION
interface ViewManagerLeaveDialogProps {
  leave: ManagerLeaveRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (leave: ManagerLeaveRequest) => void;
  onDelete?: (leave: ManagerLeaveRequest) => void;
  onDeleteById?: (leaveId: string) => void;
}

const ViewManagerLeaveDialog: React.FC<ViewManagerLeaveDialogProps> = ({ 
  leave, 
  open, 
  onOpenChange,
  onEdit,
  onDelete,
  onDeleteById
}) => {
  if (!leave) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return "bg-green-100 text-green-800 border-green-200";
      case 'rejected':
        return "bg-red-100 text-red-800 border-red-200";
      case 'pending':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'cancelled':
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'annual':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'sick':
        return "bg-red-100 text-red-800 border-red-200";
      case 'casual':
        return "bg-green-100 text-green-800 border-green-200";
      case 'maternity':
        return "bg-purple-100 text-purple-800 border-purple-200";
      case 'paternity':
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case 'bereavement':
        return "bg-gray-100 text-gray-800 border-gray-200";
      case 'unpaid':
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-5 w-5 text-primary" />
            Manager Leave Request Details
          </DialogTitle>
          <DialogDescription>
            Detailed information for your leave request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg border ${
            leave.status === 'approved' ? 'bg-green-50 border-green-200' :
            leave.status === 'rejected' ? 'bg-red-50 border-red-200' :
            leave.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {leave.status === 'approved' && <CheckCircle className="h-6 w-6 text-green-600" />}
                {leave.status === 'rejected' && <XCircle className="h-6 w-6 text-red-600" />}
                {leave.status === 'pending' && <Clock className="h-6 w-6 text-yellow-600" />}
                {leave.status === 'cancelled' && <XCircle className="h-6 w-6 text-gray-600" />}
                <div>
                  <p className="font-semibold text-lg capitalize">{leave.status}</p>
                  {leave.approvedBy && (
                    <p className="text-sm text-muted-foreground">
                      by {leave.approvedBy} on {formatDateTimeDisplay(leave.approvedAt || '')}
                    </p>
                  )}
                  {leave.rejectedBy && (
                    <p className="text-sm text-muted-foreground">
                      by {leave.rejectedBy} on {formatDateTimeDisplay(leave.rejectedAt || '')}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                <Crown className="mr-1 h-3 w-3" />
                Manager
              </Badge>
            </div>
          </div>

          {/* Manager Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Manager Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium">{leave.managerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ID:</span>
                  <span className="text-sm font-medium">{leave.managerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Department:</span>
                  <span className="text-sm font-medium">{leave.managerDepartment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Position:</span>
                  <span className="text-sm font-medium">{leave.managerPosition || 'Manager'}</span>
                </div>
                {leave.managerEmail && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm font-medium">{leave.managerEmail}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Contact:</span>
                  <span className="text-sm font-medium">{leave.managerContact}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Leave Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Leave Type:</span>
                  <Badge className={getLeaveTypeBadge(leave.leaveType)}>
                    {leave.leaveType}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">From Date:</span>
                  <span className="text-sm font-medium">{formatDateDisplay(leave.fromDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">To Date:</span>
                  <span className="text-sm font-medium">{formatDateDisplay(leave.toDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Days:</span>
                  <span className="text-sm font-bold">{leave.totalDays}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reason */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-muted/30 p-3 rounded-lg">{leave.reason}</p>
            </CardContent>
          </Card>

          {/* Superadmin Remarks */}
          {leave.superadminRemarks && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Superadmin Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm bg-muted/30 p-3 rounded-lg">{leave.superadminRemarks}</p>
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Applied By:</span>
                <span className="text-sm font-medium">{leave.appliedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Applied On:</span>
                <span className="text-sm font-medium">{formatDateTimeDisplay(leave.appliedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Updated:</span>
                <span className="text-sm font-medium">{formatDateTimeDisplay(leave.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons - FIXED DELETE BUTTON */}
          {leave.status === 'pending' && (
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (onDeleteById) {
                    // Use the ID-based delete handler
                    onDeleteById(leave._id);
                    onOpenChange(false);
                  } else if (onDelete) {
                    // Fallback to object-based delete handler
                    onDelete(leave);
                    onOpenChange(false);
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  if (onEdit) {
                    onEdit(leave);
                    onOpenChange(false);
                  }
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Edit Manager Leave Dialog Component
interface EditManagerLeaveDialogProps {
  leave: ManagerLeaveRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (leaveId: string, data: any) => Promise<void>;
}

const EditManagerLeaveDialog: React.FC<EditManagerLeaveDialogProps> = ({ 
  leave, 
  open, 
  onOpenChange,
  onSave
}) => {
  const [formData, setFormData] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [formErrors, setFormErrors] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (leave) {
      setFormData({
        leaveType: leave.leaveType,
        fromDate: leave.fromDate?.split('T')[0] || '',
        toDate: leave.toDate?.split('T')[0] || '',
        reason: leave.reason
      });
    }
  }, [leave]);

  const validateForm = (): boolean => {
    const errors = {
      leaveType: '',
      fromDate: '',
      toDate: '',
      reason: ''
    };
    
    let isValid = true;
    
    if (!formData.leaveType) {
      errors.leaveType = 'Please select leave type';
      isValid = false;
    }
    
    if (!formData.fromDate) {
      errors.fromDate = 'Please select from date';
      isValid = false;
    }
    
    if (!formData.toDate) {
      errors.toDate = 'Please select to date';
      isValid = false;
    }
    
    if (!formData.reason.trim()) {
      errors.reason = 'Please enter reason for leave';
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!leave) return;
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const fromDate = new Date(formData.fromDate);
    const toDate = new Date(formData.toDate);
    
    if (fromDate > toDate) {
      toast.error('From date must be before to date');
      return;
    }

    const totalDays = calculateDaysBetween(formData.fromDate, formData.toDate);

    setIsSubmitting(true);
    try {
      await onSave(leave._id, {
        ...formData,
        totalDays
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!leave) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-leaveType">Leave Type *</Label>
            <Select
              value={formData.leaveType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, leaveType: value }))}
            >
              <SelectTrigger className={formErrors.leaveType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual Leave</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="casual">Casual Leave</SelectItem>
                <SelectItem value="maternity">Maternity Leave</SelectItem>
                <SelectItem value="paternity">Paternity Leave</SelectItem>
                <SelectItem value="bereavement">Bereavement Leave</SelectItem>
                <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.leaveType && (
              <p className="text-xs text-red-500">{formErrors.leaveType}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fromDate">From Date *</Label>
              <Input
                id="edit-fromDate"
                type="date"
                value={formData.fromDate}
                onChange={(e) => setFormData(prev => ({ ...prev, fromDate: e.target.value }))}
                className={formErrors.fromDate ? 'border-red-500' : ''}
                required
              />
              {formErrors.fromDate && (
                <p className="text-xs text-red-500">{formErrors.fromDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-toDate">To Date *</Label>
              <Input
                id="edit-toDate"
                type="date"
                value={formData.toDate}
                onChange={(e) => setFormData(prev => ({ ...prev, toDate: e.target.value }))}
                min={formData.fromDate}
                className={formErrors.toDate ? 'border-red-500' : ''}
                required
              />
              {formErrors.toDate && (
                <p className="text-xs text-red-500">{formErrors.toDate}</p>
              )}
            </div>
          </div>

          {formData.fromDate && formData.toDate && (
            <div className="text-sm text-muted-foreground">
              Total Days: {calculateDaysBetween(formData.fromDate, formData.toDate)} days
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-reason">Reason *</Label>
            <Textarea
              id="edit-reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Please provide a reason for leave"
              className={formErrors.reason ? 'border-red-500' : ''}
              rows={3}
              required
            />
            {formErrors.reason && (
              <p className="text-xs text-red-500">{formErrors.reason}</p>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Update Leave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Site Leave Details Component
interface SiteLeaveDetailsProps {
  siteData: SiteLeaveData;
  onBack: () => void;
  selectedDate: string;
  onApprove: (leaveId: string, remarks: string) => Promise<void>;
  onReject: (leaveId: string, remarks: string) => Promise<void>;
  onRevertToPending: (leaveId: string, remarks: string) => Promise<void>;
}

const SiteLeaveDetails: React.FC<SiteLeaveDetailsProps> = ({ 
  siteData, 
  onBack, 
  selectedDate, 
  onApprove, 
  onReject,
  onRevertToPending
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    if (siteData?.leaves && siteData.leaves.length > 0) {
      console.log(`Setting ${siteData.leaves.length} leaves in details view`);
      setLeaves(siteData.leaves);
    }
  }, [siteData?.leaves]);

  const allLeaves = leaves;
  const pendingLeaves = allLeaves.filter(l => l.status === 'pending');
  const approvedLeaves = allLeaves.filter(l => l.status === 'approved');
  const rejectedLeaves = allLeaves.filter(l => l.status === 'rejected');
  const cancelledLeaves = allLeaves.filter(l => l.status === 'cancelled');
  const supervisorLeaves = allLeaves.filter(l => l.isSupervisorLeave);
  const employeeLeaves = allLeaves.filter(l => !l.isSupervisorLeave && !l.isManagerLeave);
  const managerLeaves = allLeaves.filter(l => l.isManagerLeave);

  const filteredLeaves = useMemo(() => {
    let filtered = [];
    switch (activeTab) {
      case 'pending':
        filtered = pendingLeaves;
        break;
      case 'approved':
        filtered = approvedLeaves;
        break;
      case 'rejected':
        filtered = rejectedLeaves;
        break;
      default:
        filtered = allLeaves;
    }

    if (employeeSearch) {
      filtered = filtered.filter(l =>
        l.employeeName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (l.employeeId && l.employeeId.toLowerCase().includes(employeeSearch.toLowerCase())) ||
        l.leaveType.toLowerCase().includes(employeeSearch.toLowerCase())
      );
    }

    return filtered;
  }, [activeTab, employeeSearch, allLeaves, pendingLeaves, approvedLeaves, rejectedLeaves]);

  const paginatedLeaves = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLeaves.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLeaves, currentPage]);

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return "bg-green-100 text-green-800 border-green-200";
      case 'rejected':
        return "bg-red-100 text-red-800 border-red-200";
      case 'pending':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'cancelled':
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'annual':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'sick':
        return "bg-red-100 text-red-800 border-red-200";
      case 'casual':
        return "bg-green-100 text-green-800 border-green-200";
      case 'maternity':
        return "bg-purple-100 text-purple-800 border-purple-200";
      case 'paternity':
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case 'bereavement':
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleBadge = (leave: LeaveRequest) => {
    if (leave.isManagerLeave) {
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Manager</Badge>;
    } else if (leave.isSupervisorLeave) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Supervisor</Badge>;
    } else {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Employee</Badge>;
    }
  };

  const handleViewLeave = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setViewDialogOpen(true);
  };

  return (
    <>
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sites
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {siteData.name} - Leave Details
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatDateDisplay(selectedDate)} • {siteData.totalEmployees} employees • {leaves.length} leave requests
                {siteData.clientName && ` • Client: ${siteData.clientName}`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6"
        >
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-600">{siteData.totalEmployees}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{siteData.pendingLeaves}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{siteData.approvedLeaves}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{siteData.rejectedLeaves}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800">Supervisor</p>
                  <p className="text-2xl font-bold text-amber-600">{siteData.supervisorLeaves}</p>
                </div>
                <Shield className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Manager</p>
                  <p className="text-2xl font-bold text-purple-600">{siteData.managerLeaves}</p>
                </div>
                <Crown className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Role Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Crown className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Manager Leaves</p>
                    <p className="text-xl font-bold text-purple-600">{managerLeaves.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Supervisor Leaves</p>
                    <p className="text-xl font-bold text-amber-600">{supervisorLeaves.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Employee Leaves</p>
                    <p className="text-xl font-bold text-blue-600">{employeeLeaves.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters and Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
                  <Button
                    variant={activeTab === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                  >
                    All ({allLeaves.length})
                  </Button>
                  <Button
                    variant={activeTab === 'pending' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                  >
                    Pending ({pendingLeaves.length})
                  </Button>
                  <Button
                    variant={activeTab === 'approved' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => { setActiveTab('approved'); setCurrentPage(1); }}
                  >
                    Approved ({approvedLeaves.length})
                  </Button>
                  <Button
                    variant={activeTab === 'rejected' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => { setActiveTab('rejected'); setCurrentPage(1); }}
                  >
                    Rejected ({rejectedLeaves.length})
                  </Button>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by employee, ID, type..."
                    value={employeeSearch}
                    onChange={(e) => { setEmployeeSearch(e.target.value); setCurrentPage(1); }}
                    className="w-full lg:w-64"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leave Requests Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                Leave Requests - {filteredLeaves.length} found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left font-medium">Employee</th>
                        <th className="h-12 px-4 text-left font-medium">Role</th>
                        <th className="h-12 px-4 text-left font-medium">Leave Type</th>
                        <th className="h-12 px-4 text-left font-medium">Dates</th>
                        <th className="h-12 px-4 text-left font-medium">Days</th>
                        <th className="h-12 px-4 text-left font-medium">Status</th>
                        <th className="h-12 px-4 text-left font-medium">Applied</th>
                        <th className="h-12 px-4 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLeaves.length > 0 ? (
                        paginatedLeaves.map((leave) => (
                          <tr key={leave._id} className="border-b hover:bg-muted/50">
                            <td className="p-4 align-middle">
                              <div className="font-medium">{leave.employeeName}</div>
                              <div className="text-xs text-muted-foreground">{leave.employeeId}</div>
                            </td>
                            <td className="p-4 align-middle">
                              {getRoleBadge(leave)}
                            </td>
                            <td className="p-4 align-middle">
                              <Badge className={getLeaveTypeBadge(leave.leaveType)}>
                                {leave.leaveType}
                              </Badge>
                            </td>
                            <td className="p-4 align-middle">
                              <div className="text-xs">
                                <div>{formatDateDisplay(leave.fromDate)}</div>
                                <div>to {formatDateDisplay(leave.toDate)}</div>
                              </div>
                            </td>
                            <td className="p-4 align-middle font-bold">{leave.totalDays}</td>
                            <td className="p-4 align-middle">
                              <Badge className={getStatusBadge(leave.status)}>
                                {leave.status}
                              </Badge>
                            </td>
                            <td className="p-4 align-middle text-xs">{formatDateDisplay(leave.createdAt)}</td>
                            <td className="p-4 align-middle">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewLeave(leave)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            No leave requests found for the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredLeaves.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLeaves.length)} of {filteredLeaves.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                        First
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                        Next
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                        Last
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* View Leave Dialog */}
      <ViewLeaveDialog
        leave={selectedLeave}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onApprove={onApprove}
        onReject={onReject}
        onRevertToPending={onRevertToPending}
      />
    </>
  );
};

const ManagerLeaves = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useRole();
  
  // Current user state
  const [managerId, setManagerId] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  const [managerDepartment, setManagerDepartment] = useState<string>('');
  const [managerContact, setManagerContact] = useState<string>('');
  const [managerEmail, setManagerEmail] = useState<string>('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState("team-leaves");
  
  // Leave data states
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]); // Employee & Supervisor leaves
  const [managerLeaves, setManagerLeaves] = useState<ManagerLeaveRequest[]>([]); // Manager's own leaves
  const [sites, setSites] = useState<Site[]>([]);
  const [siteLeaveData, setSiteLeaveData] = useState<SiteLeaveData[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [currentPage, setCurrentPage] = useState(1);
  const [showSiteDetails, setShowSiteDetails] = useState(false);
  const [selectedSite, setSelectedSite] = useState<SiteLeaveData | null>(null);
  
  // My Leaves filter states
  const [myLeavesFilter, setMyLeavesFilter] = useState<string>("all");
  const [myLeavesSearch, setMyLeavesSearch] = useState('');
  const [myLeavesPage, setMyLeavesPage] = useState(1);
  
  // Supervisor Leaves filter states
  const [supervisorFilter, setSupervisorFilter] = useState<string>("all");
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisorPage, setSupervisorPage] = useState(1);
  
  // Apply for Leave Dialog
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyFormData, setApplyFormData] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // View Details Dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  
  // View Manager Leave Details Dialog
  const [viewManagerDialogOpen, setViewManagerDialogOpen] = useState(false);
  const [selectedManagerLeave, setSelectedManagerLeave] = useState<ManagerLeaveRequest | null>(null);
  
  // Edit/Delete states for manager leaves
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLeaveForEdit, setSelectedLeaveForEdit] = useState<ManagerLeaveRequest | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState<LeaveStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    supervisorLeaves: 0,
    employeeLeaves: 0,
    managerLeaves: 0,
    totalDays: 0
  });
  
  const itemsPerPage = 10;

  // Initialize current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        if (authUser) {
          const userId = authUser._id || authUser.id;
          
          if (userId) {
            const allUsersResponse = await userService.getAllUsers();
            const foundUser = allUsersResponse.allUsers.find((user: any) => 
              user._id === userId || user.id === userId
            );
            
            if (foundUser) {
              setManagerId(foundUser._id);
              setManagerName(foundUser.name || foundUser.firstName || 'Manager');
              setManagerDepartment(foundUser.department || '');
              setManagerContact(foundUser.phone || foundUser.contactNumber || '');
              setManagerEmail(foundUser.email || '');
            } else {
              const storedUser = localStorage.getItem("sk_user");
              if (storedUser) {
                const user = JSON.parse(storedUser);
                setManagerId(user._id || user.id);
                setManagerName(user.name || user.firstName || 'Manager');
                setManagerDepartment(user.department || '');
                setManagerContact(user.phone || user.contactNumber || '');
                setManagerEmail(user.email || '');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, [authUser]);

  // Fetch all data when managerId is available
  useEffect(() => {
    if (managerId) {
      fetchAllData();
    }
  }, [managerId]);

  // Recalculate when date changes
  useEffect(() => {
    if (sites.length > 0 && activeTab === "team-leaves") {
      calculateSiteLeaveData(sites, selectedDate);
    }
  }, [selectedDate, activeTab]);

  // Fetch all data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all leave requests (employee & supervisor)
      const leaves = await fetchAllLeaveRequests(selectedDate);
      setLeaveRequests(leaves);
      
      // Fetch manager's own leaves
      const myLeaves = await fetchMyManagerLeaves(managerId);
      console.log('📊 Manager leaves fetched:', myLeaves);
      setManagerLeaves(myLeaves);
      
      // Fetch sites where manager is assigned
      const sitesData = await fetchManagerSites(managerId);
      setSites(sitesData);
      
      // Calculate site leave data
      await calculateSiteLeaveData(sitesData, selectedDate, leaves);
      
      // Update statistics
      updateStats(leaves, myLeaves);
      
      console.log(`✅ Loaded ${leaves.length} total leaves, ${myLeaves.length} manager leaves, ${sitesData.length} sites`);
    } catch (error: any) {
      console.error('❌ Error fetching data:', error);
      setError(error.message || 'Failed to load data');
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  // Test API connection
  const testApiConnection = async () => {
    try {
      console.log('🔄 Testing API connection...');
      
      // Test main API
      const testResponse = await fetch(`${API_URL}/test`);
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('✅ Main API test:', testData);
        toast.success('Main API connected');
      } else {
        console.warn('⚠️ Main API test failed');
      }
      
      // Test manager leaves API
      const managerTestResponse = await fetch(`${API_URL}/manager-leaves/test`);
      if (managerTestResponse.ok) {
        const managerTestData = await managerTestResponse.json();
        console.log('✅ Manager leaves API test:', managerTestData);
        toast.success('Manager leaves API connected');
      } else {
        console.warn('⚠️ Manager leaves API test failed');
        toast.warning('Manager leaves API not available');
      }
    } catch (error) {
      console.error('❌ API test failed:', error);
      toast.error('API connection failed');
    }
  };

  // Call this in useEffect after managerId is set
  useEffect(() => {
    if (managerId) {
      testApiConnection();
    }
  }, [managerId]);

  // Calculate site leave data
  const calculateSiteLeaveData = async (sitesList: Site[], date: string, leaves?: LeaveRequest[]) => {
    try {
      setRefreshing(true);
      
      const allLeaves = leaves || leaveRequests;
      const data: SiteLeaveData[] = [];
      
      for (const site of sitesList) {
        const siteLeave = await generateSiteLeaveData(site, date, allLeaves);
        data.push(siteLeave);
      }
      
      setSiteLeaveData(data);
      
    } catch (error) {
      console.error('Error calculating site data:', error);
      toast.error('Error calculating leave data');
    } finally {
      setRefreshing(false);
    }
  };

  // Update statistics
  const updateStats = (leaves: LeaveRequest[], myLeaves: ManagerLeaveRequest[]) => {
    const supervisorLeaves = leaves.filter(l => l.isSupervisorLeave).length;
    const employeeLeaves = leaves.filter(l => !l.isSupervisorLeave && !l.isManagerLeave).length;
    
    setStats({
      total: leaves.length + myLeaves.length,
      pending: leaves.filter(l => l.status === 'pending').length + myLeaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length + myLeaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length + myLeaves.filter(l => l.status === 'rejected').length,
      cancelled: leaves.filter(l => l.status === 'cancelled').length + myLeaves.filter(l => l.status === 'cancelled').length,
      supervisorLeaves,
      employeeLeaves,
      managerLeaves: myLeaves.length,
      totalDays: leaves.reduce((sum, l) => sum + l.totalDays, 0) + myLeaves.reduce((sum, l) => sum + l.totalDays, 0)
    });
  };

  // Handle approve leave
 // Example for approve:
const handleApproveLeave = async (leaveId: string, remarks: string) => {
  try {
    const response = await fetch(`${API_URL}/leaves/${leaveId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', managerId, managerName, remarks })
    });
    const data = await response.json();
    if (response.ok && data.success) {
      // ✅ NEW: Dispatch event
      const leave = leaveRequests.find(l => l._id === leaveId);
      if (leave) {
        window.dispatchEvent(new CustomEvent('leave-update', {
          detail: {
            leaveId: leave._id,
            title: '✅ Leave Approved',
            message: `${leave.employeeName}'s ${leave.leaveType} leave has been approved by ${managerName}`,
            notificationType: 'leave_approved',
            employeeName: leave.employeeName,
            leaveType: leave.leaveType,
            approvedBy: managerName
          }
        }));
      }
      
      toast.success('Leave approved successfully');
      await fetchAllData();
    } else {
      toast.error(data.message || 'Failed to approve leave');
    }
  } catch (error: any) {
      console.error('❌ Error approving leave:', error);
      toast.error('Failed to approve leave');
    }
  };

  // Handle reject leave
  const handleRejectLeave = async (leaveId: string, remarks: string) => {
    try {
      const response = await fetch(`${API_URL}/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'rejected',
          managerId,
          managerName,
          remarks
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
  const leave = leaveRequests.find(l => l._id === leaveId);
      if (leave) {
         window.dispatchEvent(new CustomEvent('leave-update', {
    detail: {
      leaveId: leave._id,
      title: '❌ Leave Rejected',
      message: `${leave.employeeName}'s ${leave.leaveType} leave has been rejected by ${managerName}`,
      notificationType: 'leave_rejected',
      employeeName: leave.employeeName,
      leaveType: leave.leaveType,
      rejectedBy: managerName
    }
  }));
}
        toast.success('Leave rejected successfully');
        await fetchAllData();
      } else {
        toast.error(data.message || 'Failed to reject leave');
      }
    } catch (error: any) {
      console.error('❌ Error rejecting leave:', error);
      toast.error('Failed to reject leave');
    }
  };

  // Handle revert to pending
  const handleRevertToPending = async (leaveId: string, remarks: string) => {
    try {
      const response = await fetch(`${API_URL}/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'pending',
          managerId,
          managerName,
          remarks
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Leave reverted to pending successfully');
        await fetchAllData();
      } else {
        toast.error(data.message || 'Failed to revert leave');
      }
    } catch (error: any) {
      console.error('❌ Error reverting leave:', error);
      toast.error('Failed to revert leave');
    }
  };

  // Handle edit manager leave
  const handleEditManagerLeave = async (leaveId: string, data: any) => {
    try {
      setIsSubmittingEdit(true);
      
      console.log('📤 Updating manager leave:', {
        leaveId,
        data,
        endpoint: `${API_URL}/manager-leaves/${leaveId}`
      });
      
      const response = await fetch(`${API_URL}/manager-leaves/${leaveId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          updatedBy: managerName
        })
      });

      // Check if response is OK
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        
        if (response.status === 404) {
          throw new Error('Manager leave endpoint not found. Please check if backend server is running and routes are configured.');
        }
        
        throw new Error(errorData.message || `http error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Update response:', result);

      if (result.success) {
        toast.success('Leave request updated successfully');
        
        // Update local state
        setManagerLeaves(prev => 
          prev.map(leave => 
            leave._id === leaveId ? { ...leave, ...data } : leave
          )
        );
        
        setEditDialogOpen(false);
      } else {
        toast.error(result.message || 'Failed to update leave');
      }
    } catch (error: any) {
      console.error('❌ Error updating leave:', error);
      toast.error(error.message || 'Failed to update leave');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle delete manager leave (by ID) - NEW FUNCTION FOR VIEW DIALOG
  const handleDeleteById = async (leaveId: string) => {
    try {
      setIsSubmittingDelete(true);
      
      const response = await fetch(`${API_URL}/manager-leaves/${leaveId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deletedBy: managerName
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Leave request deleted successfully');
        await fetchAllData();
        setDeleteDialogOpen(false);
        setViewManagerDialogOpen(false);
      } else {
        toast.error(result.message || 'Failed to delete leave');
      }
    } catch (error: any) {
      console.error('Error deleting leave:', error);
      toast.error('Failed to delete leave');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Handle delete manager leave (by object) - FOR TABLE DELETE ICON
  const handleDeleteClick = (leave: ManagerLeaveRequest) => {
    setSelectedLeaveForEdit(leave);
    setDeleteDialogOpen(true);
  };

  // Handle apply for manager leave
const handleApplyManagerLeave = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation (same as before)
  if (!applyFormData.leaveType) {
    toast.error('Please select leave type');
    return;
  }
  if (!applyFormData.fromDate || !applyFormData.toDate) {
    toast.error('Please select dates');
    return;
  }
  const fromDate = new Date(applyFormData.fromDate);
  const toDate = new Date(applyFormData.toDate);
  if (fromDate > toDate) {
    toast.error('From date must be before to date');
    return;
  }
  const totalDays = calculateDaysBetween(applyFormData.fromDate, applyFormData.toDate);
  if (!applyFormData.reason) {
    toast.error('Please provide a reason');
    return;
  }

  setIsSubmitting(true);
  try {
    const leaveData = {
      managerId,
      managerName,
      managerDepartment,
      managerPosition: 'Manager',
      managerEmail,
      managerContact: managerContact || '0000000000',
      leaveType: applyFormData.leaveType,
      fromDate: applyFormData.fromDate,
      toDate: applyFormData.toDate,
      totalDays,
      reason: applyFormData.reason,
      appliedBy: managerName,
      appliedDate: new Date().toISOString()
    };

    const response = await fetch(`${API_URL}/manager-leaves/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leaveData)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      toast.success('Leave request submitted successfully! Waiting for superadmin approval.');

      // ✅ Dispatch leave-update event here, using the returned data
      window.dispatchEvent(new CustomEvent('leave-update', {
        detail: {
          leaveId: data._id || data.leaveId || applyFormData.leaveId,
          title: '📅 New Manager Leave Request',
          message: `${managerName} applied for ${applyFormData.leaveType} leave (${totalDays} days)`,
          notificationType: 'leave_request',
          employeeName: managerName,
          leaveType: applyFormData.leaveType,
          totalDays
        }
      }));

      setApplyDialogOpen(false);
      setApplyFormData({
        leaveType: '',
        fromDate: '',
        toDate: '',
        reason: ''
      });
      await fetchAllData();
      setActiveTab('my-leaves');
    } else {
      toast.error(data.message || 'Failed to apply for leave');
    }
  } catch (error: any) {
    console.error('❌ Error applying for leave:', error);
    toast.error('Failed to apply for leave');
  } finally {
    setIsSubmitting(false);
  }
};

  // Handle view site details
  const handleViewSiteDetails = (site: SiteLeaveData) => {
    setSelectedSite(site);
    setShowSiteDetails(true);
  };

  // Handle back from site details
  const handleBackFromSiteDetails = () => {
    setShowSiteDetails(false);
    setSelectedSite(null);
  };

  // Handle view manager leave details
  const handleViewManagerLeave = (leave: ManagerLeaveRequest) => {
    setSelectedManagerLeave(leave);
    setViewManagerDialogOpen(true);
  };

  // Handle edit click
  const handleEditClick = (leave: ManagerLeaveRequest) => {
    setSelectedLeaveForEdit(leave);
    setEditDialogOpen(true);
  };

  // Handle refresh all data
  const handleRefresh = async () => {
    await fetchAllData();
    toast.success('Data refreshed successfully');
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setCurrentPage(1);
  };

  // Filter sites based on search
  const filteredSites = useMemo(() => {
    if (!siteLeaveData || siteLeaveData.length === 0) return [];
    
    return siteLeaveData.filter(site =>
      site.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [siteLeaveData, searchTerm]);

  // Filter supervisor leaves
  const filteredSupervisorLeaves = useMemo(() => {
    const supervisorLeaves = leaveRequests.filter(l => l.isSupervisorLeave);
    
    let filtered = supervisorLeaves;
    
    if (supervisorFilter !== 'all') {
      filtered = filtered.filter(l => l.status === supervisorFilter);
    }
    
    if (supervisorSearch) {
      filtered = filtered.filter(l =>
        l.employeeName.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
        l.employeeId.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
        l.leaveType.toLowerCase().includes(supervisorSearch.toLowerCase())
      );
    }
    
    return filtered;
  }, [leaveRequests, supervisorFilter, supervisorSearch]);

  // Filter my leaves (manager's own leaves)
  const filteredMyLeaves = useMemo(() => {
    let filtered = managerLeaves;
    
    if (myLeavesFilter !== 'all') {
      filtered = filtered.filter(l => l.status === myLeavesFilter);
    }
    
    if (myLeavesSearch) {
      filtered = filtered.filter(l =>
        l.leaveType.toLowerCase().includes(myLeavesSearch.toLowerCase()) ||
        l.reason.toLowerCase().includes(myLeavesSearch.toLowerCase())
      );
    }
    
    return filtered;
  }, [managerLeaves, myLeavesFilter, myLeavesSearch]);

  // Paginate sites
  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSites.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSites, currentPage]);

  // Paginate supervisor leaves
  const paginatedSupervisorLeaves = useMemo(() => {
    const startIndex = (supervisorPage - 1) * itemsPerPage;
    return filteredSupervisorLeaves.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSupervisorLeaves, supervisorPage]);

  // Paginate my leaves
  const paginatedMyLeaves = useMemo(() => {
    const startIndex = (myLeavesPage - 1) * itemsPerPage;
    return filteredMyLeaves.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMyLeaves, myLeavesPage]);

  const totalSitePages = Math.ceil(filteredSites.length / itemsPerPage);
  const totalSupervisorPages = Math.ceil(filteredSupervisorLeaves.length / itemsPerPage);
  const totalMyLeavesPages = Math.ceil(filteredMyLeaves.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return "bg-green-100 text-green-800 border-green-200";
      case 'rejected':
        return "bg-red-100 text-red-800 border-red-200";
      case 'pending':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'cancelled':
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleBadge = (leave: LeaveRequest) => {
    if (leave.isManagerLeave) {
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Manager</Badge>;
    } else if (leave.isSupervisorLeave) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Supervisor</Badge>;
    } else {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Employee</Badge>;
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'annual':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'sick':
        return "bg-red-100 text-red-800 border-red-200";
      case 'casual':
        return "bg-green-100 text-green-800 border-green-200";
      case 'maternity':
        return "bg-purple-100 text-purple-800 border-purple-200";
      case 'paternity':
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case 'bereavement':
        return "bg-gray-100 text-gray-800 border-gray-200";
      case 'unpaid':
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getManagerLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'annual':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'sick':
        return "bg-red-100 text-red-800 border-red-200";
      case 'casual':
        return "bg-green-100 text-green-800 border-green-200";
      case 'maternity':
        return "bg-purple-100 text-purple-800 border-purple-200";
      case 'paternity':
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case 'bereavement':
        return "bg-gray-100 text-gray-800 border-gray-200";
      case 'unpaid':
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // If showing site details, render the details component
  if (showSiteDetails && selectedSite) {
    return (
      <SiteLeaveDetails
        siteData={selectedSite}
        onBack={handleBackFromSiteDetails}
        selectedDate={selectedDate}
        onApprove={handleApproveLeave}
        onReject={handleRejectLeave}
        onRevertToPending={handleRevertToPending}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Leave Management" 
        subtitle="Manage team leaves, supervisor leaves, and your personal leaves"
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Manager Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  {managerName}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="default" className="text-sm capitalize">
                    Manager
                  </Badge>
                  {managerDepartment && (
                    <Badge variant="outline" className="text-sm">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {managerDepartment}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="default" size="sm" onClick={() => setApplyDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Apply for Leave
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leaves</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pending} pending • {stats.approved} approved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Supervisor Leaves</CardTitle>
              <Shield className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.supervisorLeaves}</div>
              <p className="text-xs text-muted-foreground">From supervisors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employee Leaves</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.employeeLeaves}</div>
              <p className="text-xs text-muted-foreground">From employees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Leaves</CardTitle>
              <Crown className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.managerLeaves}</div>
              <p className="text-xs text-muted-foreground">Your personal leaves</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="team-leaves" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Team Leaves
            </TabsTrigger>
            <TabsTrigger value="supervisor-leaves" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Supervisor Leaves
            </TabsTrigger>
            <TabsTrigger value="my-leaves" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              My Leaves
            </TabsTrigger>
          </TabsList>

          {/* Team Leaves Tab */}
          <TabsContent value="team-leaves" className="space-y-6">
            {/* Filters with Date Selection */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={handleDateChange}
                      className="w-40"
                    />
                    <Button variant="outline" size="sm" onClick={() => setSelectedDate(formatDate(new Date()))}>
                      Today
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search sites..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Showing leave data for {formatDateDisplay(selectedDate)}
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading sites data...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={handleRefresh}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Sites Table */}
            {!loading && !error && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Sites Leave Overview - {formatDateDisplay(selectedDate)}
                  </CardTitle>
                  <CardDescription>
                    Showing {filteredSites.length} sites • {siteLeaveData.reduce((sum, site) => sum + site.totalEmployees, 0)} total employees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredSites.length === 0 ? (
                    <div className="text-center py-12">
                      <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites Found</h3>
                      <p className="text-gray-500">
                        {searchTerm
                          ? 'No sites match your search criteria.'
                          : 'No sites are currently assigned to you.'}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="h-12 px-4 text-left font-medium">Site Name</th>
                              <th className="h-12 px-4 text-left font-medium">Client</th>
                              <th className="h-12 px-4 text-left font-medium">Location</th>
                              <th className="h-12 px-4 text-left font-medium">Total Emp</th>
                              <th className="h-12 px-4 text-left font-medium text-yellow-700 bg-yellow-50">Pending</th>
                              <th className="h-12 px-4 text-left font-medium text-green-700 bg-green-50">Approved</th>
                              <th className="h-12 px-4 text-left font-medium text-red-700 bg-red-50">Rejected</th>
                              <th className="h-12 px-4 text-left font-medium text-amber-700 bg-amber-50">Supervisor</th>
                              <th className="h-12 px-4 text-left font-medium text-blue-700 bg-blue-50">Employee</th>
                              <th className="h-12 px-4 text-left font-medium text-purple-700 bg-purple-50">Manager</th>
                              <th className="h-12 px-4 text-left font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedSites.map((site) => (
                              <tr key={site.id} className="border-b hover:bg-muted/50">
                                <td className="p-4 align-middle font-medium">
                                  <div className="font-medium">{site.name}</div>
                                  {site.isRealData && (
                                    <Badge variant="outline" className="mt-1 text-xs bg-green-50">
                                      Real Data
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-4 align-middle">{site.clientName || '-'}</td>
                                <td className="p-4 align-middle">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    {site.location || '-'}
                                  </div>
                                </td>
                                <td className="p-4 align-middle font-bold">{site.totalEmployees}</td>
                                <td className="p-4 align-middle font-bold text-yellow-700 bg-yellow-50">{site.pendingLeaves}</td>
                                <td className="p-4 align-middle font-bold text-green-700 bg-green-50">{site.approvedLeaves}</td>
                                <td className="p-4 align-middle font-bold text-red-700 bg-red-50">{site.rejectedLeaves}</td>
                                <td className="p-4 align-middle font-bold text-amber-700 bg-amber-50">{site.supervisorLeaves}</td>
                                <td className="p-4 align-middle font-bold text-blue-700 bg-blue-50">{site.employeeLeaves}</td>
                                <td className="p-4 align-middle font-bold text-purple-700 bg-purple-50">{site.managerLeaves}</td>
                                <td className="p-4 align-middle">
                                  <Button variant="outline" size="sm" onClick={() => handleViewSiteDetails(site)}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {filteredSites.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
                          <div className="text-sm text-muted-foreground">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSites.length)} of {filteredSites.length} sites
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                              First
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                              Previous
                            </Button>
                            <span className="text-sm">
                              Page {currentPage} of {totalSitePages}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalSitePages}>
                              Next
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalSitePages)} disabled={currentPage === totalSitePages}>
                              Last
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Supervisor Leaves Tab */}
          <TabsContent value="supervisor-leaves" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search supervisors..."
                      value={supervisorSearch}
                      onChange={(e) => setSupervisorSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supervisor Leaves Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-600" />
                  Supervisor Leave Requests
                </CardTitle>
                <CardDescription>
                  Showing {filteredSupervisorLeaves.length} supervisor leave requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredSupervisorLeaves.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Supervisor Leaves</h3>
                    <p className="text-gray-500">
                      {supervisorSearch || supervisorFilter !== 'all'
                        ? 'No supervisor leave requests match your filters.'
                        : 'No supervisor leave requests found.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="h-12 px-4 text-left font-medium">Supervisor</th>
                            <th className="h-12 px-4 text-left font-medium">ID</th>
                            <th className="h-12 px-4 text-left font-medium">Leave Type</th>
                            <th className="h-12 px-4 text-left font-medium">Dates</th>
                            <th className="h-12 px-4 text-left font-medium">Days</th>
                            <th className="h-12 px-4 text-left font-medium">Status</th>
                            <th className="h-12 px-4 text-left font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedSupervisorLeaves.map((leave) => (
                            <tr key={leave._id} className="border-b hover:bg-muted/50">
                              <td className="p-4 align-middle font-medium">{leave.employeeName}</td>
                              <td className="p-4 align-middle font-mono text-xs">{leave.employeeId}</td>
                              <td className="p-4 align-middle">
                                <Badge className={getLeaveTypeBadge(leave.leaveType)}>
                                  {leave.leaveType}
                                </Badge>
                              </td>
                              <td className="p-4 align-middle">
                                <div className="text-xs">
                                  <div>{formatDateDisplay(leave.fromDate)}</div>
                                  <div>to {formatDateDisplay(leave.toDate)}</div>
                                </div>
                              </td>
                              <td className="p-4 align-middle font-bold">{leave.totalDays}</td>
                              <td className="p-4 align-middle">
                                <Badge className={getStatusBadge(leave.status)}>
                                  {leave.status}
                                </Badge>
                              </td>
                              <td className="p-4 align-middle">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setSelectedLeave(leave);
                                    setViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {filteredSupervisorLeaves.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {((supervisorPage - 1) * itemsPerPage) + 1} to {Math.min(supervisorPage * itemsPerPage, filteredSupervisorLeaves.length)} of {filteredSupervisorLeaves.length} leaves
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setSupervisorPage(1)} disabled={supervisorPage === 1}>
                            First
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSupervisorPage(supervisorPage - 1)} disabled={supervisorPage === 1}>
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {supervisorPage} of {totalSupervisorPages}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => setSupervisorPage(supervisorPage + 1)} disabled={supervisorPage === totalSupervisorPages}>
                            Next
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSupervisorPage(totalSupervisorPages)} disabled={supervisorPage === totalSupervisorPages}>
                            Last
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Leaves Tab */}
          <TabsContent value="my-leaves" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Select value={myLeavesFilter} onValueChange={setMyLeavesFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by leave type, reason..."
                      value={myLeavesSearch}
                      onChange={(e) => setMyLeavesSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* My Leaves Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-600" />
                  My Leave Requests
                </CardTitle>
                <CardDescription>
                  Showing {filteredMyLeaves.length} of your personal leave requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredMyLeaves.length === 0 ? (
                  <div className="text-center py-12">
                    <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Personal Leaves</h3>
                    <p className="text-gray-500 mb-4">
                      {myLeavesSearch || myLeavesFilter !== 'all' 
                        ? 'No leave requests match your filters.'
                        : 'You haven\'t applied for any leaves yet.'}
                    </p>
                    <Button onClick={() => setApplyDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Apply for Leave
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="h-12 px-4 text-left font-medium">Leave Type</th>
                            <th className="h-12 px-4 text-left font-medium">From Date</th>
                            <th className="h-12 px-4 text-left font-medium">To Date</th>
                            <th className="h-12 px-4 text-left font-medium">Days</th>
                            <th className="h-12 px-4 text-left font-medium">Status</th>
                            <th className="h-12 px-4 text-left font-medium">Reason</th>
                            <th className="h-12 px-4 text-left font-medium">Applied On</th>
                            <th className="h-12 px-4 text-left font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedMyLeaves.map((leave) => (
                            <tr key={leave._id} className="border-b hover:bg-muted/50">
                              <td className="p-4 align-middle">
                                <Badge className={getManagerLeaveTypeBadge(leave.leaveType)}>
                                  {leave.leaveType}
                                </Badge>
                              </td>
                              <td className="p-4 align-middle">{formatDateDisplay(leave.fromDate)}</td>
                              <td className="p-4 align-middle">{formatDateDisplay(leave.toDate)}</td>
                              <td className="p-4 align-middle font-bold">{leave.totalDays}</td>
                              <td className="p-4 align-middle">
                                <Badge className={getStatusBadge(leave.status)}>
                                  {leave.status}
                                </Badge>
                              </td>
                              <td className="p-4 align-middle max-w-xs truncate">{leave.reason}</td>
                              <td className="p-4 align-middle text-xs">{formatDateDisplay(leave.appliedDate)}</td>
                              <td className="p-4 align-middle">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewManagerLeave(leave)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  
                                  {leave.status === 'pending' && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-blue-600"
                                        onClick={() => handleEditClick(leave)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600"
                                        onClick={() => handleDeleteClick(leave)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {filteredMyLeaves.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {((myLeavesPage - 1) * itemsPerPage) + 1} to {Math.min(myLeavesPage * itemsPerPage, filteredMyLeaves.length)} of {filteredMyLeaves.length} leaves
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setMyLeavesPage(1)} disabled={myLeavesPage === 1}>
                            First
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setMyLeavesPage(myLeavesPage - 1)} disabled={myLeavesPage === 1}>
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {myLeavesPage} of {totalMyLeavesPages}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => setMyLeavesPage(myLeavesPage + 1)} disabled={myLeavesPage === totalMyLeavesPages}>
                            Next
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setMyLeavesPage(totalMyLeavesPages)} disabled={myLeavesPage === totalMyLeavesPages}>
                            Last
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Apply for Leave Dialog */}
        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Apply for Leave
              </DialogTitle>
              <DialogDescription>
                Submit a leave request for yourself. This will be sent to superadmin for approval.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleApplyManagerLeave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type *</Label>
                <Select
                  value={applyFormData.leaveType}
                  onValueChange={(value) => setApplyFormData(prev => ({ ...prev, leaveType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="maternity">Maternity Leave</SelectItem>
                    <SelectItem value="paternity">Paternity Leave</SelectItem>
                    <SelectItem value="bereavement">Bereavement Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date *</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={applyFormData.fromDate}
                    onChange={(e) => setApplyFormData(prev => ({ ...prev, fromDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">To Date *</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={applyFormData.toDate}
                    onChange={(e) => setApplyFormData(prev => ({ ...prev, toDate: e.target.value }))}
                    required
                  />
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
                  required
                  rows={3}
                />
              </div>

              <DialogFooter className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setApplyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog for Employee/Supervisor Leaves */}
        <ViewLeaveDialog
          leave={selectedLeave}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          onApprove={handleApproveLeave}
          onReject={handleRejectLeave}
          onRevertToPending={handleRevertToPending}
        />

        {/* View Details Dialog for Manager Leaves - UPDATED WITH onDeleteById PROP */}
        <ViewManagerLeaveDialog
          leave={selectedManagerLeave}
          open={viewManagerDialogOpen}
          onOpenChange={setViewManagerDialogOpen}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onDeleteById={handleDeleteById}
        />

        {/* Edit Manager Leave Dialog */}
        <EditManagerLeaveDialog
          leave={selectedLeaveForEdit}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleEditManagerLeave}
        />

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
                    <p className="font-medium">{selectedLeaveForEdit.managerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedLeaveForEdit.leaveType} • {selectedLeaveForEdit.totalDays} days
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDateDisplay(selectedLeaveForEdit.fromDate)} to {formatDateDisplay(selectedLeaveForEdit.toDate)}
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteById(selectedLeaveForEdit?._id || '')}
                className="bg-red-600 hover:bg-red-700"
                disabled={isSubmittingDelete}
              >
                {isSubmittingDelete && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
};

export default ManagerLeaves;