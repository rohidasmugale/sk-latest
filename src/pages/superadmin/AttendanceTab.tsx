import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/context/RoleContext";
import { machineService, type FrontendMachine } from "@/services/machineService";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  ArrowLeft,
  Download,
  Filter,
  Calendar,
  Building,
  Users,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  User,
  AlertCircle,
  UserCheck,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RefreshCw,
  Loader2,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  FileSpreadsheet,
  MapPin,
  Briefcase,
  Hash,
  Mail,
  Phone,
  UserCog,
  Target,
  Percent,
  FileText,
  Shield,
  ShieldCheck,
  Camera,
  ExternalLink, Home, Car, Trash2, Droplets, ShoppingCart,Settings,Cpu,       // <-- add
  Shirt,     // <-- add
  Images,    // <-- add
  Factory    
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { siteService, Site } from "@/services/SiteService";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// OR use toast directly (we'll use toast with long duration)
// API URL
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const apiClient = axios.create({ baseURL: API_URL });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Employee data structure with photo fields
interface Employee {
  id: string;
  _id?: string;
  employeeId?: string;
  name: string;
  department: string;
  position: string;
  status: 'present' | 'absent' | 'leave' | 'weekly-off';
  checkInTime?: string;
  checkOutTime?: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
  site: string;
  siteName?: string;
  date: string;
  remark?: string;
  action?: 'fine' | 'advance' | 'other' | '' | 'none';
  email?: string;
  phone?: string;
  employeeStatus?: string;
  role?: string;
  gender?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  salary?: number | string;
  assignedSites?: string[];
  shift?: string;
  workingHours?: string;
  employeeType?: string;
  reportingManager?: string;
  createdAt?: string;
  updatedAt?: string;
  isManager?: boolean;
  isSupervisor?: boolean;
  totalHours?: number;
}

// Attendance Record structure with photo fields
interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  isCheckedIn: boolean;
  isOnBreak: boolean;
  supervisorId?: string;
  remarks?: string;
  siteName?: string;
  department?: string;
  shift?: string;
  overtimeHours?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
}

// Site Deployment Stats interface
interface SiteDeploymentStats {
  totalStaff: number;
  managerCount: number;
  supervisorCount: number;
  staffCount: number;
  managerRequirement: number;
  supervisorRequirement: number;
  staffRequirement: number;
  dailyStaffRequirement: number;
  totalStaffRequirementForPeriod: number;
  isStaffFull: boolean;
  remainingStaff: number;
}

// Helper function to calculate days between dates
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff + 1;
};

// Helper function to format date
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to format time
const formatTimeForDisplay = (timestamp: string | null): string => {
  if (!timestamp || timestamp === "-" || timestamp === "" || timestamp === "null") return "-";

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
    console.error('Error formatting time:', timestamp, error);
    return timestamp || "-";
  }
};

// Helper function to check if employee is manager or supervisor
const isManagerOrSupervisor = (employee: Employee): boolean => {
  const position = employee.position?.toLowerCase() || '';
  const department = employee.department?.toLowerCase() || '';

  return position.includes('manager') ||
    position.includes('supervisor') ||
    department.includes('manager') ||
    department.includes('supervisor');
};

// Fetch employees from API
const fetchEmployees = async (): Promise<Employee[]> => {
  try {
    console.log('🔄 Fetching employees from API...');

    const response = await axios.get(`${API_URL}/employees`, {
      params: { limit: 1000 }
    });

    console.log('Employees API response:', response.data);

    let employeesData = [];

    if (response.data) {
      if (Array.isArray(response.data)) {
        employeesData = response.data;
      } else if (response.data.success && Array.isArray(response.data.data)) {
        employeesData = response.data.data;
      } else if (Array.isArray(response.data.employees)) {
        employeesData = response.data.employees;
      } else if (response.data.data && Array.isArray(response.data.data.employees)) {
        employeesData = response.data.data.employees;
      }
    }

    // Transform employees data to match our interface
    const transformedEmployees: Employee[] = employeesData.map((emp: any) => {
      const employee = {
        id: emp._id || emp.id || `emp_${Math.random()}`,
        _id: emp._id || emp.id,
        employeeId: emp.employeeId || emp.employeeID || `EMP${String(Math.random()).slice(2, 6)}`,
        name: emp.name || emp.employeeName || "Unknown Employee",
        email: emp.email || "",
        phone: emp.phone || emp.mobile || "",
        department: emp.department || "Unknown Department",
        position: emp.position || emp.designation || emp.role || "Employee",
        site: emp.site || emp.siteName || "Main Site",
        siteName: emp.siteName || emp.site || "Main Site",
        status: "present" as const,
        employeeStatus: (emp.status || "active") as string,
        role: emp.role || 'employee',
        gender: emp.gender || '',
        dateOfJoining: emp.dateOfJoining || emp.joinDate || '',
        dateOfBirth: emp.dateOfBirth || '',
        salary: emp.salary || emp.basicSalary || 0,
        assignedSites: emp.assignedSites || emp.sites || [],
        shift: emp.shift || 'General',
        workingHours: emp.workingHours || '9:00 AM - 6:00 PM',
        employeeType: emp.employeeType || emp.type || 'Full-time',
        reportingManager: emp.reportingManager || emp.manager || '',
        createdAt: emp.createdAt || emp.created || new Date().toISOString(),
        updatedAt: emp.updatedAt || emp.updated || new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        isManager: false,
        isSupervisor: false
      };

      // Set manager/supervisor flags
      const position = employee.position?.toLowerCase() || '';
      const department = employee.department?.toLowerCase() || '';

      employee.isManager = position.includes('manager') || department.includes('manager');
      employee.isSupervisor = position.includes('supervisor') || department.includes('supervisor');

      return employee;
    });

    console.log(`✅ Loaded ${transformedEmployees.length} employees`);
    return transformedEmployees;
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    throw new Error(`Error loading employees: ${error.message}`);
  }
};

// Fetch attendance records for date range
const fetchAttendanceRecords = async (start: string, end: string): Promise<AttendanceRecord[]> => {
  try {
    console.log(`🔄 Fetching attendance records from ${start} to ${end}`);

    // First, try to fetch all attendance records (might be paginated)
    try {
      const response = await axios.get(`${API_URL}/attendance`, {
        params: {
          startDate: start,
          endDate: end,
          limit: 1000
        }
      });

      console.log('Attendance API response:', response.data);

      if (response.data) {
        let records = [];

        if (response.data.success && Array.isArray(response.data.data)) {
          records = response.data.data;
        } else if (Array.isArray(response.data)) {
          records = response.data;
        } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
          records = response.data.attendance;
        }

        // Filter records by date range if API doesn't support range filtering
        const filteredRecords = records.filter((record: any) => {
          const recordDate = record.date;
          return recordDate >= start && recordDate <= end;
        });

        const transformedRecords: AttendanceRecord[] = filteredRecords.map((record: any) => ({
          _id: record._id || record.id || `att_${Math.random()}`,
          employeeId: record.employeeId || record.employee?._id || '',
          employeeName: record.employeeName || record.employee?.name || 'Unknown',
          date: record.date || '',
          checkInTime: record.checkInTime || null,
          checkOutTime: record.checkOutTime || null,
          checkInPhoto: record.checkInPhoto || null,
          checkOutPhoto: record.checkOutPhoto || null,
          breakStartTime: record.breakStartTime || null,
          breakEndTime: record.breakEndTime || null,
          totalHours: Number(record.totalHours) || 0,
          breakTime: Number(record.breakTime) || 0,
          status: (record.status?.toLowerCase() || 'absent') as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
          isCheckedIn: Boolean(record.isCheckedIn),
          isOnBreak: Boolean(record.isOnBreak),
          supervisorId: record.supervisorId,
          remarks: record.remarks || '',
          siteName: record.siteName || record.site || record.department || '',
          department: record.department || '',
          shift: record.shift || '',
          overtimeHours: Number(record.overtimeHours) || 0,
          lateMinutes: Number(record.lateMinutes) || 0,
          earlyLeaveMinutes: Number(record.earlyLeaveMinutes) || 0
        }));

        console.log(`✅ Loaded ${transformedRecords.length} attendance records from main endpoint`);
        return transformedRecords;
      }
    } catch (mainError) {
      console.log('Main attendance endpoint failed, trying range endpoint:', mainError);
    }

    // Try bulk range endpoint second
    try {
      const response = await axios.get(`${API_URL}/attendance/range`, {
        params: { startDate: start, endDate: end }
      });

      console.log('Attendance range API response:', response.data);

      if (response.data) {
        let records = [];

        if (response.data.success && Array.isArray(response.data.data)) {
          records = response.data.data;
        } else if (Array.isArray(response.data)) {
          records = response.data;
        } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
          records = response.data.attendance;
        }

        const transformedRecords: AttendanceRecord[] = records.map((record: any) => ({
          _id: record._id || record.id || `att_${Math.random()}`,
          employeeId: record.employeeId || record.employee?._id || '',
          employeeName: record.employeeName || record.employee?.name || 'Unknown',
          date: record.date || '',
          checkInTime: record.checkInTime || null,
          checkOutTime: record.checkOutTime || null,
          checkInPhoto: record.checkInPhoto || null,
          checkOutPhoto: record.checkOutPhoto || null,
          breakStartTime: record.breakStartTime || null,
          breakEndTime: record.breakEndTime || null,
          totalHours: Number(record.totalHours) || 0,
          breakTime: Number(record.breakTime) || 0,
          status: (record.status?.toLowerCase() || 'absent') as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
          isCheckedIn: Boolean(record.isCheckedIn),
          isOnBreak: Boolean(record.isOnBreak),
          supervisorId: record.supervisorId,
          remarks: record.remarks || '',
          siteName: record.siteName || record.site || record.department || '',
          department: record.department || '',
          shift: record.shift || '',
          overtimeHours: Number(record.overtimeHours) || 0,
          lateMinutes: Number(record.lateMinutes) || 0,
          earlyLeaveMinutes: Number(record.earlyLeaveMinutes) || 0
        }));

        console.log(`✅ Loaded ${transformedRecords.length} attendance records from range endpoint`);
        return transformedRecords;
      }
    } catch (rangeError: any) {
      console.log('Range endpoint failed:', rangeError.message);
    }

    // Fallback: fetch day by day
    console.log('Falling back to day-by-day attendance fetch...');
    const allRecords: AttendanceRecord[] = [];
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);

    const totalDays = calculateDaysBetween(start, end);
    let daysProcessed = 0;

    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      try {
        const response = await axios.get(`${API_URL}/attendance`, {
          params: { date: dateStr }
        });

        if (response.data) {
          let dayRecords = [];

          if (response.data.success && Array.isArray(response.data.data)) {
            dayRecords = response.data.data;
          } else if (Array.isArray(response.data)) {
            dayRecords = response.data;
          } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
            dayRecords = response.data.attendance;
          }

          const transformedDayRecords: AttendanceRecord[] = dayRecords.map((record: any) => ({
            _id: record._id || record.id || `att_${Math.random()}`,
            employeeId: record.employeeId || record.employee?._id || '',
            employeeName: record.employeeName || record.employee?.name || 'Unknown',
            date: record.date || dateStr,
            checkInTime: record.checkInTime || null,
            checkOutTime: record.checkOutTime || null,
            checkInPhoto: record.checkInPhoto || null,
            checkOutPhoto: record.checkOutPhoto || null,
            breakStartTime: record.breakStartTime || null,
            breakEndTime: record.breakEndTime || null,
            totalHours: Number(record.totalHours) || 0,
            breakTime: Number(record.breakTime) || 0,
            status: (record.status?.toLowerCase() || 'absent') as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
            isCheckedIn: Boolean(record.isCheckedIn),
            isOnBreak: Boolean(record.isOnBreak),
            supervisorId: record.supervisorId,
            remarks: record.remarks || '',
            siteName: record.siteName || record.site || record.department || '',
            department: record.department || '',
            shift: record.shift || '',
            overtimeHours: Number(record.overtimeHours) || 0,
            lateMinutes: Number(record.lateMinutes) || 0,
            earlyLeaveMinutes: Number(record.earlyLeaveMinutes) || 0
          }));

          allRecords.push(...transformedDayRecords);
        }

        daysProcessed++;
        if (daysProcessed % 5 === 0) {
          console.log(`Processed ${daysProcessed}/${totalDays} days...`);
        }
      } catch (dayError: any) {
        console.log(`No attendance data for ${dateStr}: ${dayError.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Loaded ${allRecords.length} attendance records across ${totalDays} days (day-by-day)`);
    return allRecords;

  } catch (error: any) {
    console.error('Error fetching attendance records:', error);
    return [];
  }
};

// Generate employee data for sites - WITH PHOTO SUPPORT
const generateEmployeeData = async (
  siteName: string,
  startDate: string,
  endDate: string
): Promise<Employee[]> => {
  try {
    const allEmployees = await fetchEmployees();
    const siteEmployees = allEmployees.filter(
      emp => emp.site === siteName || emp.siteName === siteName
    );

    if (siteEmployees.length === 0) return [];

    const attendanceRecords = await fetchAttendanceRecords(startDate, endDate);

    // KEY FIX: index by MongoDB _id (what record.employeeId actually is)
    const attendanceMap = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach(record => {
      // Primary key: mongoId_date
      attendanceMap.set(`${record.employeeId}_${record.date}`, record);
      // Secondary key: employeeName_date (fallback)
      if (record.employeeName) {
        attendanceMap.set(`name_${record.employeeName}_${record.date}`, record);
      }
    });

    const employees: Employee[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const currentDate = formatDate(date);

      for (const employee of siteEmployees) {
        // Try MongoDB _id first, then name fallback
        const mongoId = employee._id || employee.id || '';
        const attendance =
          attendanceMap.get(`${mongoId}_${currentDate}`) ||
          attendanceMap.get(`name_${employee.name}_${currentDate}`);

        let status: 'present' | 'absent' | 'leave' | 'weekly-off' = 'absent';
        let checkInTime = '';
        let checkOutTime = '';
        let checkInPhoto = '';
        let checkOutPhoto = '';
        let remark = '';
        let totalHours = 0;
        if (attendance) {
          status = attendance.status as any;
          checkInTime = attendance.checkInTime
            ? formatTimeForDisplay(attendance.checkInTime)
            : '';
          checkOutTime = attendance.checkOutTime
            ? formatTimeForDisplay(attendance.checkOutTime)
            : '';
          checkInPhoto = attendance.checkInPhoto || '';
          checkOutPhoto = attendance.checkOutPhoto || '';
          remark = attendance.remarks || '';
          totalHours = attendance.totalHours || 0;   // <-- add this line
        }

        employees.push({
          id: `${mongoId}_${currentDate}`,
          _id: employee._id,
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          position: employee.position,
          isManager: employee.isManager,
          isSupervisor: employee.isSupervisor,
          status,
          checkInTime,
          checkOutTime,
          checkInPhoto,
          checkOutPhoto,
           totalHours,
          site: siteName,
          siteName,
          date: currentDate,
          remark,
          action: 'none',
          email: employee.email,
          phone: employee.phone,
          employeeStatus: employee.employeeStatus,
          role: employee.role,
          gender: employee.gender,
          dateOfJoining: employee.dateOfJoining,
          dateOfBirth: employee.dateOfBirth,
          salary: employee.salary,
          assignedSites: employee.assignedSites,
          shift: employee.shift,
          workingHours: employee.workingHours,
          employeeType: employee.employeeType,
          reportingManager: employee.reportingManager,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        });
      }
    }

    if (employees.length === 0) return generateDemoEmployeeData(siteName, startDate, endDate);

    return employees;
  } catch (error) {
    console.error('Error generating employee data:', error);
    return generateDemoEmployeeData(siteName, startDate, endDate);
  }
};

// Generate demo employee data with mock photos
const generateDemoEmployeeData = (siteName: string, startDate: string, endDate: string): Employee[] => {
  const employees: Employee[] = [];
  const departments = ['Housekeeping', 'Security', 'Parking', 'Waste Management', 'Consumables', 'Other'];
  const positions = ['Staff', 'Supervisor', 'Manager', 'Executive'];
  const actions = ['fine', 'advance', 'other', 'none'] as const;
  const remarks = [
    'Late arrival',
    'Early departure',
    'Half day',
    'Permission granted',
    'Medical leave',
    'Personal work',
    '',
    '',
    '',
    ''
  ];

  // Generate demo employees for each date in the range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysInPeriod = calculateDaysBetween(startDate, endDate);

  // Base employees (same across dates)
  const baseEmployees: { id: string; name: string; department: string; position: string; isManager: boolean; isSupervisor: boolean; }[] = [];
  const totalEmployees = 10 + Math.floor(Math.random() * 20);

  for (let i = 1; i <= totalEmployees; i++) {
    const position = positions[Math.floor(Math.random() * positions.length)];
    const isManager = position === 'Manager';
    const isSupervisor = position === 'Supervisor';

    baseEmployees.push({
      id: `DEMO${siteName.substring(0, 3).toUpperCase()}${i.toString().padStart(3, '0')}`,
      name: `Demo Employee ${i}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      position: position,
      isManager,
      isSupervisor
    });
  }

  // For each date, create attendance records
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const currentDate = formatDate(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    baseEmployees.forEach((baseEmp, index) => {
      let status: 'present' | 'absent' | 'leave' | 'weekly-off';

      // Only set weekly-off on weekends and based on probability
      // This ensures weekly-off is explicitly set, not default
      if (isWeekend && Math.random() > 0.8) {
        status = 'weekly-off';
      } else {
        const rand = Math.random();
        if (rand < 0.75) {
          status = 'present';
        } else if (rand < 0.9) {
          status = 'absent';
        } else {
          status = 'leave';
        }
      }

      const hasRemark = Math.random() > 0.5;
      const hasAction = Math.random() > 0.7;

      // Mock photo URLs for demo
      const mockPhotoUrl = status === 'present'
        ? `http://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`
        : '';

      employees.push({
        id: `${baseEmp.id}_${currentDate}`,
        employeeId: baseEmp.id,
        name: baseEmp.name,
        department: baseEmp.department,
        position: baseEmp.position,
        isManager: baseEmp.isManager,
        isSupervisor: baseEmp.isSupervisor,
        status: status,
        checkInTime: status === 'present' ? '09:00 AM' : '',
        checkOutTime: status === 'present' ? '06:00 PM' : '',
        checkInPhoto: status === 'present' ? mockPhotoUrl : '',
        checkOutPhoto: status === 'present' ? mockPhotoUrl : '',
        site: siteName,
        siteName: siteName,
        date: currentDate,
        remark: hasRemark ? remarks[Math.floor(Math.random() * remarks.length)] : '',
        action: hasAction ? actions[Math.floor(Math.random() * actions.length)] : 'none',
        email: `demo${index}@example.com`,
        phone: `+123456789${index}`,
        employeeStatus: 'active',
        role: 'employee',
        shift: 'General',
        workingHours: '9:00 AM - 6:00 PM',
        employeeType: 'Full-time'
      });
    });
  }

  return employees;
};

// Calculate site deployment statistics
const calculateSiteDeploymentStats = (site: Site, employees: Employee[]): SiteDeploymentStats => {
  const managerRequirement = site.managerCount || 0;
  const supervisorRequirement = site.supervisorCount || 0;

  const staffRequirement = Array.isArray(site.staffDeployment)
    ? site.staffDeployment.reduce((total, item) => {
      const role = item.role?.toLowerCase() || '';
      if (!role.includes('manager') && !role.includes('supervisor')) {
        return total + (Number(item.count) || 0);
      }
      return total;
    }, 0)
    : 0;

  let managerCount = 0;
  let supervisorCount = 0;
  let staffCount = 0;

  // Count unique employees (not per day)
  const uniqueEmployeeIds = new Set<string>();
  employees.forEach(emp => {
    if (!uniqueEmployeeIds.has(emp.employeeId || emp.id)) {
      uniqueEmployeeIds.add(emp.employeeId || emp.id);
      if (emp.isManager) {
        managerCount++;
      } else if (emp.isSupervisor) {
        supervisorCount++;
      } else {
        staffCount++;
      }
    }
  });

  const totalStaff = managerCount + supervisorCount + staffCount;
  const dailyStaffRequirement = staffRequirement;
  const remainingStaff = Math.max(0, staffRequirement - staffCount);
  const isStaffFull = staffCount >= staffRequirement;

  return {
    totalStaff,
    managerCount,
    supervisorCount,
    staffCount,
    managerRequirement,
    supervisorRequirement,
    staffRequirement,
    dailyStaffRequirement,
    totalStaffRequirementForPeriod: dailyStaffRequirement,
    isStaffFull,
    remainingStaff
  };
};

// Calculate attendance data for a site for a given period
const calculateSiteAttendanceData = async (site: Site, startDate: string, endDate: string) => {
  const daysInPeriod = calculateDaysBetween(startDate, endDate);
  const isSingleDay = daysInPeriod === 1;

  let employees: Employee[] = [];
  try {
    employees = await generateEmployeeData(site.name, startDate, endDate);
  } catch (error) {
    console.error('Error fetching employee data:', error);
    employees = generateDemoEmployeeData(site.name, startDate, endDate);
  }

  const deploymentStats = calculateSiteDeploymentStats(site, employees);
  const dailyRequirement = deploymentStats.dailyStaffRequirement;
  const totalRequiredForPeriod = dailyRequirement * daysInPeriod;

  let totalPresentCount = 0;
  let totalAbsentCount = 0;
  let totalWeeklyOffCount = 0;
  let totalLeaveCount = 0;

  const dailyStats: { [date: string]: { present: number; absent: number; weeklyOff: number; leave: number; total: number } } = {};

  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = formatDate(date);
    dailyStats[dateStr] = { present: 0, absent: 0, weeklyOff: 0, leave: 0, total: 0 };
  }

  // Count attendance per date, excluding managers and supervisors
  employees.forEach(emp => {
    // Skip managers and supervisors for staff counts
    if (emp.isManager || emp.isSupervisor) return;

    const date = emp.date;
    if (!dailyStats[date]) {
      dailyStats[date] = { present: 0, absent: 0, weeklyOff: 0, leave: 0, total: 0 };
    }

    dailyStats[date].total++;

    // CRITICAL FIX: Only count as weekly-off if status is explicitly 'weekly-off'
    if (emp.status === 'present') {
      totalPresentCount++;
      dailyStats[date].present++;
    } else if (emp.status === 'absent') {
      totalAbsentCount++;
      dailyStats[date].absent++;
    } else if (emp.status === 'weekly-off') {
      totalWeeklyOffCount++;
      dailyStats[date].weeklyOff++;
    } else if (emp.status === 'leave') {
      totalLeaveCount++;
      dailyStats[date].leave++;
    } else {
      // Any other status (like undefined) counts as absent
      totalAbsentCount++;
      dailyStats[date].absent++;
    }
  });

  const totalRequiredAttendance = totalRequiredForPeriod;
  const totalPresentAttendance = totalPresentCount; // Only actual present counts, not including weekly-off
  const periodShortage = totalAbsentCount + totalLeaveCount;

  const singleDayPresent = Object.values(dailyStats)[0]?.present || 0;
  const singleDayWeeklyOff = Object.values(dailyStats)[0]?.weeklyOff || 0;
  const singleDayLeave = Object.values(dailyStats)[0]?.leave || 0;
  const singleDayAbsent = Object.values(dailyStats)[0]?.absent || 0;
  const singleDayTotalPresent = singleDayPresent; // Only actual present for daily view
  const singleDayOnSiteRequirement = dailyRequirement; // Weekly off doesn't reduce requirement for daily

  return {
    id: `${site._id}-${startDate}-${endDate}`,
    siteId: `${site._id}-${startDate}-${endDate}`,
    name: site.name,
    siteName: site.name,
    dailyRequirement,
    totalEmployees: dailyRequirement,
    deploymentStats,
    totalRequiredForPeriod,
    totalPresent: totalPresentCount,
    totalWeeklyOff: totalWeeklyOffCount,
    totalLeave: totalLeaveCount,
    totalAbsent: totalAbsentCount,
    present: totalPresentCount,
    weeklyOff: totalWeeklyOffCount,
    leave: totalLeaveCount,
    absent: totalAbsentCount,
    shortage: periodShortage,
    date: `${startDate} to ${endDate}`,
    daysInPeriod,
    totalRequiredAttendance,
    totalPresentAttendance,
    periodShortage,
    startDate,
    endDate,
    presentCount: totalPresentCount,
    absentCount: totalAbsentCount,
    weeklyOffCount: totalWeeklyOffCount,
    leaveCount: totalLeaveCount,
    durationTotalRequired: totalRequiredForPeriod,
    durationWeeklyOff: totalWeeklyOffCount,
    durationOnSiteRequirement: totalRequiredForPeriod - totalWeeklyOffCount,
    durationPresent: totalPresentCount,
    durationAbsent: totalAbsentCount + totalLeaveCount,
    avgDailyPresent: Math.round(totalPresentCount / daysInPeriod),
    avgDailyAbsent: Math.round((totalAbsentCount + totalLeaveCount) / daysInPeriod),
    avgDailyWeeklyOff: Math.round(totalWeeklyOffCount / daysInPeriod),
    avgDailyLeave: Math.round(totalLeaveCount / daysInPeriod),
    avgDailyTotalRequired: dailyRequirement,
    avgDailyOnSiteRequirement: dailyRequirement,
    dailyStats,
    singleDayPresent,
    singleDayWeeklyOff,
    singleDayLeave,
    singleDayAbsent,
    singleDayTotalPresent,
    singleDayShortage: singleDayAbsent + singleDayLeave,
    singleDayOnSiteRequirement,
    employees: employees || [],
    originalSite: site,
    isRealData: employees.length > 0 && employees[0]?.employeeId?.startsWith?.('DEMO') === false
  };
};

// Calculate department site data
const calculateDepartmentSiteData = async (site: Site, startDate: string, endDate: string, department: string) => {
  const siteData = await calculateSiteAttendanceData(site, startDate, endDate);

  const departmentEmployees = (siteData.employees || []).filter(emp => emp.department === department);

  let departmentPresent = 0;
  let departmentAbsent = 0;
  let departmentWeeklyOff = 0;
  let departmentLeave = 0;

  departmentEmployees.forEach(emp => {
    if (emp.isManager || emp.isSupervisor) return;

    if (emp.status === 'present') departmentPresent++;
    else if (emp.status === 'absent') departmentAbsent++;
    else if (emp.status === 'weekly-off') departmentWeeklyOff++;
    else if (emp.status === 'leave') departmentLeave++;
    else departmentAbsent++;
  });

  const departmentDailyRequirement = Math.round(departmentEmployees.filter(emp => !emp.isManager && !emp.isSupervisor).length / siteData.daysInPeriod);
  const departmentTotalRequired = departmentDailyRequirement * siteData.daysInPeriod;

  return {
    ...siteData,
    siteId: `${site._id}-${startDate}-${endDate}`,
    dailyRequirement: departmentDailyRequirement,
    totalEmployees: departmentDailyRequirement,
    totalRequiredForPeriod: departmentTotalRequired,
    totalPresent: departmentPresent,
    totalWeeklyOff: departmentWeeklyOff,
    totalLeave: departmentLeave,
    totalAbsent: departmentAbsent,
    present: departmentPresent,
    weeklyOff: departmentWeeklyOff,
    leave: departmentLeave,
    absent: departmentAbsent,
    employees: departmentEmployees,
    durationTotalRequired: departmentTotalRequired,
    durationWeeklyOff: departmentWeeklyOff,
    durationOnSiteRequirement: departmentTotalRequired - departmentWeeklyOff,
    durationPresent: departmentPresent,
    durationAbsent: departmentAbsent + departmentLeave
  };
};

interface SiteEmployeeDetailsProps {
  siteData: any;
  onBack: () => void;
  viewType: "site" | "department";
}

const SiteEmployeeDetails: React.FC<SiteEmployeeDetailsProps> = ({
  siteData,
  onBack,
  viewType,
}) => {
  const { role } = useRole();

  // ----- Employee table state (original) -----
  const [activeTab, setActiveTab] = useState<"all" | "present" | "absent" | "weekly-off">("all");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>(
    siteData?.startDate || new Date().toISOString().split("T")[0]
  );
  const [employees, setEmployees] = useState<any[]>(siteData?.employees || []);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyView, setDailyView] = useState<boolean>(siteData?.daysInPeriod === 1);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoType, setSelectedPhotoType] = useState<"checkin" | "checkout">("checkin");

  // ----- New tab state -----
  const [mainTab, setMainTab] = useState<
    "employees" | "machines" | "grooming" | "incidents" | "photos" | "shift"
  >("employees");

  // Machines
  const [machines, setMachines] = useState<FrontendMachine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [updatingMachine, setUpdatingMachine] = useState<string | null>(null);

  // Grooming
  const [groomingEmployees, setGroomingEmployees] = useState<any[]>([]);
  const [groomingRecords, setGroomingRecords] = useState<Map<string, any>>(new Map());
  const [loadingGrooming, setLoadingGrooming] = useState(false);

  // Incidents
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  // Cleaning photos
  const [cleaningPhotos, setCleaningPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Shift deployment
  const [shiftText, setShiftText] = useState<string>("");
 const [editShiftText, setEditShiftText] = useState("");
  const siteName = siteData?.siteName || siteData?.name;
  // Shift deployment state
const [todayShift, setTodayShift] = useState<string>("");
const [tomorrowShift, setTomorrowShift] = useState<string>("");
const [editTodayText, setEditTodayText] = useState<string>("");
const [editTomorrowText, setEditTomorrowText] = useState<string>("");
const [editingShift, setEditingShift] = useState(false);
const [loadingShift, setLoadingShift] = useState(false);
// Grooming count for this site
const [groomingCount, setGroomingCount] = useState(0);
const [loadingGroomingCount, setLoadingGroomingCount] = useState(false);
const [isMobileView, setIsMobileView] = useState(false);
const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
// Remark editing for machines (inside SiteEmployeeDetails)
const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
const [remarkValue, setRemarkValue] = useState<string>("");
const [savingRemarkId, setSavingRemarkId] = useState<string | null>(null);

const handleSaveRemark = async (machineId: string) => {
  setSavingRemarkId(machineId);
  try {
    await machineService.updateMachine(machineId, { remark: remarkValue });
    setMachines(prev =>
      prev.map(m => (m._id === machineId ? { ...m, remark: remarkValue } : m))
    );
    toast.success("Remark saved");
    setEditingRemarkId(null);
  } catch (error) {
    toast.error("Failed to save remark");
  } finally {
    setSavingRemarkId(null);
  }
};

const startEditingRemark = (machine: FrontendMachine) => {
  setEditingRemarkId(machine._id);
  setRemarkValue(machine.remark || "");
};
const toggleExpand = (id: string) => setExpandedEmployeeId(prev => prev === id ? null : id);

const fetchGroomingCount = async () => {
  if (!siteName || mainTab !== "employees") return;
  setLoadingGroomingCount(true);
  try {
    const res = await apiClient.get('/grooming', {
      params: { date: selectedDate, site: siteName }
    });
    const records = res.data?.data || [];
    // records is an array of grooming records for employees of this site on selectedDate
    // We consider "improper" if any required item is missing
    // For simplicity, count employees that have at least one missing grooming item
    let improperCount = 0;
    records.forEach((rec: any) => {
      // Check required fields based on gender (we don't have gender here, use basic)
      const missing = !rec.shirt || !rec.pant || !rec.cap || !rec.shoes || !rec.idCard;
      if (missing) improperCount++;
    });
    setGroomingCount(improperCount);
  } catch (error) {
    console.error("Error fetching grooming count:", error);
    setGroomingCount(0);
  } finally {
    setLoadingGroomingCount(false);
  }
};
// ---- Add this helper inside SiteEmployeeDetails ----
const getDerivedAttendanceStatus = (employee: any) => {
  const status = employee.status;
  const checkInTime = employee.checkInTime;
  if (status === 'weekly-off' || status === 'leave') {
    return { status, isLate: false };
  }
  let isLate = false;
  if (checkInTime && checkInTime !== '-') {
    const timeStr = checkInTime;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      const totalMinutes = hours * 60 + minutes;
      isLate = totalMinutes > 9 * 60 + 30;
    }
  }
  let derivedStatus = status;
  if (employee.checkOutTime && employee.totalHours !== undefined) {
    const totalHours = employee.totalHours || 0;
    if (totalHours < 4) derivedStatus = 'absent';
    else if (totalHours < 9) derivedStatus = 'half-day';
    else derivedStatus = 'present';
  }
  return { status: derivedStatus, isLate };
};
useEffect(() => {
  const checkMobile = () => setIsMobileView(window.innerWidth < 768);
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
// Call it whenever selectedDate or siteName changes
useEffect(() => {
  if (siteName && mainTab === "employees") {
    fetchGroomingCount();
  }
}, [selectedDate, siteName, mainTab]);
  // ----- Data fetching for tabs -----
  const fetchMachines = async () => {
    setLoadingMachines(true);
    try {
      const allMachines = await machineService.getMachines();
      const siteMachines = allMachines.filter((m) => m.location === siteName);
      setMachines(siteMachines);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load machines");
    } finally {
      setLoadingMachines(false);
    }
  };

  const fetchGrooming = async () => {
  setLoadingGrooming(true);
  try {
    // Get employees of this site
    const allEmployeesRes = await apiClient.get('/employees', { params: { limit: 1000 } });
    const allEmployees = allEmployeesRes.data?.data || allEmployeesRes.data || [];
    const siteEmployees = allEmployees.filter((emp: any) => emp.siteName === siteName);
    setGroomingEmployees(siteEmployees);

    // Fetch grooming records for the selected date AND site
    const groomingRes = await apiClient.get('/grooming', {
      params: { date: selectedDate, site: siteName }   // ← ADD site parameter
    });

    const records = groomingRes.data?.data || [];
    const map = new Map();
    records.forEach((r: any) => map.set(r.employeeId, r));
    setGroomingRecords(map);
  } catch (error) {
    toast.error("Failed to load grooming status");
  } finally {
    setLoadingGrooming(false);
  }
};
    

  const fetchIncidents = async () => {
    setLoadingIncidents(true);
    try {
     const incidentRes = await apiClient.get('/incidents', { params: { site: siteName } });
      setIncidents(incidentRes.data?.data || []);
    } catch (error) {
      toast.error("Failed to load incidents");
    } finally {
      setLoadingIncidents(false);
    }
  };

 const fetchCleaningPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const photosRes = await apiClient.get('/cleaning-photos', { params: { site: siteName } });
      setCleaningPhotos(photosRes.data?.data || []);
    } catch (error) {
      toast.error("Failed to load cleaning photos");
    } finally {
      setLoadingPhotos(false);
    }
  };



const fetchShiftDeployment = async () => {
  if (!siteName) return;
  setLoadingShift(true);
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const [todayRes, tomorrowRes] = await Promise.all([
      apiClient.get('/shifts/site-deployment', { params: { site: siteName, date: today } }),
      apiClient.get('/shifts/site-deployment', { params: { site: siteName, date: tomorrow } })
    ]);

    const todayText = todayRes.data?.data?.text || 'No shift deployment available.';
    const tomorrowText = tomorrowRes.data?.data?.text || 'No shift deployment available.';

    setTodayShift(todayText);
    setTomorrowShift(tomorrowText);
    setEditTodayText(todayText);
    setEditTomorrowText(tomorrowText);
  } catch (error) {
    setTodayShift('No shift deployment available.');
    setTomorrowShift('No shift deployment available.');
    setEditTodayText('');
    setEditTomorrowText('');
  } finally {
    setLoadingShift(false);
  }
};

const saveShiftDeployment = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Save today
    await apiClient.post('/shifts/site-deployment', { site: siteName, date: today, text: editTodayText });
    // Save tomorrow
    await apiClient.post('/shifts/site-deployment', { site: siteName, date: tomorrow, text: editTomorrowText });

    setTodayShift(editTodayText);
    setTomorrowShift(editTomorrowText);
    setEditingShift(false);
    toast.success('Shift deployment saved');
  } catch (error) {
    toast.error('Failed to save shift deployment');
  }
};
  // Load data when tab changes
  useEffect(() => {
    if (mainTab === "machines") fetchMachines();
    if (mainTab === "grooming") fetchGrooming();
    if (mainTab === "incidents") fetchIncidents();
    if (mainTab === "photos") fetchCleaningPhotos();
    if (mainTab === "shift") fetchShiftDeployment();
  }, [mainTab, selectedDate, siteName]);

  // Update machine status (allowed for admin/manager/superadmin)
  const updateMachineStatus = async (machineId: string, newStatus: string) => {
  const machine = machines.find((m) => m._id === machineId);
  if (!machine) return;
  if (!window.confirm(`Change status of "${machine.name}" to ${newStatus}?`)) return;
  setUpdatingMachine(machineId);
  try {
    // Preserve the existing remark
    await machineService.updateMachine(machineId, {
      status: newStatus,
      remark: machine.remark || ""
    });
    setMachines((prev) =>
      prev.map((m) =>
        m._id === machineId ? { ...m, status: newStatus } : m
      )
    );
    toast.success(`Status updated to ${newStatus}`);
  } catch (error) {
    toast.error("Update failed");
  } finally {
    setUpdatingMachine(null);
  }
};

  // ----- Employee table logic (unchanged from your original) -----
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    employees.forEach((emp) => {
      if (emp.date) dates.add(emp.date);
    });
    return Array.from(dates).sort();
  }, [employees]);

  useEffect(() => {
    if (siteData?.employees) {
      setEmployees(siteData.employees || []);
      if (siteData.daysInPeriod === 1) {
        setDailyView(true);
        setSelectedDate(siteData.startDate);
      } else {
        setDailyView(false);
      }
    }
  }, [siteData?.employees, siteData?.daysInPeriod, siteData?.startDate]);

  const filteredEmployeesByDate = useMemo(() => {
    if (dailyView && selectedDate) {
      return employees.filter((emp) => emp.date === selectedDate);
    }
    return employees;
  }, [employees, dailyView, selectedDate]);

  const allEmployees = filteredEmployeesByDate;
  const presentEmployees = allEmployees.filter((emp: any) => emp.status === "present");
  const absentEmployees = allEmployees.filter((emp: any) => emp.status === "absent");
  const weeklyOffEmployees = allEmployees.filter((emp: any) => emp.status === "weekly-off");
  const leaveEmployees = allEmployees.filter((emp: any) => emp.status === "leave");

  const filteredEmployees = useMemo(() => {
    let list: any[] = [];
    if (activeTab === "present") list = presentEmployees;
    else if (activeTab === "absent") list = [...absentEmployees, ...leaveEmployees];
    else if (activeTab === "weekly-off") list = weeklyOffEmployees;
    else list = allEmployees;
    if (employeeSearch) {
      list = list.filter((emp) =>
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase())
      );
    }
    return list;
  }, [activeTab, employeeSearch, allEmployees, presentEmployees, absentEmployees, weeklyOffEmployees, leaveEmployees]);

  const itemsPerPage = 20;
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const refreshEmployeeData = async () => {
    setRefreshing(true);
    const refreshed = await generateEmployeeData(
      siteData?.siteName || siteData?.name,
      siteData?.startDate,
      siteData?.endDate
    );
    setEmployees(refreshed);
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  const updateEmployeeAction = (id: string, action: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, action: action === "none" ? "" : action } : emp
      )
    );
  };

  const updateEmployeeRemark = (id: string, remark: string) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, remark } : emp))
    );
  };

  const handleExport = (detailed = false) => {
    const headers = detailed
      ? [
          "Employee ID",
          "Name",
          "Department",
          "Position",
          "Status",
          "Check In",
          "Check Out",
          "Check In Photo URL",
          "Check Out Photo URL",
          "Email",
          "Phone",
          "Employee Type",
          "Shift",
          "Working Hours",
          "Reporting Manager",
          "Date of Joining",
          "Action",
          "Remark",
          "Site",
          "Date",
          "Role Type",
        ]
      : [
          "Employee ID",
          "Name",
          "Department",
          "Position",
          "Status",
          "Check In",
          "Check Out",
          "Has Check In Photo",
          "Has Check Out Photo",
          "Action",
          "Remark",
          "Site",
          "Date",
          "Role Type",
        ];
    const rows = filteredEmployees.map((emp) => {
      const base = [
        emp.employeeId,
        emp.name,
        emp.department,
        emp.position,
        emp.status === "weekly-off"
          ? "Weekly Off"
          : emp.status === "leave"
          ? "Leave"
          : emp.status.charAt(0).toUpperCase() + emp.status.slice(1),
        emp.checkInTime || "-",
        emp.checkOutTime || "-",
        emp.checkInPhoto ? "Yes" : "No",
        emp.checkOutPhoto ? "Yes" : "No",
        emp.action || "-",
        emp.remark || "",
        emp.site,
        emp.date,
        emp.isManager ? "Manager" : emp.isSupervisor ? "Supervisor" : "Staff",
      ];
      if (detailed) {
        return [
          ...base.slice(0, 8),
          emp.email || "-",
          emp.phone || "-",
          emp.employeeType || "Full-time",
          emp.shift || "General",
          emp.workingHours || "9-6",
          emp.reportingManager || "-",
          emp.dateOfJoining ? formatDateDisplay(emp.dateOfJoining) : "-",
          emp.action || "-",
          emp.remark || "",
          emp.site,
          emp.date,
          emp.isManager ? "Manager" : emp.isSupervisor ? "Supervisor" : "Staff",
        ];
      }
      return base;
    });
    const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `employees_${siteData.name}_${detailed ? "details" : "summary"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Exported");
  };


  // Add this function to SiteEmployeeDetails
const handleExportFullMonth = async () => {
  if (!siteData || !siteData.siteName) {
    toast.error('No site data available');
    return;
  }

  try {
    toast.loading('Fetching full month data...');

    // Get the month from startDate
    const month = siteData.startDate?.substring(0, 7) || new Date().toISOString().substring(0, 7);
    const monthStart = `${month}-01`;
    const monthEnd = new Date(
      parseInt(month.split('-')[0]),
      parseInt(month.split('-')[1]),
      0
    ).toISOString().split('T')[0];

    // ✅ FETCH FULL MONTH DATA
    const fullMonthEmployees = await generateEmployeeData(
      siteData.siteName || siteData.name,
      monthStart,
      monthEnd
    );

    if (!fullMonthEmployees || fullMonthEmployees.length === 0) {
      toast.dismiss();
      toast.error('No data found for this month');
      return;
    }

    toast.dismiss();

    // Group employees by employeeId to get unique staff
    const uniqueEmployees = new Map();
    fullMonthEmployees.forEach((emp: any) => {
      if (emp.employeeId && !uniqueEmployees.has(emp.employeeId)) {
        uniqueEmployees.set(emp.employeeId, {
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department,
          position: emp.position,
          isManager: emp.isManager || false,
          isSupervisor: emp.isSupervisor || false,
          site: emp.site || siteData.siteName || siteData.name,
          dates: []
        });
      }
    });

    // Count attendance per employee
    const attendanceCounts = new Map();
    fullMonthEmployees.forEach((emp: any) => {
      const key = emp.employeeId || emp.id;
      if (!attendanceCounts.has(key)) {
        attendanceCounts.set(key, { present: 0, absent: 0, weeklyOff: 0, leave: 0, total: 0 });
      }
      const counts = attendanceCounts.get(key);
      counts.total++;
      
      if (emp.status === 'present') {
        counts.present++;
      } else if (emp.status === 'weekly-off') {
        counts.weeklyOff++;
      } else if (emp.status === 'leave') {
        counts.leave++;
      } else {
        counts.absent++;
      }
    });

    // Get days in month
    const daysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();

    // Calculate totals
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalWeeklyOff = 0;
    let totalLeave = 0;
    let totalManagers = 0;
    let totalSupervisors = 0;
    let totalStaff = 0;

    const rows: string[][] = [];

    uniqueEmployees.forEach((emp: any) => {
      const counts = attendanceCounts.get(emp.employeeId) || { present: 0, absent: 0, weeklyOff: 0, leave: 0, total: 0 };
      
      if (emp.isManager) {
        totalManagers++;
      } else if (emp.isSupervisor) {
        totalSupervisors++;
      } else {
        totalStaff++;
      }

      totalPresent += counts.present;
      totalAbsent += counts.absent;
      totalWeeklyOff += counts.weeklyOff;
      totalLeave += counts.leave;

      const attendanceRate = daysInMonth > 0 ? ((counts.present / daysInMonth) * 100).toFixed(1) + '%' : '0.0%';

      rows.push([
        `"${emp.employeeId}"`,
        `"${emp.name}"`,
        `"${emp.department}"`,
        `"${emp.position}"`,
        `"${emp.isManager ? 'Manager' : emp.isSupervisor ? 'Supervisor' : 'Staff'}"`,
        counts.present.toString(),
        counts.absent.toString(),
        counts.weeklyOff.toString(),
        counts.leave.toString(),
        daysInMonth.toString(),
        attendanceRate
      ]);
    });

    // Calculate totals
    const totalEmployees = uniqueEmployees.size;
    const totalRequired = totalEmployees * daysInMonth;
    const totalAbsentAll = totalAbsent + totalLeave;

    // Sort rows by name
    rows.sort((a, b) => a[1].localeCompare(b[1]));

    // Headers
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Position',
      'Role',
      'Present',
      'Absent',
      'Weekly Off',
      'Leave',
      'Total Working Days',
      'Attendance Rate'
    ];

    // Summary Row
    const overallRate = totalRequired > 0 ? ((totalPresent / totalRequired) * 100).toFixed(1) + '%' : '0.0%';
    const summaryRow = [
      `"📊 GRAND TOTAL"`,
      `"${siteData.siteName || siteData.name}"`,
      `"All Departments"`,
      `"${totalEmployees} Employees"`,
      `"M:${totalManagers} S:${totalSupervisors} St:${totalStaff}"`,
      totalPresent.toString(),
      totalAbsentAll.toString(),
      totalWeeklyOff.toString(),
      totalLeave.toString(),
      totalRequired.toString(),
      overallRate
    ];

    const emptyRow = headers.map(() => '');

    // Additional stats row
    const statsRow = [
      `"📈 MONTHLY STATS"`,
      `"${month}"`,
      `"${daysInMonth} days"`,
      `"Daily Req: ${totalEmployees}"`,
      `"Total Required: ${totalRequired}"`,
      `"Attendance Rate: ${overallRate}"`,
      '', '', '', '', ''
    ];

    // Create CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      emptyRow.join(','),
      ['=== SUMMARY ===', '', '', '', '', '', '', '', '', '', ''],
      summaryRow.join(','),
      statsRow.join(',')
    ].join('\n');

    // Download
    const filename = `Attendance_${(siteData.siteName || siteData.name).replace(/\s/g, '_')}_${month}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Full month data exported to ${filename} with summary`);

  } catch (error) {
    console.error('Error exporting full month:', error);
    toast.dismiss();
    toast.error('Failed to export full month data');
  }
};

  const handleViewPhoto = (photoUrl: string | null | undefined, type: "checkin" | "checkout") => {
    if (photoUrl) {
      setSelectedPhoto(photoUrl);
      setSelectedPhotoType(type);
      setPhotoModalOpen(true);
    } else {
      toast.error("No photo available");
    }
  };
// Export old incidents (all except selected date)
const exportOldIncidents = () => {
  const oldIncidents = incidents.filter(inc => inc.date !== selectedDate);
  if (oldIncidents.length === 0) {
    toast.info("No old incidents to export");
    return;
  }
  const headers = ['Date', 'Site', 'Type', 'Description', 'Employee ID', 'Photo URL'];
  const rows = oldIncidents.map(inc => [
    inc.date,
    inc.site,
    inc.type,
    inc.description,
    inc.employeeId || '',
    inc.photoUrl || ''
  ]);
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `incidents_old_${selectedDate}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast.success("Old incidents exported");
};

// Export old cleaning photos (all except selected date)
const exportOldPhotos = () => {
  const oldPhotos = cleaningPhotos.filter(photo => !photo.createdAt?.startsWith(selectedDate));
  if (oldPhotos.length === 0) {
    toast.info("No old photos to export");
    return;
  }
  const headers = ['Date', 'Site', 'Photo URL', 'Remark'];
  const rows = oldPhotos.map(p => [
  new Date(p.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }),
  p.site,
  p.photoUrl,
  p.remark || ''
]);
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cleaning_photos_old_${selectedDate}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast.success("Old cleaning photos exported");
};


const renderEmployeesTab = () => (
  <div className="space-y-4">
    {/* Date navigation & search */}
    <div className="flex flex-wrap justify-between items-center gap-2">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-36 h-8 text-sm"
        />
        <Button variant="outline" size="sm" onClick={() => setDailyView(false)} className="h-8">
          Cumulative
        </Button>
      </div>
      <div className="relative w-64">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={employeeSearch}
          onChange={(e) => {
            setEmployeeSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-7 h-8 text-sm"
        />
      </div>
    </div>

    {/* Tabs */}
    <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-md">
      <Button variant={activeTab === "all" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("all")}>
        All ({allEmployees.length})
      </Button>
      <Button variant={activeTab === "present" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("present")}>
        Present ({presentEmployees.length})
      </Button>
      <Button variant={activeTab === "weekly-off" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("weekly-off")}>
        WO ({weeklyOffEmployees.length})
      </Button>
      <Button variant={activeTab === "absent" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("absent")}>
        Absent ({absentEmployees.length + leaveEmployees.length})
      </Button>
    </div>

    {/* Mobile Card View */}
    {isMobileView ? (
      <div className="space-y-3">
        {paginatedEmployees.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No employees found</p>
        ) : (
          paginatedEmployees.map((emp: any) => {
            const isExpanded = expandedEmployeeId === emp.id;
            const { status: displayStatus, isLate } = getDerivedAttendanceStatus(emp);
            return (
              <Card key={emp.id} className="p-3">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{emp.name}</h4>
                    <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                    <p className="text-xs">{emp.department} • {emp.position}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggleExpand(emp.id)}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Status & Action Buttons */}
                <div className="mt-2 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        displayStatus === "present" ? "default" :
                        displayStatus === "half-day" ? "secondary" :
                        displayStatus === "weekly-off" ? "outline" :
                        "destructive"
                      }
                      className="text-xs"
                    >
                      {displayStatus === "weekly-off" ? "WO" :
                       displayStatus === "half-day" ? "Half Day" :
                       displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                    </Badge>
                    {isLate && (
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">
                        Late
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => updateEmployeeAction(emp.id, "fine")}>Fine</Button>
                    <Button variant="outline" size="sm" onClick={() => updateEmployeeRemark(emp.id, "Late")}>Mark</Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t text-sm space-y-1">
                    <div className="flex justify-between"><span>Check In:</span><span>{emp.checkInTime || "-"}</span></div>
                    <div className="flex justify-between"><span>Check Out:</span><span>{emp.checkOutTime || "-"}</span></div>
                    <div className="flex justify-between"><span>Role:</span><span>{emp.isManager ? "Manager" : emp.isSupervisor ? "Supervisor" : "Staff"}</span></div>
                    {emp.checkInPhoto && (
                      <button onClick={() => handleViewPhoto(emp.checkInPhoto, "checkin")} className="text-blue-500 text-xs flex items-center gap-1">
                        <Camera className="h-3 w-3" /> Check-in Photo
                      </button>
                    )}
                    {emp.checkOutPhoto && (
                      <button onClick={() => handleViewPhoto(emp.checkOutPhoto, "checkout")} className="text-blue-500 text-xs flex items-center gap-1">
                        <Camera className="h-3 w-3" /> Check-out Photo
                      </button>
                    )}
                    <div className="mt-2">
                      <Select value={emp.action || "none"} onValueChange={(v) => updateEmployeeAction(emp.id, v)}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="fine">Fine</SelectItem>
                          <SelectItem value="advance">Advance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={emp.remark || ""}
                      onChange={(e) => updateEmployeeRemark(emp.id, e.target.value)}
                      placeholder="Remark"
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    ) : (
      /* Desktop Table */
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left text-xs">ID</th>
              <th className="p-2 text-left text-xs">Name</th>
              <th className="p-2 text-left text-xs">Dept</th>
              <th className="p-2 text-left text-xs">Position</th>
              <th className="p-2 text-left text-xs">Role</th>
              <th className="p-2 text-left text-xs">Status</th>
              <th className="p-2 text-left text-xs">Check In</th>
              <th className="p-2 text-left text-xs">Check Out</th>
              <th className="p-2 text-left text-xs">In Photo</th>
              <th className="p-2 text-left text-xs">Out Photo</th>
              <th className="p-2 text-left text-xs">Date</th>
              <th className="p-2 text-left text-xs">Action</th>
              <th className="p-2 text-left text-xs">Remark</th>
            </tr>
          </thead>
          <tbody>
            {refreshing ? (
              <tr><td colSpan={13} className="p-4 text-center"><Loader2 className="animate-spin h-5 w-5 mx-auto" /></td></tr>
            ) : paginatedEmployees.length === 0 ? (
              <tr><td colSpan={13} className="p-4 text-center text-muted-foreground">No employees found</td></tr>
            ) : (
              paginatedEmployees.map((emp: any) => {
                const { status: displayStatus, isLate } = getDerivedAttendanceStatus(emp);
                return (
                  <tr key={emp.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-xs font-mono">{emp.employeeId}</td>
                    <td className="p-2 font-medium">{emp.name}</td>
                    <td className="p-2"><Badge variant="outline" className="text-xs">{emp.department}</Badge></td>
                    <td className="p-2 text-xs">{emp.position}</td>
                    <td className="p-2">{emp.isManager ? <Badge className="bg-amber-100 text-amber-800 text-xs">Mgr</Badge> : emp.isSupervisor ? <Badge className="bg-teal-100 text-teal-800 text-xs">Sup</Badge> : <Badge className="bg-cyan-100 text-cyan-800 text-xs">Staff</Badge>}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            displayStatus === "present" ? "default" :
                            displayStatus === "half-day" ? "secondary" :
                            displayStatus === "weekly-off" ? "outline" :
                            "destructive"
                          }
                          className="text-xs"
                        >
                          {displayStatus === "weekly-off" ? "WO" :
                           displayStatus === "half-day" ? "Half Day" :
                           displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                        </Badge>
                        {isLate && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">
                            Late
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-xs">{emp.checkInTime || "-"}</td>
                    <td className="p-2 text-xs">{emp.checkOutTime || "-"}</td>
                    <td className="p-2">{emp.checkInPhoto ? <Button variant="ghost" size="sm" onClick={() => handleViewPhoto(emp.checkInPhoto, "checkin")} className="h-6 px-1"><Camera className="h-3 w-3" /></Button> : "-"}</td>
                    <td className="p-2">{emp.checkOutPhoto ? <Button variant="ghost" size="sm" onClick={() => handleViewPhoto(emp.checkOutPhoto, "checkout")} className="h-6 px-1"><Camera className="h-3 w-3" /></Button> : "-"}</td>
                    <td className="p-2 text-xs">{emp.date ? formatDateDisplay(emp.date) : "-"}</td>
                    <td className="p-2">
                      <Select value={emp.action || "none"} onValueChange={(v) => updateEmployeeAction(emp.id, v)}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="fine">Fine</SelectItem>
                          <SelectItem value="advance">Advance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2"><Input value={emp.remark || ""} onChange={(e) => updateEmployeeRemark(emp.id, e.target.value)} placeholder="Remark" className="h-7 text-xs" /></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    )}

    {/* Pagination */}
    {totalPages > 1 && (
      <div className="flex justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
        <span className="py-1 px-2 text-sm">Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Last</Button>
      </div>
    )}
  </div>
);

  // ----- Render new tabs -----
const renderMachinesTab = () => {
  return (
    <div>
      {/* Refresh button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">Machines</h3>
        <Button variant="outline" size="sm" onClick={fetchMachines} disabled={loadingMachines}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loadingMachines ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loadingMachines ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
      ) : machines.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Cpu className="h-12 w-12 mx-auto mb-2" />
          <p>No machines found for this site.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Machine Name</th>
                <th className="p-3 text-left font-medium">Location</th>
                <th className="p-3 text-left font-medium">Manufacturer</th>
                <th className="p-3 text-left font-medium">Model No</th>
                <th className="p-3 text-left font-medium">Serial No</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Remark</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((machine) => {
                const isEditing = editingRemarkId === machine._id;

                return (
                  <tr key={machine._id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{machine.name}</td>
                    <td className="p-3">{machine.location || '-'}</td>
                    <td className="p-3">{machine.manufacturer || '-'}</td>
                    <td className="p-3">{machine.model || '-'}</td>
                    <td className="p-3">{machine.serialNumber || '-'}</td>
                    <td className="p-3">
                      <Badge variant={machine.status === 'operational' ? 'default' : 'destructive'} className="text-xs">
                        {machine.status === 'operational' ? 'Operational' : 'Under Maintenance'}
                      </Badge>
                    </td>

                    {/* Remark column */}
                    <td className="p-3">
                      {role === 'supervisor' ? (
                        // Supervisor can edit remark
                        isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={remarkValue}
                              onChange={(e) => setRemarkValue(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Enter remark..."
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveRemark(machine._id)}
                              disabled={savingRemarkId === machine._id}
                            >
                              {savingRemarkId === machine._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingRemarkId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{machine.remark || "-"}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingRemark(machine)}
                              title="Edit remark"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      ) : (
                        // Admin / Manager / Superadmin – view only
                        <span className="text-sm">{machine.remark || "-"}</span>
                      )}
                    </td>

                    {/* Actions column */}
                    <td className="p-3">
                      {/* Status update dropdown – allowed for admin, manager, superadmin, and supervisor */}
                      {["superadmin", "admin", "manager", "supervisor"].includes(role) && (
                        <Select
                          value={machine.status}
                          onValueChange={(value) => updateMachineStatus(machine._id, value)}
                          disabled={updatingMachine === machine._id}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue placeholder="Change status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operational">Operational</SelectItem>
                            <SelectItem value="maintenance">Under Maintenance</SelectItem>
                            <SelectItem value="out-of-service">Out of Service</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {!["superadmin", "admin", "manager", "supervisor"].includes(role) && (
                        <span className="text-xs text-muted-foreground">Read only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

  const renderGroomingTab = () => (
    <div>
      {loadingGrooming ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin" />
        </div>
      ) : groomingEmployees.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Shirt className="h-12 w-12 mx-auto mb-2" />
          <p>No employees found for this site.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2">Employee</th>
                <th>Shirt</th>
                <th>Pant</th>
                <th>Cap</th>
                <th>Shoes</th>
                <th>ID Card</th>
                <th>Nails</th>
                <th>Shaving</th>
                <th>Haircut</th>
                <th>Apron</th>
                <th>Westcoat</th>
              </tr>
            </thead>
            <tbody>
              {groomingEmployees.map((emp) => {
                const rec = groomingRecords.get(emp._id) || {};
                const check = (value: boolean) =>
                  value ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-400" />;
                return (
                  <tr key={emp._id} className="border-b">
                    <td className="p-2">
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
                    </td>
                    <td className="p-2 text-center">{check(rec.shirt)}</td>
                    <td className="p-2 text-center">{check(rec.pant)}</td>
                    <td className="p-2 text-center">{check(rec.cap)}</td>
                    <td className="p-2 text-center">{check(rec.shoes)}</td>
                    <td className="p-2 text-center">{check(rec.idCard)}</td>
                    <td className="p-2 text-center">{check(rec.nails)}</td>
                    <td className="p-2 text-center">{check(rec.shaving)}</td>
                    <td className="p-2 text-center">{check(rec.haircut)}</td>
                    <td className="p-2 text-center">{check(rec.apron)}</td>
                    <td className="p-2 text-center">{check(rec.westcoat)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

const renderIncidentsTab = () => {
  if (loadingIncidents) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;
  }

  const incidentsForDate = incidents.filter(inc => inc.date === selectedDate);
  const oldIncidentsCount = incidents.filter(inc => inc.date !== selectedDate).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Incidents on {formatDateDisplay(selectedDate)}</h3>
        {oldIncidentsCount > 0 && (
          <Button variant="outline" size="sm" onClick={exportOldIncidents}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Export Old ({oldIncidentsCount})
          </Button>
        )}
      </div>
      {incidentsForDate.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-2" />
          <p>No incidents reported for this site on {formatDateDisplay(selectedDate)}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidentsForDate.map((inc) => (
            <Card key={inc._id} className="p-3">
              <div className="flex justify-between">
                <Badge variant={inc.type === "accident" ? "destructive" : "default"}>
                  {inc.type}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatDateDisplay(inc.date)}</span>
              </div>
              <p className="text-sm mt-1">{inc.description}</p>
              {inc.employeeId && <p className="text-xs text-muted-foreground">Employee: {inc.employeeId}</p>}
              {inc.photoUrl && (
                <img
                  src={inc.photoUrl}
                  alt="Incident"
                  className="h-20 w-20 object-cover rounded mt-2 cursor-pointer"
                  onClick={() => {
                    setSelectedPhoto(inc.photoUrl);
                    setSelectedPhotoType("checkin");
                    setPhotoModalOpen(true);
                  }}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

  const renderPhotosTab = () => {
  if (loadingPhotos) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;
  }

  const photosForDate = cleaningPhotos.filter(photo => photo.createdAt?.startsWith(selectedDate));
  const oldPhotosCount = cleaningPhotos.filter(photo => !photo.createdAt?.startsWith(selectedDate)).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Cleaning Photos on {formatDateDisplay(selectedDate)}</h3>
        {oldPhotosCount > 0 && (
          <Button variant="outline" size="sm" onClick={exportOldPhotos}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Export Old ({oldPhotosCount})
          </Button>
        )}
      </div>
      {photosForDate.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Images className="h-12 w-12 mx-auto mb-2" />
          <p>No cleaning photos uploaded for this site on {formatDateDisplay(selectedDate)}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photosForDate.map((photo) => (
            <Card
              key={photo._id}
              className="p-2 cursor-pointer"
              onClick={() => {
                setSelectedPhoto(photo.photoUrl);
                setSelectedPhotoType("checkin");
                setPhotoModalOpen(true);
              }}
            >
              <img src={photo.photoUrl} alt="Cleaning" className="w-full h-32 object-cover rounded" />
              {photo.remark && <p className="text-xs mt-1 truncate">{photo.remark}</p>}
              <p className="text-[10px] text-muted-foreground">
  {new Date(photo.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}
</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const renderShiftTab = () => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <Card>
      <CardContent className="p-4">
        {editingShift ? (
          // Edit mode
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Today ({today})</h3>
              <Textarea
                value={editTodayText}
                onChange={(e) => setEditTodayText(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Tomorrow ({tomorrow})</h3>
              <Textarea
                value={editTomorrowText}
                onChange={(e) => setEditTomorrowText(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveShiftDeployment} size="sm">Save</Button>
              <Button variant="outline" onClick={() => setEditingShift(false)} size="sm">Cancel</Button>
            </div>
          </div>
        ) : (
          // View mode – two columns
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Today ({today})</h4>
                <p className="whitespace-pre-wrap text-sm">{todayShift || 'No deployment set.'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Tomorrow ({tomorrow})</h4>
                <p className="whitespace-pre-wrap text-sm">{tomorrowShift || 'No deployment set.'}</p>
              </div>
            </div>
            {(role === 'superadmin' || role === 'admin' || role === 'manager') && (
              <Button variant="outline" size="sm" onClick={() => setEditingShift(true)}>
                Edit Shift Deployment
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
  // ----- Main render -----
  if (!siteData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Site Data...</h2>
          <p className="text-gray-600 mb-4">Please wait while site data is being loaded.</p>
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">{siteData.name || siteData.siteName} - Details</h1>
            <p className="text-xs text-muted-foreground">
              {formatDateDisplay(siteData.startDate)} to {formatDateDisplay(siteData.endDate)} •{" "}
              {viewType === "department" ? "Department View" : "Site View"}
              {siteData.isRealData && <span className="ml-1 text-green-600 text-xs">✓ Real Data</span>}
            </p>
          </div>
        </div>
<div className="flex gap-2 items-center flex-wrap">
  <Button variant="outline" size="sm" onClick={refreshEmployeeData} disabled={refreshing}>
    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
  </Button>
  <Button variant="outline" size="sm" onClick={() => handleExport(false)}>
    <Download className="h-4 w-4 mr-1" /> Summary
  </Button>
  <Button variant="default" size="sm" onClick={() => handleExport(true)}>
    <FileText className="h-4 w-4 mr-1" /> Details
  </Button>
  {/* ✅ ADD THIS BUTTON */}
  <Button 
    variant="default" 
    size="sm" 
    onClick={handleExportFullMonth}
    disabled={employees.length === 0}
    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
  >
    <FileSpreadsheet className="h-4 w-4" />
    Export Full Month
  </Button>
  <Badge variant="outline" className="bg-yellow-50 ml-auto">
    Grooming issues: {groomingCount}
  </Badge>
</div>
      </div>
{/* Feature Blocks (like supervisor dashboard) */}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4">
  <Card
    className="cursor-pointer hover:shadow-md transition-all"
    onClick={() => setMainTab("employees")}
  >
    <CardContent className="p-2 flex flex-col items-center text-center">
      <div className="p-2 rounded-full bg-blue-500 text-white mb-1">
        <Users className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium">Employees</span>
    </CardContent>
  </Card>
  <Card
    className="cursor-pointer hover:shadow-md transition-all"
    onClick={() => setMainTab("machines")}
  >
    <CardContent className="p-2 flex flex-col items-center text-center">
      <div className="p-2 rounded-full bg-green-500 text-white mb-1">
        <Cpu className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium">Machines</span>
    </CardContent>
  </Card>
  <Card
    className="cursor-pointer hover:shadow-md transition-all"
    onClick={() => setMainTab("grooming")}
  >
    <CardContent className="p-2 flex flex-col items-center text-center">
      <div className="p-2 rounded-full bg-purple-500 text-white mb-1">
        <Shirt className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium">Grooming</span>
    </CardContent>
  </Card>
  <Card
    className="cursor-pointer hover:shadow-md transition-all"
    onClick={() => setMainTab("incidents")}
  >
    <CardContent className="p-2 flex flex-col items-center text-center">
      <div className="p-2 rounded-full bg-red-500 text-white mb-1">
        <AlertCircle className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium">Incidents</span>
    </CardContent>
  </Card>
  <Card
    className="cursor-pointer hover:shadow-md transition-all"
    onClick={() => setMainTab("photos")}
  >
    <CardContent className="p-2 flex flex-col items-center text-center">
      <div className="p-2 rounded-full bg-yellow-500 text-white mb-1">
        <Images className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium">Cleaning Photos</span>
    </CardContent>
  </Card>
  <Card
    className="cursor-pointer hover:shadow-md transition-all"
    onClick={() => setMainTab("shift")}
  >
    <CardContent className="p-2 flex flex-col items-center text-center">
      <div className="p-2 rounded-full bg-indigo-500 text-white mb-1">
        <Factory className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium">Shift</span>
    </CardContent>
  </Card>
</div>
      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="space-y-4">
        
        <TabsContent value="employees">{renderEmployeesTab()}</TabsContent>
        <TabsContent value="machines">{renderMachinesTab()}</TabsContent>
        <TabsContent value="grooming">{renderGroomingTab()}</TabsContent>
        <TabsContent value="incidents">{renderIncidentsTab()}</TabsContent>
        <TabsContent value="photos">{renderPhotosTab()}</TabsContent>
        <TabsContent value="shift">{renderShiftTab()}</TabsContent>
      </Tabs>

      {/* Photo Modal (for attendance photos) */}
      <Dialog open={photoModalOpen && !!selectedPhotoType} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedPhotoType === "checkin" ? "Check-in Photo" : "Check-out Photo"}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {selectedPhoto && (
              <img
                src={selectedPhoto}
                alt="Attendance photo"
                className="max-w-full h-auto rounded"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoModalOpen(false)}>
              Close
            </Button>
            {selectedPhoto && (
              <Button onClick={() => window.open(selectedPhoto, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-2" /> Open Original
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SuperAdminAttendanceView = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const initialViewType = searchParams.get('view') || 'site';
  const initialDepartment = searchParams.get('department') || '';
  const today = new Date().toISOString().split('T')[0];
  const initialStartDate = searchParams.get('startDate') || today;
  const initialEndDate = searchParams.get('endDate') || today;
  const initialSiteDetails = searchParams.get('siteDetails') === 'true';
  const initialSelectedSiteId = searchParams.get('selectedSiteId') || '';

  const [viewType, setViewType] = useState<'site' | 'department'>(initialViewType as 'site' | 'department');
  const [selectedDepartment, setSelectedDepartment] = useState(initialDepartment);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSiteDetails, setShowSiteDetails] = useState(initialSiteDetails);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [displayData, setDisplayData] = useState<any[]>([]);

  // ========== NEW: Department attendance stats (present / total) ==========
  const [departmentStats, setDepartmentStats] = useState<
    { department: string; total: number; present: number }[]
  >([]);
  const [loadingDept, setLoadingDept] = useState(false);
const [isMobileSiteView, setIsMobileSiteView] = useState(false);

useEffect(() => {
  const checkMobile = () => setIsMobileSiteView(window.innerWidth < 768);
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
  const itemsPerPage = 10;

  // Fetch department attendance for the selected date range
  const loadDepartmentAttendance = async () => {
    setLoadingDept(true);
    try {
      const allEmployees = await fetchEmployees();           // your existing fetch
      const attendanceRecords = await fetchAttendanceRecords(startDate, endDate);

      // Map employee ID -> department (staff only)
      const empDeptMap = new Map<string, string>();
      const empIsStaff = new Map<string, boolean>();
      allEmployees.forEach(emp => {
        if (emp.isManager || emp.isSupervisor) return;
        const dept = emp.department?.trim();
        if (dept) {
          empDeptMap.set(emp.id, dept);
          empIsStaff.set(emp.id, true);
        }
      });

      // Track which staff employees were present (at least once)
      const presentEmpIds = new Set<string>();
      attendanceRecords.forEach(rec => {
        const status = rec.status?.toLowerCase() || '';
        if (status === 'present' || status === 'half-day') {
          const empId = rec.employeeId;
          if (empIsStaff.get(empId)) presentEmpIds.add(empId);
        }
      });

      // Count totals and presents per department
      const deptTotalMap = new Map<string, number>();
      const deptPresentMap = new Map<string, number>();
      for (const [empId, dept] of empDeptMap.entries()) {
        deptTotalMap.set(dept, (deptTotalMap.get(dept) || 0) + 1);
        if (presentEmpIds.has(empId)) {
          deptPresentMap.set(dept, (deptPresentMap.get(dept) || 0) + 1);
        }
      }

      // Always show the six fixed departments
      const desiredDepts = [
        'Housekeeping',
        'Security',
        'Waste Management',
        'Parking',
        'Consumables',
        'Other',
      ];
      const stats = desiredDepts.map(dept => ({
        department: dept,
        total: deptTotalMap.get(dept) || 0,
        present: deptPresentMap.get(dept) || 0,
      }));
      setDepartmentStats(stats);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load department attendance');
    } finally {
      setLoadingDept(false);
    }
  };

  // Re‑fetch department stats when date range changes
  useEffect(() => {
    loadDepartmentAttendance();
  }, [startDate, endDate]);
  // =======================================================================

  // Fetch sites data – unchanged from your original
  const fetchSitesData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching sites from server...');
      const sitesData = await siteService.getAllSites();
      if (sitesData && Array.isArray(sitesData)) {
        console.log(`✅ Successfully fetched ${sitesData.length} sites`);
        setSites(sitesData);
        await calculateDisplayData(sitesData);
      } else {
        console.warn('⚠️ No sites data received or invalid format');
        setSites([]);
        setDisplayData([]);
        toast.error('No sites data available');
      }
    } catch (err: any) {
      console.error('❌ Error fetching sites:', err);
      setError(err.message || 'Failed to fetch sites');
      toast.error('Failed to fetch sites', {
        description: err.message || 'Please try again later',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate display data – unchanged
  const calculateDisplayData = async (sitesData: Site[]) => {
    try {
      setRefreshing(true);
      const calculatedData = [];
      for (const site of sitesData) {
        let siteData;
        if (viewType === 'department' && selectedDepartment) {
          siteData = await calculateDepartmentSiteData(site, startDate, endDate, selectedDepartment);
        } else {
          siteData = await calculateSiteAttendanceData(site, startDate, endDate);
        }
        if (!siteData.employees) siteData.employees = [];
        calculatedData.push(siteData);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setDisplayData(calculatedData);
      console.log(`✅ Calculated display data for ${calculatedData.length} sites`);
    } catch (error) {
      console.error('Error calculating display data:', error);
      setDisplayData(
        sitesData.map(site => ({
          ...site,
          employees: [],
          isRealData: false,
          daysInPeriod: calculateDaysBetween(startDate, endDate),
          startDate,
          endDate,
          dailyRequirement: 0,
          totalEmployees: 0,
          totalRequiredForPeriod: 0,
          totalPresent: 0,
          totalWeeklyOff: 0,
          totalLeave: 0,
          totalAbsent: 0,
          deploymentStats: {
            totalStaff: 0,
            managerCount: 0,
            supervisorCount: 0,
            staffCount: 0,
            managerRequirement: site.managerCount || 0,
            supervisorRequirement: site.supervisorCount || 0,
            staffRequirement: 0,
            dailyStaffRequirement: 0,
            totalStaffRequirementForPeriod: 0,
            isStaffFull: false,
            remainingStaff: 0,
          },
        }))
      );
    } finally {
      setRefreshing(false);
    }
  };

  // Initial data fetch – unchanged
  useEffect(() => {
    fetchSitesData();
  }, []);

  // Recalculate data when filters change – unchanged
  useEffect(() => {
    if (sites.length > 0) {
      calculateDisplayData(sites);
    }
  }, [viewType, selectedDepartment, startDate, endDate]);

  const daysInPeriod = useMemo(() => calculateDaysBetween(startDate, endDate), [startDate, endDate]);

  const filteredData = useMemo(() => {
    if (!displayData || displayData.length === 0) return [];
    return displayData.filter(
      item =>
        item.siteName?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchTerm?.toLowerCase())
    );
  }, [displayData, searchTerm]);

  const overallTotals = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalEmployees: 0,
        durationTotalRequired: 0,
        durationWeeklyOff: 0,
        durationOnSiteRequirement: 0,
        durationPresent: 0,
        durationAbsent: 0,
        totalRequiredAttendance: 0,
        totalPresentAttendance: 0,
        totalShortage: 0,
        attendanceRate: '0.0',
        totalManagers: 0,
        totalSupervisors: 0,
        totalStaff: 0,
      };
    }
    const durationTotalRequired = filteredData.reduce(
      (sum, item) => sum + (item.totalRequiredForPeriod || item.durationTotalRequired || 0),
      0
    );
    const durationWeeklyOff = filteredData.reduce(
      (sum, item) => sum + (item.totalWeeklyOff || item.weeklyOffCount || 0),
      0
    );
    const durationOnSiteRequirement = filteredData.reduce(
      (sum, item) => sum + (item.durationOnSiteRequirement || 0),
      0
    );
    const durationPresent = filteredData.reduce(
      (sum, item) => sum + (item.totalPresent || item.presentCount || 0),
      0
    );
    const durationAbsent = filteredData.reduce(
      (sum, item) => sum + (item.totalAbsent || 0) + (item.totalLeave || 0),
      0
    );
    const totalManagers = filteredData.reduce(
      (sum, item) => sum + (item.deploymentStats?.managerCount || 0),
      0
    );
    const totalSupervisors = filteredData.reduce(
      (sum, item) => sum + (item.deploymentStats?.supervisorCount || 0),
      0
    );
    const totalStaff = filteredData.reduce(
      (sum, item) => sum + (item.deploymentStats?.staffCount || 0),
      0
    );
    const totalEmployees = filteredData.reduce(
      (sum, item) => sum + (item.dailyRequirement || item.totalEmployees || item.total),
      0
    );
    const totalRequiredAttendance = filteredData.reduce(
      (sum, item) => sum + (item.totalRequiredForPeriod || item.totalRequiredAttendance || 0),
      0
    );
    const totalPresentAttendance = filteredData.reduce(
      (sum, item) => sum + (item.totalPresentAttendance || 0),
      0
    );
    const totalShortage = filteredData.reduce((sum, item) => sum + (item.periodShortage || 0), 0);
    const attendanceRate =
      totalRequiredAttendance > 0
        ? ((totalPresentAttendance / totalRequiredAttendance) * 100).toFixed(1)
        : '0.0';
    return {
      totalEmployees,
      durationTotalRequired,
      durationWeeklyOff,
      durationOnSiteRequirement,
      durationPresent,
      durationAbsent,
      totalRequiredAttendance,
      totalPresentAttendance,
      totalShortage,
      attendanceRate,
      totalManagers,
      totalSupervisors,
      totalStaff,
    };
  }, [filteredData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

const handleExportToExcel = () => {
  // ✅ Use the FULL filteredData, not paginatedData
  const dataToExport = filteredData;
  
  if (dataToExport.length === 0) {
    toast.error('No data to export');
    return;
  }

  // Get date range for filename
  const dateRange = startDate === endDate 
    ? startDate 
    : `${startDate}_to_${endDate}`;
  
  const filename = viewType === 'department'
    ? `Attendance_${selectedDepartment}_${dateRange}.csv`
    : `Sitewise_Attendance_${dateRange}.csv`;

  // ===== Headers =====
  const headers = [
    'Site Name',
    'Department',
    'Period',
    'Days',
    'Daily Staff Requirement',
    'Total Required',
    'Weekly Off (Staff)',
    'On Site Requirement',
    'Total Present (Staff)',
    'Leave (Staff)',
    'Absent (Staff)',
    'Managers',
    'Supervisors',
    'Total Staff',
    'Attendance Rate',
    'Data Source'
  ];

  // ===== Data Rows =====
  const rows = dataToExport.map(item => {
    const dailyRequirement = item.dailyRequirement || 0;
    const totalRequired = item.totalRequiredForPeriod || item.durationTotalRequired || dailyRequirement * daysInPeriod;
    const weeklyOff = item.totalWeeklyOff || item.weeklyOffCount || 0;
    const onSiteRequirement = totalRequired - weeklyOff;
    const present = item.totalPresent || item.presentCount || 0;
    const leave = item.totalLeave || item.leaveCount || 0;
    const absent = item.totalAbsent || item.absentCount || 0;
    const managers = item.deploymentStats?.managerCount || 0;
    const supervisors = item.deploymentStats?.supervisorCount || 0;
    const staff = item.deploymentStats?.staffCount || 0;
    const rate = totalRequired > 0 ? ((present / totalRequired) * 100).toFixed(1) + '%' : '0.0%';
    const dataSource = item.isRealData ? 'Real Data' : 'Demo Data';
    
    return [
      `"${item.siteName || item.name}"`,
      `"${viewType === 'department' ? selectedDepartment : 'General'}"`,
      `"${item.startDate} to ${item.endDate}"`,
      item.daysInPeriod || daysInPeriod,
      dailyRequirement,
      totalRequired,
      weeklyOff,
      onSiteRequirement,
      present,
      leave,
      absent,
      managers,
      supervisors,
      staff,
      rate,
      dataSource
    ];
  });

  // ===== Summary Row =====
  const totalRequiredAll = dataToExport.reduce((sum, item) => 
    sum + (item.totalRequiredForPeriod || item.durationTotalRequired || 0), 0
  );
  const totalPresentAll = dataToExport.reduce((sum, item) => 
    sum + (item.totalPresent || item.presentCount || 0), 0
  );
  const totalLeaveAll = dataToExport.reduce((sum, item) => 
    sum + (item.totalLeave || item.leaveCount || 0), 0
  );
  const totalAbsentAll = dataToExport.reduce((sum, item) => 
    sum + (item.totalAbsent || item.absentCount || 0), 0
  );
  const totalWeeklyOffAll = dataToExport.reduce((sum, item) => 
    sum + (item.totalWeeklyOff || item.weeklyOffCount || 0), 0
  );
  const totalManagersAll = dataToExport.reduce((sum, item) => 
    sum + (item.deploymentStats?.managerCount || 0), 0
  );
  const totalSupervisorsAll = dataToExport.reduce((sum, item) => 
    sum + (item.deploymentStats?.supervisorCount || 0), 0
  );
  const totalStaffAll = dataToExport.reduce((sum, item) => 
    sum + (item.deploymentStats?.staffCount || 0), 0
  );
  const overallRate = totalRequiredAll > 0 
    ? ((totalPresentAll / totalRequiredAll) * 100).toFixed(1) + '%' 
    : '0.0%';

  const summaryRow = [
    `"${'📊 GRAND TOTAL'}"`,
    `"${viewType === 'department' ? selectedDepartment : 'All'}"`,
    `"${startDate} to ${endDate}"`,
    dataToExport.reduce((sum, item) => sum + (item.daysInPeriod || daysInPeriod), 0),
    dataToExport.reduce((sum, item) => sum + (item.dailyRequirement || 0), 0),
    totalRequiredAll,
    totalWeeklyOffAll,
    totalRequiredAll - totalWeeklyOffAll,
    totalPresentAll,
    totalLeaveAll,
    totalAbsentAll,
    totalManagersAll,
    totalSupervisorsAll,
    totalStaffAll,
    overallRate,
    'SUMMARY'
  ];

  // ===== Empty Row for Spacing =====
  const emptyRow = headers.map(() => '');

  // ===== Create CSV =====
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
    emptyRow.join(','),
    ['=== SUMMARY ===', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    summaryRow.join(',')
  ].join('\n');

  // ===== Download =====
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Data exported to ${filename} with summary`);
};

  const handleBack = () => {
    navigate('/superadmin/dashboard');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewTypeChange = (newViewType: 'site' | 'department') => {
    setViewType(newViewType);
    setCurrentPage(1);
    if (newViewType === 'site') {
      setSelectedDepartment('');
    } else if (newViewType === 'department' && !selectedDepartment) {
      // Fallback – set to first department from stats if available
      const firstDept = departmentStats[0]?.department || '';
      setSelectedDepartment(firstDept);
    }
  };

  const handleViewDetails = (siteData: any) => {
    if (!siteData) return;
    setSelectedSite(siteData);
    setShowSiteDetails(true);
    const params = new URLSearchParams();
    params.set('view', viewType);
    if (viewType === 'department') params.set('department', selectedDepartment);
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    params.set('siteDetails', 'true');
    params.set('selectedSiteId', siteData?.siteId || siteData?.id || '');
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleBackFromDetails = () => {
    setShowSiteDetails(false);
    setSelectedSite(null);
    const params = new URLSearchParams();
    params.set('view', viewType);
    if (viewType === 'department') params.set('department', selectedDepartment);
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    navigate(`?${params.toString()}`, { replace: true });
  };

  useEffect(() => {
    if (initialSiteDetails && initialSelectedSiteId && displayData.length > 0) {
      const site = displayData.find(
        item => item.id === initialSelectedSiteId || item.siteId === initialSelectedSiteId
      );
      if (site) {
        setSelectedSite(site);
        setShowSiteDetails(true);
      }
    }
  }, [initialSiteDetails, initialSelectedSiteId, displayData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const Pagination = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-4 gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {filteredData.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) pageNum = i + 1;
            else if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      </div>
    );
  };

  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      await fetchSitesData();
      toast.success('All data refreshed successfully');
    } catch (err: any) {
      toast.error('Failed to refresh data', { description: err.message || 'Please try again' });
    } finally {
      setRefreshing(false);
    }
  };

  const hasRealEmployeeData = useMemo(() => displayData.some(item => item.isRealData), [displayData]);

  if (loading && sites.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Sites Data</h2>
          <p className="text-gray-600">Fetching sites and employee data from the server...</p>
        </div>
      </div>
    );
  }

  if (error && sites.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" /> Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  if (showSiteDetails) {
    return (
      <SiteEmployeeDetails
        siteData={selectedSite}
        onBack={handleBackFromDetails}
        viewType={viewType}
      />
    );
  }

  // Map department name to icon & gradient – same as dashboard
  const getDeptStyle = (deptName: string) => {
    const lower = deptName.toLowerCase();
    if (lower.includes('housekeeping'))
      return { icon: Home, gradient: 'from-blue-50 to-blue-100 border-blue-200' };
    if (lower.includes('security'))
      return { icon: Shield, gradient: 'from-green-50 to-green-100 border-green-200' };
    if (lower.includes('waste'))
      return { icon: Trash2, gradient: 'from-gray-50 to-gray-100 border-gray-200' };
    if (lower.includes('parking'))
      return { icon: Car, gradient: 'from-purple-50 to-purple-100 border-purple-200' };
    if (lower.includes('consumables'))
      return { icon: ShoppingCart, gradient: 'from-orange-50 to-orange-100 border-orange-200' };
    return { icon: Droplets, gradient: 'from-cyan-50 to-cyan-100 border-cyan-200' };
  };
  // Add this function before the return statement in SuperAdminAttendanceView
const handleExportFullMonth = () => {
  // Get the month from startDate
  const month = startDate.substring(0, 7); // YYYY-MM
  const monthStart = `${month}-01`;
  const monthEnd = new Date(
    parseInt(month.split('-')[0]),
    parseInt(month.split('-')[1]),
    0
  ).toISOString().split('T')[0];
  
  // Re-fetch data for full month
  const fetchFullMonthData = async () => {
    try {
      setRefreshing(true);
      toast.loading('Fetching full month data...');
      
      const fullMonthData = [];
      for (const site of sites) {
        let siteData;
        if (viewType === 'department' && selectedDepartment) {
          siteData = await calculateDepartmentSiteData(site, monthStart, monthEnd, selectedDepartment);
        } else {
          siteData = await calculateSiteAttendanceData(site, monthStart, monthEnd);
        }
        fullMonthData.push(siteData);
      }
      
      toast.dismiss();
      
      // Export the full month data
      const dataToExport = fullMonthData;
      if (dataToExport.length === 0) {
        toast.error('No data to export');
        return;
      }

      const filename = viewType === 'department'
        ? `Attendance_${selectedDepartment}_${month}.csv`
        : `Sitewise_Attendance_${month}.csv`;

      const headers = [
        'Site Name', 'Department', 'Period', 'Days',
        'Daily Staff Requirement', 'Total Required', 'Weekly Off (Staff)',
        'On Site Requirement', 'Total Present (Staff)', 'Leave (Staff)',
        'Absent (Staff)', 'Managers', 'Supervisors', 'Total Staff',
        'Attendance Rate', 'Data Source'
      ];

      const rows = dataToExport.map(item => {
        const dailyRequirement = item.dailyRequirement || 0;
        const totalRequired = item.totalRequiredForPeriod || item.durationTotalRequired || dailyRequirement * 30;
        const weeklyOff = item.totalWeeklyOff || item.weeklyOffCount || 0;
        const onSiteRequirement = totalRequired - weeklyOff;
        const present = item.totalPresent || item.presentCount || 0;
        const leave = item.totalLeave || item.leaveCount || 0;
        const absent = item.totalAbsent || item.absentCount || 0;
        const managers = item.deploymentStats?.managerCount || 0;
        const supervisors = item.deploymentStats?.supervisorCount || 0;
        const staff = item.deploymentStats?.staffCount || 0;
        const rate = totalRequired > 0 ? ((present / totalRequired) * 100).toFixed(1) + '%' : '0.0%';
        const dataSource = item.isRealData ? 'Real Data' : 'Demo Data';
        return [
          `"${item.siteName || item.name}"`,
          `"${viewType === 'department' ? selectedDepartment : 'General'}"`,
          `"${monthStart} to ${monthEnd}"`,
          item.daysInPeriod || 30,
          dailyRequirement,
          totalRequired,
          weeklyOff,
          onSiteRequirement,
          present,
          leave,
          absent,
          managers,
          supervisors,
          staff,
          rate,
          dataSource
        ];
      });

      // Summary Row
      const totalRequiredAll = dataToExport.reduce((sum, item) => 
        sum + (item.totalRequiredForPeriod || item.durationTotalRequired || 0), 0
      );
      const totalPresentAll = dataToExport.reduce((sum, item) => 
        sum + (item.totalPresent || item.presentCount || 0), 0
      );
      const totalLeaveAll = dataToExport.reduce((sum, item) => 
        sum + (item.totalLeave || item.leaveCount || 0), 0
      );
      const totalAbsentAll = dataToExport.reduce((sum, item) => 
        sum + (item.totalAbsent || item.absentCount || 0), 0
      );
      const totalWeeklyOffAll = dataToExport.reduce((sum, item) => 
        sum + (item.totalWeeklyOff || item.weeklyOffCount || 0), 0
      );
      const overallRate = totalRequiredAll > 0 
        ? ((totalPresentAll / totalRequiredAll) * 100).toFixed(1) + '%' 
        : '0.0%';

      const summaryRow = [
        `"📊 GRAND TOTAL"`,
        `"${viewType === 'department' ? selectedDepartment : 'All'}"`,
        `"${monthStart} to ${monthEnd}"`,
        dataToExport.reduce((sum, item) => sum + (item.daysInPeriod || 30), 0),
        dataToExport.reduce((sum, item) => sum + (item.dailyRequirement || 0), 0),
        totalRequiredAll,
        totalWeeklyOffAll,
        totalRequiredAll - totalWeeklyOffAll,
        totalPresentAll,
        totalLeaveAll,
        totalAbsentAll,
        dataToExport.reduce((sum, item) => sum + (item.deploymentStats?.managerCount || 0), 0),
        dataToExport.reduce((sum, item) => sum + (item.deploymentStats?.supervisorCount || 0), 0),
        dataToExport.reduce((sum, item) => sum + (item.deploymentStats?.staffCount || 0), 0),
        overallRate,
        'SUMMARY'
      ];

      const emptyRow = headers.map(() => '');
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
        emptyRow.join(','),
        ['=== SUMMARY ===', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        summaryRow.join(',')
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Full month data exported to ${filename} with summary`);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to fetch full month data');
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };
  
  fetchFullMonthData();
};

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>

          </div>
          <div className="flex items-center gap-4">

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {viewType === 'department'
                  ? `${selectedDepartment} Department Attendance`
                  : 'Site-wise Attendance Overview'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={refreshing || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              All
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Loading indicator */}
      {(refreshing || loading) && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-muted-foreground">
                  {refreshing
                    ? 'Refreshing employee data...'
                    : 'Loading data...'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Data Table – unchanged from your original */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>
                {viewType === 'department'
                  ? `${selectedDepartment} Sites Attendance - Cumulative Totals (${daysInPeriod} days)`
                  : `All Sites Attendance - Cumulative Totals (${daysInPeriod} days)`}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshAll}
                  disabled={refreshing || loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                  Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={filteredData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" /> Export to Excel
                </Button>
                <Button 
    variant="default" 
    size="sm" 
    onClick={handleExportFullMonth}
    disabled={filteredData.length === 0}
    className="flex items-center gap-2"
  >
    <FileSpreadsheet className="h-4 w-4" />
    Export Full Month
  </Button>
              </div>
            </div>
          </CardHeader>
         <CardContent>
  {filteredData.length === 0 ? (
    <div className="text-center py-12">
      <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites Found</h3>
      <p className="text-gray-500 mb-6">
        {searchTerm
          ? 'No sites match your search criteria. Try a different search term.'
          : 'No sites available or all sites are filtered out.'}
      </p>
      {searchTerm && (
        <Button variant="outline" onClick={() => setSearchTerm('')}>
          Clear Search
        </Button>
      )}
    </div>
  ) : isMobileSiteView ? (
    // ✅ Mobile Card View (like supervisor dashboard)
    <div className="space-y-3">
      {paginatedData.map((item, index) => {
        const dailyRequirement = item.dailyRequirement || 0;
        const totalRequired = item.totalRequiredForPeriod || item.durationTotalRequired || dailyRequirement * daysInPeriod;
        const present = item.totalPresent || item.presentCount || 0;
        const absent = (item.totalAbsent || 0) + (item.totalLeave || 0);
        const rate = totalRequired > 0 ? ((present / totalRequired) * 100).toFixed(1) : '0.0';
        const status = parseFloat(rate) >= 90 ? 'Excellent' : parseFloat(rate) >= 80 ? 'Good' : parseFloat(rate) >= 70 ? 'Average' : 'Poor';

        return (
          <Card key={item.siteId || item.id || index} className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{item.siteName || item.name}</h3>
                <p className="text-xs text-muted-foreground">{item.daysInPeriod} {item.daysInPeriod === 1 ? 'day' : 'days'}</p>
              </div>
              <Badge variant={status === 'Excellent' ? 'default' : status === 'Good' ? 'secondary' : 'outline'}>{status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div><span className="text-muted-foreground">Daily Req:</span> <strong>{dailyRequirement}</strong></div>
              <div><span className="text-muted-foreground">Total Required:</span> <strong>{totalRequired}</strong></div>
              <div className="text-green-600"><span className="text-muted-foreground">Present:</span> <strong>{present}</strong></div>
              <div className="text-red-600"><span className="text-muted-foreground">Absent:</span> <strong>{absent}</strong></div>
              <div><span className="text-muted-foreground">Rate:</span> <strong>{rate}%</strong></div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => handleViewDetails(item)}>
                <Eye className="h-4 w-4 mr-1" /> Details
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/superadmin/machines/${encodeURIComponent(item.siteName || item.name)}`)}>
                <Settings className="h-4 w-4 mr-1" /> Machines
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  ) : (
    // ✅ Desktop Table (unchanged)
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Site Name</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-indigo-700 bg-indigo-50">Daily Req</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-blue-700 bg-blue-50">Total Required</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-green-700 bg-green-50">Present</th>
               <th className="h-12 px-4 text-left align-middle font-medium text-purple-700 bg-purple-50">Weekly Off</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-red-700 bg-red-50">Absent</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rate</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Attendance</th>
              
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => {
              const dailyRequirement = item.dailyRequirement || 0;
              const totalRequired = item.totalRequiredForPeriod || item.durationTotalRequired || dailyRequirement * daysInPeriod;
              const present = item.totalPresent || item.presentCount || 0;
              const absent = (item.totalAbsent || 0) + (item.totalLeave || 0);
              const rate = totalRequired > 0 ? ((present / totalRequired) * 100).toFixed(1) : '0.0';
              const status = parseFloat(rate) >= 90 ? 'Excellent' : parseFloat(rate) >= 80 ? 'Good' : parseFloat(rate) >= 70 ? 'Average' : 'Poor';

              return (
                <tr key={item.siteId || item.id || index} className="border-b hover:bg-muted/50">
                  <td className="p-4 align-middle font-medium">
                    <div className="font-medium text-sm">{item.siteName || item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.daysInPeriod} {item.daysInPeriod === 1 ? 'day' : 'days'}
                    </div>
                  </td>
                  <td className="p-4 align-middle font-bold text-indigo-700 bg-indigo-50">{dailyRequirement}</td>
                  <td className="p-4 align-middle font-bold text-blue-700 bg-blue-50">{totalRequired}</td>
                  <td className="p-4 align-middle font-bold text-green-700 bg-green-50">{present}</td>
                  <td className="p-4 align-middle font-bold text-purple-700 bg-purple-50">
  {item.totalWeeklyOff || item.weeklyOffCount || 0}
</td>
                  <td className="p-4 align-middle font-bold text-red-700 bg-red-50">{absent}</td>

                  <td className="p-4 align-middle font-bold">{rate}%</td>
                  <td className="p-4 align-middle">
                    <Badge variant={status === 'Excellent' ? 'default' : status === 'Good' ? 'secondary' : status === 'Average' ? 'outline' : 'destructive'}>
                      {status}
                    </Badge>
                  </td>
                  <td className="p-4 align-middle">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(item)}>
                      <Eye className="h-4 w-4 mr-1" /> Details
                    </Button>
                  </td>
                 
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredData.length > 0 && <Pagination />}
    </div>
  )}
</CardContent>
        </Card>
      </motion.div>


    </div>
  );
};

export default SuperAdminAttendanceView;