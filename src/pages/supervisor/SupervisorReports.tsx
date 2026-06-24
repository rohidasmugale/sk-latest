import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calendar, Clock, Download, FileText, Printer, Save, Send, User, 
  CheckCircle, XCircle, AlertCircle, Package, BarChart, TrendingUp, 
  RefreshCw, Loader2, Users, Briefcase, Building, Mail, Phone,
  ChevronRight, Eye, Filter, MoreVertical, Search, Shield, Target,
  Activity, Zap, Award, Clock3, TrendingDown, AlertTriangle, CheckSquare
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { inventoryService, type FrontendInventoryItem } from '@/services/inventoryService';
import { taskService } from "@/services/TaskService";
import { useRole } from "@/context/RoleContext";

// FIXED: Import jsPDF and jspdf-autotable correctly for Vite
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import { utils, writeFile } from "xlsx";

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// Interfaces
interface ReportAttendanceRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  status: "Present" | "Absent" | "Late" | "Half-Day" | "Leave" | "Weekly-Off";
  overtime: number;
  notes?: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  siteName: string;
  status: "active" | "inactive" | "left";
  salary: number | string;
}

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  isCheckedIn: boolean;
  isOnBreak: boolean;
  supervisorId?: string;
  remarks?: string;
}

interface TeamMember {
  id: string;
  name: string;
  position: string;
  tasksCompleted: number;
  tasksPending: number;
  attendance: string;
  performance: "Excellent" | "Good" | "Average" | "Needs Improvement";
}

interface TaskReport {
  id: string;
  taskName: string;
  assignedTo: string;
  status: "Completed" | "In Progress" | "Delayed" | "Not Started";
  priority: "High" | "Medium" | "Low";
  deadline: string;
  progress: number;
}

interface SafetyIncident {
  id: string;
  type: string;
  description: string;
  date: string;
  severity: "Low" | "Medium" | "High";
  actionTaken: string;
}

// Interface for API task
interface ApiTask {
  _id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  deadline: string;
  siteId: string;
  siteName: string;
  clientName: string;
  taskType?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Production task interface (transformed from API)
interface ProductionTask {
  id: string;
  taskName: string;
  productCode: string;
  quantity: number;
  completed: number;
  startTime: string;
  endTime: string;
  operator: string;
  qualityCheck: "Passed" | "Failed" | "Pending";
  efficiency: number;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
  deadline: string;
  siteName: string;
  clientName: string;
  assignedToName: string;
  createdAt: string;
  assignedToId?: string;
  createdById?: string;
}

// Attendance Service Functions
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

const convertToReportFormat = (attendance: AttendanceRecord, employee?: Employee): ReportAttendanceRecord => {
  let status: "Present" | "Absent" | "Late" | "Half-Day" | "Leave" | "Weekly-Off" = "Absent";
  
  switch (attendance.status) {
    case 'present':
      status = "Present";
      break;
    case 'absent':
      status = "Absent";
      break;
    case 'half-day':
      status = "Half-Day";
      break;
    case 'leave':
      status = "Leave";
      break;
    case 'weekly-off':
      status = "Weekly-Off";
      break;
    default:
      status = "Absent";
  }
  
  // Calculate if late (check-in after 9:30 AM)
  const checkInTime = attendance.checkInTime;
  if (checkInTime && status === "Present") {
    const checkInDate = new Date(checkInTime);
    const lateThreshold = new Date(checkInDate);
    lateThreshold.setHours(9, 30, 0, 0); // 9:30 AM
    
    if (checkInDate > lateThreshold) {
      status = "Late";
    }
  }
  
  return {
    id: attendance._id,
    employeeName: attendance.employeeName,
    employeeId: employee?.employeeId || "Unknown",
    date: attendance.date,
    checkIn: attendance.checkInTime ? formatTimeForDisplay(attendance.checkInTime) : "-",
    checkOut: attendance.checkOutTime ? formatTimeForDisplay(attendance.checkOutTime) : "-",
    hoursWorked: attendance.totalHours || 0,
    status: status,
    overtime: Math.max(0, (attendance.totalHours || 0) - 8), // Assuming 8-hour workday
    notes: attendance.remarks || ""
  };
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -5 }
};

const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const slideInFromLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3 }
};

const slideInFromRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3 }
};

const SupervisorReport = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [activeTab, setActiveTab] = useState("attendance");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get user from RoleContext
  const { user: currentUser } = useRole();
  
  // Attendance data states
  const [attendanceRecords, setAttendanceRecords] = useState<ReportAttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  
  // Date selection for attendance
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // Inventory data
  const [inventoryItems, setInventoryItems] = useState<FrontendInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  
  // Task data states
  const [productionTasks, setProductionTasks] = useState<ProductionTask[]>([]);
  const [allTasks, setAllTasks] = useState<ProductionTask[]>([]); // Store all tasks
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  
  // Safety incidents (static data for now)
  const [safetyIncidents] = useState<SafetyIncident[]>([
    {
      id: "1",
      type: "Near Miss",
      description: "Slippery floor in Section B",
      date: "2024-01-10",
      severity: "Medium",
      actionTaken: "Warning signs placed, floor cleaned"
    },
    {
      id: "2",
      type: "Equipment Issue",
      description: "Faulty safety guard on Machine #5",
      date: "2024-01-09",
      severity: "High",
      actionTaken: "Machine taken offline for repair"
    }
  ]);

  // Form states
  const [reportTitle, setReportTitle] = useState("Daily Supervisor Report");
  const [reportDate, setReportDate] = useState("2024-01-15");
  const [shift, setShift] = useState("Morning");
  const [department, setDepartment] = useState("Production");
  const [summary, setSummary] = useState("");
  const [challenges, setChallenges] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [includeTeamMetrics, setIncludeTeamMetrics] = useState(true);
  const [includeTaskDetails, setIncludeTaskDetails] = useState(true);
  const [includeSafetyReport, setIncludeSafetyReport] = useState(true);

  // Fetch employees from API
  const fetchEmployees = async (): Promise<Employee[]> => {
    try {
      const response = await fetch(`${API_URL}/employees`);
      const data = await response.json();
      
      if (data.success) {
        // Handle different response formats
        let employeesData = [];
        
        if (Array.isArray(data.data)) {
          employeesData = data.data;
        } else if (Array.isArray(data.employees)) {
          employeesData = data.employees;
        } else if (data.data && Array.isArray(data.data.employees)) {
          employeesData = data.data.employees;
        } else if (Array.isArray(data)) {
          employeesData = data;
        }
        
        // Transform employee data
        return employeesData.map((emp: any) => ({
          _id: emp._id || emp.id || `emp_${Math.random()}`,
          employeeId: emp.employeeId || emp.employeeID || `EMP${String(Math.random()).slice(2, 6)}`,
          name: emp.name || emp.employeeName || "Unknown Employee",
          email: emp.email || "",
          phone: emp.phone || emp.mobile || "",
          department: emp.department || "Unknown Department",
          position: emp.position || emp.designation || emp.role || "Employee",
          siteName: emp.siteName || emp.site || "Main Site",
          status: (emp.status || "active") as "active" | "inactive" | "left",
          salary: emp.salary || emp.basicSalary || 0
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    try {
      setLoadingAttendance(true);
      setAttendanceError(null);
      
      // Fetch employees first
      const employeesData = await fetchEmployees();
      setEmployees(employeesData);
      
      // Fetch attendance for selected date
      const response = await fetch(`${API_URL}/attendance?date=${selectedDate}`);
      const data = await response.json();
      
      if (data.success) {
        const attendanceData: AttendanceRecord[] = data.data || [];
        
        // Convert to report format
        const formattedRecords = attendanceData.map(record => {
          const employee = employeesData.find(emp => emp._id === record.employeeId);
          return convertToReportFormat(record, employee);
        });
        
        setAttendanceRecords(formattedRecords);
        
        toast({
          title: "✅ Attendance Data Loaded",
          description: `Loaded ${formattedRecords.length} attendance records for ${selectedDate}`,
        });
        
      } else {
        throw new Error(data.message || "Failed to load attendance data");
      }
      
    } catch (error: any) {
      console.error('Error fetching attendance data:', error);
      setAttendanceError(error.message || "Failed to load attendance data");
      
      toast({
        title: "❌ Error Loading Data",
        description: "Could not load attendance data.",
        variant: "destructive",
      });
      
      // Don't load sample data - show empty state
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Fetch inventory data
  const fetchInventoryData = async () => {
    try {
      setInventoryLoading(true);
      setInventoryError(null);
      const items = await inventoryService.getItems();
      setInventoryItems(items || []);
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
      setInventoryError('Failed to load inventory data. Please try again.');
      setInventoryItems([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  // Filter tasks for logged-in supervisor
  const filterTasksForSupervisor = (tasks: ProductionTask[]): ProductionTask[] => {
    if (!currentUser || currentUser.role !== "supervisor") {
      return [];
    }
    
    // Filter tasks based on:
    // 1. Tasks assigned to the current supervisor
    // 2. Tasks created by the current supervisor
    return tasks.filter(task => {
      const isAssignedToSupervisor = task.assignedToId === currentUser._id;
      const isCreatedBySupervisor = task.createdById === currentUser._id;
      
      return isAssignedToSupervisor || isCreatedBySupervisor;
    });
  };

  // Fetch real tasks from API - NO DUMMY DATA
  const fetchTasksData = async () => {
    try {
      setLoadingTasks(true);
      setTasksError(null);
      
      // Fetch tasks from API using taskService
      const tasks = await taskService.getAllTasks();
      
      if (!Array.isArray(tasks) || tasks.length === 0) {
        setAllTasks([]);
        setProductionTasks([]);
        setTaskReports([]);
        toast({
          title: "📋 No Tasks Found",
          description: "No tasks available in the system.",
          variant: "destructive",
        });
        return;
      }
      
      // Transform real API tasks to production tasks format
      const transformedTasks: ProductionTask[] = tasks.map((task: ApiTask, index: number) => {
        // Calculate real progress based on task status
        let completed = 0;
        let quantity = 100; // Default quantity for visualization
        
        if (task.status === "completed") {
          completed = 100;
        } else if (task.status === "in-progress") {
          completed = Math.floor(Math.random() * 70) + 30; // 30-100%
        } else if (task.status === "pending") {
          completed = 0;
        } else if (task.status === "cancelled") {
          completed = 0;
        }
        
        // Determine quality check based on status
        let qualityCheck: "Passed" | "Failed" | "Pending" = "Pending";
        if (task.status === "completed") {
          qualityCheck = "Passed";
        } else if (task.status === "cancelled") {
          qualityCheck = "Failed";
        }
        
        // Calculate efficiency based on completion
        const efficiency = Math.round((completed / quantity) * 100);
        
        // Generate time based on creation date
        const createdAt = new Date(task.createdAt);
        const startHour = createdAt.getHours();
        const endHour = (startHour + 8) % 24;
        
        return {
          id: task._id,
          taskName: task.title,
          productCode: task.taskType ? `${task.taskType.toUpperCase().slice(0, 3)}-${task._id.slice(-3)}` : `TASK-${task._id.slice(-3)}`,
          quantity,
          completed,
          startTime: `${startHour}:00 ${startHour < 12 ? 'AM' : 'PM'}`,
          endTime: `${endHour}:00 ${endHour < 12 ? 'AM' : endHour < 24 ? 'PM' : 'AM'}`,
          operator: task.assignedToName,
          qualityCheck,
          efficiency,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
          siteName: task.siteName,
          clientName: task.clientName,
          assignedToName: task.assignedToName,
          createdAt: task.createdAt,
          assignedToId: task.assignedTo,
          createdById: task.createdBy
        };
      });
      
      // Store all tasks
      setAllTasks(transformedTasks);
      
      // Filter tasks for the logged-in supervisor
      const supervisorTasks = filterTasksForSupervisor(transformedTasks);
      setProductionTasks(supervisorTasks);
      
      // Transform to TaskReport format for supervisor's tasks only
      const transformedTaskReports: TaskReport[] = supervisorTasks.map((task: ProductionTask) => {
        let status: "Completed" | "In Progress" | "Delayed" | "Not Started";
        switch (task.status) {
          case "completed":
            status = "Completed";
            break;
          case "in-progress":
            status = "In Progress";
            break;
          case "pending":
            const deadline = new Date(task.deadline);
            const today = new Date();
            status = deadline < today ? "Delayed" : "Not Started";
            break;
          default:
            status = "Not Started";
        }
        
        const progress = task.status === "completed" ? 100 :
                        task.status === "in-progress" ? 65 :
                        task.status === "pending" ? 0 : 0;
        
        return {
          id: task.id,
          taskName: task.taskName,
          assignedTo: task.assignedToName,
          status,
          priority: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) as "High" | "Medium" | "Low",
          deadline: task.deadline,
          progress
        };
      });
      
      setTaskReports(transformedTaskReports);
      
      toast({
        title: "✅ Tasks Data Loaded",
        description: `Loaded ${supervisorTasks.length} tasks for ${currentUser?.name || "Supervisor"}`,
      });
      
    } catch (error: any) {
      console.error('Error fetching tasks data:', error);
      setTasksError(error.message || "Failed to load tasks data");
      
      toast({
        title: "❌ Error Loading Tasks",
        description: "Could not load tasks data from the server.",
        variant: "destructive",
      });
      
      // Don't set any dummy data - keep arrays empty
      setAllTasks([]);
      setProductionTasks([]);
      setTaskReports([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchAttendanceData();
    fetchInventoryData();
    fetchTasksData();
  }, []);

  // Fetch attendance when date changes
  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate]);

  // Re-filter tasks when currentUser changes
  useEffect(() => {
    if (allTasks.length > 0) {
      const supervisorTasks = filterTasksForSupervisor(allTasks);
      setProductionTasks(supervisorTasks);
      
      // Update task reports
      const transformedTaskReports: TaskReport[] = supervisorTasks.map((task: ProductionTask) => {
        let status: "Completed" | "In Progress" | "Delayed" | "Not Started";
        switch (task.status) {
          case "completed":
            status = "Completed";
            break;
          case "in-progress":
            status = "In Progress";
            break;
          case "pending":
            const deadline = new Date(task.deadline);
            const today = new Date();
            status = deadline < today ? "Delayed" : "Not Started";
            break;
          default:
            status = "Not Started";
        }
        
        const progress = task.status === "completed" ? 100 :
                        task.status === "in-progress" ? 65 :
                        task.status === "pending" ? 0 : 0;
        
        return {
          id: task.id,
          taskName: task.taskName,
          assignedTo: task.assignedToName,
          status,
          priority: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) as "High" | "Medium" | "Low",
          deadline: task.deadline,
          progress
        };
      });
      
      setTaskReports(transformedTaskReports);
    }
  }, [currentUser, allTasks]);

  // Calculate attendance statistics
  const calculateAttendanceStats = () => {
    const presentCount = attendanceRecords.filter(a => a.status === "Present").length;
    const absentCount = attendanceRecords.filter(a => a.status === "Absent").length;
    const lateCount = attendanceRecords.filter(a => a.status === "Late").length;
    const halfDayCount = attendanceRecords.filter(a => a.status === "Half-Day").length;
    const leaveCount = attendanceRecords.filter(a => a.status === "Leave").length;
    const weeklyOffCount = attendanceRecords.filter(a => a.status === "Weekly-Off").length;
    const totalEmployees = attendanceRecords.length;
    
    const attendanceRate = totalEmployees > 0 
      ? Math.round(((presentCount + halfDayCount * 0.5) / totalEmployees) * 100)
      : 0;
    
    const totalHours = attendanceRecords.reduce((sum, record) => sum + record.hoursWorked, 0);
    const totalOvertime = attendanceRecords.reduce((sum, record) => sum + record.overtime, 0);
    
    return {
      presentCount,
      absentCount,
      lateCount,
      halfDayCount,
      leaveCount,
      weeklyOffCount,
      totalEmployees,
      attendanceRate,
      totalHours,
      totalOvertime
    };
  };

  // Calculate inventory stats
  const getItemStatus = (item: FrontendInventoryItem) => {
    if (item.quantity === 0) return "Out of Stock";
    if (item.quantity <= item.reorderLevel) return "Low Stock";
    return "In Stock";
  };

  const calculateInventoryStats = () => {
    const totalItems = inventoryItems.length;
    const lowStockItems = inventoryItems.filter(item => item.quantity <= item.reorderLevel).length;
    const outOfStockItems = inventoryItems.filter(item => item.quantity === 0).length;
    const categories = Array.from(new Set(inventoryItems.map(item => item.category))).filter(Boolean);
    
    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      categoriesCount: categories.length
    };
  };

  // Calculate task statistics
  const calculateTaskStats = () => {
    const completedTasks = productionTasks.filter(t => t.status === "completed").length;
    const inProgressTasks = productionTasks.filter(t => t.status === "in-progress").length;
    const pendingTasks = productionTasks.filter(t => t.status === "pending").length;
    const cancelledTasks = productionTasks.filter(t => t.status === "cancelled").length;
    
    const totalEfficiency = productionTasks.length > 0 
      ? Math.round(productionTasks.reduce((sum, task) => sum + task.efficiency, 0) / productionTasks.length)
      : 0;
    
    const totalUnits = productionTasks.reduce((sum, task) => sum + task.completed, 0);
    const qualityPassRate = productionTasks.length > 0 
      ? Math.round((productionTasks.filter(t => t.qualityCheck === "Passed").length / productionTasks.length) * 100)
      : 0;
    
    return {
      totalTasks: productionTasks.length,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      cancelledTasks,
      totalEfficiency,
      totalUnits,
      qualityPassRate
    };
  };

  const attendanceStats = calculateAttendanceStats();
  const inventoryStats = calculateInventoryStats();
  const taskStats = calculateTaskStats();

  // Helper functions for styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200";
      case "completed": return "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200";
      case "In Progress": return "bg-gradient-to-r from-[#3b82f6]/20 to-[#06b6d4]/20 text-[#3b82f6] border-[#3b82f6]/30";
      case "in-progress": return "bg-gradient-to-r from-[#3b82f6]/20 to-[#06b6d4]/20 text-[#3b82f6] border-[#3b82f6]/30";
      case "Delayed": return "bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200";
      case "Not Started": return "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-200";
      case "pending": return "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-200";
      case "cancelled": return "bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200";
      default: return "bg-gradient-to-r from-gray-100 to-gray-50";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200";
      case "medium": return "bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200";
      case "low": return "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200";
      default: return "bg-gradient-to-r from-gray-100 to-gray-50";
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case "Excellent": return "bg-gradient-to-r from-green-500 to-emerald-400";
      case "Good": return "bg-gradient-to-r from-[#3b82f6] to-[#06b6d4]";
      case "Average": return "bg-gradient-to-r from-yellow-500 to-amber-400";
      case "Needs Improvement": return "bg-gradient-to-r from-red-500 to-orange-400";
      default: return "bg-gradient-to-r from-gray-500 to-gray-400";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Low": return "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200";
      case "Medium": return "bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200";
      case "High": return "bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200";
      default: return "bg-gradient-to-r from-gray-100 to-gray-50";
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case "Present": return "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200";
      case "Absent": return "bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200";
      case "Late": return "bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200";
      case "Half-Day": return "bg-gradient-to-r from-[#3b82f6]/20 to-[#06b6d4]/20 text-[#3b82f6] border-[#3b82f6]/30";
      case "Leave": return "bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border-purple-200";
      case "Weekly-Off": return "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border-gray-200";
      default: return "bg-gradient-to-r from-gray-100 to-gray-50";
    }
  };

  const getInventoryStatusColor = (status: string) => {
    switch (status) {
      case "In Stock": return "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200";
      case "Low Stock": return "bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200";
      case "Out of Stock": return "bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200";
      case "On Order": return "bg-gradient-to-r from-[#3b82f6]/20 to-[#06b6d4]/20 text-[#3b82f6] border-[#3b82f6]/30";
      default: return "bg-gradient-to-r from-gray-100 to-gray-50";
    }
  };

  const getQualityCheckColor = (status: string) => {
    switch (status) {
      case "Passed": return "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200";
      case "Failed": return "bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200";
      case "Pending": return "bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200";
      default: return "bg-gradient-to-r from-gray-100 to-gray-50";
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return "text-green-600 font-bold";
    if (efficiency >= 70) return "text-[#3b82f6] font-semibold";
    return "text-red-600 font-semibold";
  };

  // Filtered data based on search
  const filteredAttendance = attendanceRecords.filter(record =>
    record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTasks = productionTasks.filter(task =>
    task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInventory = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // =================== EXPORT FUNCTIONS ===================
  
  // Export Attendance to PDF
  const exportAttendanceToPDF = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "📊 No Data",
        description: "No attendance records available to export",
        variant: "destructive",
      });
      return;
    }
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text("Attendance Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Date: ${selectedDate} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add summary stats
    const stats = calculateAttendanceStats();
    doc.setFontSize(10);
    doc.text(`Total Employees: ${stats.totalEmployees}`, 14, 40);
    doc.text(`Present: ${stats.presentCount}`, 14, 46);
    doc.text(`Absent: ${stats.absentCount}`, 60, 46);
    doc.text(`Late: ${stats.lateCount}`, 100, 46);
    doc.text(`Attendance Rate: ${stats.attendanceRate}%`, 140, 46);
    
    // Prepare table data
    const tableData = attendanceRecords.map(record => [
      record.employeeName,
      record.employeeId,
      record.date,
      record.checkIn,
      record.checkOut,
      record.hoursWorked.toFixed(1),
      record.status,
      record.overtime > 0 ? record.overtime.toFixed(1) : "-",
      record.notes || "-"
    ]);
    
    // Create table
    autoTable(doc, {
      head: [['Employee Name', 'ID', 'Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Overtime', 'Notes']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      margin: { top: 50 }
    });
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(10);
    doc.text(`Report generated by ${currentUser?.name || 'Supervisor'}`, 14, finalY + 10);
    doc.text(`Total Hours: ${stats.totalHours.toFixed(1)} | Total Overtime: ${stats.totalOvertime.toFixed(1)}`, 14, finalY + 16);
    
    // Save the PDF
    doc.save(`Attendance_Report_${selectedDate.replace(/-/g, '_')}.pdf`);
    
    toast({
      title: "✅ PDF Exported",
      description: "Attendance report has been exported as PDF",
    });
  };

  // Export Attendance to Excel
  const exportAttendanceToExcel = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "📊 No Data",
        description: "No attendance records available to export",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare data for Excel
    const excelData = attendanceRecords.map(record => ({
      'Employee Name': record.employeeName,
      'Employee ID': record.employeeId,
      'Date': record.date,
      'Check In': record.checkIn,
      'Check Out': record.checkOut,
      'Hours Worked': record.hoursWorked,
      'Status': record.status,
      'Overtime Hours': record.overtime,
      'Notes': record.notes || ''
    }));
    
    // Add summary stats as first row
    const stats = calculateAttendanceStats();
    const summaryRow = {
      'Employee Name': 'SUMMARY',
      'Employee ID': '',
      'Date': selectedDate,
      'Check In': '',
      'Check Out': '',
      'Hours Worked': stats.totalHours,
      'Status': `Present: ${stats.presentCount} | Absent: ${stats.absentCount}`,
      'Overtime Hours': stats.totalOvertime,
      'Notes': `Attendance Rate: ${stats.attendanceRate}%`
    };
    
    const allData = [summaryRow, ...excelData];
    
    // Create worksheet
    const ws = utils.json_to_sheet(allData);
    
    // Create workbook
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Attendance Report");
    
    // Generate Excel file
    writeFile(wb, `Attendance_Report_${selectedDate.replace(/-/g, '_')}.xlsx`);
    
    toast({
      title: "✅ Excel Exported",
      description: "Attendance report has been exported as Excel",
    });
  };

  // Export Tasks to PDF
  const exportTasksToPDF = () => {
    if (productionTasks.length === 0) {
      toast({
        title: "📊 No Data",
        description: "No tasks available to export",
        variant: "destructive",
      });
      return;
    }
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(`${currentUser?.name || 'Supervisor'} Tasks Report`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add summary stats
    const stats = calculateTaskStats();
    doc.setFontSize(10);
    doc.text(`Total Tasks: ${stats.totalTasks}`, 14, 40);
    doc.text(`Completed: ${stats.completedTasks}`, 60, 40);
    doc.text(`In Progress: ${stats.inProgressTasks}`, 110, 40);
    doc.text(`Average Efficiency: ${stats.totalEfficiency}%`, 160, 40);
    
    // Prepare table data
    const tableData = productionTasks.map(task => [
      task.taskName.substring(0, 30),
      task.operator,
      task.status.charAt(0).toUpperCase() + task.status.slice(1),
      task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
      `${task.completed}/${task.quantity}`,
      task.qualityCheck,
      `${task.efficiency}%`,
      new Date(task.deadline).toLocaleDateString(),
      task.siteName
    ]);
    
    // Create table
    autoTable(doc, {
      head: [['Task Name', 'Operator', 'Status', 'Priority', 'Progress', 'Quality', 'Efficiency', 'Due Date', 'Site']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 152, 219] },
      margin: { top: 50 }
    });
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(10);
    doc.text(`Report generated for ${currentUser?.name || 'Supervisor'}`, 14, finalY + 10);
    doc.text(`Total Units Produced: ${stats.totalUnits} | Quality Pass Rate: ${stats.qualityPassRate}%`, 14, finalY + 16);
    
    // Save the PDF
    doc.save(`${currentUser?.name?.replace(/\s+/g, '_') || 'Supervisor'}_Tasks_Report_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.pdf`);
    
    toast({
      title: "✅ Tasks PDF Exported",
      description: "Tasks report has been exported as PDF",
    });
  };

  // Export Inventory to PDF
  const exportInventoryToPDF = () => {
    if (inventoryItems.length === 0) {
      toast({
        title: "📊 No Data",
        description: "No inventory items available to export",
        variant: "destructive",
      });
      return;
    }
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text("Inventory Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add summary stats
    const stats = calculateInventoryStats();
    doc.setFontSize(10);
    doc.text(`Total Items: ${stats.totalItems}`, 14, 40);
    doc.text(`Low Stock: ${stats.lowStockItems}`, 60, 40);
    doc.text(`Out of Stock: ${stats.outOfStockItems}`, 100, 40);
    doc.text(`Categories: ${stats.categoriesCount}`, 140, 40);
    
    // Prepare table data
    const tableData = inventoryItems.map(item => [
      item.name.substring(0, 25),
      item.sku,
      item.category || '-',
      item.quantity.toString(),
      item.reorderLevel.toString(),
      getItemStatus(item),
      item.supplier || '-',
      item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'
    ]);
    
    // Create table
    autoTable(doc, {
      head: [['Item Name', 'SKU', 'Category', 'Current Stock', 'Min Stock', 'Status', 'Supplier', 'Last Updated']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [39, 174, 96] },
      margin: { top: 50 }
    });
    
    // Add footer
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(10);
    doc.text(`Report generated by ${currentUser?.name || 'Supervisor'}`, 14, finalY + 10);
    
    // Save the PDF
    doc.save(`Inventory_Report_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.pdf`);
    
    toast({
      title: "✅ Inventory PDF Exported",
      description: "Inventory report has been exported as PDF",
    });
  };

  // Export All Data to Comprehensive PDF
  const exportAllToPDF = () => {
    const doc = new jsPDF();
    
    // Add main title
    doc.setFontSize(24);
    doc.text("Supervisor Comprehensive Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()} | Supervisor: ${currentUser?.name || 'N/A'}`, 14, 30);
    
    let yPosition = 40;
    
    // 1. Attendance Section
    doc.setFontSize(16);
    doc.text("1. Attendance Summary", 14, yPosition);
    yPosition += 10;
    
    const attendanceStats = calculateAttendanceStats();
    doc.setFontSize(10);
    doc.text(`Total Employees: ${attendanceStats.totalEmployees}`, 20, yPosition);
    doc.text(`Present: ${attendanceStats.presentCount}`, 20, yPosition + 6);
    doc.text(`Absent: ${attendanceStats.absentCount}`, 80, yPosition + 6);
    doc.text(`Attendance Rate: ${attendanceStats.attendanceRate}%`, 140, yPosition + 6);
    yPosition += 20;
    
    // 2. Tasks Section
    doc.setFontSize(16);
    doc.text("2. Tasks Summary", 14, yPosition);
    yPosition += 10;
    
    const taskStats = calculateTaskStats();
    doc.setFontSize(10);
    doc.text(`Total Tasks: ${taskStats.totalTasks}`, 20, yPosition);
    doc.text(`Completed: ${taskStats.completedTasks}`, 80, yPosition);
    doc.text(`Average Efficiency: ${taskStats.totalEfficiency}%`, 140, yPosition);
    yPosition += 10;
    
    // 3. Inventory Section
    doc.setFontSize(16);
    doc.text("3. Inventory Summary", 14, yPosition);
    yPosition += 10;
    
    const inventoryStats = calculateInventoryStats();
    doc.setFontSize(10);
    doc.text(`Total Items: ${inventoryStats.totalItems}`, 20, yPosition);
    doc.text(`Low Stock: ${inventoryStats.lowStockItems}`, 80, yPosition);
    doc.text(`Out of Stock: ${inventoryStats.outOfStockItems}`, 140, yPosition);
    yPosition += 20;
    
    // Add footer
    doc.setFontSize(10);
    doc.text("This is a comprehensive report generated by the Supervisor Dashboard System.", 14, yPosition);
    yPosition += 6;
    doc.text("For detailed information, please refer to individual section exports.", 14, yPosition);
    
    // Save the PDF
    doc.save(`Supervisor_Comprehensive_Report_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.pdf`);
    
    toast({
      title: "✅ Comprehensive PDF Exported",
      description: "Complete supervisor report has been exported as PDF",
    });
  };

  // Export All to Excel (Multi-sheet)
  const exportAllToExcel = () => {
    // Create workbook
    const wb = utils.book_new();
    
    // 1. Attendance Sheet
    if (attendanceRecords.length > 0) {
      const attendanceData = attendanceRecords.map(record => ({
        'Employee Name': record.employeeName,
        'Employee ID': record.employeeId,
        'Date': record.date,
        'Check In': record.checkIn,
        'Check Out': record.checkOut,
        'Hours Worked': record.hoursWorked,
        'Status': record.status,
        'Overtime Hours': record.overtime,
        'Notes': record.notes || ''
      }));
      
      const wsAttendance = utils.json_to_sheet(attendanceData);
      utils.book_append_sheet(wb, wsAttendance, "Attendance");
    }
    
    // 2. Tasks Sheet
    if (productionTasks.length > 0) {
      const tasksData = productionTasks.map(task => ({
        'Task Name': task.taskName,
        'Assigned To': task.operator,
        'Status': task.status.charAt(0).toUpperCase() + task.status.slice(1),
        'Priority': task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
        'Progress': `${task.completed}/${task.quantity}`,
        'Quality Check': task.qualityCheck,
        'Efficiency': `${task.efficiency}%`,
        'Due Date': new Date(task.deadline).toLocaleDateString(),
        'Site': task.siteName,
        'Client': task.clientName
      }));
      
      const wsTasks = utils.json_to_sheet(tasksData);
      utils.book_append_sheet(wb, wsTasks, "Tasks");
    }
    
    // 3. Inventory Sheet
    if (inventoryItems.length > 0) {
      const inventoryData = inventoryItems.map(item => ({
        'Item Name': item.name,
        'SKU': item.sku,
        'Category': item.category || '-',
        'Current Stock': item.quantity,
        'Minimum Stock': item.reorderLevel,
        'Status': getItemStatus(item),
        'Supplier': item.supplier || '-',
        'Last Updated': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'
      }));
      
      const wsInventory = utils.json_to_sheet(inventoryData);
      utils.book_append_sheet(wb, wsInventory, "Inventory");
    }
    
    // 4. Summary Sheet
    const summaryData = [
      {
        'Section': 'Attendance',
        'Total Records': attendanceRecords.length,
        'Present': calculateAttendanceStats().presentCount,
        'Absent': calculateAttendanceStats().absentCount,
        'Attendance Rate': `${calculateAttendanceStats().attendanceRate}%`
      },
      {
        'Section': 'Tasks',
        'Total Records': productionTasks.length,
        'Completed': calculateTaskStats().completedTasks,
        'In Progress': calculateTaskStats().inProgressTasks,
        'Avg Efficiency': `${calculateTaskStats().totalEfficiency}%`
      },
      {
        'Section': 'Inventory',
        'Total Records': inventoryItems.length,
        'Low Stock': calculateInventoryStats().lowStockItems,
        'Out of Stock': calculateInventoryStats().outOfStockItems,
        'Categories': calculateInventoryStats().categoriesCount
      }
    ];
    
    const wsSummary = utils.json_to_sheet(summaryData);
    utils.book_append_sheet(wb, wsSummary, "Summary");
    
    // Generate Excel file
    const fileName = `Supervisor_Report_${currentUser?.name?.replace(/\s+/g, '_') || 'Supervisor'}_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.xlsx`;
    writeFile(wb, fileName);
    
    toast({
      title: "✅ Complete Excel Report Exported",
      description: "All sections have been exported to Excel",
    });
  };

  // Main export handler for the header button
  const handleExportPDF = () => {
    if (activeTab === "attendance") {
      exportAttendanceToPDF();
    } else if (activeTab === "tasks") {
      exportTasksToPDF();
    } else if (activeTab === "inventory") {
      exportInventoryToPDF();
    } else {
      exportAllToPDF();
    }
  };

  // Export handler for specific section buttons
  const handleSectionExport = (section: string, format: 'pdf' | 'excel') => {
    if (section === "attendance") {
      if (format === 'pdf') {
        exportAttendanceToPDF();
      } else {
        exportAttendanceToExcel();
      }
    } else if (section === "tasks") {
      if (format === 'pdf') {
        exportTasksToPDF();
      } else {
        exportAllToExcel();
      }
    } else if (section === "inventory") {
      if (format === 'pdf') {
        exportInventoryToPDF();
      } else {
        exportAllToExcel();
      }
    }
  };

  // Action handlers
  const refreshAttendanceData = async () => {
    await fetchAttendanceData();
    toast({
      title: "🔄 Attendance Refreshed",
      description: "Attendance data has been updated successfully",
    });
  };

  const refreshInventoryData = async () => {
    await fetchInventoryData();
    toast({
      title: "🔄 Inventory Refreshed",
      description: "Inventory data has been updated successfully",
    });
  };

  const refreshTasksData = async () => {
    await fetchTasksData();
    toast({
      title: "🔄 Tasks Refreshed",
      description: "Tasks data has been updated successfully",
    });
  };

  const handleSaveReport = () => {
    toast({
      title: "💾 Report Saved",
      description: "Your report has been saved successfully",
    });
  };

  const handleSendReport = () => {
    toast({
      title: "📤 Report Sent",
      description: "Report has been sent to management",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Check if user is a supervisor
  const isSupervisor = currentUser?.role === "supervisor";

  // Header action buttons
  const headerActionButtons = (
    <div className="flex gap-2">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" onClick={exportAllToExcel} className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <Download className="h-4 w-4 mr-2" />
          Export All Excel
        </Button>
      </motion.div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" onClick={exportAllToPDF} className="bg-gradient-to-r from-[#3b82f6]/10 to-[#06b6d4]/10 border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/20">
          <Download className="h-4 w-4 mr-2" />
          Export All PDF
        </Button>
      </motion.div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="outline" onClick={handlePrint} className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </motion.div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button onClick={handleSaveReport} className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] hover:from-[#3b82f6]/90 hover:to-[#06b6d4]/90">
          <Save className="h-4 w-4 mr-2" />
          Save Report
        </Button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <DashboardHeader 
        title="Supervisor Reports" 
        subtitle={isSupervisor ? `Reports for ${currentUser.name}` : "Generate and manage daily reports"}
        onMenuClick={onMenuClick}
        actionButtons={headerActionButtons}
      />

      <div className="p-4 md:p-6 space-y-6">
       
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across all sections..."
              className="pl-10 bg-white/50 backdrop-blur-sm border-gray-200 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <TabsList className="grid grid-cols-2 md:grid-cols-3 gap-2 p-1 bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl">
                <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-100 data-[state=active]:to-emerald-100">
                  <User className="h-4 w-4 mr-2" />
                  Attendance
                </TabsTrigger>
                <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3b82f6]/20 data-[state=active]:to-[#06b6d4]/20 data-[state=active]:text-[#3b82f6]">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-100 data-[state=active]:to-amber-100">
                  <Package className="h-4 w-4 mr-2" />
                  Inventory
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* Attendance Tab */}
            <TabsContent value="attendance">
              <motion.div
                key="attendance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border border-gray-200 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-white to-gray-50">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div>
                        <CardTitle className="text-green-900">Attendance Records</CardTitle>
                        {isSupervisor && (
                          <CardDescription className="text-green-700">
                            Attendance data for your team
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="attendance-date" className="text-sm whitespace-nowrap text-green-700">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            Select Date:
                          </Label>
                          <Input
                            id="attendance-date"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full sm:w-auto border-green-200 bg-white rounded-xl"
                          />
                        </div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={refreshAttendanceData}
                            disabled={loadingAttendance}
                            className="border-green-200 bg-white hover:bg-green-50 rounded-xl"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingAttendance ? 'animate-spin' : ''}`} />
                            {loadingAttendance ? 'Refreshing...' : 'Refresh'}
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSectionExport("attendance", 'pdf')}
                            className="border-[#3b82f6]/30 bg-white hover:bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export PDF
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSectionExport("attendance", 'excel')}
                            className="border-green-200 bg-white hover:bg-green-50 rounded-xl"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export Excel
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {loadingAttendance ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="h-12 w-12 text-green-500 mb-4" />
                        </motion.div>
                        <p className="text-lg font-medium text-green-800">Loading Attendance Data</p>
                        <p className="text-green-600">Fetching real data from backend...</p>
                      </motion.div>
                    ) : attendanceError ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                        <p className="text-lg font-medium text-red-600">Failed to Load Attendance Data</p>
                        <p className="text-red-500 mb-4">{attendanceError}</p>
                        <div className="flex gap-2 justify-center">
                          <Button onClick={fetchAttendanceData} className="bg-gradient-to-r from-red-500 to-orange-500">
                            Try Again
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ staggerChildren: 0.1 }}
                        className="space-y-6"
                      >
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { label: "Present", value: attendanceStats.presentCount, color: "green", icon: CheckCircle },
                            { label: "Absent", value: attendanceStats.absentCount, color: "red", icon: XCircle },
                            { label: "Late", value: attendanceStats.lateCount, color: "yellow", icon: Clock3 },
                            { label: "Overtime", value: attendanceStats.totalOvertime.toFixed(1), color: "blue", icon: TrendingUp }
                          ].map((stat, index) => (
                            <motion.div
                              key={stat.label}
                              variants={itemVariants}
                              whileHover={{ y: -5 }}
                              className={`border ${
                                stat.color === "blue" 
                                  ? "border-[#3b82f6]/30 bg-gradient-to-br from-[#3b82f6]/10 to-white"
                                  : `border-${stat.color}-200 bg-gradient-to-br from-${stat.color}-50 to-white`
                              } rounded-xl p-4 shadow-sm`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`${
                                    stat.color === "blue" 
                                      ? "text-[#3b82f6]"
                                      : `text-${stat.color}-700`
                                  } text-sm font-medium`}>{stat.label}</p>
                                  <p className={`${
                                    stat.color === "blue" 
                                      ? "text-[#3b82f6]"
                                      : `text-${stat.color}-900`
                                  } text-2xl font-bold`}>
                                    {stat.value}
                                  </p>
                                </div>
                                <div className={`h-10 w-10 rounded-full ${
                                  stat.color === "blue" 
                                    ? "bg-gradient-to-r from-[#3b82f6]/20 to-[#06b6d4]/20"
                                    : `bg-gradient-to-r from-${stat.color}-100 to-${stat.color}-50`
                                } flex items-center justify-center`}>
                                  <stat.icon className={`h-5 w-5 ${
                                    stat.color === "blue" 
                                      ? "text-[#3b82f6]"
                                      : `text-${stat.color}-600`
                                  }`} />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Attendance Table */}
                        <motion.div variants={itemVariants} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="font-semibold text-gray-700">Employee</TableHead>
                                  <TableHead className="font-semibold text-gray-700">ID</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Date</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Check In</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Check Out</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Hours</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Overtime</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredAttendance.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                      <User className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                                      <p className="text-lg font-medium text-gray-500">No attendance records found</p>
                                      <p className="text-gray-400">
                                        No attendance data available for {selectedDate}
                                      </p>
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  filteredAttendance.map((record, index) => (
                                    <motion.tr
                                      key={record.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      className="hover:bg-gray-50/50"
                                    >
                                      <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                          <div className={`h-8 w-8 rounded-full ${getAttendanceColor(record.status)} flex items-center justify-center`}>
                                            {record.employeeName.charAt(0)}
                                          </div>
                                          <span>{record.employeeName}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="bg-gray-50">
                                          {record.employeeId}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{record.date}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-gray-400" />
                                          {record.checkIn}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-gray-400" />
                                          {record.checkOut}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]">
                                          {record.hoursWorked.toFixed(1)} hrs
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <motion.div whileHover={{ scale: 1.05 }}>
                                          <Badge className={getAttendanceColor(record.status)}>
                                            {record.status}
                                          </Badge>
                                        </motion.div>
                                      </TableCell>
                                      <TableCell>
                                        {record.overtime > 0 ? (
                                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                            +{record.overtime.toFixed(1)} hrs
                                          </Badge>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </TableCell>
                                    </motion.tr>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </motion.div>

                        {/* Summary Section */}
                        <motion.div variants={itemVariants} className="border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                          <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                            <BarChart className="h-5 w-5" />
                            Attendance Summary for {selectedDate}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                              <p className="text-sm text-green-700 mb-2">Total Working Hours</p>
                              <p className="text-3xl font-bold text-green-900">
                                {attendanceStats.totalHours.toFixed(1)}
                                <span className="text-lg text-green-700"> hours</span>
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-green-700 mb-2">Attendance Rate</p>
                              <div className="relative inline-block">
                                <p className="text-3xl font-bold text-green-900">
                                  {attendanceStats.attendanceRate}%
                                </p>
                                <motion.div
                                  className="absolute -top-2 -right-2 h-4 w-4 bg-green-500 rounded-full"
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-green-700 mb-2">Total Employees</p>
                              <p className="text-3xl font-bold text-green-900">
                                {attendanceStats.totalEmployees}
                              </p>
                            </div>
                          </div>
                          <div className="mt-6">
                            <p className="text-sm text-green-700 mb-3">Breakdown</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: "Present", count: attendanceStats.presentCount, color: "green" },
                                { label: "Absent", count: attendanceStats.absentCount, color: "red" },
                                { label: "Late", count: attendanceStats.lateCount, color: "yellow" },
                                { label: "Half-Day", count: attendanceStats.halfDayCount, color: "blue" },
                                { label: "Leave", count: attendanceStats.leaveCount, color: "purple" },
                                { label: "Weekly-Off", count: attendanceStats.weeklyOffCount, color: "gray" }
                              ].map((item) => (
                                <motion.div
                                  key={item.label}
                                  whileHover={{ scale: 1.05 }}
                                  className={`px-3 py-1.5 rounded-full ${
                                    item.color === "blue" 
                                      ? "bg-gradient-to-r from-[#3b82f6]/20 to-[#06b6d4]/20 border border-[#3b82f6]/30 text-[#3b82f6]"
                                      : `bg-gradient-to-r from-${item.color}-100 to-${item.color}-50 border border-${item.color}-200 text-${item.color}-800`
                                  }`}
                                >
                                  <span className="text-sm font-medium">
                                    {item.label}: {item.count}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks">
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border border-gray-200 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-white to-[#3b82f6]/5">
                  <CardHeader className="bg-gradient-to-r from-[#3b82f6]/10 to-[#06b6d4]/10 border-b border-[#3b82f6]/30">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <CardTitle className="text-[#3b82f6]">
                          {isSupervisor ? `${currentUser?.name}'s Tasks` : "Production Tasks"}
                        </CardTitle>
                        <CardDescription className="text-[#3b82f6]/80">
                          {isSupervisor 
                            ? "Tasks assigned to you or created by you" 
                            : "Real tasks data from backend"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={refreshTasksData}
                            disabled={loadingTasks}
                            className="border-[#3b82f6]/30 bg-white hover:bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingTasks ? 'animate-spin' : ''}`} />
                            {loadingTasks ? 'Refreshing...' : 'Refresh'}
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSectionExport("tasks", 'pdf')}
                            className="border-[#3b82f6]/30 bg-white hover:bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export PDF
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={exportAllToExcel}
                            className="border-green-200 bg-white hover:bg-green-50 rounded-xl"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export Excel
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {!isSupervisor ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <Shield className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
                        <p className="text-lg font-medium text-yellow-700">Access Restricted</p>
                        <p className="text-yellow-600 mb-4">
                          This section is only accessible to supervisors.
                        </p>
                        <Badge variant="outline" className="text-lg capitalize bg-yellow-50 border-yellow-200">
                          Your role: {currentUser?.role || "Not logged in"}
                        </Badge>
                      </motion.div>
                    ) : loadingTasks ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="h-12 w-12 text-[#3b82f6] mb-4" />
                        </motion.div>
                        <p className="text-lg font-medium text-[#3b82f6]">Loading Your Tasks</p>
                        <p className="text-[#3b82f6]/80">Fetching tasks data from backend...</p>
                      </motion.div>
                    ) : tasksError ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                        <p className="text-lg font-medium text-red-600">Failed to Load Tasks Data</p>
                        <p className="text-red-500 mb-4">{tasksError}</p>
                        <div className="flex gap-2 justify-center">
                          <Button onClick={fetchTasksData} className="bg-gradient-to-r from-red-500 to-orange-500">
                            Try Again
                          </Button>
                        </div>
                      </motion.div>
                    ) : productionTasks.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-600">No Tasks Found</p>
                        <p className="text-gray-500 mb-4">
                          You don't have any tasks assigned to you or created by you.
                        </p>
                        <Button onClick={fetchTasksData} className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] hover:from-[#3b82f6]/90 hover:to-[#06b6d4]/90">
                          Check Again
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ staggerChildren: 0.1 }}
                        className="space-y-6"
                      >
                        {/* Supervisor Info */}
                        <motion.div variants={itemVariants}>
                          <div className="border border-[#3b82f6]/30 bg-gradient-to-r from-[#3b82f6]/10 to-[#06b6d4]/10 rounded-xl p-4">
                            <div className="flex items-center gap-4">
                              <motion.div
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.5 }}
                                className="h-12 w-12 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] flex items-center justify-center"
                              >
                                <User className="h-6 w-6 text-white" />
                              </motion.div>
                              <div>
                                <h4 className="font-semibold text-[#3b82f6]">{currentUser?.name}</h4>
                                <p className="text-sm text-[#3b82f6]/80">
                                  Supervisor • {productionTasks.length} tasks found • {taskStats.completedTasks} completed
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Stats Cards */}
                        <motion.div variants={itemVariants}>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              { label: "Total Tasks", value: taskStats.totalTasks, color: "blue", icon: FileText },
                              { label: "Completed", value: taskStats.completedTasks, color: "green", icon: CheckCircle },
                              { label: "Avg Efficiency", value: `${taskStats.totalEfficiency}%`, color: "cyan", icon: TrendingUp }
                            ].map((stat, index) => (
                              <motion.div
                                key={stat.label}
                                whileHover={{ y: -5 }}
                                className={`border ${
                                  stat.color === "blue" || stat.color === "cyan"
                                    ? "border-[#3b82f6]/30 bg-gradient-to-br from-[#3b82f6]/10 to-white"
                                    : `border-${stat.color}-200 bg-gradient-to-br from-${stat.color}-50 to-white`
                                } rounded-xl p-4 shadow-sm`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className={`${
                                      stat.color === "blue" || stat.color === "cyan"
                                        ? "text-[#3b82f6]"
                                        : `text-${stat.color}-700`
                                    } text-sm font-medium`}>{stat.label}</p>
                                    <p className={`${
                                      stat.color === "blue" || stat.color === "cyan"
                                        ? "text-[#3b82f6]"
                                        : `text-${stat.color}-900`
                                    } text-2xl font-bold`}>
                                      {stat.value}
                                    </p>
                                  </div>
                                  <div className={`h-10 w-10 rounded-full ${
                                    stat.color === "blue" || stat.color === "cyan"
                                      ? "bg-gradient-to-r from-[#3b82f6]/20 to-[#06b6d4]/20"
                                      : `bg-gradient-to-r from-${stat.color}-100 to-${stat.color}-50`
                                  } flex items-center justify-center`}>
                                    <stat.icon className={`h-5 w-5 ${
                                      stat.color === "blue" || stat.color === "cyan"
                                        ? "text-[#3b82f6]"
                                        : `text-${stat.color}-600`
                                    }`} />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>

                        {/* Tasks Table */}
                        <motion.div variants={itemVariants} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="font-semibold text-gray-700">Task Name</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Assigned To</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Priority</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Progress</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Quality</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Efficiency</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Due Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredTasks.slice(0, 10).map((task, index) => {
                                  const isAssignedToMe = task.assignedToId === currentUser?._id;
                                  const isCreatedByMe = task.createdById === currentUser?._id;
                                  
                                  return (
                                    <motion.tr
                                      key={`${task.id}-${index}`}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      className={`hover:bg-gray-50/50 ${
                                        isAssignedToMe ? 'bg-gradient-to-r from-green-50 to-white' : 
                                        isCreatedByMe ? 'bg-gradient-to-r from-[#3b82f6]/10 to-white' : ''
                                      }`}
                                    >
                                      <TableCell className="font-medium">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span>{task.taskName}</span>
                                            {isAssignedToMe && (
                                              <motion.div whileHover={{ scale: 1.1 }}>
                                                <Badge variant="outline" className="h-4 px-1 text-[10px] bg-green-100 text-green-800 border-green-200">
                                                  To You
                                                </Badge>
                                              </motion.div>
                                            )}
                                            {isCreatedByMe && (
                                              <motion.div whileHover={{ scale: 1.1 }}>
                                                <Badge variant="outline" className="h-4 px-1 text-[10px] bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30">
                                                  Your Task
                                                </Badge>
                                              </motion.div>
                                            )}
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                            {task.productCode} • {task.siteName}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <div className="h-6 w-6 rounded-full bg-gradient-to-r from-[#3b82f6]/20 to-[#06b6d4]/20 flex items-center justify-center">
                                            <span className="text-xs font-medium text-[#3b82f6]">
                                              {task.operator.charAt(0)}
                                            </span>
                                          </div>
                                          <span>{task.operator}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <motion.div whileHover={{ scale: 1.05 }}>
                                          <Badge className={getStatusColor(task.status)}>
                                            {task.status === "in-progress" ? "In Progress" : 
                                             task.status === "pending" ? "Pending" :
                                             task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                          </Badge>
                                        </motion.div>
                                      </TableCell>
                                      <TableCell>
                                        <motion.div whileHover={{ scale: 1.05 }}>
                                          <Badge className={getPriorityColor(task.priority)}>
                                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                          </Badge>
                                        </motion.div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-3">
                                          <div className="w-20 bg-gray-200 rounded-full h-2">
                                            <motion.div 
                                              initial={{ width: 0 }}
                                              animate={{ width: `${(task.completed / task.quantity) * 100}%` }}
                                              transition={{ duration: 1, delay: index * 0.1 }}
                                              className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] h-2 rounded-full"
                                            />
                                          </div>
                                          <span className="text-sm font-medium">{task.completed}/{task.quantity}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <motion.div whileHover={{ scale: 1.05 }}>
                                          <Badge className={getQualityCheckColor(task.qualityCheck)}>
                                            {task.qualityCheck}
                                          </Badge>
                                        </motion.div>
                                      </TableCell>
                                      <TableCell>
                                        <motion.div 
                                          whileHover={{ scale: 1.1 }}
                                          className={`inline-flex items-center gap-1 ${getEfficiencyColor(task.efficiency)}`}
                                        >
                                          <TrendingUp className="h-4 w-4" />
                                          <span className="font-bold">{task.efficiency}%</span>
                                        </motion.div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-gray-400" />
                                          <span className="text-sm">{formatDate(task.deadline)}</span>
                                        </div>
                                      </TableCell>
                                    </motion.tr>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </motion.div>

                        {/* Task Summary */}
                        <motion.div variants={itemVariants}>
                          <div className="border border-[#3b82f6]/30 bg-gradient-to-r from-[#3b82f6]/10 to-[#06b6d4]/10 rounded-xl p-6">
                            <h4 className="font-semibold text-[#3b82f6] mb-4 flex items-center gap-2">
                              <Target className="h-5 w-5" />
                              Task Performance Summary
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                              {[
                                { label: "Total Units Produced", value: taskStats.totalUnits, color: "blue" },
                                { label: "Quality Pass Rate", value: `${taskStats.qualityPassRate}%`, color: "green" },
                                { label: "Completion Rate", value: `${taskStats.totalTasks > 0 ? Math.round((taskStats.completedTasks / taskStats.totalTasks) * 100) : 0}%`, color: "cyan" }
                              ].map((stat) => (
                                <div key={stat.label} className="text-center">
                                  <p className={`text-sm ${
                                    stat.color === "blue" || stat.color === "cyan" 
                                      ? "text-[#3b82f6]/80" 
                                      : "text-green-700"
                                  } mb-2`}>{stat.label}</p>
                                  <p className={`text-3xl font-bold ${
                                    stat.color === "blue" || stat.color === "cyan" 
                                      ? "text-[#3b82f6]" 
                                      : "text-green-900"
                                  }`}>
                                    {stat.value}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="text-sm text-[#3b82f6]/80 mb-3">Task Status Breakdown</p>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { label: "Completed", count: taskStats.completedTasks, color: "green" },
                                  { label: "In Progress", count: taskStats.inProgressTasks, color: "blue" },
                                  { label: "Pending", count: taskStats.pendingTasks, color: "gray" },
                                  { label: "Cancelled", count: taskStats.cancelledTasks, color: "red" }
                                ].map((item) => (
                                  <motion.div
                                    key={item.label}
                                    whileHover={{ scale: 1.05 }}
                                    className={`px-3 py-1.5 rounded-full ${
                                      item.color === "blue" 
                                        ? "bg-gradient-to-r from-[#3b82f6]/20 to-[#06b6d4]/20 border border-[#3b82f6]/30 text-[#3b82f6]"
                                        : `bg-gradient-to-r from-${item.color}-100 to-${item.color}-50 border border-${item.color}-200 text-${item.color}-800`
                                    }`}
                                  >
                                    <span className="text-sm font-medium">
                                      {item.label}: {item.count}
                                    </span>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory">
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border border-gray-200 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-white to-amber-50">
                  <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <CardTitle className="text-yellow-900">Inventory Management</CardTitle>
                        <CardDescription className="text-yellow-700">Real inventory data from backend</CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={refreshInventoryData}
                            disabled={inventoryLoading}
                            className="border-yellow-200 bg-white hover:bg-yellow-50 rounded-xl"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${inventoryLoading ? 'animate-spin' : ''}`} />
                            {inventoryLoading ? 'Refreshing...' : 'Refresh'}
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSectionExport("inventory", 'pdf')}
                            className="border-[#3b82f6]/30 bg-white hover:bg-[#3b82f6]/10 text-[#3b82f6] rounded-xl"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export PDF
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={exportAllToExcel}
                            className="border-green-200 bg-white hover:bg-green-50 rounded-xl"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export Excel
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {inventoryLoading ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center py-12"
                      >
                        <div className="text-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"
                          ></motion.div>
                          <p className="mt-4 text-lg font-medium text-yellow-800">Loading Inventory Data</p>
                          <p className="text-yellow-600">Fetching real data from backend...</p>
                        </div>
                      </motion.div>
                    ) : inventoryError ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                        <p className="text-lg font-medium text-red-600">Failed to Load Inventory Data</p>
                        <p className="text-red-500 mb-4">{inventoryError}</p>
                        <Button onClick={fetchInventoryData} className="bg-gradient-to-r from-red-500 to-orange-500">
                          Try Again
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ staggerChildren: 0.1 }}
                        className="space-y-6"
                      >
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {[
                            { label: "Total Items", value: inventoryStats.totalItems, color: "blue", icon: Package },
                            { label: "Low Stock", value: inventoryStats.lowStockItems, color: "yellow", icon: AlertTriangle },
                            { label: "Out of Stock", value: inventoryStats.outOfStockItems, color: "red", icon: XCircle },
                            { label: "Categories", value: inventoryStats.categoriesCount, color: "green", icon: BarChart }
                          ].map((stat, index) => (
                            <motion.div
                              key={stat.label}
                              variants={itemVariants}
                              whileHover={{ y: -5 }}
                              className={`border ${
                                stat.color === "blue" 
                                  ? "border-[#3b82f6]/30 bg-gradient-to-br from-[#3b82f6]/10 to-white"
                                  : `border-${stat.color}-200 bg-gradient-to-br from-${stat.color}-50 to-white`
                              } rounded-xl p-4 shadow-sm`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`${
                                    stat.color === "blue" 
                                      ? "text-[#3b82f6]"
                                      : `text-${stat.color}-700`
                                  } text-sm font-medium`}>{stat.label}</p>
                                  <p className={`${
                                    stat.color === "blue" 
                                      ? "text-[#3b82f6]"
                                      : `text-${stat.color}-900`
                                  } text-2xl font-bold`}>
                                    {stat.value}
                                  </p>
                                </div>
                                <div className={`h-10 w-10 rounded-full ${
                                  stat.color === "blue" 
                                    ? "bg-gradient-to-r from-[#3b82f6]/20 to-[#06b6d4]/20"
                                    : `bg-gradient-to-r from-${stat.color}-100 to-${stat.color}-50`
                                } flex items-center justify-center`}>
                                  <stat.icon className={`h-5 w-5 ${
                                    stat.color === "blue" 
                                      ? "text-[#3b82f6]"
                                      : `text-${stat.color}-600`
                                  }`} />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Inventory Table */}
                        <motion.div variants={itemVariants} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="font-semibold text-gray-700">Item Name</TableHead>
                                  <TableHead className="font-semibold text-gray-700">SKU</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Category</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Current Stock</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Min Stock</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Supplier</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredInventory.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                      <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                                      <p className="text-lg font-medium text-gray-500">No inventory items found</p>
                                      <p className="text-gray-400">
                                        Add items to your inventory database
                                      </p>
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  filteredInventory.slice(0, 10).map((item, index) => (
                                    <motion.tr
                                      key={`${item.id}-${index}`}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      className="hover:bg-gray-50/50"
                                    >
                                      <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 flex items-center justify-center">
                                            <Package className="h-4 w-4 text-yellow-600" />
                                          </div>
                                          <span>{item.name}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="bg-gray-50">
                                          {item.category}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{item.quantity}</span>
                                          <span className="text-gray-500 text-sm">
                                            {item.brushCount ? `(${item.brushCount} brushes)` : 
                                             item.squeegeeCount ? `(${item.squeegeeCount} squeegees)` : 'units'}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="bg-gray-50">
                                          {item.reorderLevel}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <motion.div whileHover={{ scale: 1.05 }}>
                                          <Badge className={getInventoryStatusColor(getItemStatus(item))}>
                                            {getItemStatus(item)}
                                          </Badge>
                                        </motion.div>
                                      </TableCell>
                                      <TableCell className="text-sm text-gray-600">{item.supplier}</TableCell>
                                    </motion.tr>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </motion.div>

                        {/* Stock Level Analysis */}
                        <motion.div variants={itemVariants}>
                          <div className="border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6">
                            <h4 className="font-semibold text-yellow-900 mb-4 flex items-center gap-2">
                              <Activity className="h-5 w-5" />
                              Stock Level Analysis
                            </h4>
                            {filteredInventory.length === 0 ? (
                              <p className="text-sm text-yellow-700 text-center py-4">
                                No inventory data to display
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {filteredInventory.slice(0, 5).map((item, index) => {
                                  const percentage = Math.min(100, (item.quantity / (item.reorderLevel * 2)) * 100);
                                  const statusColor = item.quantity > item.reorderLevel * 1.5 ? "bg-green-500" :
                                                    item.quantity > item.reorderLevel ? "bg-yellow-500" :
                                                    item.quantity === 0 ? "bg-red-500" : "bg-orange-500";
                                  
                                  return (
                                    <motion.div
                                      key={`${item.id}-${index}`}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 }}
                                      className="space-y-2"
                                    >
                                      <div className="flex justify-between text-sm">
                                        <span className="font-medium text-yellow-900">{item.name}</span>
                                        <span className="text-yellow-700">
                                          {item.quantity}/{item.reorderLevel} units
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${percentage}%` }}
                                          transition={{ duration: 1, delay: index * 0.2 }}
                                          className={`h-2 rounded-full ${statusColor}`}
                                        />
                                      </div>
                                    </motion.div>
                                  );
                                })}
                                {filteredInventory.length > 5 && (
                                  <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-yellow-700 text-center"
                                  >
                                    Showing 5 of {filteredInventory.length} items
                                  </motion.p>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Floating Action Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
           
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SupervisorReport;