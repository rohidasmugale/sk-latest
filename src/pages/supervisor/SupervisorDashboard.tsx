import React, { useState, useEffect, useCallback,useRef } from 'react';
import { useOutletContext, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from '@/context/NotificationContext';
import { getLocation } from "@/utils/geo";
import { startLocationTracking, stopLocationTracking } from "@/utils/locationTracker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  ClipboardList, 
  CheckCircle2, 
  FileText, 
  AlertTriangle,
  Clock,
  TrendingUp,
  MessageSquare,
  Calendar,
  BarChart3,
  Plus,
  Download,
  Search,
  RefreshCw,
  LogIn,
  LogOut,
  Coffee,
  Timer,
  UserCheck,
  ClipboardCheck,
  AlertCircle,
  Wifi,
  WifiOff,
  Crown,
  Eye,
  Ban,
  Loader2,
  Building,
  CalendarDays,
  XCircle,
  UserX,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Home,
  Shield,
  Car,
  Trash2,
  Droplets,
  ShoppingCart,
  DollarSign,
  Briefcase,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  Info,
  Target,
  ExternalLink,
  UserCheck as UserCheckIcon,
  UserX as UserXIcon,
  Calendar as CalendarIcon,
  Filter,
  Camera,
  Paperclip,
  Cpu,       // <-- add
  Shirt,     // <-- add
  Images,    // <-- add
  Factory    // <-- add
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import CameraCapture from "./CameraCapture";
import { UnifiedCreateModal } from "@/components/shared/UnifiedCreateModal";
import { BackButton } from '@/components/shared/BackButton';
import { machineService } from '@/services/machineService';
// At the top of SupervisorDashboard.tsx, make sure you have:


// Then inside your component:

// API URL
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
  // API client with auth interceptor
const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
// Types
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  siteName?: string;
  status: "active" | "inactive" | "left";
  email?: string;
  phone?: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
}

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInPhoto?: string | null;
  checkOutPhoto?: string | null;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  totalHours?: number;
  breakTime?: number;
  isCheckedIn?: boolean;
  isOnBreak?: boolean;
  supervisorId?: string;
  remarks?: string;
}

interface LeaveRequest {
  _id: string;
  id?: string;
  employeeId: string;
  employeeName: string;
  department: string;
  site: string;
  siteId?: string;
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
  isSupervisorLeave?: boolean;
  supervisorId?: string;
  remarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

interface Site {
  _id: string;
  name: string;
  clientName?: string;
  status?: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  deadline: string;
  dueDateTime?: string;
  siteId: string;
  siteName: string;
  clientName?: string;
  assignedUsers?: Array<{
    userId: string;
    name: string;
    role: string;
    assignedAt: string;
    status: string;
  }>;
  assignedTo?: string;
  assignedToName?: string;
  assignedSupervisors?: Array<{
    userId: string;
    name: string;
    role: string;
    assignedAt: string;
    status: string;
  }>;
  taskTitle?: string;
  taskType?: string;
  startDate?: string;
  endDate?: string;
  siteLocation?: string;
  hourlyUpdates?: Array<{
    id: string;
    content: string;
    timestamp: string;
    submittedBy: string;
    submittedByName: string;
  }>;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    uploadedAt: string;
    uploadedBy: string;
    uploadedByName: string;
    size: number;
    type: string;
  }>;
  createdByName?: string;
  createdAt?: string;
}

interface TaskWithPersonalStatus extends Task {
  personalStatus: string;
  myAssignedAt?: string;
}

interface DashboardStats {
  totalEmployees: number;
  assignedTasks: number;
  completedTasks: number;
  pendingReports: number;
  attendanceRate: number;
  overtimeHours: number;
  productivity: number;
  pendingRequests: number;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  employee: string;
  priority: string;
  timestamp: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface SiteEmployeeCount {
  siteName: string;
  totalEmployees: number;
}

interface AttendanceStatus {
  isCheckedIn: boolean;
  isOnBreak: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  lastCheckInDate?: string | null;
  hasCheckedInToday?: boolean;
  hasCheckedOutToday?: boolean;
}

interface SupervisorAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  supervisorId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: string;
  shift: string;
  hours: number;
}

interface ManagerAttendanceData {
  _id: string;
  managerId: string;
  managerName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  lastCheckInDate: string | null;
  isCheckedIn: boolean;
  isOnBreak: boolean;
}

interface AttendanceSummary {
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  weeklyOffCount: number;
  leaveCount: number;
  halfDayCount: number;
}

interface OutletContext {
  onMenuClick: () => void;
}

// Helper function to format date
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to format time for display
const formatTimeForDisplay = (timestamp: string | null): string => {
  if (!timestamp || timestamp === "-" || timestamp === "") return "-";
  
  try {
    if (typeof timestamp === 'string' && (timestamp.includes('AM') || timestamp.includes('PM'))) {
      return timestamp;
    }
    
    if (timestamp.includes('T')) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      }
    }
    
    const timeParts = timestamp.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = timeParts[1];
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period}`;
    }
    
    return timestamp;
  } catch (error) {
    return timestamp || "-";
  }
};

// Helper function to format hours
const formatHours = (hours: number): string => {
  if (hours < 0) {
    return "0.00 hrs";
  }
  return `${hours.toFixed(2)} hrs`;
};

// Helper function to normalize site names for comparison
const normalizeSiteName = (siteName: string | null | undefined): string => {
  if (!siteName) return '';
  return siteName.toString().toLowerCase().trim();
};

// Helper function to calculate total hours
const calculateTotalHours = (start: string | null, end: string | null): number => {
  if (!start || !end) return 0;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return (endTime - startTime) / (1000 * 60 * 60);
};

// Helper function to calculate break time
const calculateBreakTime = (start: string | null, end: string | null): number => {
  if (!start || !end) return 0;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return (endTime - startTime) / (1000 * 60 * 60);
};

// Helper to check if a date is within a leave range
const isDateInLeaveRange = (date: string, fromDate: string, toDate: string): boolean => {
  const checkDate = new Date(date);
  const start = new Date(fromDate);
  const end = new Date(toDate);
  return checkDate >= start && checkDate <= end;
};

// Format date time helper
const formatDateTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
  } catch {
    return dateString;
  }
};

// Get current supervisor from localStorage
const getCurrentSupervisor = () => {
  const storedUser = localStorage.getItem("sk_user");
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return {
        id: user._id || user.id || `supervisor-${Date.now()}`,
        name: user.name || user.firstName || 'Supervisor',
        supervisorId: user.supervisorId || user._id || `supervisor-${Date.now()}`,
        email: user.email || ''
      };
    } catch (e) {
      console.error('Error parsing user:', e);
      return {
        id: `supervisor-${Date.now()}`,
        name: 'Supervisor',
        supervisorId: `supervisor-${Date.now()}`,
        email: ''
      };
    }
  } else {
    return {
      id: 'supervisor-001',
      name: 'Supervisor User',
      supervisorId: 'supervisor-001',
      email: 'supervisor@example.com'
    };
  }
};

// Mock data generators
const generateMockStats = (totalEmployees: number, assignedTasks: number, completedTasks: number): DashboardStats => ({
  totalEmployees: totalEmployees,
  assignedTasks: assignedTasks,
  completedTasks: completedTasks,
  pendingReports: 0,
  attendanceRate: 0,
  overtimeHours: 0,
  productivity: 0,
  pendingRequests: 0
});



const SupervisorDashboard = () => {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
const [attendanceResult, setAttendanceResult] = useState<string | null>(null);
const [lastCaptureTime, setLastCaptureTime] = useState(0);
const [isAutoMode, setIsAutoMode] = useState(false); // <-- Add this
  // Camera states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraAction, setCameraAction] = useState<'checkin' | 'checkout' | 'recognize' | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  // Photo modal for viewing
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] = useState<Employee | null>(null);
  // State for data
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    assignedTasks: 0,
    completedTasks: 0,
    pendingReports: 0,
    attendanceRate: 0,
    overtimeHours: 0,
    productivity: 0,
    pendingRequests: 0
  });
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TaskWithPersonalStatus[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskWithPersonalStatus[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<string>('');
  
  // State for API connection
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  
  // Current supervisor state
  const [currentSupervisor, setCurrentSupervisor] = useState(getCurrentSupervisor());
 
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', phone: '', site: '', department: '', position: '' });
  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceStatus>({
    isCheckedIn: false,
    isOnBreak: false,
    checkInTime: null,
    checkOutTime: null,
    checkInPhoto: null,
    checkOutPhoto: null,
    breakStartTime: null,
    breakEndTime: null,
    totalHours: 0,
    breakTime: 0,
    lastCheckInDate: null,
    hasCheckedInToday: false,
    hasCheckedOutToday: false
  });

  // Manager attendance data
  const [managerAttendance, setManagerAttendance] = useState<ManagerAttendanceData | null>(null);
  const [isLoadingManagerAttendance, setIsLoadingManagerAttendance] = useState(false);

  // Supervisor attendance records
  const [supervisorAttendanceRecords, setSupervisorAttendanceRecords] = useState<SupervisorAttendanceRecord[]>([]);

  // Loading states
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  
  // Site and employee data
  const [supervisorSites, setSupervisorSites] = useState<Site[]>([]);
  const [supervisorSiteNames, setSupervisorSiteNames] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [siteEmployeeCounts, setSiteEmployeeCounts] = useState<SiteEmployeeCount[]>([]);
  
  // Leave requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [todayLeaveCount, setTodayLeaveCount] = useState(0);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[]>([]);
  
  // Task tracking state
  const [assignedTasksCount, setAssignedTasksCount] = useState(0);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [updatingTaskStatus, setUpdatingTaskStatus] = useState<string | null>(null);
  
  // Loading states for data fetching
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>('');
  // Attendance summary
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    weeklyOffCount: 0,
    leaveCount: 0,
    halfDayCount: 0
  });

  // Date selection
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Task stats
  const [taskStats, setTaskStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0
  });

  
  // Chart data
  const [weeklyAttendanceTrend, setWeeklyAttendanceTrend] = useState<{ date: string; present: number; total: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number; color: string }[]>([]);
const [missingData, setMissingData] = useState<string[]>([]);

const { addNotification } = useNotifications();

const locationWatchRef = useRef<number | null>(null);
const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
// For daily data duplicate prevention
const lastDailyCheckRef = useRef<string>('');
const dailyCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

// For task polling
const taskPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
const knownTaskIdsRef = useRef<Set<string>>(new Set());
const isFirstTaskLoadRef = useRef(true);
const checkDailyData = useCallback(async () => {
  const today = new Date().toISOString().split('T')[0];
  const site = selectedSite || (supervisorSites.length > 0 ? supervisorSites[0].name : '');
  if (!site) return;

  // Prevent duplicate checks in the same session for the same site+date
  const checkKey = `${today}_${site}`;
  if (lastDailyCheckRef.current === checkKey) return;
  lastDailyCheckRef.current = checkKey;

  const missing: string[] = [];

  try {
    const gr = await apiClient.get('/grooming', { params: { date: today, site } });
    const groomingRecords = gr.data?.data || [];
    if (groomingRecords.length === 0) missing.push('Grooming Status');

    const ph = await apiClient.get('/cleaning-photos', { params: { site } });
    const photosToday = (ph.data?.data || []).filter((p: any) => {
      if (!p.createdAt) return false;
      return p.createdAt.startsWith(today);
    });
    if (photosToday.length === 0) missing.push('Cleaning Photos');

    const sh = await apiClient.get('/shifts/site-deployment', { params: { site, date: today } });
    if (!sh.data?.data?.text) missing.push('Shift-wise Deployment');
const machines = await machineService.getMachines();
    const siteMachines = machines.filter((m: any) => m.location === site);
    const anyMachineUpdatedToday = siteMachines.some((m: any) => {
      if (!m.updatedAt) return false;
      return m.updatedAt.startsWith(today);
    });
    if (siteMachines.length > 0 && !anyMachineUpdatedToday) {
      missing.push('Machine Status');
    }

  } catch (e) {
    console.warn('Error checking daily data:', e);
  }

  setMissingData(missing);

  if (missing.length > 0) {
    // Use a localStorage key to prevent duplicate notifications across page refreshes
    const notifId = `daily_check_${today}_${site.replace(/\s/g, '_')}`;
    const alreadyNotified = localStorage.getItem(notifId);
    if (alreadyNotified) return;

    localStorage.setItem(notifId, 'true');

    // Clean up old keys (older than today)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('daily_check_') && !key.includes(today)) {
        localStorage.removeItem(key);
      }
    });

    const message = `Missing daily data: ${missing.join(', ')}. Please update them.`;
    addNotification({
      title: '⚠️ Missing Daily Data',
      message,
      type: 'system',
      metadata: {
        priority: 'high',
        missingItems: missing,
        site,
        date: today,
      }
    });
    toast.warning(message, { duration: 10000 });
  }
}, [selectedSite, supervisorSites, addNotification]);

  // Feature blocks
  const featureBlocks = [
    { title: "Employee Data", icon: <Users className="h-6 w-6" />, path: "/supervisor/attendance", color: "bg-blue-500" },
    { title: "Machine Status", icon: <Cpu className="h-6 w-6" />, path: "/supervisor/machine-status", color: "bg-green-500" },
    { title: "Grooming Status", icon: <Shirt className="h-6 w-6" />, path: "/supervisor/grooming", color: "bg-purple-500" },
    { title: "Incident Reports", icon: <AlertTriangle className="h-6 w-6" />, path: "/supervisor/incidents", color: "bg-red-500" },
    { title: "Cleaning Photos", icon: <Images className="h-6 w-6" />, path: "/supervisor/cleaning-photos", color: "bg-yellow-500" },
    { title: "Shift-wise Deployment", icon: <Factory className="h-6 w-6" />, path: "/supervisor/shift-deployment", color: "bg-indigo-500" },
    { title: "Salary Slip", icon: <DollarSign className="h-6 w-6" />, path: "/supervisor/salary-slip", color: "bg-pink-500" }
  ];

  const [weeklyOffDialogOpen, setWeeklyOffDialogOpen] = useState(false);
const [selectedEmployeeForWeeklyOff, setSelectedEmployeeForWeeklyOff] = useState<Employee | null>(null);
const [weeklyOffLoading, setWeeklyOffLoading] = useState(false);

const handleOpenWeeklyOffDialog = () => {
  if (employees.length === 0) {
    toast.error("No employees available");
    return;
  }
  setWeeklyOffDialogOpen(true);
};

const markAttendanceInBackend = async (employeeId: string, employeeName: string, photoFile: File) => {
  try {
    const formData = new FormData();
    formData.append('employeeId', employeeId);
    formData.append('employeeName', employeeName);
    formData.append('supervisorId', currentSupervisor.id);
    formData.append('siteName', selectedSite || supervisorSites[0]?.name || '');
    formData.append('photo', photoFile);
    
    // ✅ Increase timeout and add retry logic
    await axios.post(`${API_URL}/attendance/checkin-with-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 15000  // Increased from 5000
    });
    console.log('✅ Attendance marked in backend successfully');
  } catch (error) {
    // Don't throw - face recognition already succeeded
    console.warn('⚠️ Could not mark attendance in backend:', error);
  }
};

const handleMarkWeeklyOff = async () => {
  if (!selectedEmployeeForWeeklyOff) {
    toast.error("Please select an employee");
    return;
  }
  setWeeklyOffLoading(true);
  try {
    await axios.post(`${API_URL}/attendance/update-status`, {
      employeeId: selectedEmployeeForWeeklyOff._id,
      date: selectedDate,
      status: 'weekly-off',
      supervisorId: currentSupervisor.id,
      employeeName: selectedEmployeeForWeeklyOff.name,
      remarks: 'Marked as weekly off by supervisor'
    });
    toast.success(`${selectedEmployeeForWeeklyOff.name} marked as Weekly Off`);
    setWeeklyOffDialogOpen(false);
    setSelectedEmployeeForWeeklyOff(null);
    // Refresh attendance data
    loadAttendanceRecords(selectedDate);
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Failed to mark weekly off");
  } finally {
    setWeeklyOffLoading(false);
  }
};

  const openCameraForEmployee = (employee: Employee | null) => {
    setSelectedEmployeeForAttendance(employee);
    setCameraAction('checkin'); // we will determine checkin/out based on current status later
    setCameraOpen(true);
  };
const handleAttendanceCamera = () => {
  setCameraAction('recognize');
  setCameraOpen(true);
};
  
const handlePhotoCapture = async (photoFile: File) => {
  if (!cameraAction) return;
  
  // ✅ Auto face recognition mode (fast path)
  if (cameraAction === 'recognize') {
    const now = Date.now();
    if (isProcessing || now - lastCaptureTime < 3000) {
      return;
    }

    setIsProcessing(true);
    setLastCaptureTime(now);

    const formData = new FormData();
    formData.append('file', photoFile);
    formData.append('siteName', selectedSite || supervisorSites[0]?.name || '');

    try {
      console.log('📤 Sending match request to face service...');
      
      // ✅ Call the face service directly on port 8000
      const response = await axios.post(`http://localhost:8000/match`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 10000
      });

      console.log('📥 Match response:', response.data);

      if (response.data.success) {
        const { employeeId, employeeName, confidence } = response.data.data;
        setAttendanceResult(`✅ ${employeeName} (${Math.round(confidence * 100)}%)`);
        toast.success(`${employeeName} marked present!`);
        
        // ✅ Mark attendance in the main backend
       markAttendanceInBackend(employeeId, employeeName, photoFile);
        
        setTimeout(() => setAttendanceResult(null), 2500);
        loadAttendanceRecords(selectedDate);
      } else {
        setAttendanceResult(`❌ ${response.data.message}`);
        setTimeout(() => setAttendanceResult(null), 2000);
      }
    } catch (error: any) {
      console.error('❌ Match error:', error);
      
      // ✅ Better error messages
      if (error.response?.status === 404) {
        setAttendanceResult('❌ Face service not found (port 8000)');
        toast.error('Face service is not running on port 8000');
      } else if (error.code === 'ECONNREFUSED') {
        setAttendanceResult('❌ Cannot connect to face service');
        toast.error('Face service is not running. Start with: python main.py');
      } else if (error.response?.data?.message) {
        setAttendanceResult(`❌ ${error.response.data.message}`);
      } else {
        setAttendanceResult(`❌ ${error.message || 'Unknown error'}`);
      }
      setTimeout(() => setAttendanceResult(null), 3000);
    } finally {
      setIsProcessing(false);
    }
    return; // ✅ Don't close camera
  }

  // ✅ Check-in / Check-out with photo
  setUploadingPhoto(true);
  try {
    // Determine if this is check-in or check-out based on current state
    const isCheckIn = cameraAction === 'checkin';
    
    // Get employee ID
    const employeeId = selectedEmployeeForAttendance?._id || currentSupervisor.id;
    const employeeName = selectedEmployeeForAttendance?.name || currentSupervisor.name;
    
    const formData = new FormData();
    formData.append('employeeId', employeeId);
    formData.append('employeeName', employeeName);
    formData.append('photo', photoFile);
    formData.append('supervisorId', currentSupervisor.id);
    
    // ✅ FIX: Get location if available (returns { lat, lng })
    try {
      const location = await getLocation();
      if (location) {
        // ✅ Use lat and lng (not latitude and longitude)
        formData.append('latitude', String(location.lat));
        formData.append('longitude', String(location.lng));
      }
    } catch (locError) {
      console.warn('Could not get location:', locError);
    }
    
   // ✅ NEW CODE (CORRECT)
const endpoint = isCheckIn ? '/attendance/checkin-with-photo' : '/attendance/checkout-with-photo';
    
    const response = await axios.post(`${API_URL}${endpoint}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 10000
    });
    
    if (response.data.success) {
      toast.success(`✅ ${isCheckIn ? 'Check-in' : 'Check-out'} successful!`);
      
      // Update local attendance state
      const updatedAttendance = response.data.data;
      if (updatedAttendance) {
        setAttendance({
          ...attendance,
          isCheckedIn: updatedAttendance.isCheckedIn || false,
          isOnBreak: updatedAttendance.isOnBreak || false,
          checkInTime: updatedAttendance.checkInTime || attendance.checkInTime,
          checkOutTime: updatedAttendance.checkOutTime || attendance.checkOutTime,
          checkInPhoto: updatedAttendance.checkInPhoto || attendance.checkInPhoto,
          checkOutPhoto: updatedAttendance.checkOutPhoto || attendance.checkOutPhoto,
          totalHours: updatedAttendance.totalHours || attendance.totalHours || 0,
          hasCheckedInToday: updatedAttendance.hasCheckedInToday || false,
          hasCheckedOutToday: updatedAttendance.hasCheckedOutToday || false,
        });
      }
      
      // Refresh attendance records
      loadAttendanceRecords(selectedDate);
      loadSupervisorAttendanceRecords();
      
      // Add activity
      addActivity(
        isCheckIn ? 'checkin' : 'checkout', 
        `${isCheckIn ? 'Checked in' : 'Checked out'} at ${new Date().toLocaleTimeString()}`
      );
      
    } else {
      toast.error(response.data.message || 'Attendance failed');
    }
    
  } catch (error: any) {
    console.error('❌ Attendance error:', error);
    
    let errorMessage = 'Error processing attendance';
    if (error.response?.status === 404) {
      errorMessage = 'Endpoint not found. Please check if the server is running.';
    } else if (error.response?.status === 405) {
      errorMessage = 'Method not allowed. The server expected POST but received GET.';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    toast.error(errorMessage);
    
  } finally {
    setUploadingPhoto(false);
    setCameraOpen(false);
    setSelectedEmployeeForAttendance(null);
    setCameraAction(null);
  }
};
  // Handle view photo
  const handleViewPhoto = (photoUrl: string | null | undefined, type: 'checkin' | 'checkout') => {
    if (photoUrl) {
      setSelectedPhotoUrl(photoUrl);
      setSelectedPhotoType(type);
      setPhotoModalOpen(true);
    } else {
      toast.error('No photo available');
    }
  };  
        
  // Handle check-in with camera
  const handleCheckIn = () => {
    if (attendance.hasCheckedInToday && !attendance.isCheckedIn) {
      toast.error("You have already checked in today. Only one check-in allowed per day.");
      return;
    }

    if (attendance.isCheckedIn) {
      toast.error("You are already checked in!");
      return;
    }
    
    setCameraAction('checkin');
    setCameraOpen(true);
  };

  // Handle check-out with camera
  const handleCheckOut = () => {
    if (attendance.hasCheckedOutToday) {
      toast.error("You have already checked out today.");
      return;
    }

    if (!attendance.isCheckedIn && !attendance.hasCheckedInToday) {
      toast.error("You need to check in first!");
      return;
    }

    if (!attendance.isCheckedIn && attendance.hasCheckedInToday) {
      toast.warning("You are not currently checked in, but you checked in earlier today.", {
        action: {
          label: "Force Check Out",
          onClick: () => forceCheckOut()
        }
      });
      return;
    }
    
    setCameraAction('checkout');
    setCameraOpen(true);
  };

  // Force check out without photo
  const forceCheckOut = async () => {
    try {
      console.log('🔄 Force checking out for supervisor:', currentSupervisor.id);
      stopLocationTracking();  // <-- add this line
      const now = new Date().toISOString();
      const totalHours = calculateTotalHours(attendance.checkInTime, now);
      
      const newAttendance = {
        ...attendance,
        isCheckedIn: false,
        isOnBreak: false,
        checkOutTime: now,
        totalHours: totalHours,
        hasCheckedOutToday: true
      };
      
      setAttendance(newAttendance);
      localStorage.setItem(`supervisorAttendance_${currentSupervisor.id}`, JSON.stringify(newAttendance));
      addActivity('checkout', `Force checked out at ${formatTimeForDisplay(now)} - Total: ${totalHours.toFixed(2)}h`);
      
      toast.success(`✅ Force checked out successfully! Total hours: ${totalHours.toFixed(2)}`);
      
    } catch (error) {
      console.error('Force check-out error:', error);
      toast.error("Error force checking out");
    }
  };

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      setIsCheckingConnection(true);
      console.log('🔄 Checking backend connection at:', `${API_URL}`);
      
      const response = await axios.get(`${API_URL}/employees?limit=1`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      console.log(`✅ Backend connected (status: ${response.status})`);
      setIsBackendConnected(true);
      
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        console.error('❌ Backend connection error - server not reachable:', error);
        setIsBackendConnected(false);
      } else if (error.response) {
        console.log(`✅ Backend is running but returned status ${error.response.status}`);
        setIsBackendConnected(true);
      } else {
        console.error('❌ Backend connection error:', error);
        setIsBackendConnected(false);
      }
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Fetch all leave requests (similar to Leave component)
  const fetchAllLeaveRequests = useCallback(async () => {
    if (!currentSupervisor) return;
    
    try {
      setLoadingLeaves(true);
      console.log("🔍 Fetching all leave requests for dashboard...");
      
      const response = await axios.get(`${API_URL}/leaves`, {
        params: { limit: 1000 }
      });
      
      let allLeaves: LeaveRequest[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          allLeaves = response.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          allLeaves = response.data.data;
        } else if (response.data.leaves && Array.isArray(response.data.leaves)) {
          allLeaves = response.data.leaves;
        }
      }
      
      console.log(`📊 Total leaves from API: ${allLeaves.length}`);
      
      // Count pending leaves
      const pendingCount = allLeaves.filter(leave => leave.status === 'pending').length;
      setPendingLeaveCount(pendingCount);
      
      // Get recent leaves (last 5, sorted by createdAt desc)
      const sortedLeaves = [...allLeaves].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const recent = sortedLeaves.slice(0, 5);
      setRecentLeaves(recent);
      
      // Count today's leaves
      const today = selectedDate;
      const approvedLeavesToday = allLeaves.filter(leave => {
        if (leave.status !== 'approved') return false;
        return isDateInLeaveRange(today, leave.fromDate, leave.toDate);
      });
      
      console.log(`✅ Found ${approvedLeavesToday.length} employees on leave today`);
      console.log(`📋 Pending leaves: ${pendingCount}`);
      
      setLeaveRequests(allLeaves);
      setTodayLeaveCount(approvedLeavesToday.length);
      
      // Update summary leave count
      setSummary(prev => ({
        ...prev,
        leaveCount: approvedLeavesToday.length
      }));
      
      // Update stats pending requests
      setStats(prev => ({
        ...prev,
        pendingRequests: pendingCount
      }));
      
      // Create activity for each pending leave (optional - for recent activities)
      if (pendingCount > 0 && recent.length > 0) {
        const pendingLeaves = allLeaves.filter(l => l.status === 'pending');
        if (pendingLeaves.length > 0 && activities.length === 0) {
          // Add one activity for pending leaves
          addActivity('approval', `${pendingLeaves.length} pending leave request${pendingLeaves.length !== 1 ? 's' : ''} awaiting approval`, 'system');
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching leave requests:', error);
      setLeaveRequests([]);
      setPendingLeaveCount(0);
      setRecentLeaves([]);
    } finally {
      setLoadingLeaves(false);
    }
  }, [currentSupervisor, selectedDate]);

  // Fetch tasks assigned to this supervisor (similar to SupervisorAssignTask)
  const fetchAssignedTasks = useCallback(async () => {
    if (!currentSupervisor) return { assigned: 0, completed: 0, tasks: [] };
    
    try {
      setLoadingTasks(true);
      const supervisorId = currentSupervisor.id;
      const supervisorName = currentSupervisor.name;
      
      console.log("🔍 Fetching tasks assigned to supervisor:", {
        id: supervisorId,
        name: supervisorName
      });
      
      const response = await axios.get(`${API_URL}/assigntasks`, {
        params: { limit: 1000 }
      });
      
      let allTasks: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          allTasks = response.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          allTasks = response.data.data;
        } else if (response.data.tasks && Array.isArray(response.data.tasks)) {
          allTasks = response.data.tasks;
        }
      }
      
      console.log(`📊 Total tasks from assigntasks: ${allTasks.length}`);
      
      // Filter tasks assigned to this supervisor
      const myTasks = allTasks.filter(task => {
        if (!task.assignedSupervisors || !Array.isArray(task.assignedSupervisors)) {
          return false;
        }
        
        return task.assignedSupervisors.some(supervisor => {
          const supervisorUserId = supervisor.userId;
          const matchById = String(supervisorUserId) === String(supervisorId);
          const matchByName = supervisor.name?.toLowerCase().trim() === supervisorName?.toLowerCase().trim();
          return matchById || matchByName;
        });
      });
      
      // Add personal status to each task
      const tasksWithPersonalStatus: TaskWithPersonalStatus[] = myTasks.map(task => {
        const myInfo = task.assignedSupervisors?.find((supervisor: any) => {
          const matchById = String(supervisor.userId) === String(supervisorId);
          const matchByName = supervisor.name?.toLowerCase().trim() === supervisorName?.toLowerCase().trim();
          return matchById || matchByName;
        });
        
        return {
          ...task,
          personalStatus: myInfo?.status || 'pending',
          myAssignedAt: myInfo?.assignedAt,
          title: task.taskTitle || task.title,
          deadline: task.dueDateTime || task.endDate || task.deadline,
        };
      });
      
      const completedCount = tasksWithPersonalStatus.filter(task => task.personalStatus === 'completed').length;
      
      console.log(`✅ Found ${myTasks.length} tasks assigned to this supervisor (${completedCount} completed)`);
      
      // Calculate task stats
      const now = new Date();
      const statsCalc = {
        totalTasks: tasksWithPersonalStatus.length,
        completedTasks: tasksWithPersonalStatus.filter(t => t.personalStatus === 'completed').length,
        pendingTasks: tasksWithPersonalStatus.filter(t => t.personalStatus === 'pending').length,
        inProgressTasks: tasksWithPersonalStatus.filter(t => t.personalStatus === 'in-progress').length,
        overdueTasks: tasksWithPersonalStatus.filter(t => 
          t.personalStatus !== 'completed' && 
          t.personalStatus !== 'cancelled' && 
          new Date(t.dueDateTime || t.deadline || '') < now
        ).length
      };
      setTaskStats(statsCalc);
      
      // Sort tasks by due date (upcoming first)
      const sortedTasks = [...tasksWithPersonalStatus].sort((a, b) => {
        const dateA = new Date(a.dueDateTime || a.deadline || '');
        const dateB = new Date(b.dueDateTime || b.deadline || '');
        return dateA.getTime() - dateB.getTime();
      });
      
      setTasks(sortedTasks);
      setFilteredTasks(sortedTasks);
      
      setAssignedTasksCount(myTasks.length);
      setCompletedTasksCount(completedCount);
      
      setStats(prev => ({
        ...prev,
        assignedTasks: myTasks.length,
        completedTasks: completedCount
      }));
      
      return { 
        assigned: myTasks.length, 
        completed: completedCount,
        tasks: sortedTasks 
      };
      
    } catch (error: any) {
      console.error('❌ Error fetching assigned tasks:', error);
      return { assigned: 0, completed: 0, tasks: [] };
    } finally {
      setLoadingTasks(false);
    }
  }, [currentSupervisor]);



  const pollForNewTasks = useCallback(async () => {
  if (!currentSupervisor?.id) return;

  try {
    const supervisorId = currentSupervisor.id;
    const supervisorName = currentSupervisor.name;

    const response = await axios.get(`${API_URL}/assigntasks`);
    let allTasks: any[] = [];
    if (Array.isArray(response.data)) {
      allTasks = response.data;
    } else if (response.data?.tasks) {
      allTasks = response.data.tasks;
    } else if (response.data?.data) {
      allTasks = response.data.data;
    }

    // Filter tasks assigned to this supervisor
    const myTasks = allTasks.filter(task => {
      if (!task.assignedSupervisors || !Array.isArray(task.assignedSupervisors)) return false;
      return task.assignedSupervisors.some((supervisor: any) => {
        return (
          String(supervisor.userId) === String(supervisorId) ||
          supervisor.name?.toLowerCase().trim() === supervisorName?.toLowerCase().trim()
        );
      });
    });

    // First load: just remember the IDs, no notification
    if (isFirstTaskLoadRef.current) {
      myTasks.forEach(task => knownTaskIdsRef.current.add(task._id));
      isFirstTaskLoadRef.current = false;
      return;
    }

    // Find new tasks
    const newTasks = myTasks.filter(task => !knownTaskIdsRef.current.has(task._id));

    if (newTasks.length > 0) {
      newTasks.forEach(task => {
        knownTaskIdsRef.current.add(task._id);

        addNotification({
          title: `📋 New Task Assigned: ${task.taskTitle || task.title}`,
          message: `Task "${task.taskTitle || task.title}" at ${task.siteName} — Priority: ${task.priority || 'medium'}`,
          type: 'task',
          metadata: {
            taskId: task._id,
            taskTitle: task.taskTitle || task.title,
            siteName: task.siteName,
            priority: task.priority,
            notificationType: 'task_assignment',
          },
        });

        toast.info(`📋 New Task: ${task.taskTitle || task.title}`, {
          description: `Site: ${task.siteName} | Priority: ${task.priority}`,
          duration: 8000,
        });
      });

      // Refresh the task list display
      fetchAssignedTasks();
    }
  } catch (error) {
    console.warn('Task poll error:', error);
  }
}, [currentSupervisor, addNotification, fetchAssignedTasks]);
  // Update personal task status
  const handleUpdatePersonalStatus = async (taskId: string, newStatus: string) => {
    try {
      setUpdatingTaskStatus(taskId);
      
      const task = tasks.find(t => t._id === taskId);
      if (!task) {
        toast.error('Task not found');
        return;
      }
      
      const supervisorId = currentSupervisor.id;
      if (!supervisorId) {
        toast.error('Supervisor ID not found');
        return;
      }
      
      const supervisorIndex = task.assignedSupervisors?.findIndex(supervisor => {
        const supervisorUserId = supervisor.userId;
        const matchById = String(supervisorUserId) === String(supervisorId);
        const matchByName = supervisor.name?.toLowerCase().trim() === currentSupervisor.name?.toLowerCase().trim();
        return matchById || matchByName;
      });
      
      if (supervisorIndex === -1 || supervisorIndex === undefined) {
        toast.error('Could not find your assignment in this task');
        return;
      }
      
      const updatedSupervisors = [...(task.assignedSupervisors || [])];
      updatedSupervisors[supervisorIndex] = {
        ...updatedSupervisors[supervisorIndex],
        status: newStatus as any
      };
      
      const response = await fetch(`${API_URL}/assigntasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedSupervisors: updatedSupervisors
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      toast.success(`Task status updated to ${newStatus}`);
      
      // Add activity for task status change
      addActivity('task', `Task "${task.taskTitle || task.title}" marked as ${newStatus}`, 'self');
      
      // Refresh tasks
      await fetchAssignedTasks();
      
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdatingTaskStatus(null);
    }
  };
// Call checkDailyData whenever selectedSite or supervisorSites changes
useEffect(() => {
  if (selectedSite) {
    checkDailyData();
  }
}, [selectedSite, supervisorSites]);
  // Filter tasks based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredTasks(tasks);
    } else {
      const query = search.toLowerCase();
      const filtered = tasks.filter(task => 
        (task.taskTitle || task.title || '').toLowerCase().includes(query) ||
        (task.description || '').toLowerCase().includes(query) ||
        (task.siteName || '').toLowerCase().includes(query) ||
        (task.clientName || '').toLowerCase().includes(query)
      );
      setFilteredTasks(filtered);
    }
  }, [search, tasks]);

  // Fetch tasks where this specific supervisor is assigned (for site filtering)
  const fetchSupervisorSitesFromTasks = useCallback(async () => {
    if (!currentSupervisor) return { siteNames: [], siteIds: [] };
    
    try {
      const supervisorId = currentSupervisor.id;
      const supervisorName = currentSupervisor.name;
      
      console.log("🔍 Fetching tasks for supervisor:", {
        id: supervisorId,
        name: supervisorName
      });
      
      const response = await axios.get(`${API_URL}/tasks`, {
        params: { limit: 1000 }
      });
      
      let supervisorSiteNamesSet = new Set<string>();
      let supervisorSiteIdsSet = new Set<string>();
      let tasksWithSupervisor: Task[] = [];
      
      let allTasks: Task[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          allTasks = response.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          allTasks = response.data.data;
        } else if (response.data.tasks && Array.isArray(response.data.tasks)) {
          allTasks = response.data.tasks;
        }
      }
      
      console.log(`📊 Total tasks fetched: ${allTasks.length}`);
      
      allTasks.forEach((task: Task) => {
        let isAssignedToThisSupervisor = false;
        
        if (task.assignedUsers && Array.isArray(task.assignedUsers)) {
          isAssignedToThisSupervisor = task.assignedUsers.some(user => {
            const userIdMatch = user.userId === supervisorId;
            const nameMatch = user.name?.toLowerCase() === supervisorName?.toLowerCase();
            return userIdMatch || nameMatch;
          });
        }
        
        if (!isAssignedToThisSupervisor && task.assignedTo) {
          isAssignedToThisSupervisor = 
            task.assignedTo === supervisorId || 
            task.assignedToName?.toLowerCase() === supervisorName?.toLowerCase();
        }
        
        if (isAssignedToThisSupervisor && task.siteId && task.siteName) {
          supervisorSiteIdsSet.add(task.siteId);
          supervisorSiteNamesSet.add(task.siteName);
          tasksWithSupervisor.push(task);
        }
      });
      
      const supervisorSiteNames = Array.from(supervisorSiteNamesSet);
      const supervisorSiteIds = Array.from(supervisorSiteIdsSet);
      
      console.log(`✅ Found ${tasksWithSupervisor.length} tasks for this supervisor`);
      console.log("📍 Supervisor's sites from tasks:", supervisorSiteNames);
      
      return { siteNames: supervisorSiteNames, siteIds: supervisorSiteIds };
      
    } catch (error: any) {
      console.error('❌ Error fetching tasks:', error);
      return { siteNames: [], siteIds: [] };
    }
  }, [currentSupervisor]);

  // Fetch all sites and filter by supervisor's task-assigned sites
  const fetchAllSites = useCallback(async () => {
    if (!currentSupervisor) return [];
    
    try {
      setLoadingSites(true);
      const { siteNames: taskSiteNames, siteIds: taskSiteIds } = await fetchSupervisorSitesFromTasks();
      
      console.log("🌐 Fetching all sites from API...");
      
      const response = await axios.get(`${API_URL}/sites`);
      
      let allSitesData: Site[] = [];
      
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          allSitesData = response.data.data;
        } else if (Array.isArray(response.data)) {
          allSitesData = response.data;
        } else if (response.data.sites && Array.isArray(response.data.sites)) {
          allSitesData = response.data.sites;
        }
      }
      
      console.log(`📊 Fetched ${allSitesData.length} sites from API`);
      
      const transformedSites = allSitesData.map((site: any) => ({
        _id: site._id || site.id,
        name: site.name,
        clientName: site.clientName || site.client,
        status: site.status || "active"
      }));
      
      let supervisorSiteList: Site[] = [];
      
      if (taskSiteNames.length > 0) {
        supervisorSiteList = transformedSites.filter(site => {
          const exactNameMatch = taskSiteNames.some(taskSiteName => 
            site.name === taskSiteName
          );
          
          const exactNormalizedMatch = taskSiteNames.some(taskSiteName => 
            normalizeSiteName(site.name) === normalizeSiteName(taskSiteName)
          );
          
          const idMatch = taskSiteIds.includes(site._id);
          
          return exactNameMatch || exactNormalizedMatch || idMatch;
        });
        
        console.log(`✅ Matched ${supervisorSiteList.length} sites from task assignments (exact matches only)`);
      } else {
        supervisorSiteList = transformedSites;
        console.log("⚠️ No task sites found, showing all sites");
      }
      
      setSupervisorSites(supervisorSiteList);
      setSupervisorSiteNames(supervisorSiteList.map(site => site.name));
      if (supervisorSiteList.length > 0 && !selectedSite) {
  setSelectedSite(supervisorSiteList[0].name);
}
      setLoadingSites(false);
      return supervisorSiteList;
      
    } catch (error: any) {
      console.error('❌ Error fetching sites:', error);
      setLoadingSites(false);
      return [];
    }
  }, [currentSupervisor, fetchSupervisorSitesFromTasks]);

  // Fetch employees assigned to supervisor's sites
  const fetchEmployees = useCallback(async () => {
    if (!currentSupervisor) {
      console.log("No current supervisor");
      return;
    }
    
    try {
      setLoadingEmployees(true);
      console.log("Fetching employees...");
      
      let supervisorSiteList = supervisorSites;
      let supervisorSiteNameList = supervisorSiteNames;
      
      if (supervisorSiteList.length === 0) {
        supervisorSiteList = await fetchAllSites() || [];
        supervisorSiteNameList = supervisorSiteList.map(site => site.name);
      }
      
      if (supervisorSiteNameList.length === 0) {
        console.log("❌ No sites from tasks - setting empty employees array");
        setEmployees([]);
        setSiteEmployeeCounts([]);
        
        setSummary(prev => ({
          ...prev,
          totalEmployees: 0
        }));
        
        setStats(prev => ({
          ...prev,
          totalEmployees: 0
        }));
        
        toast.warning("You have no tasks assigned to any sites. Please contact your administrator.");
        setLoadingEmployees(false);
        return;
      }
      
      console.log("📡 Fetching all employees from API:", `${API_URL}/employees`);
      
      const response = await axios.get(`${API_URL}/employees`, {
        params: { limit: 1000 }
      });
      
      let fetchedEmployees: Employee[] = [];
      let allEmployees: Employee[] = [];
      
      if (response.data) {
        if (response.data.success) {
          allEmployees = response.data.data || response.data.employees || [];
        } else if (Array.isArray(response.data)) {
          allEmployees = response.data;
        } else if (response.data.employees && Array.isArray(response.data.employees)) {
          allEmployees = response.data.employees;
        }
        
        console.log(`📊 Total employees from API: ${allEmployees.length}`);
        console.log("📍 Supervisor's task-assigned sites:", supervisorSiteNameList);
        
        fetchedEmployees = allEmployees.filter((emp: Employee) => {
          const employeeSite = emp.siteName || '';
          
          const exactMatch = supervisorSiteNameList.some(siteName => 
            siteName === employeeSite
          );
          
          const normalizedExactMatch = supervisorSiteNameList.some(siteName => 
            normalizeSiteName(siteName) === normalizeSiteName(employeeSite)
          );
          
          const matches = exactMatch || normalizedExactMatch;
          
          if (matches) {
            console.log(`✅ Employee ${emp.name} (${emp.employeeId}) matches site: "${employeeSite}"`);
          } else {
            console.log(`❌ Employee ${emp.name} site: "${employeeSite}" does NOT match any supervisor site`);
          }
          
          return matches;
        });
        
        console.log(`✅ Filtered ${fetchedEmployees.length} employees for supervisor's task-assigned sites`);
        
        const siteCountMap = new Map<string, number>();
        fetchedEmployees.forEach(emp => {
          const siteName = emp.siteName || 'Unknown Site';
          siteCountMap.set(siteName, (siteCountMap.get(siteName) || 0) + 1);
        });
        
        const siteCounts = Array.from(siteCountMap.entries()).map(([siteName, count]) => ({
          siteName,
          totalEmployees: count
        }));
        
        setSiteEmployeeCounts(siteCounts);
        
        setSummary(prev => ({
          ...prev,
          totalEmployees: fetchedEmployees.length
        }));
        
        setStats(prev => ({
          ...prev,
          totalEmployees: fetchedEmployees.length
        }));
        
        if (fetchedEmployees.length > 0) {
          toast.success(`Loaded ${fetchedEmployees.length} employees for your task-assigned sites`);
        } else {
          toast.warning(`No employees found for your task-assigned sites: ${supervisorSiteNameList.join(', ')}`);
        }
      }
      
      setEmployees(fetchedEmployees);
      
    } catch (error: any) {
      console.error('❌ Error fetching employees:', error);
      
      if (error.code === 'ERR_NETWORK') {
        toast.error("Network error: Cannot connect to server");
      } else {
        toast.error(`Failed to load employees: ${error.message}`);
      }
      
      setEmployees([]);
      setSiteEmployeeCounts([]);
      
      setSummary(prev => ({
        ...prev,
        totalEmployees: 0
      }));
      
      setStats(prev => ({
        ...prev,
        totalEmployees: 0
      }));
    } finally {
      setLoadingEmployees(false);
    }
  }, [currentSupervisor, supervisorSites, supervisorSiteNames, fetchAllSites]);
// ========== Geofence Breach Monitoring ==========
useEffect(() => {
  // Check for geofence breaches every 60 seconds
  const checkBreaches = async () => {
    try {
      const response = await axios.get(`${API_URL}/attendance/geofence-breaches`);
      if (response.data.success && response.data.data.length > 0) {
        response.data.data.forEach((breach: any) => {
          // Add notification with sound
          addNotification({
            title: '🚨 Geofence Alert',
            message: `${breach.employeeName} is ${breach.distanceKm || '0'}km away from site: ${breach.siteName}`,
            type: 'geofence',
            metadata: {
              priority: 'high',
              employeeId: breach.employeeId,
              employeeName: breach.employeeName,
              siteName: breach.siteName,
              distance: breach.distanceKm || 0
            }
          });
          
          // Play sound for high-priority alerts
          try {
            const audio = new Audio('/notification-sound.mp3');
            audio.play().catch(e => console.log('Sound play failed:', e));
          } catch (e) {
            console.log('Audio not available');
          }
          
          toast.error(
            `🚨 ${breach.employeeName} is outside geofence (${breach.distanceKm || 0}km away from ${breach.siteName})`,
            { duration: 10000 }
          );
        });
      }
    } catch (error) {
      console.error('Error checking geofence breaches:', error);
    }
  };

  // Check immediately and then every 60 seconds
  if (selectedSite) {
    checkBreaches();
    const interval = setInterval(checkBreaches, 60000);
    return () => clearInterval(interval);
  }
}, [selectedSite, addNotification]);
  // Load attendance records for selected date
  const loadAttendanceRecords = async (date: string) => {
    try {
      setLoadingAttendance(true);
      console.log('📋 Fetching attendance for date:', date);
      
      if (employees.length === 0) {
        console.log("No employees to fetch attendance for");
        setAttendanceRecords([]);
        setSummary(prev => ({
          ...prev,
          presentCount: 0,
          absentCount: 0,
          weeklyOffCount: 0,
          halfDayCount: 0
        }));
        setLoadingAttendance(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { date }
      });
      
      console.log('Attendance API response:', response.data);
      
      if (response.data && response.data.success) {
        const allRecords = response.data.data || [];
        
        const employeeIdsFromSites = new Set(employees.map(emp => emp._id));
        const employeeNamesFromSites = new Set(employees.map(emp => emp.name));
        
        const filteredRecords = allRecords.filter((record: any) => 
          employeeIdsFromSites.has(record.employeeId) || 
          employeeNamesFromSites.has(record.employeeName)
        );
        
        console.log(`📊 Total attendance records: ${allRecords.length}, Filtered: ${filteredRecords.length}`);
        
        setAttendanceRecords(filteredRecords);
        
        const presentCount = filteredRecords.filter((r: AttendanceRecord) => r.status === 'present').length;
        const weeklyOffCount = filteredRecords.filter((r: AttendanceRecord) => r.status === 'weekly-off').length;
        const halfDayCount = filteredRecords.filter((r: AttendanceRecord) => r.status === 'half-day').length;
        
        const absentFromRecords = filteredRecords.filter((r: AttendanceRecord) => r.status === 'absent').length;
        
        const employeesWithRecords = new Set(filteredRecords.map(r => r.employeeId));
        const employeesWithoutRecords = employees.filter(emp => !employeesWithRecords.has(emp._id)).length;
        
        const totalAbsentCount = absentFromRecords + employeesWithoutRecords;
        
        console.log(`📊 Summary - Total: ${employees.length}, Present: ${presentCount}, Weekly Off: ${weeklyOffCount}, Half Day: ${halfDayCount}, Absent: ${totalAbsentCount}`);
        
        setSummary(prev => ({
          totalEmployees: employees.length,
          presentCount,
          absentCount: totalAbsentCount,
          weeklyOffCount,
          leaveCount: todayLeaveCount,
          halfDayCount
        }));
      } else {
        console.error('Failed to load attendance:', response.data?.message);
        setAttendanceRecords([]);
        
        setSummary(prev => ({
          totalEmployees: employees.length,
          presentCount: 0,
          absentCount: employees.length,
          weeklyOffCount: 0,
          leaveCount: todayLeaveCount,
          halfDayCount: 0
        }));
      }
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      
      if (error.code === 'ERR_NETWORK') {
        toast.error("Network error: Cannot fetch attendance data");
      }
      
      setAttendanceRecords([]);
      
      setSummary(prev => ({
        totalEmployees: employees.length,
        presentCount: 0,
        absentCount: employees.length,
        weeklyOffCount: 0,
        leaveCount: todayLeaveCount,
        halfDayCount: 0
      }));
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Load manager attendance data
  const loadManagerAttendanceData = async () => {
    try {
      setIsLoadingManagerAttendance(true);
      console.log('🔄 Loading manager attendance data...');
      
      const storedUser = localStorage.getItem("sk_user");
      let managerId = '';
      let managerName = '';
      
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          managerId = user._id || user.id || `manager-${Date.now()}`;
          managerName = user.name || user.firstName || 'Manager';
        } catch (e) {
          console.error('Error parsing user:', e);
          managerId = `manager-${Date.now()}`;
          managerName = 'Manager';
        }
      } else {
        managerId = `manager-${Date.now()}`;
        managerName = 'Demo Manager';
      }
      
      if (!managerId) {
        console.log('⚠️ No manager ID found, skipping manager attendance fetch');
        setIsLoadingManagerAttendance(false);
        return;
      }
      
      console.log('📋 Fetching manager attendance for ID:', managerId);
      
      const response = await fetch(`${API_URL}/manager-attendance/today/${managerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Manager attendance API response:', data);
        
        if (data.success && data.data) {
          setManagerAttendance(data.data);
          console.log('✅ Manager attendance data loaded:', data.data);
          
          if (data.data.checkInTime) {
            const checkInTime = formatTimeForDisplay(data.data.checkInTime);
            addActivity('checkin', `Manager ${managerName} checked in at ${checkInTime}`, 'manager');
          }
        } else {
          console.log('ℹ️ No manager attendance data found for today');
          setManagerAttendance(null);
        }
      } else {
        console.log('⚠️ Manager attendance API failed, status:', response.status);
        setManagerAttendance(null);
      }
    } catch (error) {
      console.error('❌ Error loading manager attendance:', error);
      setManagerAttendance(null);
    } finally {
      setIsLoadingManagerAttendance(false);
    }
  };

  // Load attendance status
  const loadAttendanceStatus = async () => {
    try {
      setIsCheckingStatus(true);
      console.log('🔄 Loading attendance status from API...');
      
      const response = await fetch(`${API_URL}/attendance/status/${currentSupervisor.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 API Response data:', data);
        
        if (data.success && data.data) {
          const apiAttendance = data.data;
          const today = new Date().toDateString();
          const lastCheckInDate = apiAttendance.lastCheckInDate ? 
            new Date(apiAttendance.lastCheckInDate).toDateString() : null;
          
          const hasCheckedInToday = lastCheckInDate === today;
          const hasCheckedOutToday = apiAttendance.checkOutTime && 
            new Date(apiAttendance.checkOutTime).toDateString() === today;
          
          const newAttendance: AttendanceStatus = {
            isCheckedIn: apiAttendance.isCheckedIn || false,
            isOnBreak: apiAttendance.isOnBreak || false,
            checkInTime: apiAttendance.checkInTime || null,
            checkOutTime: apiAttendance.checkOutTime || null,
            checkInPhoto: apiAttendance.checkInPhoto || null,
            checkOutPhoto: apiAttendance.checkOutPhoto || null,
            breakStartTime: apiAttendance.breakStartTime || null,
            breakEndTime: apiAttendance.breakEndTime || null,
            totalHours: Number(apiAttendance.totalHours) || 0,
            breakTime: Number(apiAttendance.breakTime) || 0,
            lastCheckInDate: apiAttendance.lastCheckInDate || null,
            hasCheckedInToday: hasCheckedInToday,
            hasCheckedOutToday: hasCheckedOutToday
          };
          
          setAttendance(newAttendance);
          localStorage.setItem(`supervisorAttendance_${currentSupervisor.id}`, JSON.stringify(newAttendance));
          console.log('✅ Attendance loaded from API');
          setApiStatus('');
          return;
        }
      } else {
        console.log('⚠️ API failed, using localStorage');
        setApiStatus('API connection failed, using local data');
      }
      
      const savedAttendance = localStorage.getItem(`supervisorAttendance_${currentSupervisor.id}`);
      if (savedAttendance) {
        const parsedAttendance = JSON.parse(savedAttendance);
        
        const today = new Date().toDateString();
        const lastCheckInDate = parsedAttendance.lastCheckInDate ? 
          new Date(parsedAttendance.lastCheckInDate).toDateString() : null;
        
        const updatedAttendance = {
          ...parsedAttendance,
          totalHours: Number(parsedAttendance.totalHours) || 0,
          breakTime: Number(parsedAttendance.breakTime) || 0,
          hasCheckedInToday: lastCheckInDate === today,
          hasCheckedOutToday: parsedAttendance.checkOutTime && 
            new Date(parsedAttendance.checkOutTime).toDateString() === today
        };
        
        setAttendance(updatedAttendance);
        console.log('📁 Attendance loaded from localStorage');
        setApiStatus('Using local data');
      }
    } catch (error) {
      console.error('❌ Error loading attendance status:', error);
      setApiStatus('Error loading attendance data');
      
      const savedAttendance = localStorage.getItem(`supervisorAttendance_${currentSupervisor.id}`);
      if (savedAttendance) {
        const parsedAttendance = JSON.parse(savedAttendance);
        setAttendance({
          ...parsedAttendance,
          totalHours: Number(parsedAttendance.totalHours) || 0,
          breakTime: Number(parsedAttendance.breakTime) || 0,
          hasCheckedInToday: parsedAttendance.hasCheckedInToday || false,
          hasCheckedOutToday: parsedAttendance.hasCheckedOutToday || false
        });
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Load supervisor attendance records
  const loadSupervisorAttendanceRecords = async () => {
    try {
      console.log('🔄 Loading supervisor attendance history...');
      
      const response = await fetch(`${API_URL}/attendance/history?employeeId=${currentSupervisor.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Supervisor attendance history response:', data);
        
        if (data.success && Array.isArray(data.data)) {
          const supervisorRecords = data.data.filter((record: any) => 
            record.employeeId === currentSupervisor.id || 
            record.supervisorId === currentSupervisor.id
          );
          
          console.log(`✅ Found ${supervisorRecords.length} records for current supervisor`);
          
          const transformedRecords = supervisorRecords.map((record: any, index: number) => {
            const recordDate = record.date ? record.date : 
                             new Date(Date.now() - index * 86400000).toISOString().split('T')[0];
            
            let status = "Absent";
            if (record.checkInTime && record.checkOutTime) {
              status = "Present";
            } else if (record.checkInTime && !record.checkOutTime) {
              status = "In Progress";
            } else if (record.status === "Weekly Off") {
              status = "Weekly Off";
            }
            
            return {
              id: record._id || record.id || `record-${index}`,
              employeeId: record.employeeId || currentSupervisor.id,
              employeeName: record.employeeName || currentSupervisor.name,
              supervisorId: record.supervisorId || currentSupervisor.supervisorId,
              date: recordDate,
              checkInTime: record.checkInTime ? formatTimeForDisplay(record.checkInTime) : "-",
              checkOutTime: record.checkOutTime ? formatTimeForDisplay(record.checkOutTime) : "-",
              checkInPhoto: record.checkInPhoto || null,
              checkOutPhoto: record.checkOutPhoto || null,
              breakStartTime: record.breakStartTime ? formatTimeForDisplay(record.breakStartTime) : "-",
              breakEndTime: record.breakEndTime ? formatTimeForDisplay(record.breakEndTime) : "-",
              totalHours: Number(record.totalHours) || 0,
              breakTime: Number(record.breakTime) || 0,
              status: status,
              shift: record.shift || "Supervisor Shift",
              hours: Number(record.totalHours) || 0
            };
          });
          
          transformedRecords.sort((a: SupervisorAttendanceRecord, b: SupervisorAttendanceRecord) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          setSupervisorAttendanceRecords(transformedRecords);
          return;
        }
      } else {
        console.log('⚠️ History endpoint failed, creating sample data');
        createSampleAttendanceRecords();
      }
    } catch (error) {
      console.error('❌ Error loading supervisor attendance history:', error);
      createSampleAttendanceRecords();
    }
  };

  // Create sample attendance records with mock photos
  const createSampleAttendanceRecords = () => {
    const today = new Date().toISOString().split('T')[0];
    const sampleRecords: SupervisorAttendanceRecord[] = [
      {
        id: "today",
        employeeId: currentSupervisor.id,
        employeeName: currentSupervisor.name,
        supervisorId: currentSupervisor.supervisorId,
        date: today,
        checkInTime: attendance.checkInTime ? formatTimeForDisplay(attendance.checkInTime) : "-",
        checkOutTime: attendance.checkOutTime ? formatTimeForDisplay(attendance.checkOutTime) : "-",
        checkInPhoto: attendance.checkInPhoto || null,
        checkOutPhoto: attendance.checkOutPhoto || null,
        breakStartTime: attendance.breakStartTime,
        breakEndTime: attendance.breakEndTime,
        totalHours: attendance.totalHours || 0,
        breakTime: attendance.breakTime || 0,
        status: attendance.isCheckedIn ? 
               (attendance.checkOutTime ? "Present" : "In Progress") : 
               "Absent",
        shift: "Supervisor Shift",
        hours: attendance.totalHours || 0
      },
      {
        id: "1",
        employeeId: currentSupervisor.id,
        employeeName: currentSupervisor.name,
        supervisorId: currentSupervisor.supervisorId,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        checkInTime: "08:45 AM",
        checkOutTime: "05:15 PM",
        checkInPhoto: null,
        checkOutPhoto: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 8.5,
        breakTime: 0.5,
        status: "Present",
        shift: "Supervisor Shift",
        hours: 8.5
      },
      {
        id: "2",
        employeeId: currentSupervisor.id,
        employeeName: currentSupervisor.name,
        supervisorId: currentSupervisor.supervisorId,
        date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        checkInTime: "09:00 AM",
        checkOutTime: "04:30 PM",
        checkInPhoto: null,
        checkOutPhoto: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 7.5,
        breakTime: 0.5,
        status: "Present",
        shift: "Supervisor Shift",
        hours: 7.5
      },
      {
        id: "3",
        employeeId: currentSupervisor.id,
        employeeName: currentSupervisor.name,
        supervisorId: currentSupervisor.supervisorId,
        date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        checkInTime: "-",
        checkOutTime: "-",
        checkInPhoto: null,
        checkOutPhoto: null,
        breakStartTime: null,
        breakEndTime: null,
        totalHours: 0,
        breakTime: 0,
        status: "Absent",
        shift: "Supervisor Shift",
        hours: 0
      }
    ];
    
    setSupervisorAttendanceRecords(sampleRecords);
  };

  // Save attendance status
  const saveAttendanceStatus = (newAttendance: AttendanceStatus) => {
    const sanitizedAttendance = {
      ...newAttendance,
      totalHours: Number(newAttendance.totalHours) || 0,
      breakTime: Number(newAttendance.breakTime) || 0,
    };
    
    setAttendance(sanitizedAttendance);
    localStorage.setItem(`supervisorAttendance_${currentSupervisor.id}`, JSON.stringify(sanitizedAttendance));
  };

  // Handle break in
  const handleBreakIn = async () => {
    try {
      if (!attendance.isCheckedIn) {
        toast.error("You need to check in first!");
        return;
      }

      if (attendance.isOnBreak) {
        toast.error("You are already on break!");
        return;
      }

      console.log('🔄 Starting break for supervisor:', currentSupervisor.id);
      
      setIsAttendanceLoading(true);
      
      const payload = {
        employeeId: currentSupervisor.id,
      };
      
      const response = await fetch(`${API_URL}/attendance/breakin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Break started successfully!");
        
        const now = new Date().toISOString();
        const newAttendance = {
          ...attendance,
          isOnBreak: true,
          breakStartTime: now
        };
        saveAttendanceStatus(newAttendance);
        addActivity('break', `Started break at ${formatTimeForDisplay(now)}`);
        loadSupervisorAttendanceRecords();
      } else {
        throw new Error(data.message || "Error starting break");
      }
    } catch (error: any) {
      console.error('Break-in error:', error);
      toast.error(`Break-in failed: ${error.message}`);
      
      const now = new Date().toISOString();
      const newAttendance = {
        ...attendance,
        isOnBreak: true,
        breakStartTime: now
      };
      saveAttendanceStatus(newAttendance);
      addActivity('break', `Started break at ${formatTimeForDisplay(now)} (Offline)`);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle break out
  const handleBreakOut = async () => {
    try {
      if (!attendance.isOnBreak) {
        toast.error("You are not on break!");
        return;
      }

      console.log('🔄 Ending break for supervisor:', currentSupervisor.id);
      
      setIsAttendanceLoading(true);
      
      const payload = {
        employeeId: currentSupervisor.id,
      };
      
      const response = await fetch(`${API_URL}/attendance/breakout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Break ended successfully!");
        
        const now = new Date().toISOString();
        const breakTime = calculateBreakTime(attendance.breakStartTime, now);
        const totalBreakTime = (Number(attendance.breakTime) || 0) + breakTime;
        const newAttendance = {
          ...attendance,
          isOnBreak: false,
          breakEndTime: now,
          breakTime: totalBreakTime
        };
        saveAttendanceStatus(newAttendance);
        addActivity('break', `Ended break at ${formatTimeForDisplay(now)} - Duration: ${breakTime.toFixed(2)}h`);
        loadSupervisorAttendanceRecords();
      } else {
        throw new Error(data.message || "Error ending break");
      }
    } catch (error: any) {
      console.error('Break-out error:', error);
      toast.error(`Break-out failed: ${error.message}`);
      
      const now = new Date().toISOString();
      const breakTime = calculateBreakTime(attendance.breakStartTime, now);
      const totalBreakTime = (Number(attendance.breakTime) || 0) + breakTime;
      const newAttendance = {
        ...attendance,
        isOnBreak: false,
        breakEndTime: now,
        breakTime: totalBreakTime
      };
      saveAttendanceStatus(newAttendance);
      addActivity('break', `Ended break at ${formatTimeForDisplay(now)} - Duration: ${breakTime.toFixed(2)}h (Offline)`);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  // Handle card clicks
  const handlePresentClick = () => {
    if (summary.presentCount === 0) {
      toast.info('No present employees to show');
      return;
    }
    navigate('/supervisor/attendance', { 
      state: { 
        filterStatus: 'present',
        date: selectedDate,
        fromDashboard: true 
      } 
    });
    toast.info('Showing present employees for today');
  };

  const handleAbsentClick = () => {
    if (summary.absentCount === 0) {
      toast.info('No absent employees to show');
      return;
    }
    navigate('/supervisor/attendance', { 
      state: { 
        filterStatus: 'absent',
        date: selectedDate,
        fromDashboard: true 
      } 
    });
    toast.info('Showing absent employees for today');
  };

  const handleWeeklyOffClick = () => {
    if (summary.weeklyOffCount === 0) {
      toast.info('No employees on weekly off to show');
      return;
    }
    navigate('/supervisor/attendance', { 
      state: { 
        filterStatus: 'weekly-off',
        date: selectedDate,
        fromDashboard: true 
      } 
    });
    toast.info('Showing employees on weekly off for today');
  };

  // Add activity
  const addActivity = (type: string, message: string, userType: string = 'self') => {
    const user = userType === 'manager' ? 'Manager' : (userType === 'system' ? 'System' : 'You');
    const newActivity: Activity = {
      id: Date.now().toString(),
      type,
      message,
      employee: user,
      priority: type === 'approval' ? 'high' : 'medium',
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
  };

  // Handle action
  const handleAction = (action: string, id?: string) => {
    const actions: { [key: string]: (id?: string) => void } = {
      assignTask: () => alert('Opening task assignment...'),
      generateReport: () => alert('Generating report...'),
      approveRequests: () => window.location.href = '/supervisor/approvals',
      scheduleMeeting: () => window.location.href = '/supervisor/meetings/schedule',
      performanceReview: () => window.location.href = '/supervisor/performance/reviews',
      exportData: () => alert('Exporting data...'),
      viewAllActivities: () => window.location.href = '/supervisor/assigntask',
      manageEmployees: () => window.location.href = '/supervisor/employees',
      viewTask: (id?: string) => window.location.href = `/supervisor/tasks/${id}`,
      viewEmployee: (id?: string) => window.location.href = `/supervisor/employees/${id}`,
      viewAttendance: () => navigate('/supervisor/attendance'),
      taskManagement: () => navigate('/supervisor/tasks'),
      viewTaskDetails: (taskId?: string) => navigate(`/supervisor/tasks/${taskId}`),
      viewLeaveRequests: () => navigate('/supervisor/leave')
    };
    
    if (actions[action]) {
      actions[action](id);
    }
  };

  // Get color for badges
  const getColor = (type: string, value: string) => {
    const colors: { [key: string]: { [key: string]: string } } = {
      priority: {
        high: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
        medium: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
        low: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      },
      status: {
        active: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
        'on leave': 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        remote: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      },
      icon: {
        task: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        approval: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
        completion: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        checkin: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        checkout: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        break: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
      },
      progress: {
        high: 'bg-red-600 dark:bg-red-500',
        medium: 'bg-yellow-500 dark:bg-yellow-400',
        low: 'bg-blue-600 dark:bg-blue-500'
      },
      personalStatus: {
        completed: 'bg-green-100 text-green-800 border-green-200',
        'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        cancelled: 'bg-red-100 text-red-800 border-red-200'
      },
      leaveStatus: {
        approved: 'bg-green-100 text-green-800 border-green-200',
        rejected: 'bg-red-100 text-red-800 border-red-200',
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
      }
    };
    
    return colors[type]?.[value] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  };

  // Format time
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Format number
  const formatNumber = (value: number): string => {
    return Number(value).toFixed(2);
  };

  // Handle retry connection
  const handleRetryConnection = () => {
    checkBackendConnection().then(() => {
      if (isBackendConnected) {
        loadData();
        loadAttendanceStatus();
        loadManagerAttendanceData();
        loadSupervisorAttendanceRecords();
        fetchAllSites();
        fetchEmployees();
        loadAttendanceRecords(selectedDate);
        fetchAssignedTasks();
        fetchAllLeaveRequests();
      }
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    setCurrentSupervisor(getCurrentSupervisor());
    
    checkBackendConnection();
    loadData();
    loadAttendanceStatus();
    loadManagerAttendanceData();
    loadSupervisorAttendanceRecords();
    fetchAllSites();
    fetchEmployees();
    loadAttendanceRecords(selectedDate);
    fetchAssignedTasks();
    fetchAllLeaveRequests();
    
    toast.success("Dashboard data refreshed!");
  };

  const loadData = async () => {
    const result = await fetchAssignedTasks();
    await fetchAllLeaveRequests();
    
    setStats(prev => ({
      ...prev,
      totalEmployees: summary.totalEmployees,
      assignedTasks: result.assigned,
      completedTasks: result.completed,
      pendingRequests: pendingLeaveCount
    }));
    setActivities(prev => [...prev]);
    setTeam([]);
  };

  // Check if it's a new day
  const isNewDay = () => {
    if (!attendance.lastCheckInDate) return true;
    
    const today = new Date().toDateString();
    const lastCheckInDay = new Date(attendance.lastCheckInDate).toDateString();
    
    return today !== lastCheckInDay;
  };

  // Auto-reset attendance if it's a new day
  useEffect(() => {
    if (attendance.lastCheckInDate && isNewDay()) {
      console.log('📅 New day detected, resetting attendance flags');
      const resetAttendance = {
        ...attendance,
        hasCheckedInToday: false,
        hasCheckedOutToday: false
      };
      saveAttendanceStatus(resetAttendance);
    }
  }, [attendance.lastCheckInDate]);

  // Update stats whenever summary.totalEmployees or task counts or leave count change
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalEmployees: summary.totalEmployees,
      assignedTasks: assignedTasksCount,
      completedTasks: completedTasksCount,
      pendingRequests: pendingLeaveCount
    }));
  }, [summary.totalEmployees, assignedTasksCount, completedTasksCount, pendingLeaveCount]);

  // Update summary leave count when todayLeaveCount changes
  useEffect(() => {
    setSummary(prev => ({
      ...prev,
      leaveCount: todayLeaveCount
    }));
  }, [todayLeaveCount]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      console.log("🚀 Initializing supervisor dashboard...");
      await checkBackendConnection();
      await fetchAllSites();
      await fetchEmployees();
      await fetchAllLeaveRequests();
      await loadAttendanceRecords(selectedDate);
      await loadAttendanceStatus();
      await loadManagerAttendanceData();
      await loadSupervisorAttendanceRecords();
      await fetchAssignedTasks();
      await loadData();
      setLoading(false);
    };
    
    initializeData();
  }, []);

  // Load attendance records when employees or date changes
  useEffect(() => {
    if (employees.length > 0) {
      loadAttendanceRecords(selectedDate);
    } else {
      setSummary(prev => ({
        ...prev,
        totalEmployees: 0,
        presentCount: 0,
        absentCount: 0,
        weeklyOffCount: 0,
        leaveCount: todayLeaveCount,
        halfDayCount: 0
      }));
    }
  }, [employees, selectedDate]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  }

return (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <DashboardHeader title="Supervisor Dashboard" subtitle="Manage team and operations" onMenuClick={onMenuClick} />

    {/* Floating Plus button at top right corner */}
    <div className="fixed top-4 right-4 z-50">
      <Button
        onClick={() => setQuickCreateOpen(true)}
        className="rounded-full h-12 w-12 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>

    <div className="p-4 space-y-4">
      {/* Top row: Back, Attendance, Break In, Break Out, Today status, Refresh */}
      <div className="flex flex-wrap items-center gap-2">
       
        <Button onClick={handleAttendanceCamera} variant="default" size="sm" className="flex items-center gap-1">
          <Camera className="h-4 w-4" /> Attendance
        </Button>
        <Button onClick={handleOpenWeeklyOffDialog} variant="outline" size="sm">
  <CalendarDays className="h-4 w-4 mr-1" /> Mark Weekly Off
</Button>
        <Button onClick={handleBreakIn} disabled={!attendance.isCheckedIn || attendance.isOnBreak} variant="outline" size="sm">
          <Coffee className="h-4 w-4 mr-1" /> Break In
        </Button>
        <Button onClick={handleBreakOut} disabled={!attendance.isOnBreak} variant="outline" size="sm">
          <Timer className="h-4 w-4 mr-1" /> Break Out
        </Button>

        {/* Today status inline */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <Badge 
            variant={
              attendance.hasCheckedOutToday ? "success" : 
              attendance.hasCheckedInToday ? "warning" : 
              "secondary"
            }
            className="text-xs"
          >
            {attendance.hasCheckedOutToday ? "Completed" : attendance.hasCheckedInToday ? "In Progress" : "Not Started"}
          </Badge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Hours: {attendance.totalHours.toFixed(1)}h
          </span>
        </div>

        {/* Optional refresh button */}
        <Button onClick={handleRefresh} variant="ghost" size="sm" className="ml-auto">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
  {featureBlocks.map(block => {
    const isMissing = missingData.some(item => block.title.includes(item));
    return (
      <Card key={block.title} className="cursor-pointer hover:shadow-md relative" onClick={() => navigate(block.path)}>
        <CardContent className="p-2 flex flex-col items-center text-center">
          <div className={`p-2 rounded-full text-white ${block.color} mb-1 relative`}>
            {block.icon}
            {isMissing && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
              />
            )}
          </div>
          <span className="text-xs font-medium">{block.title}</span>
        </CardContent>
      </Card>
    );
  })}
</div>

      {/* Upcoming Tasks – compact */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Upcoming Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {filteredTasks.length === 0 ? (
            <p className="text-xs">No tasks</p>
          ) : (
            <div className="space-y-1">
              {filteredTasks.slice(0, 3).map(t => (
                <div key={t._id} className="text-xs border-b pb-1">
                  <strong>{t.title}</strong> – {t.siteName}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Leave Requests – compact */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Recent Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {recentLeaves.length === 0 ? (
            <p className="text-xs">No requests</p>
          ) : (
            <div className="space-y-1">
              {recentLeaves.slice(0, 3).map(l => (
                <div key={l._id} className="text-xs border-b pb-1">
                  {l.employeeName} – {l.status}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Unified Create Modal (only Employee tab) */}
    <UnifiedCreateModal
      open={quickCreateOpen}
      onOpenChange={setQuickCreateOpen}
      employees={employees as any}
      setEmployees={setEmployees as any}
      onSuccess={() => {
        fetchEmployees();
        loadAttendanceRecords(selectedDate);
        toast.success("Employees refreshed");
      }}
      allowedTabs={['employee']}
    />

    {/* Camera Capture Dialog for Face Recognition */}
   <CameraCapture
  open={cameraOpen}
  onOpenChange={setCameraOpen}
  onCapture={handlePhotoCapture}
  title={cameraAction === 'checkin' ? 'Check-in' : 
        cameraAction === 'checkout' ? 'Check-out' : 
        'Face Recognition Attendance'}
  description={
    cameraAction === 'recognize' 
      ? attendanceResult || (isProcessing ? '🔄 Processing...' : '👤 Look at camera for instant attendance')
      : 'Look into the camera for verification'
  }
  actionLabel={cameraAction === 'checkin' ? "Confirm Check-in" : 
              cameraAction === 'checkout' ? "Confirm Check-out" : 
              "Done"}
  continuous={cameraAction === 'recognize'} // ✅ Auto-capture mode
  onAutoCapture={handlePhotoCapture} // ✅ Auto-capture handler
/>

    <Dialog open={weeklyOffDialogOpen} onOpenChange={setWeeklyOffDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Mark Weekly Off</DialogTitle>
      <DialogDescription>Select an employee to mark as weekly off for today.</DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <Select
        value={selectedEmployeeForWeeklyOff?._id || ""}
        onValueChange={(value) => {
          const emp = employees.find(e => e._id === value);
          setSelectedEmployeeForWeeklyOff(emp || null);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select Employee" />
        </SelectTrigger>
        <SelectContent>
          {employees.map(emp => (
            <SelectItem key={emp._id} value={emp._id}>
              {emp.name} ({emp.employeeId})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setWeeklyOffDialogOpen(false)}>Cancel</Button>
      <Button onClick={handleMarkWeeklyOff} disabled={weeklyOffLoading}>
        {weeklyOffLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
        Confirm Weekly Off
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
  </div>
);
};

export default SupervisorDashboard;