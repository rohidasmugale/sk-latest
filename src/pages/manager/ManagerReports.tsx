import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  Filter,
  Calendar, 
  TrendingUp,
  Users,
  Building,
  CheckCircle,
  AlertCircle,
  Clock,
  CheckSquare,
  XCircle,
  CalendarDays,
  FileText,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Search,
  User,
  Mail,
  Phone,
  Eye,
  Download as DownloadIcon,
  FileBarChart,
  ClipboardCheck,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  MapPin,
  ClipboardList,
  UserCheck,
  Home,
  Briefcase,
  Lock,
  Wifi,
  WifiOff,
  BarChart3,
  TrendingUp as TrendingUpIcon,
  Loader2,
  RefreshCw,
  Plus,
  AlertTriangle,
  Info,
  Database as DatabaseIcon,
  FileSpreadsheet,
  FileDown,
  ScrollText
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { useRole } from "@/context/RoleContext";
import { taskService, Task, Site as TaskServiceSite } from "@/services/TaskService";
import userService from "@/services/userService";

// Interface for Attendance Data
interface AttendanceRecord {
  id: string;
  date: string;
  day: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Absent" | "Half Day" | "Late";
  totalHours: string;
  breaks: number;
  breakDuration: string;
  overtime: string;
  managerId: string;
  managerName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  breakTime: number;
  lastCheckInDate: string | null;
  isCheckedIn: boolean;
  isOnBreak: boolean;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  averageHours: string;
  totalOvertime: string;
  attendanceRate: number;
}

interface ApiAttendanceRecord {
  _id: string;
  managerId: string;
  managerName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  lastCheckInDate: string | null;
  isCheckedIn: boolean;
  isOnBreak: boolean;
  dailyActivities: any[];
  createdAt: string;
  updatedAt: string;
}

// Interface for Leave Data
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
  contactNumber: string;
  remarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  isManagerLeave?: boolean;
}

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
}

// Extended Task interface for reporting
interface ReportTask extends Task {
  progress?: number;
  site?: string;
  attachments?: number;
  hoursSpent?: number;
  assignee?: string;
  department?: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
}

// Departments and Statuses
const departments = ["All Departments", "IT", "Marketing", "Operations", "HR", "Sales", "Finance", "Product"];
const taskStatuses = ["All Status", "pending", "in-progress", "completed", "cancelled"];
const taskPriorities = ["All Priority", "high", "medium", "low"];
const leaveStatuses = ["All Status", "pending", "approved", "rejected"];
const leaveTypes = ["All Types", "Annual Leave", "Sick Leave", "Casual Leave", "Emergency Leave", "Maternity Leave", "Study Leave"];
const attendanceStatuses = ["All Status", "present", "absent", "late", "half-day"];

// Helper function to get department from task type
const getDepartmentFromTaskType = (taskType?: string): string => {
  if (!taskType) return "Operations";
  
  const type = taskType.toLowerCase();
  if (type.includes('it') || type.includes('tech') || type.includes('software')) return "IT";
  if (type.includes('hr') || type.includes('human')) return "HR";
  if (type.includes('finance') || type.includes('account')) return "Finance";
  if (type.includes('market') || type.includes('sales')) return "Marketing";
  if (type.includes('product') || type.includes('dev')) return "Product";
  if (type.includes('admin') || type.includes('office')) return "Admin";
  if (type.includes('security')) return "Security";
  if (type.includes('housekeeping')) return "Housekeeping";
  if (type.includes('consumable')) return "Consumables";
  if (type.includes('maintenance') || type.includes('repair')) return "Maintenance";
  if (type.includes('inspection') || type.includes('audit')) return "Quality";
  if (type.includes('training') || type.includes('meeting')) return "Training";
  
  return "Operations";
};

const ManagerReports = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { user: authUser, isAuthenticated } = useRole();
  
  // API Base URL
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
  // Manager ID and Name
  const [managerId, setManagerId] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  const [managerInfo, setManagerInfo] = useState<ManagerInfo>({
    _id: "",
    name: "",
    department: "",
    contactNumber: "",
    email: "",
    role: "manager",
    phone: "",
    position: "Manager"
  });
  
  // State for API connection
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  
  // State for Tasks
  const [taskSearch, setTaskSearch] = useState("");
  const [taskDeptFilter, setTaskDeptFilter] = useState("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
  const [taskSiteFilter, setTaskSiteFilter] = useState("all");

  // State for Attendance
  const [attendanceDate, setAttendanceDate] = useState("2024-11-25");
  const [attendanceDeptFilter, setAttendanceDeptFilter] = useState("all");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("all");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    averageHours: "0.0",
    totalOvertime: "0.0",
    attendanceRate: 0
  });
  const [attendanceFilter, setAttendanceFilter] = useState<string>("all");

  // State for Leaves
  const [leaveDeptFilter, setLeaveDeptFilter] = useState("all");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [managerDepartment, setManagerDepartment] = useState<string>("");
  const [leaveApiStatus, setLeaveApiStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const [isLoadingMyLeaves, setIsLoadingMyLeaves] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isFetchingFromAPI, setIsFetchingFromAPI] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // Task related states
  const [tasks, setTasks] = useState<ReportTask[]>([]);
  const [sites, setSites] = useState<TaskServiceSite[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    cancelled: 0,
    highPriority: 0,
    completionRate: "0",
    overdue: 0
  });

  // Initialize manager info from localStorage and auth context
  useEffect(() => {
    const initializeManagerInfo = async () => {
      try {
        let managerData: ManagerInfo | null = null;
        
        // First try to get from auth context
        if (authUser && isAuthenticated) {
          managerData = {
            _id: authUser._id || authUser.id || `mgr_${Date.now()}`,
            employeeId: authUser.employeeId || authUser.id || `MGR${Date.now().toString().slice(-6)}`,
            name: authUser.name || authUser.firstName + " " + authUser.lastName || "Manager",
            department: authUser.department || "",
            contactNumber: authUser.phone || authUser.contactNumber || "0000000000",
            email: authUser.email || "",
            role: authUser.role || "manager",
            phone: authUser.phone || authUser.contactNumber || "",
            position: authUser.position || "Manager",
            site: authUser.site || ""
          };
        } 
        // Try from localStorage
        else {
          const storedUser = localStorage.getItem("sk_user");
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              managerData = {
                _id: user._id || user.id || `mgr_${Date.now()}`,
                employeeId: user.employeeId || user.id || `MGR${Date.now().toString().slice(-6)}`,
                name: user.name || user.firstName || 'Manager',
                department: user.department || "",
                contactNumber: user.phone || user.contactNumber || "0000000000",
                email: user.email || "",
                role: user.role || "manager",
                phone: user.phone || user.contactNumber || "",
                position: user.position || "Manager",
                site: user.site || ""
              };
            } catch (e) {
              console.error('Error parsing user from localStorage:', e);
            }
          }
        }
        
        // If still no manager data, fetch from user service
        if (!managerData) {
          try {
            const allUsersResponse = await userService.getAllUsers();
            const currentUser = allUsersResponse.allUsers.find(user => 
              user.role === "manager" || user.role === "Manager"
            );
            
            if (currentUser) {
              managerData = {
                _id: currentUser._id || currentUser.id,
                employeeId: currentUser.employeeId || currentUser.id,
                name: currentUser.name || currentUser.firstName || 'Manager',
                department: currentUser.department || "",
                contactNumber: currentUser.phone || currentUser.contactNumber || "0000000000",
                email: currentUser.email || "",
                role: currentUser.role || "manager",
                phone: currentUser.phone || currentUser.contactNumber || "",
                position: currentUser.position || "Manager",
                site: currentUser.site || ""
              };
            }
          } catch (error) {
            console.error('Error fetching user from service:', error);
          }
        }
        
        // Set default if still no data
        if (!managerData) {
          const randomId = `manager-${Date.now()}`;
          managerData = {
            _id: randomId,
            employeeId: `MGR${Date.now().toString().slice(-6)}`,
            name: 'Demo Manager',
            department: "Operations",
            contactNumber: "0000000000",
            email: "demo@manager.com",
            role: "manager",
            phone: "0000000000",
            position: "Manager",
            site: "Main Office"
          };
        }
        
        setManagerInfo(managerData);
        setManagerId(managerData._id);
        setManagerName(managerData.name);
        setManagerDepartment(managerData.department || "");
        
        console.log('Current Manager Info:', managerData);
        
      } catch (error) {
        console.error('Error initializing manager info:', error);
        // Set fallback data
        const randomId = `manager-${Date.now()}`;
        const fallbackData: ManagerInfo = {
          _id: randomId,
          name: 'Demo Manager',
          department: "Operations",
          contactNumber: "",
          email: "",
          role: "manager",
          phone: "",
          position: "Manager",
          site: "Main Office"
        };
        setManagerInfo(fallbackData);
        setManagerId(randomId);
        setManagerName('Demo Manager');
        setManagerDepartment("Operations");
      }
    };

    initializeManagerInfo();
  }, [authUser, isAuthenticated]);

  // Load data when managerId is available
  useEffect(() => {
    if (managerId) {
      checkBackendConnection();
      fetchAttendanceData();
      checkLeaveApiConnection();
      fetchDepartments();
      fetchSites();
      fetchTasksData();
    }
  }, [selectedMonth, managerId, taskSiteFilter]);

  // Fetch leaves when department changes
  useEffect(() => {
    if (managerDepartment && leaveApiStatus === 'connected') {
      fetchTeamLeaves();
      fetchManagerLeaves();
    }
  }, [managerDepartment, leaveApiStatus]);

  // Check backend connection for attendance
  const checkBackendConnection = async () => {
    try {
      setIsCheckingConnection(true);
      console.log('Checking backend connection at:', `${API_URL}/health`);
      
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Health check response:', data);
        
        if (data.status === 'OK') {
          setIsBackendConnected(true);
          console.log('✅ Backend connected successfully');
        } else {
          setIsBackendConnected(false);
          console.warn('⚠️ Backend health check failed');
        }
      } else {
        setIsBackendConnected(false);
        console.warn('⚠️ Backend health check failed with status:', response.status);
      }
    } catch (error) {
      console.error('❌ Backend connection error:', error);
      setIsBackendConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Check API connection for leaves
  const checkLeaveApiConnection = async () => {
    try {
      setLeaveApiStatus('checking');
      const response = await fetch(`${API_URL}/test`);
      
      if (response.ok) {
        setLeaveApiStatus('connected');
        console.log("✅ Leave API connection successful");
      } else {
        setLeaveApiStatus('error');
        console.error("❌ Leave API connection failed");
      }
    } catch (error) {
      setLeaveApiStatus('error');
      console.error("❌ Leave API connection error:", error);
    }
  };

  // Fetch sites from task service
  const fetchSites = async () => {
    try {
      const sitesData = await taskService.getAllSites();
      setSites(sitesData);
      console.log("📋 Sites loaded:", sitesData);
    } catch (error) {
      console.error("Error fetching sites:", error);
      toast.error("Failed to load sites");
      setSites([]);
    }
  };

  // Format duration in hours to Xh Ym format
  const formatDuration = (hours: number): string => {
    if (!hours || hours === 0) return "0m";
    
    const totalMinutes = Math.round(hours * 60);
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    
    if (hoursPart > 0 && minutesPart > 0) {
      return `${hoursPart}h ${minutesPart}m`;
    } else if (hoursPart > 0) {
      return `${hoursPart}h`;
    } else {
      return `${minutesPart}m`;
    }
  };

  // Transform API attendance data to UI format
  const transformApiAttendanceData = (apiRecords: any[], year: number, month: number, daysInMonth: number): AttendanceRecord[] => {
    const records: AttendanceRecord[] = [];
    
    // Create a map of existing records by date
    const recordsByDate = new Map<string, any>();
    apiRecords.forEach(record => {
      if (record.date) {
        recordsByDate.set(record.date, record);
      }
    });
    
    // Generate records for all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const existingRecord = recordsByDate.get(dateString);
      
      if (existingRecord) {
        // Has attendance record
        const status = existingRecord.status || "Absent";
        const totalHours = existingRecord.totalHours || 0;
        const breakTime = existingRecord.breakTime || 0;
        const checkIn = existingRecord.checkIn || "-";
        const checkOut = existingRecord.checkOut || "-";
        const overtime = totalHours > 8 ? (totalHours - 8).toFixed(1) : "0.0";
        
        records.push({
          id: existingRecord._id || `record-${dateString}`,
          date: dateString,
          day: dayOfWeek,
          checkIn: checkIn,
          checkOut: checkOut,
          status: status as "Present" | "Absent" | "Half Day" | "Late",
          totalHours: totalHours.toString(),
          breaks: breakTime > 0 ? 1 : 0,
          breakDuration: formatDuration(breakTime),
          overtime: overtime,
          managerId: managerId,
          managerName: managerName,
          checkInTime: existingRecord.checkInTime,
          checkOutTime: existingRecord.checkOutTime,
          breakStartTime: existingRecord.breakStartTime,
          breakEndTime: existingRecord.breakEndTime,
          breakTime: breakTime,
          lastCheckInDate: existingRecord.lastCheckInDate,
          isCheckedIn: existingRecord.isCheckedIn || false,
          isOnBreak: existingRecord.isOnBreak || false
        });
      } else {
        // No record - mark as absent
        records.push({
          id: `absent-${dateString}`,
          date: dateString,
          day: dayOfWeek,
          checkIn: "-",
          checkOut: "-",
          status: "Absent",
          totalHours: "0.0",
          breaks: 0,
          breakDuration: "0m",
          overtime: "0.0",
          managerId: managerId,
          managerName: managerName,
          checkInTime: null,
          checkOutTime: null,
          breakStartTime: null,
          breakEndTime: null,
          breakTime: 0,
          lastCheckInDate: null,
          isCheckedIn: false,
          isOnBreak: false
        });
      }
    }
    
    return records;
  };

  // Generate sample attendance data
  const generateSampleAttendanceData = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const endDate = new Date(year, month, 0);
    const daysInMonth = endDate.getDate();
    
    const records: AttendanceRecord[] = [];
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let totalHours = 0;
    let totalOvertime = 0;

    const generateTime = (startHour: number, startMin: number, endHour: number, endMin: number) => {
      const hour = Math.floor(Math.random() * (endHour - startHour)) + startHour;
      const minute = Math.floor(Math.random() * (endMin - startMin)) + startMin;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    };

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      // Skip weekends for sample data
      if (date.getDay() === 0 || date.getDay() === 6) {
        // Weekend - mark as absent or present with some probability
        if (Math.random() < 0.3) {
          // Sometimes work on weekends
          const hours = 6 + (Math.random() * 2);
          const overtime = Math.max(0, hours - 8);
          
          records.push({
            id: `sample-weekend-${dateStr}`,
            date: dateStr,
            day: dayOfWeek,
            checkIn: generateTime(9, 0, 10, 0),
            checkOut: generateTime(15, 0, 16, 0),
            status: "Present",
            totalHours: hours.toFixed(1),
            breaks: 1,
            breakDuration: "45m",
            overtime: overtime.toFixed(1),
            managerId: managerId,
            managerName: managerName,
            checkInTime: null,
            checkOutTime: null,
            breakStartTime: null,
            breakEndTime: null,
            breakTime: 45,
            lastCheckInDate: dateStr,
            isCheckedIn: false,
            isOnBreak: false
          });
          
          presentCount++;
          totalHours += hours;
          totalOvertime += overtime;
        } else {
          // Weekend absent
          records.push({
            id: `sample-absent-${dateStr}`,
            date: dateStr,
            day: dayOfWeek,
            checkIn: "-",
            checkOut: "-",
            status: "Absent",
            totalHours: "0.0",
            breaks: 0,
            breakDuration: "0m",
            overtime: "0.0",
            managerId: managerId,
            managerName: managerName,
            checkInTime: null,
            checkOutTime: null,
            breakStartTime: null,
            breakEndTime: null,
            breakTime: 0,
            lastCheckInDate: null,
            isCheckedIn: false,
            isOnBreak: false
          });
        }
      } else {
        // Weekday
        const rand = Math.random();
        let status: string;
        let hours: number;

        if (rand < 0.7) {
          status = "Present";
          hours = 8.0 + (Math.random() * 0.5);
          presentCount++;
        } else if (rand < 0.85) {
          status = "Late";
          hours = 7.5 + (Math.random() * 0.5);
          lateCount++;
        } else if (rand < 0.95) {
          status = "Half Day";
          hours = 4.0 + (Math.random() * 1.0);
          halfDayCount++;
        } else {
          status = "Absent";
          hours = 0;
        }

        const overtime = Math.max(0, hours - 8.0);
        
        records.push({
          id: `sample-${dateStr}`,
          date: dateStr,
          day: dayOfWeek,
          checkIn: status !== "Absent" ? generateTime(8, 30, 9, 30) : "-",
          checkOut: status !== "Absent" ? generateTime(16, 30, 18, 0) : "-",
          status: status as any,
          totalHours: hours.toFixed(1),
          breaks: status !== "Absent" ? Math.floor(Math.random() * 2) + 1 : 0,
          breakDuration: status !== "Absent" ? "45m" : "0m",
          overtime: overtime.toFixed(1),
          managerId: managerId,
          managerName: managerName,
          checkInTime: null,
          checkOutTime: null,
          breakStartTime: null,
          breakEndTime: null,
          breakTime: status !== "Absent" ? 45 : 0,
          lastCheckInDate: status !== "Absent" ? dateStr : null,
          isCheckedIn: false,
          isOnBreak: false
        });

        totalHours += hours;
        totalOvertime += overtime;
      }
    }

    const totalDays = records.length;
    const absentCount = records.filter(r => r.status === "Absent").length;
    const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

    setAttendanceRecords(records);
    setAttendanceStats({
      totalDays,
      presentDays: presentCount,
      absentDays: absentCount,
      lateDays: lateCount,
      halfDays: halfDayCount,
      averageHours: (totalHours / (presentCount + lateCount + halfDayCount) || 0).toFixed(1),
      totalOvertime: totalOvertime.toFixed(1),
      attendanceRate
    });
  };

  // Fetch attendance data from database
  const fetchAttendanceData = async () => {
    if (!managerId) {
      console.log('Manager ID not available yet');
      return;
    }

    setIsLoadingAttendance(true);
    setIsFetchingFromAPI(false);
    
    try {
      console.log('📅 Fetching attendance data for manager:', managerId);
      console.log('Selected month:', selectedMonth);
      
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log('Date range:', { startDateStr, endDateStr });
      
      // Try the new endpoint
      setIsFetchingFromAPI(true);
      const response = await fetch(
        `${API_URL}/manager-attendance/summary/${managerId}?year=${year}&month=${month}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      console.log('API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API response for manager attendance:', data);
        
        if (data.success && data.data) {
          const { dailyRecords, stats } = data.data;
          
          // Get number of days in the month
          const daysInMonth = endDate.getDate();
          const formattedRecords = transformApiAttendanceData(dailyRecords, year, month, daysInMonth);
          
          setAttendanceRecords(formattedRecords);
          
          // Calculate statistics
          const totalDays = daysInMonth;
          const presentDays = formattedRecords.filter(r => 
            r.status === "Present" || r.status === "Late" || r.status === "Half Day"
          ).length;
          const absentDays = formattedRecords.filter(r => r.status === "Absent").length;
          const lateDays = formattedRecords.filter(r => r.status === "Late").length;
          const halfDays = formattedRecords.filter(r => r.status === "Half Day").length;
          
          // Calculate hours
          const presentRecords = formattedRecords.filter(r => 
            r.status === "Present" || r.status === "Late" || r.status === "Half Day"
          );
          const totalHours = presentRecords.reduce((sum, record) => 
            sum + parseFloat(record.totalHours || "0"), 0
          );
          const totalOvertime = presentRecords.reduce((sum, record) => 
            sum + parseFloat(record.overtime || "0"), 0
          );
          
          const averageHours = presentDays > 0 ? (totalHours / presentDays) : 0;
          const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
          
          setAttendanceStats({
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            halfDays,
            averageHours: averageHours.toFixed(1),
            totalOvertime: totalOvertime.toFixed(1),
            attendanceRate
          });
          
          toast.success(`Attendance data loaded for ${getCurrentMonthName()}`);
          return;
        } else {
          console.warn('No valid data from API response');
        }
      } else {
        console.warn('API request failed with status:', response.status);
      }
      
      // If API fails, generate sample data as fallback
      console.log('Generating sample attendance data as fallback');
      generateSampleAttendanceData();
      
    } catch (error) {
      console.error('❌ Error fetching attendance from API:', error);
      toast.error("Could not load attendance data");
      generateSampleAttendanceData();
    } finally {
      setIsLoadingAttendance(false);
      setIsFetchingFromAPI(false);
    }
  };

  // Fetch tasks data
  const fetchTasksData = async () => {
    if (!managerId) return;
    
    setIsLoadingTasks(true);
    try {
      console.log("📊 Fetching tasks for manager:", managerId);
      
      // Fetch tasks based on manager's access
      let fetchedTasks: ReportTask[] = [];
      
      // First try to get tasks created by the manager
      try {
        const createdTasks = await taskService.getTasksByCreator(managerId);
        console.log("📝 Tasks created by manager:", createdTasks);
        fetchedTasks = [...fetchedTasks, ...createdTasks.map(task => ({
          ...task,
          source: "manager" as const,
          department: getDepartmentFromTaskType(task.taskType),
          hoursSpent: Math.floor(Math.random() * 100), // Mock data for now
          attachments: task.attachments?.length || 0,
          progress: calculateTaskProgress(task),
          assignee: task.assignedToName,
          site: task.siteName
        }))];
      } catch (error) {
        console.error("Error fetching created tasks:", error);
      }
      
      // Then try to get tasks for the manager's site
      if (managerInfo.site || authUser?.site) {
        const siteName = managerInfo.site || authUser?.site;
        try {
          const siteTasks = await taskService.getTasksBySite(siteName!);
          console.log("🏢 Tasks for site:", siteTasks);
          
          const siteTasksFormatted = siteTasks
            .filter(task => !fetchedTasks.some(t => t._id === task._id))
            .map(task => ({
              ...task,
              source: "site" as const,
              department: getDepartmentFromTaskType(task.taskType),
              hoursSpent: Math.floor(Math.random() * 100),
              attachments: task.attachments?.length || 0,
              progress: calculateTaskProgress(task),
              assignee: task.assignedToName,
              site: task.siteName
            }));
          
          fetchedTasks = [...fetchedTasks, ...siteTasksFormatted];
        } catch (error) {
          console.error("Error fetching site tasks:", error);
        }
      }
      
      // If no tasks found, get all tasks as fallback
      if (fetchedTasks.length === 0) {
        try {
          const allTasks = await taskService.getAllTasks();
          console.log("🌐 All tasks:", allTasks);
          
          fetchedTasks = allTasks.slice(0, 20).map(task => ({
            ...task,
            source: "all" as const,
            department: getDepartmentFromTaskType(task.taskType),
            hoursSpent: Math.floor(Math.random() * 100),
            attachments: task.attachments?.length || 0,
            progress: calculateTaskProgress(task),
            assignee: task.assignedToName,
            site: task.siteName
          }));
        } catch (error) {
          console.error("Error fetching all tasks:", error);
          toast.error("Could not load tasks from server");
        }
      }
      
      setTasks(fetchedTasks);
      calculateTaskStatistics(fetchedTasks);
      
      console.log("✅ Tasks loaded successfully:", fetchedTasks.length);
      
    } catch (error) {
      console.error("Error in fetchTasksData:", error);
      toast.error("Failed to load tasks");
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Calculate task progress based on status and dates
  const calculateTaskProgress = (task: Task): number => {
    if (task.status === 'completed') return 100;
    if (task.status === 'cancelled') return 0;
    
    // For in-progress tasks, estimate based on time
    if (task.status === 'in-progress') {
      if (task.createdAt && task.deadline) {
        const created = new Date(task.createdAt).getTime();
        const deadline = new Date(task.deadline).getTime();
        const now = new Date().getTime();
        
        if (deadline > created) {
          const totalTime = deadline - created;
          const elapsed = now - created;
          return Math.min(50, Math.max(10, Math.floor((elapsed / totalTime) * 100)));
        }
      }
      return 40; // Default for in-progress
    }
    
    // For pending tasks, based on urgency
    if (task.status === 'pending') {
      if (task.deadline) {
        const deadline = new Date(task.deadline).getTime();
        const now = new Date().getTime();
        const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDeadline < 0) return 0; // Overdue
        if (daysUntilDeadline < 3) return 10; // Urgent
        if (daysUntilDeadline < 7) return 5; // Soon
      }
      return 0; // Default for pending
    }
    
    return 0;
  };

  // Calculate task statistics
  const calculateTaskStatistics = (tasks: ReportTask[]) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const cancelled = tasks.filter(t => t.status === 'cancelled').length;
    const highPriority = tasks.filter(t => t.priority === 'high').length;
    
    // Calculate overdue tasks
    const today = new Date();
    const overdue = tasks.filter(task => {
      if (task.deadline && task.status !== 'completed' && task.status !== 'cancelled') {
        const deadline = new Date(task.deadline);
        return deadline < today;
      }
      return false;
    }).length;
    
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0";
    
    setTaskStats({
      total,
      completed,
      inProgress,
      pending,
      cancelled,
      highPriority,
      completionRate,
      overdue
    });
  };

  // Fetch departments for leaves
  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/leaves/departments`);
      if (response.ok) {
        const departments = await response.json();
        console.log("📋 Available departments:", departments);
        
        if (departments && departments.length > 0) {
          setAvailableDepartments(departments);
          if (!managerDepartment && departments.length > 0) {
            setManagerDepartment(departments[0]);
          }
        } else {
          const defaultDepartments = ["Consumables Management", "Housekeeping Management", "Security Management"];
          setAvailableDepartments(defaultDepartments);
          if (!managerDepartment) {
            setManagerDepartment(defaultDepartments[0]);
          }
        }
      } else {
        throw new Error("Failed to fetch departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      const defaultDepartments = ["Consumables Management", "Housekeeping Management", "Security Management"];
      setAvailableDepartments(defaultDepartments);
      if (!managerDepartment) {
        setManagerDepartment(defaultDepartments[0]);
      }
    }
  };

  // Fetch team leaves
  const fetchTeamLeaves = async () => {
    if (leaveApiStatus !== 'connected') {
      toast.error("Please check API connection first");
      return;
    }

    if (!managerDepartment) {
      return;
    }

    try {
      setIsLoadingLeaves(true);
      const response = await fetch(
        `${API_URL}/leaves/supervisor?department=${encodeURIComponent(managerDepartment)}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        
        let errorMessage = 'Failed to fetch leaves';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("✅ Team leaves data received:", data);
      
      const formattedData = data.map((leave: any) => ({
        ...leave,
        id: leave._id || leave.id,
        isManagerLeave: false
      }));
      
      setLeaveRequests(formattedData);
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
      toast.error(error.message || "Failed to load leave requests");
      setLeaveRequests([]);
    } finally {
      setIsLoadingLeaves(false);
    }
  };

  // Fetch manager's personal leaves
  const fetchManagerLeaves = async () => {
    if (leaveApiStatus !== 'connected') {
      return;
    }

    if (!managerInfo._id) {
      console.log("Manager info not available yet");
      return;
    }

    try {
      setIsLoadingMyLeaves(true);
      
      const response = await fetch(
        `${API_URL}/manager-leaves?managerId=${encodeURIComponent(managerInfo._id)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch manager leaves: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const formattedData = data.leaves.map((leave: any) => ({
          ...leave,
          id: leave._id || leave.id,
          _id: leave._id || leave.id,
          isManagerLeave: true,
          employeeId: leave.managerId,
          employeeName: leave.managerName,
          department: leave.managerDepartment,
          contactNumber: leave.managerContact,
          appliedDate: leave.appliedDate || leave.createdAt
        }));
        
        setMyLeaves(formattedData);
      }
    } catch (error) {
      console.error("Error fetching manager's leaves:", error);
      setMyLeaves([]);
    } finally {
      setIsLoadingMyLeaves(false);
    }
  };

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = taskSearch === "" || 
        task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        task.description.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (task.assignee && task.assignee.toLowerCase().includes(taskSearch.toLowerCase())) ||
        (task.site && task.site.toLowerCase().includes(taskSearch.toLowerCase()));
      
      const matchesDept = taskDeptFilter === "all" || (task.department && task.department.toLowerCase() === taskDeptFilter.toLowerCase());
      const matchesStatus = taskStatusFilter === "all" || task.status === taskStatusFilter;
      const matchesPriority = taskPriorityFilter === "all" || task.priority === taskPriorityFilter;
      const matchesSite = taskSiteFilter === "all" || (task.siteName && task.siteName === taskSiteFilter);
      
      return matchesSearch && matchesDept && matchesStatus && matchesPriority && matchesSite;
    });
  }, [tasks, taskSearch, taskDeptFilter, taskStatusFilter, taskPriorityFilter, taskSiteFilter]);

  // Filter Attendance
  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter(record => {
      const matchesDept = attendanceDeptFilter === "all" || "Operations" === attendanceDeptFilter;
      const matchesStatus = attendanceStatusFilter === "all" || record.status.toLowerCase() === attendanceStatusFilter.toLowerCase();
      const matchesDate = record.date === attendanceDate;
      
      return matchesDept && matchesStatus && matchesDate;
    });
  }, [attendanceDate, attendanceDeptFilter, attendanceStatusFilter, attendanceRecords]);

  // Filter Leaves
  const filteredLeaves = useMemo(() => {
    const allLeaves = [...leaveRequests, ...myLeaves];
    return allLeaves.filter(leave => {
      const matchesDept = leaveDeptFilter === "all" || leave.department.toLowerCase() === leaveDeptFilter.toLowerCase();
      const matchesStatus = leaveStatusFilter === "all" || leave.status === leaveStatusFilter;
      const matchesType = leaveTypeFilter === "all" || leave.leaveType === leaveTypeFilter;
      
      return matchesDept && matchesStatus && matchesType;
    });
  }, [leaveDeptFilter, leaveStatusFilter, leaveTypeFilter, leaveRequests, myLeaves]);

  // Attendance Statistics
  const attendanceStatsMemo = useMemo(() => attendanceStats, [attendanceStats]);

  // Leave Statistics
  const leaveStats = useMemo(() => {
    const allLeaves = [...leaveRequests, ...myLeaves];
    const approved = allLeaves.filter(l => l.status === 'approved').length;
    const pending = allLeaves.filter(l => l.status === 'pending').length;
    const rejected = allLeaves.filter(l => l.status === 'rejected').length;
    const cancelled = allLeaves.filter(l => l.status === 'cancelled').length;
    const total = allLeaves.length;
    const totalDays = allLeaves.reduce((sum, l) => sum + l.totalDays, 0);
    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : "0";
    
    return { 
      total, 
      approved, 
      pending, 
      rejected, 
      cancelled,
      totalDays, 
      approvalRate,
      teamLeaves: leaveRequests.length,
      myLeaves: myLeaves.length
    };
  }, [leaveRequests, myLeaves]);

  // Task Chart Data
  const taskChartData = [
    { name: "Completed", value: taskStats.completed, color: "#10b981" },
    { name: "In Progress", value: taskStats.inProgress, color: "#3b82f6" },
    { name: "Pending", value: taskStats.pending, color: "#f59e0b" },
    { name: "Cancelled", value: taskStats.cancelled, color: "#6b7280" },
  ];

  // Attendance Chart Data
  const attendanceChartData = [
    { status: "Present", count: attendanceStatsMemo.presentDays, color: "#10b981" },
    { status: "Late", count: attendanceStatsMemo.lateDays, color: "#f59e0b" },
    { status: "Absent", count: attendanceStatsMemo.absentDays, color: "#ef4444" },
  ];

  // Leave Chart Data
  const leaveChartData = [
    { status: "Approved", count: leaveStats.approved, color: "#10b981" },
    { status: "Pending", count: leaveStats.pending, color: "#f59e0b" },
    { status: "Rejected", count: leaveStats.rejected, color: "#ef4444" },
    { status: "Cancelled", count: leaveStats.cancelled, color: "#6b7280" },
  ];

  // Task Trend Data (last 6 months)
  const taskTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      completed: Math.floor(Math.random() * 20) + 5,
      pending: Math.floor(Math.random() * 15) + 3,
      inProgress: Math.floor(Math.random() * 10) + 2,
    }));
  }, []);

  // Department-wise Task Data
  const departmentTaskData = useMemo(() => {
    const deptMap = new Map();
    tasks.forEach(task => {
      const dept = task.department || "Unknown";
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { department: dept, total: 0, completed: 0 });
      }
      const deptData = deptMap.get(dept);
      deptData.total++;
      if (task.status === 'completed') deptData.completed++;
    });
    
    return Array.from(deptMap.values()).map(dept => ({
      department: dept.department,
      completed: dept.completed,
      total: dept.total,
      completionRate: dept.total > 0 ? ((dept.completed / dept.total) * 100).toFixed(1) : "0"
    }));
  }, [tasks]);

  // Site-wise Task Data
  const siteTaskData = useMemo(() => {
    const siteMap = new Map();
    tasks.forEach(task => {
      const site = task.siteName || "Unknown Site";
      if (!siteMap.has(site)) {
        siteMap.set(site, { site, total: 0, completed: 0 });
      }
      const siteData = siteMap.get(site);
      siteData.total++;
      if (task.status === 'completed') siteData.completed++;
    });
    
    return Array.from(siteMap.values()).map(site => ({
      site: site.site,
      completed: site.completed,
      total: site.total,
      completionRate: site.total > 0 ? ((site.completed / site.total) * 100).toFixed(1) : "0"
    }));
  }, [tasks]);

  // Filter attendance records based on filter
  const filteredAttendanceRecords = attendanceRecords.filter(record => {
    if (attendanceFilter === "all") return true;
    if (attendanceFilter === "present") return record.status === "Present";
    if (attendanceFilter === "absent") return record.status === "Absent";
    if (attendanceFilter === "late") return record.status === "Late";
    if (attendanceFilter === "halfday") return record.status === "Half Day";
    return true;
  });

  // Export tasks to CSV
  const exportTasksToCSV = () => {
    if (filteredTasks.length === 0) {
      toast.error("No tasks to export");
      return;
    }

    setIsExporting(true);
    try {
      const headers = ['Task ID', 'Title', 'Description', 'Assignee', 'Site', 'Department', 'Priority', 'Status', 'Progress', 'Deadline', 'Created At', 'Hours Spent', 'Attachments'];
      
      const csvRows = [
        headers.join(','),
        ...filteredTasks.map(task => [
          task._id,
          `"${task.title.replace(/"/g, '""')}"`,
          `"${(task.description || '').replace(/"/g, '""')}"`,
          `"${task.assignee || 'Unassigned'}"`,
          `"${task.siteName || 'Unknown'}"`,
          `"${task.department || 'Unknown'}"`,
          task.priority,
          task.status,
          `${task.progress || 0}%`,
          task.deadline || '',
          task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '',
          task.hoursSpent || 0,
          task.attachments || 0
        ].join(','))
      ];
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `task-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${filteredTasks.length} tasks to CSV`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export tasks');
    } finally {
      setIsExporting(false);
    }
  };

  // Export attendance to CSV
  const exportAttendanceToCSV = () => {
    if (filteredAttendanceRecords.length === 0) {
      toast.error("No attendance records to export");
      return;
    }

    try {
      const headers = ['Date', 'Day', 'Status', 'Check In', 'Check Out', 'Total Hours', 'Overtime', 'Breaks', 'Break Duration'];
      
      const csvRows = [
        headers.join(','),
        ...filteredAttendanceRecords.map(record => [
          record.date,
          record.day,
          record.status,
          record.checkIn,
          record.checkOut,
          record.totalHours,
          record.overtime,
          record.breaks,
          record.breakDuration
        ].join(','))
      ];
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance-report-${selectedMonth}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${filteredAttendanceRecords.length} attendance records to CSV`);
    } catch (error) {
      console.error('Error exporting attendance CSV:', error);
      toast.error('Failed to export attendance records');
    }
  };

  // Export leaves to CSV
  const exportLeavesToCSV = () => {
    if (filteredLeaves.length === 0) {
      toast.error("No leave records to export");
      return;
    }

    try {
      const headers = ['Employee Name', 'Employee ID', 'Department', 'Leave Type', 'From Date', 'To Date', 'Total Days', 'Status', 'Reason', 'Applied Date', 'Contact Number'];
      
      const csvRows = [
        headers.join(','),
        ...filteredLeaves.map(leave => [
          `"${leave.employeeName}"`,
          `"${leave.employeeId || ''}"`,
          `"${leave.department}"`,
          `"${leave.leaveType}"`,
          leave.fromDate,
          leave.toDate,
          leave.totalDays,
          leave.status,
          `"${(leave.reason || '').replace(/"/g, '""')}"`,
          leave.createdAt ? new Date(leave.createdAt).toLocaleDateString() : '',
          `"${leave.contactNumber || ''}"`
        ].join(','))
      ];
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `leave-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${filteredLeaves.length} leave records to CSV`);
    } catch (error) {
      console.error('Error exporting leaves CSV:', error);
      toast.error('Failed to export leave records');
    }
  };

  const handleDownloadReport = (type: string) => {
    switch (type) {
      case "tasks":
        exportTasksToCSV();
        break;
      case "attendance":
        exportAttendanceToCSV();
        break;
      case "leaves":
        exportLeavesToCSV();
        break;
      default:
        toast.info(`${type} report download feature coming soon!`);
    }
  };

  const handleExportData = (type: string) => {
    toast.success(`${type} data exported as CSV!`);
  };

  const handleRetryConnection = () => {
    checkBackendConnection().then(() => {
      if (isBackendConnected) {
        fetchAttendanceData();
      }
    });
    checkLeaveApiConnection().then(() => {
      if (leaveApiStatus === 'connected') {
        fetchTeamLeaves();
        fetchManagerLeaves();
      }
    });
  };

  const getCurrentMonthName = () => {
    return new Date(selectedMonth + "-01").toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Present: "bg-green-100 text-green-800 border-green-200",
      Absent: "bg-red-100 text-red-800 border-red-200",
      Late: "bg-yellow-100 text-yellow-800 border-yellow-200",
      "Half Day": "bg-blue-100 text-blue-800 border-blue-200"
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getTaskStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getTaskPriorityBadge = (priority: string) => {
    const styles = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-green-100 text-green-800 border-green-200"
    };
    return styles[priority as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getLeaveStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      Present: <CheckCircle className="h-4 w-4" />,
      Absent: <XCircle className="h-4 w-4" />,
      Late: <Clock className="h-4 w-4" />,
      "Half Day": <AlertCircle className="h-4 w-4" />
    };
    return icons[status as keyof typeof icons];
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(event.target.value);
  };

  const formatDate = (dateString: string) => {
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

  const getApiStatusBadge = () => {
    if (isBackendConnected && leaveApiStatus === 'connected') {
      return <Badge variant="default" className="bg-green-500">Both APIs Connected</Badge>;
    } else if (isBackendConnected) {
      return <Badge variant="default" className="bg-green-500">Attendance API Connected</Badge>;
    } else if (leaveApiStatus === 'connected') {
      return <Badge variant="default" className="bg-green-500">Leaves API Connected</Badge>;
    } else if (leaveApiStatus === 'checking' || isCheckingConnection) {
      return <Badge variant="secondary">Checking APIs...</Badge>;
    } else {
      return <Badge variant="destructive">API Error</Badge>;
    }
  };

  const handleTestDatabase = async () => {
    try {
      setIsLoading(true);
      toast.info("Testing database connections...");
      
      // Test attendance API
      const attendanceResponse = await fetch(`${API_URL}/health`);
      // Test leaves API
      const leavesResponse = await fetch(`${API_URL}/test`);
      
      if (attendanceResponse.ok && leavesResponse.ok) {
        toast.success("Both database connections successful!");
        setIsBackendConnected(true);
        setLeaveApiStatus('connected');
        
        // Fetch all data
        fetchAttendanceData();
        fetchTeamLeaves();
        fetchManagerLeaves();
      } else {
        toast.error("Some database connections failed");
      }
    } catch (error) {
      console.error("Database test error:", error);
      toast.error("Failed to connect to databases");
    } finally {
      setIsLoading(false);
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      // Find the task
      const task = tasks.find(t => t._id === taskId);
      if (!task) {
        toast.error("Task not found");
        return;
      }

      // Update via task service
      await taskService.updateTaskStatus(taskId, { 
        status: newStatus as "pending" | "in-progress" | "completed" | "cancelled" 
      });
      
      // Update local state
      setTasks(tasks.map(t => 
        t._id === taskId ? { ...t, status: newStatus as any, progress: newStatus === 'completed' ? 100 : t.progress } : t
      ));
      
      // Recalculate statistics
      calculateTaskStatistics(tasks.map(t => 
        t._id === taskId ? { ...t, status: newStatus as any, progress: newStatus === 'completed' ? 100 : t.progress } : t
      ));
      
      toast.success(`Task status updated to ${newStatus}`);
      
    } catch (error: any) {
      console.error("Error updating task status:", error);
      toast.error(error.message || "Failed to update task status");
    }
  };

  // Refresh tasks
  const refreshTasks = () => {
    fetchTasksData();
    toast.success("Tasks refreshed");
  };

  // Refresh attendance
  const refreshAttendance = () => {
    fetchAttendanceData();
    toast.success("Attendance data refreshed");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <DashboardHeader 
        title="Manager Reports" 
        subtitle="Comprehensive analytics for tasks, attendance, and leaves"
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 sm:p-6 space-y-4 sm:space-y-6"
      >
      
        {/* Summary Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Task Summary */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                Task Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-blue-700">{taskStats.total}</div>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-2 gap-1">
                <div className="text-xs sm:text-sm text-gray-600 truncate">
                  {taskStats.completed} completed • {taskStats.inProgress} in progress
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-xs w-fit">
                  {taskStats.completionRate}% completion
                </Badge>
              </div>
              {taskStats.overdue > 0 && (
                <div className="mt-2 text-xs text-red-600 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{taskStats.overdue} overdue tasks</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <CalendarCheck className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-700">{attendanceStatsMemo.presentDays}/{attendanceStatsMemo.totalDays}</div>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-2 gap-1">
                <div className="text-xs sm:text-sm text-gray-600 truncate">
                  {attendanceStatsMemo.lateDays} late • {attendanceStatsMemo.absentDays} absent
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs w-fit">
                  {attendanceStatsMemo.attendanceRate}% present
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Leave Summary */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                Leave Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-purple-700">{leaveStats.total}</div>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-2 gap-1">
                <div className="text-xs sm:text-sm text-gray-600 truncate">
                  {leaveStats.approved} approved • {leaveStats.pending} pending
                </div>
                <Badge className="bg-purple-100 text-purple-800 text-xs w-fit">
                  {leaveStats.totalDays} total days
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Manager Stats */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <User className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                Manager Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-amber-700">{leaveStats.myLeaves}</div>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-2 gap-1">
                <div className="text-xs sm:text-sm text-gray-600 truncate">
                  {leaveStats.teamLeaves} team leaves • {availableDepartments.length} depts
                </div>
                <Badge className="bg-amber-100 text-amber-800 text-xs w-fit">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Selector - Responsive */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building className="h-4 w-4 sm:h-5 sm:w-5" />
              Department Selection
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Select department to view team leaves and data
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2 w-full sm:w-96">
                <Select
                  value={managerDepartment}
                  onValueChange={setManagerDepartment}
                  disabled={availableDepartments.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDepartments.length > 0 ? (
                      availableDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          <div className="flex items-center">
                            <Building className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{dept}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        Loading departments...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <div className="flex flex-col xs:flex-row items-start xs:items-center space-y-1 xs:space-y-0 xs:space-x-4 text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <Users className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{leaveRequests.length} team leaves</span>
                  </span>
                  <span className="flex items-center">
                    <Building className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{availableDepartments.length} departments available</span>
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    fetchAttendanceData();
                    fetchTasksData();
                    fetchTeamLeaves();
                    fetchManagerLeaves();
                  }}
                  className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                  disabled={isLoading || isLoadingLeaves || isLoadingMyLeaves || isLoadingTasks || isLoadingAttendance}
                >
                  <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">Refresh All</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleDownloadReport("tasks")}
                  disabled={tasks.length === 0}
                  className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                >
                  <DownloadIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">Export All</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs - Responsive */}
        <Tabs defaultValue="tasks" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="tasks" className="flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
              <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Tasks ({taskStats.total})</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
              <CalendarCheck className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Attendance ({attendanceStatsMemo.totalDays} days)</span>
            </TabsTrigger>
            <TabsTrigger value="leaves" className="flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
              <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Leaves ({leaveStats.total})</span>
            </TabsTrigger>
          </TabsList>

          {/* Task Reports Tab */}
          <TabsContent value="tasks" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 p-4 sm:p-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    Task Performance Analytics
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Real task data from your site and assigned tasks</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshTasks}
                    disabled={isLoadingTasks}
                    className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0 ${isLoadingTasks ? 'animate-spin' : ''}`} />
                    <span className="truncate">Refresh</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownloadReport("tasks")}
                    disabled={isExporting || tasks.length === 0}
                    className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{isExporting ? "Exporting..." : "Export CSV"}</span>
                  </Button>
                  <Button size="sm" onClick={() => handleDownloadReport("tasks")} disabled={tasks.length === 0} className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial">
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Download</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
                {/* Task Filters - Responsive Grid with all fields visible */}
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Search Tasks</label>
                    <div className="relative">
                      <Search className="absolute left-2 sm:left-3 top-2 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      <Input
                        placeholder="Search tasks..."
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        className="pl-7 sm:pl-9 h-8 sm:h-10 text-xs sm:text-sm w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Department</label>
                    <Select value={taskDeptFilter} onValueChange={setTaskDeptFilter}>
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm w-full">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        {["All Departments", ...Array.from(new Set(tasks.map(t => t.department).filter(Boolean) as string[]))].map(dept => (
                          <SelectItem key={dept} value={dept === "All Departments" ? "all" : dept} className="text-xs sm:text-sm">
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Status</label>
                    <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm w-full">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskStatuses.map(status => (
                          <SelectItem key={status} value={status === "All Status" ? "all" : status} className="text-xs sm:text-sm">
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Priority</label>
                    <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm w-full">
                        <SelectValue placeholder="All Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskPriorities.map(priority => (
                          <SelectItem key={priority} value={priority === "All Priority" ? "all" : priority} className="text-xs sm:text-sm">
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Site</label>
                    <Select value={taskSiteFilter} onValueChange={setTaskSiteFilter}>
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm w-full">
                        <SelectValue placeholder="All Sites" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs sm:text-sm">All Sites</SelectItem>
                        {sites.map(site => (
                          <SelectItem key={site._id} value={site.name} className="text-xs sm:text-sm">
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Task Statistics - Responsive Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <Card>
                    <CardHeader className="p-3 sm:p-4">
                      <CardTitle className="text-xs sm:text-sm">Task Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className="h-48 sm:h-56 lg:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={taskChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={60}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {taskChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-2 mt-3 sm:mt-4">
                        {taskChartData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                              <div 
                                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2 flex-shrink-0" 
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs sm:text-sm truncate">{item.name}</span>
                            </div>
                            <span className="text-xs sm:text-sm font-medium ml-1">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-3 sm:p-4">
                      <CardTitle className="text-xs sm:text-sm">Department Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className="space-y-3 sm:space-y-4">
                        {departmentTaskData.slice(0, 5).map((dept) => (
                          <div key={dept.department}>
                            <div className="flex justify-between text-xs sm:text-sm mb-1">
                              <span className="truncate">{dept.department}</span>
                              <span className="ml-2 flex-shrink-0">{dept.completed}/{dept.total} ({dept.completionRate}%)</span>
                            </div>
                            <Progress value={parseFloat(dept.completionRate)} className="h-1.5 sm:h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tasks Table - Responsive with horizontal scroll */}
                <div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4">Task List ({filteredTasks.length})</h3>
                  {isLoadingTasks ? (
                    <div className="flex items-center justify-center h-48 sm:h-64">
                      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
                      <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-muted-foreground">Loading tasks...</p>
                    </div>
                  ) : filteredTasks.length > 0 ? (
                    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <div className="min-w-[1200px] lg:min-w-full">
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Task</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Assignee</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Site</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Department</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Priority</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Status</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Progress</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Deadline</TableHead>
                                <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredTasks.slice(0, 10).map((task) => (
                                <TableRow key={task._id}>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <div className="max-w-[200px]">
                                      <p className="font-medium text-xs sm:text-sm truncate">{task.title}</p>
                                      <p className="text-xs text-gray-500 truncate hidden sm:block">
                                        {task.description}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-xs sm:text-sm truncate">{task.assignee || "Unassigned"}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-xs sm:text-sm truncate">{task.siteName || "Unknown"}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <Badge variant="outline" className="bg-gray-100 text-xs whitespace-nowrap">
                                      {task.department || "Unknown"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <Badge className={`${getTaskPriorityBadge(task.priority)} text-xs whitespace-nowrap`}>
                                      {task.priority}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <Badge className={`${getTaskStatusBadge(task.status)} text-xs whitespace-nowrap`}>
                                      {task.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <Progress value={task.progress} className="w-12 sm:w-16 h-1.5" />
                                      <span className="text-xs">{task.progress}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <div className="text-xs">
                                      {task.deadline ? formatDate(task.deadline) : "No deadline"}
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => updateTaskStatus(task._id, 'completed')}
                                        disabled={task.status === 'completed'}
                                        className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                                      >
                                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(`/tasks/${task._id}`, '_blank')}
                                        className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                                      >
                                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-sm sm:text-base font-medium text-gray-900">No tasks found</h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 px-4">
                        No tasks match your current filters. Try changing your search criteria.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Reports Tab - Responsive */}
          <TabsContent value="attendance" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 p-4 sm:p-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <CalendarCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    Attendance Analytics
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Showing attendance data for {getCurrentMonthName()}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      className="px-2 py-1 border border-gray-300 rounded-md text-xs sm:text-sm w-full sm:w-auto"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshAttendance}
                    disabled={isLoadingAttendance}
                    className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0 ${isLoadingAttendance ? 'animate-spin' : ''}`} />
                    <span className="truncate">Refresh</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownloadReport("attendance")}
                    disabled={attendanceRecords.length === 0}
                    className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Export CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
                {/* Attendance Statistics - Responsive Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Attendance Distribution Card */}
                  <Card className="lg:col-span-1">
                    <CardHeader className="p-3 sm:p-4">
                      <CardTitle className="text-xs sm:text-sm">Attendance Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className="h-56 sm:h-64 lg:h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={attendanceChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="count"
                              label={(entry) => `${entry.status}: ${entry.count}`}
                            >
                              {attendanceChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value, name) => [`${value} days`, name]}
                              contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36}
                              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3 sm:mt-4">
                        {attendanceChartData.map((item) => (
                          <div key={item.status} className="text-center p-1 sm:p-2 rounded-lg bg-gray-50">
                            <div className="flex items-center justify-center mb-1">
                              <div 
                                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1" 
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs sm:text-sm font-medium truncate">{item.status}</span>
                            </div>
                            <div className="text-base sm:text-xl lg:text-2xl font-bold">{item.count}</div>
                            <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                              {attendanceStatsMemo.totalDays > 0 
                                ? `${Math.round((item.count / attendanceStatsMemo.totalDays) * 100)}%` 
                                : '0%'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly Summary Card */}
                  <Card className="lg:col-span-1">
                    <CardHeader className="p-3 sm:p-4">
                      <CardTitle className="text-xs sm:text-sm">Monthly Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className="space-y-4 sm:space-y-6">
                        {/* Main Stats Row */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-100">
                            <div className="text-xs text-blue-600 font-medium mb-1">Working Days</div>
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-700">
                              {attendanceStatsMemo.totalDays - attendanceStatsMemo.absentDays}
                              <span className="text-xs text-blue-600 ml-1">days</span>
                            </div>
                          </div>
                          
                          <div className="bg-green-50 p-2 sm:p-4 rounded-lg border border-green-100">
                            <div className="text-xs text-green-600 font-medium mb-1">Attendance Rate</div>
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-700">
                              {attendanceStatsMemo.attendanceRate}
                              <span className="text-xs text-green-600 ml-1">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Stats */}
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                <TrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-medium">Total Hours Worked</div>
                                <div className="text-xs text-gray-500 hidden sm:block">Monthly total</div>
                              </div>
                            </div>
                            <div className="text-sm sm:text-lg font-bold ml-2">
                              {((parseFloat(attendanceStatsMemo.averageHours) * attendanceStatsMemo.presentDays) || 0).toFixed(1)}
                              <span className="text-xs text-gray-600 ml-1">h</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-medium">Average Daily Hours</div>
                                <div className="text-xs text-gray-500 hidden sm:block">Per working day</div>
                              </div>
                            </div>
                            <div className="text-sm sm:text-lg font-bold ml-2">
                              {attendanceStatsMemo.averageHours}
                              <span className="text-xs text-gray-600 ml-1">h</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-medium">Total Overtime</div>
                                <div className="text-xs text-gray-500 hidden sm:block">Extra hours worked</div>
                              </div>
                            </div>
                            <div className="text-sm sm:text-lg font-bold text-orange-600 ml-2">
                              {attendanceStatsMemo.totalOvertime}
                              <span className="text-xs text-orange-600 ml-1">h</span>
                            </div>
                          </div>

                          {/* Status Breakdown */}
                          <div className="pt-3 sm:pt-4 border-t">
                            <div className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">Status Breakdown</div>
                            <div className="space-y-1.5 sm:space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                                  <span className="text-xs sm:text-sm">Present</span>
                                </div>
                                <span className="text-xs sm:text-sm font-medium ml-2">{attendanceStatsMemo.presentDays} days</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
                                  <span className="text-xs sm:text-sm">Late</span>
                                </div>
                                <span className="text-xs sm:text-sm font-medium ml-2">{attendanceStatsMemo.lateDays} days</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                                  <span className="text-xs sm:text-sm">Half Day</span>
                                </div>
                                <span className="text-xs sm:text-sm font-medium ml-2">{attendanceStatsMemo.halfDays} days</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                                  <span className="text-xs sm:text-sm">Absent</span>
                                </div>
                                <span className="text-xs sm:text-sm font-medium ml-2">{attendanceStatsMemo.absentDays} days</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Attendance Table - Responsive with horizontal scroll */}
                <Card>
                  <CardHeader className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                      <div>
                        <CardTitle className="text-sm sm:text-base">Attendance Records</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Showing records for {getCurrentMonthName()} 
                          {attendanceFilter !== "all" && (
                            <span className="ml-1 sm:ml-2">
                              | Filtered: {attendanceFilter.charAt(0).toUpperCase() + attendanceFilter.slice(1)}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
                          <SelectTrigger className="w-full sm:w-48 h-8 sm:h-9 text-xs sm:text-sm">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs sm:text-sm">All Status</SelectItem>
                            <SelectItem value="present" className="text-xs sm:text-sm">Present Only</SelectItem>
                            <SelectItem value="absent" className="text-xs sm:text-sm">Absent Only</SelectItem>
                            <SelectItem value="late" className="text-xs sm:text-sm">Late Only</SelectItem>
                            <SelectItem value="halfday" className="text-xs sm:text-sm">Half Day Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAttendanceFilter("all")}
                          disabled={attendanceFilter === "all"}
                          className="h-8 sm:h-9 text-xs sm:text-sm flex-shrink-0"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    {isLoadingAttendance ? (
                      <div className="flex items-center justify-center h-48 sm:h-64">
                        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
                        <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-muted-foreground">Loading attendance data...</p>
                      </div>
                    ) : filteredAttendanceRecords.length > 0 ? (
                      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <div className="min-w-[900px] lg:min-w-full">
                          <div className="overflow-hidden border border-gray-200 rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Date</TableHead>
                                  <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Day</TableHead>
                                  <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Check In</TableHead>
                                  <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Check Out</TableHead>
                                  <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Status</TableHead>
                                  <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Total Hours</TableHead>
                                  <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Breaks</TableHead>
                                  <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Overtime</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredAttendanceRecords.map((record) => (
                                  <TableRow key={record.id} className="hover:bg-gray-50">
                                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                      <span className="text-xs sm:text-sm">
                                        {new Date(record.date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </span>
                                    </TableCell>
                                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                        record.day === 'Sat' || record.day === 'Sun' 
                                          ? 'bg-blue-100 text-blue-600' 
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {record.day}
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                      <div className="flex items-center gap-1 sm:gap-2">
                                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-mono">{record.checkIn}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                      <div className="flex items-center gap-1 sm:gap-2">
                                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-mono">{record.checkOut}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                      <Badge 
                                        variant="outline" 
                                        className={`${getStatusBadge(record.status)} px-2 py-0.5 sm:px-3 sm:py-1 text-xs`}
                                      >
                                        <span className="flex items-center gap-1">
                                          {getStatusIcon(record.status)}
                                          {record.status}
                                        </span>
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                      <span className="text-xs sm:text-sm font-medium">{record.totalHours}h</span>
                                    </TableCell>
                                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                      <span className="text-xs sm:text-sm font-medium">{record.breaks}</span>
                                      <span className="text-xs text-muted-foreground ml-1">({record.breakDuration})</span>
                                    </TableCell>
                                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                      <Badge 
                                        variant="outline" 
                                        className={`px-2 py-0.5 sm:px-3 sm:py-1 text-xs ${
                                          parseFloat(record.overtime) > 0 
                                            ? "bg-orange-100 text-orange-800 border-orange-200" 
                                            : "bg-gray-100 text-gray-800 border-gray-200"
                                        }`}
                                      >
                                        {record.overtime}h
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-12">
                        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 mb-3 sm:mb-4">
                          <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                        </div>
                        <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1 sm:mb-2">No attendance records</h3>
                        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-3 sm:mb-4 px-4">
                          {attendanceFilter !== "all" 
                            ? `No ${attendanceFilter} records found for ${getCurrentMonthName()}. Try changing the filter.`
                            : `No attendance records found for ${getCurrentMonthName()}.`
                          }
                        </p>
                        {attendanceFilter !== "all" && (
                          <Button
                            variant="outline"
                            onClick={() => setAttendanceFilter("all")}
                            className="mt-2 text-xs sm:text-sm h-8 sm:h-9"
                          >
                            Show All Records
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Reports Tab - Responsive */}
          <TabsContent value="leaves" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 p-4 sm:p-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
                    Leave Management Analytics
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Manage and track leave requests for your department
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      fetchTeamLeaves();
                      fetchManagerLeaves();
                    }}
                    disabled={isLoadingLeaves || isLoadingMyLeaves}
                    className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0 ${(isLoadingLeaves || isLoadingMyLeaves) ? 'animate-spin' : ''}`} />
                    <span className="truncate">Refresh</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownloadReport("leaves")}
                    disabled={leaveRequests.length === 0 && myLeaves.length === 0}
                    className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Export CSV</span>
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleDownloadReport("leaves")}
                    disabled={leaveRequests.length === 0 && myLeaves.length === 0}
                    className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Download</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
                {/* Leave Filters - Responsive with all fields visible */}
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Department</label>
                    <Select value={leaveDeptFilter} onValueChange={setLeaveDeptFilter}>
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm w-full">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs sm:text-sm">All Departments</SelectItem>
                        {Array.from(new Set([...leaveRequests, ...myLeaves].map(l => l.department))).map(dept => (
                          <SelectItem key={dept} value={dept} className="text-xs sm:text-sm">{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Status</label>
                    <Select value={leaveStatusFilter} onValueChange={setLeaveStatusFilter}>
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm w-full">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveStatuses.map(status => (
                          <SelectItem key={status} value={status === "All Status" ? "all" : status} className="text-xs sm:text-sm">
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Leave Type</label>
                    <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm w-full">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map(type => (
                          <SelectItem key={type} value={type === "All Types" ? "all" : type} className="text-xs sm:text-sm">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium">View</label>
                    <Select defaultValue="all" onValueChange={(value) => {
                      if (value === 'team') {
                        setLeaveDeptFilter(managerDepartment);
                      }
                    }}>
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm w-full">
                        <SelectValue placeholder="All Leaves" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs sm:text-sm">All Leaves</SelectItem>
                        <SelectItem value="team" className="text-xs sm:text-sm">Team Leaves Only</SelectItem>
                        <SelectItem value="personal" className="text-xs sm:text-sm">My Leaves Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Leave Statistics - Responsive */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <Card>
                    <CardHeader className="p-3 sm:p-4">
                      <CardTitle className="text-xs sm:text-sm">Leave Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className="h-48 sm:h-56 lg:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={leaveChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="count"
                            >
                              {leaveChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-2 mt-3 sm:mt-4">
                        {leaveChartData.map((item) => (
                          <div key={item.status} className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                              <div 
                                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2 flex-shrink-0" 
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs sm:text-sm truncate">{item.status}</span>
                            </div>
                            <span className="text-xs sm:text-sm font-medium ml-1">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-3 sm:p-4">
                      <CardTitle className="text-xs sm:text-sm">Leave Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Total Leaves</span>
                          <span className="text-xs sm:text-sm font-medium">{leaveStats.total}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Approval Rate</span>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            {leaveStats.approvalRate}%
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Total Leave Days</span>
                          <span className="text-xs sm:text-sm font-medium">{leaveStats.totalDays} days</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Pending Requests</span>
                          <span className="text-xs sm:text-sm font-medium text-yellow-600">{leaveStats.pending}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Team vs Personal</span>
                          <span className="text-xs sm:text-sm font-medium">
                            {leaveStats.teamLeaves}/{leaveStats.myLeaves}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-3 sm:p-4">
                      <CardTitle className="text-xs sm:text-sm">Leave Types</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <div className="space-y-3 sm:space-y-4">
                        {Array.from(
                          new Map(
                            [...leaveRequests, ...myLeaves]
                              .map(l => l.leaveType)
                              .reduce((acc, type) => {
                                acc.set(type, (acc.get(type) || 0) + 1);
                                return acc;
                              }, new Map())
                          )
                        ).slice(0, 5).map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm truncate">{type}</span>
                            <Badge variant="outline" className="text-xs ml-2">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Leaves Table - Responsive with horizontal scroll */}
                <div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4">Leave Requests ({filteredLeaves.length})</h3>
                  
                  {(isLoadingLeaves || isLoadingMyLeaves) ? (
                    <div className="flex items-center justify-center h-48 sm:h-64">
                      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
                      <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-muted-foreground">Loading leave requests...</p>
                    </div>
                  ) : filteredLeaves.length > 0 ? (
                    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <div className="min-w-[1100px] lg:min-w-full">
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Employee</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Department</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Leave Type</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Period</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Days</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Status</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Applied On</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Contact</TableHead>
                                <TableHead className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">Type</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredLeaves.slice(0, 10).map((leave) => (
                                <TableRow key={leave._id}>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <div>
                                      <p className="font-medium text-xs sm:text-sm truncate">{leave.employeeName}</p>
                                      <p className="text-xs text-gray-500 truncate">{leave.employeeId}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                                      {leave.department}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <span className="text-xs sm:text-sm">{leave.leaveType}</span>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <div className="text-xs">
                                      <div>{formatDate(leave.fromDate)}</div>
                                      <div className="text-gray-500">to {formatDate(leave.toDate)}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <Badge variant="outline" className="text-xs whitespace-nowrap">{leave.totalDays} days</Badge>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <Badge variant={getLeaveStatusBadgeVariant(leave.status)} className="text-xs whitespace-nowrap">
                                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <span className="text-xs">{formatDate(leave.createdAt)}</span>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <span className="text-xs">{leave.contactNumber || "N/A"}</span>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                                    <Badge variant={leave.isManagerLeave ? "default" : "secondary"} className="text-xs whitespace-nowrap">
                                      {leave.isManagerLeave ? "Personal" : "Team"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-sm sm:text-base font-medium text-gray-900">No leave requests</h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 px-4">
                        No leave requests found for the selected filters.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default ManagerReports;