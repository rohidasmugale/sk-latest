import React, { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import CameraCapture from "./CameraCapture";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  RefreshCw,
  AlertCircle,
  Loader2,
  Camera,
  FileText,
  Save,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useRole } from "@/context/RoleContext";
import { useOutletContext } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

// ---------- API ----------
const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
// ---------- Types ----------
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  siteName?: string;
  status: "active" | "inactive" | "left";
  profileStatus?: "complete" | "incomplete";   // ✅ ADD THIS
}

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
  latitude?: number | null;
  longitude?: number | null;
}

interface Site {
  _id: string;
  name: string;
  clientName?: string;
}

interface OutletContext {
  onMenuClick: () => void;
}

// ---------- Helper functions ----------
const formatTimeForDisplay = (timestamp: string | null): string => {
  if (!timestamp || timestamp === "-") return "-";
  try {
    if (timestamp.includes('T')) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime()))
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const parts = timestamp.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0]);
      const minutes = parts[1];
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period}`;
    }
    return timestamp;
  } catch {
    return timestamp || "-";
  }
};

const formatHours = (hours: number): string => `${hours.toFixed(2)} hrs`;

const normalizeSiteName = (siteName: string | null | undefined): string => {
  if (!siteName) return '';
  return siteName.toLowerCase().trim();
};

const isCheckInLate = (checkInTime: string | null): boolean => {
  if (!checkInTime) return false;
  const timeStr = formatTimeForDisplay(checkInTime);
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return false;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes > 9 * 60 + 30;
};

const getDerivedAttendanceStatus = (record: AttendanceRecord | undefined, checkInTime: string | null) => {
  if (!record) return { status: 'absent', isLate: false };
  if (record.status === 'weekly-off' || record.status === 'leave') {
    return { status: record.status, isLate: false };
  }

  const late = isCheckInLate(checkInTime);
  let derivedStatus = record.status;

  // Only apply rule if employee has checked out (shift finished)
  if (record.checkOutTime) {
    const totalHours = record.totalHours || 0;
    if (totalHours < 4) {
      derivedStatus = 'absent';
    } else if (totalHours < 9) {
      derivedStatus = 'half-day';
    } else {
      derivedStatus = 'present';
    }
  }

  return { status: derivedStatus, isLate: late };
};

// ---------- Main Component ----------
const Attendance = () => {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const { user: currentUser, isAuthenticated } = useRole();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [supervisorSites, setSupervisorSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [isMobileView, setIsMobileView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  // ------- Photo Capture for Mark Present -------
  const [attendanceCameraOpen, setAttendanceCameraOpen] = useState(false);
  const [attendancePhotoTarget, setAttendancePhotoTarget] = useState<Employee | null>(null);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedEmployeeForManual, setSelectedEmployeeForManual] = useState<Employee | null>(null);
  const [manualData, setManualData] = useState({
    checkInTime: "",
    checkOutTime: "",
    breakStartTime: "",
    breakEndTime: "",
    status: "present" as 'present' | 'absent' | 'half-day' | 'weekly-off',
    remarks: "",
  });

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedEmployeeForStatus, setSelectedEmployeeForStatus] = useState<Employee | null>(null);
  const [statusUpdateData, setStatusUpdateData] = useState({
    employeeId: "",
    employeeName: "",
    attendanceId: "",
    currentStatus: "",
    newStatus: "present" as 'present' | 'absent' | 'half-day' | 'weekly-off',
    date: selectedDate,
    remarks: "",
  });
  // ------- Photo Capture for Check Out -------
  const [checkoutCameraOpen, setCheckoutCameraOpen] = useState(false);
  const [checkoutPhotoTarget, setCheckoutPhotoTarget] = useState<Employee | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'checkin' | 'checkout'>('checkin');
  const [activeShiftId, setActiveShiftId] = useState<string>("");
  const [siteShifts, setSiteShifts] = useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  // ─── Employee Status Update (active/inactive/left) ───
  const [employeeStatusDialogOpen, setEmployeeStatusDialogOpen] = useState(false);

  const [newEmployeeStatus, setNewEmployeeStatus] = useState<"active" | "inactive" | "left">("active");
  const [updatingEmployeeStatus, setUpdatingEmployeeStatus] = useState(false);
  // Data fetching
  const fetchSupervisorSites = useCallback(async () => {
    if (!currentUser) return [];
    try {
      const supervisorId = currentUser._id || currentUser.id;
      const response = await axios.get(`${API_URL}/tasks`, { params: { limit: 1000 } });
      let allTasks = response.data?.data || response.data || [];
      if (!Array.isArray(allTasks)) allTasks = [];
      const siteSet = new Set<string>();
      allTasks.forEach((task: any) => {
        if (task.assignedUsers?.some((u: any) => u.userId === supervisorId)) {
          if (task.siteName) siteSet.add(task.siteName);
        }
        if (task.assignedTo === supervisorId && task.siteName) siteSet.add(task.siteName);
      });
      const siteNames = Array.from(siteSet);
      const sitesRes = await axios.get(`${API_URL}/sites`);
      let allSites = sitesRes.data?.data || sitesRes.data || [];
      if (!Array.isArray(allSites)) allSites = [];
      const filtered = allSites.filter((s: any) => siteNames.includes(s.name));
      setSupervisorSites(filtered);
      return filtered;
    } catch (error) {
      console.error("Error fetching supervisor sites:", error);
      return [];
    }
  }, [currentUser]);
  const fetchSiteShifts = async (siteName: string) => {
    if (!siteName) return;
    setLoadingShifts(true);
    try {
      const res = await axios.get(`${API_URL}/sites`);
      const sites = res.data?.data || res.data || [];
      const site = sites.find((s: any) => s.name === siteName);
      if (site?.shifts && site.shifts.length > 0) {
        setSiteShifts(site.shifts);
        // Set default active shift to first one
        if (!activeShiftId) {
          setActiveShiftId(site.shifts[0].id);
        }
      } else {
        setSiteShifts([]);
        setActiveShiftId("");
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
      setSiteShifts([]);
    } finally {
      setLoadingShifts(false);
    }
  };
  const fetchEmployees = useCallback(async () => {
    if (!currentUser) return;
    try {
      let sites = supervisorSites;
      if (sites.length === 0) sites = await fetchSupervisorSites();
      const siteNames = sites.map(s => s.name);
      if (siteNames.length === 0) {
        setEmployees([]);
        return;
      }
      const response = await axios.get(`${API_URL}/employees`, { params: { limit: 1000 } });
      let allEmployees = response.data?.data || response.data?.employees || response.data || [];
      if (!Array.isArray(allEmployees)) allEmployees = [];
      const filtered = allEmployees.filter((emp: any) => {
        const empSite = emp.siteName || '';
        return siteNames.some(sn => normalizeSiteName(sn) === normalizeSiteName(empSite));
      });
      setEmployees(filtered);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  }, [currentUser, supervisorSites, fetchSupervisorSites]);

  const loadAttendanceRecords = useCallback(async () => {
    if (employees.length === 0) {
      setAttendanceRecords([]);
      return;
    }

    try {
      // ✅ Fix 1: always fetch all records (limit=1000)
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { date: selectedDate, limit: 1000 }
      });

      let records = response.data?.data || response.data || [];
      if (!Array.isArray(records)) records = [];

      // ✅ Fix 2: match on multiple fields (mongo _id, employeeId, and name)
      const employeeMongoIds = new Set(employees.map(e => e._id));
      const employeeEmpIds = new Set(employees.map(e => e.employeeId));
      const employeeNames = new Set(employees.map(e => e.name));

      const filteredRecords = records.filter((r: AttendanceRecord) =>
        employeeMongoIds.has(r.employeeId) ||
        employeeEmpIds.has(r.employeeId) ||
        employeeNames.has(r.employeeName)
      );

      setAttendanceRecords(filteredRecords);
    } catch (error) {
      console.error("Error loading attendance:", error);
      setAttendanceRecords([]);
    }
  }, [employees, selectedDate]);

  const handleOpenEmployeeStatusDialog = (emp: Employee) => {
    setSelectedEmployeeForStatus(emp);
    setNewEmployeeStatus(emp.status || "active");
    setEmployeeStatusDialogOpen(true);
  };
  const submitEmployeeStatusUpdate = async () => {
    if (!selectedEmployeeForStatus) return;

    setUpdatingEmployeeStatus(true);
    try {
      const response = await axios.patch(`${API_URL}/employees/${selectedEmployeeForStatus._id}`, {
        status: newEmployeeStatus,
      });

      if (response.data.success) {
        toast.success(`Employee status updated to ${newEmployeeStatus}`);
        setEmployeeStatusDialogOpen(false);
        // Refresh employee list
        await fetchEmployees();
      } else {
        toast.error(response.data.message || "Failed to update status");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error updating status");
    } finally {
      setUpdatingEmployeeStatus(false);
    }
  };
  useEffect(() => {
    if (currentUser && currentUser.role === "supervisor") {
      const init = async () => {
        setLoading(true);
        await fetchSupervisorSites();
        await fetchEmployees();
        setLoading(false);
      };
      init();
    }
  }, [currentUser]);

  useEffect(() => {
    if (employees.length > 0) {
      loadAttendanceRecords();
    }
  }, [employees, selectedDate, loadAttendanceRecords]);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getEmployeeAttendance = (emp: Employee): AttendanceRecord | undefined => {
    return attendanceRecords.find(r =>
      r.employeeId === emp._id ||
      r.employeeId === emp.employeeId ||
      r.employeeName === emp.name
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return "bg-green-100 text-green-800 border-green-200";
      case 'absent': return "bg-red-100 text-red-800 border-red-200";
      case 'half-day': return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'weekly-off': return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  const isEmployeeIncomplete = (emp: Employee): boolean => {
    if (emp.profileStatus) {
      return emp.profileStatus === 'incomplete';
    }
    // Fallback check
    const requiredForBadge = [emp.employeeId, emp.name, emp.phone, emp.department, emp.position, emp.dateOfBirth];
    return requiredForBadge.some(v => v === undefined || v === null || v === '');
  };
  const summary = {
    total: employees.length,
    present: attendanceRecords.filter(r => r.status === 'present').length,
    absent: employees.length - attendanceRecords.filter(r => r.status === 'present' || r.status === 'weekly-off' || r.status === 'half-day').length,
    weeklyOff: attendanceRecords.filter(r => r.status === 'weekly-off').length,
    halfDay: attendanceRecords.filter(r => r.status === 'half-day').length,
  };

  const filteredEmployees = employees.filter(emp => {
    if (searchQuery && !emp.name.toLowerCase().includes(searchQuery.toLowerCase()) && !emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedSiteFilter !== "all" && emp.siteName !== selectedSiteFilter) return false;
    if (selectedDepartment !== "all" && emp.department !== selectedDepartment) return false;
    return true;
  });

  const siteOptions = Array.from(new Set(employees.map(e => e.siteName))).filter(Boolean);
  const departmentOptions = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);

  const handleAttendancePhotoCapture = async (photoFile: File) => {
    if (!attendancePhotoTarget) return;

    const toastId = toast.loading('Marking present with photo...');
    try {
      const formData = new FormData();
      formData.append('employeeId', attendancePhotoTarget._id);
      formData.append('employeeName', attendancePhotoTarget.name);
      formData.append('photo', photoFile);

      // ✅ CRITICAL FIX: Must send siteName to match backend expectations
      formData.append('siteName', attendancePhotoTarget.siteName || '');

      // If your app uses shifts, you must add this too:
      // formData.append('shiftId', selectedShiftId || '');

      formData.append('supervisorId', currentUser?._id || currentUser?.id);

      // Note: We removed date, checkInTime, and status. 
      // The /checkin-with-photo endpoint handles the timestamp automatically!

      const response = await axios.post(`${API_URL}/attendance/checkin-with-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.dismiss(toastId);

      if (response.data.success) {
        toast.success(`${attendancePhotoTarget.name} marked as Present with photo!`);
        setAttendanceCameraOpen(false);
        setAttendancePhotoTarget(null);
        await loadAttendanceRecords();
      } else {
        toast.error(response.data.message || "Failed to mark present");
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Attendance photo error:', error);
      toast.error(error.response?.data?.message || "Failed to mark present with photo");
    }
  };
  const handleCheckoutPhotoCapture = async (photoFile: File) => {
    if (!checkoutPhotoTarget) return;

    const toastId = toast.loading('Checking out with photo...');
    try {
      const formData = new FormData();
      formData.append('employeeId', checkoutPhotoTarget._id);
      formData.append('employeeName', checkoutPhotoTarget.name);
      formData.append('photo', photoFile);
      formData.append('siteName', checkoutPhotoTarget.siteName || '');
      formData.append('supervisorId', currentUser?._id || currentUser?.id);
      // If your app uses shifts:
      // formData.append('shiftId', selectedShiftId || '');

      const response = await axios.post(`${API_URL}/attendance/checkout-with-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.dismiss(toastId);

      if (response.data.success) {
        toast.success(`${checkoutPhotoTarget.name} checked out with photo!`);
        setCheckoutCameraOpen(false);
        setCheckoutPhotoTarget(null);
        await loadAttendanceRecords();
      } else {
        toast.error(response.data.message || "Failed to check out");
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Checkout photo error:', error);
      toast.error(error.response?.data?.message || "Failed to check out with photo");
    }
  };

  const submitManualAttendance = async () => {
    if (!selectedEmployeeForManual) return;
    try {
      let totalHours = 0;
      if (manualData.checkInTime && manualData.checkOutTime) {
        totalHours = (() => {
          const inTime = new Date(`${selectedDate}T${manualData.checkInTime}`).getTime();
          const outTime = new Date(`${selectedDate}T${manualData.checkOutTime}`).getTime();
          return (outTime - inTime) / (1000 * 60 * 60);
        })();
      }
      const payload = {
        employeeId: selectedEmployeeForManual._id,
        employeeName: selectedEmployeeForManual.name,
        date: selectedDate,
        checkInTime: manualData.checkInTime ? `${selectedDate}T${manualData.checkInTime}` : null,
        checkOutTime: manualData.checkOutTime ? `${selectedDate}T${manualData.checkOutTime}` : null,
        breakStartTime: manualData.breakStartTime ? `${selectedDate}T${manualData.breakStartTime}` : null,
        breakEndTime: manualData.breakEndTime ? `${selectedDate}T${manualData.breakEndTime}` : null,
        status: manualData.status,
        remarks: manualData.remarks,
        totalHours,
        isCheckedIn: !!manualData.checkInTime && !manualData.checkOutTime,
        supervisorId: currentUser?._id || currentUser?.id,
      };
      const response = await axios.post(`${API_URL}/attendance/manual`, payload);
      if (response.data.success) {
        toast.success("Manual attendance saved");
        setManualDialogOpen(false);
        await loadAttendanceRecords();
      } else {
        toast.error(response.data.message || "Failed");
      }
    } catch (error) {
      toast.error("Error saving manual attendance");
    }
  };

  const handleStatusUpdate = (emp: Employee) => {
    const record = getEmployeeAttendance(emp);
    setSelectedEmployeeForStatus(emp);
    setStatusUpdateData({
      employeeId: emp._id,
      employeeName: emp.name,
      attendanceId: record?._id || "",
      currentStatus: record?.status || "absent",
      newStatus: "present",
      date: selectedDate,
      remarks: record?.remarks || "",
    });
    setStatusDialogOpen(true);
  };

  const submitStatusUpdate = async () => {
    if (!selectedEmployeeForStatus) return;
    setUpdatingStatus(true);
    try {
      const response = await axios.post(`${API_URL}/attendance/update-status`, {
        employeeId: statusUpdateData.employeeId,
        attendanceId: statusUpdateData.attendanceId || null,
        date: statusUpdateData.date,
        status: statusUpdateData.newStatus,
        remarks: statusUpdateData.remarks,
        supervisorId: currentUser?._id || currentUser?.id,
        employeeName: selectedEmployeeForStatus.name,
      });
      if (response.data.success) {
        toast.success(`Status updated to ${statusUpdateData.newStatus.replace('-', ' ')}`);
        setStatusDialogOpen(false);
        await loadAttendanceRecords();
      } else {
        toast.error(response.data.message || "Update failed");
      }
    } catch (error) {
      toast.error("Error updating status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleViewPhoto = (photoUrl: string | null, type: 'checkin' | 'checkout') => {
    if (photoUrl) {
      setSelectedPhoto(photoUrl);
      setSelectedPhotoType(type);
      setPhotoModalOpen(true);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSiteFilter("all");
    setSelectedDepartment("all");
  };

  const toggleExpand = (empId: string) => {
    setExpandedEmployeeId(prev => prev === empId ? null : empId);
  };

  const exportToExcel = () => {
    if (filteredEmployees.length === 0) {
      toast.warning("No data to export");
      return;
    }
    const headers = [
      "Employee Name", "Employee ID", "Department",
      "Check In", "Check Out", "Check In Photo URL", "Check Out Photo URL",
      "Hours", "Latitude", "Longitude", "Status", "Remarks"
    ];
    const rows = filteredEmployees.map(emp => {
      const record = getEmployeeAttendance(emp);
      return [
        emp.name,
        emp.employeeId,
        emp.department,

        record?.checkInTime ? formatTimeForDisplay(record.checkInTime) : '-',
        record?.checkOutTime ? formatTimeForDisplay(record.checkOutTime) : '-',
        record?.checkInPhoto || '',
        record?.checkOutPhoto || '',
        record ? record.totalHours.toFixed(2) : '0',
        record?.latitude ?? '',
        record?.longitude ?? '',
        record ? record.status.replace('-', ' ') : 'Absent',
        record?.remarks || ''
      ];
    });
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Attendance exported successfully!");
  };


  const handleExportFullMonth = async () => {
    try {
      toast.loading('Fetching full month data...');

      // Get the month from selectedDate
      const month = selectedDate.substring(0, 7);
      const monthStart = `${month}-01`;
      const monthEnd = new Date(
        parseInt(month.split('-')[0]),
        parseInt(month.split('-')[1]),
        0
      ).toISOString().split('T')[0];

      // Fetch ALL attendance records for the month
      const response = await axios.get(`${API_URL}/attendance`, {
        params: {
          startDate: monthStart,
          endDate: monthEnd,
          limit: 10000
        }
      });

      let allRecords = response.data?.data || response.data || [];
      if (!Array.isArray(allRecords)) allRecords = [];

      // Filter records for supervisor's employees
      const employeeIds = new Set(employees.map(e => e._id));
      const filteredRecords = allRecords.filter((r: AttendanceRecord) =>
        employeeIds.has(r.employeeId)
      );

      if (filteredRecords.length === 0) {
        toast.dismiss();
        toast.warning('No attendance records found for this month');
        return;
      }

      toast.dismiss();

      // Group records by employee
      const employeeRecordMap = new Map();
      filteredRecords.forEach((record: AttendanceRecord) => {
        if (!employeeRecordMap.has(record.employeeId)) {
          employeeRecordMap.set(record.employeeId, []);
        }
        employeeRecordMap.get(record.employeeId).push(record);
      });

      // Build CSV data
      const headers = [
        'Date', 'Employee Name', 'Employee ID', 'Department',
        'Check In', 'Check Out', 'Total Hours', 'Status', 'Remarks'
      ];

      const rows: string[][] = [];
      let totalPresent = 0, totalAbsent = 0, totalHalfDay = 0, totalWeeklyOff = 0, totalLeave = 0;

      // Sort records by date
      filteredRecords.sort((a: AttendanceRecord, b: AttendanceRecord) =>
        a.date.localeCompare(b.date)
      );

      filteredRecords.forEach((record: AttendanceRecord) => {
        const emp = employees.find(e => e._id === record.employeeId);
        const status = record.status || 'absent';

        // Count statuses
        if (status === 'present') totalPresent++;
        else if (status === 'absent') totalAbsent++;
        else if (status === 'half-day') totalHalfDay++;
        else if (status === 'weekly-off') totalWeeklyOff++;
        else if (status === 'leave') totalLeave++;

        rows.push([
          record.date,
          emp?.name || record.employeeName || 'Unknown',
          emp?.employeeId || 'N/A',
          emp?.department || 'N/A',

          record.checkInTime ? formatTimeForDisplay(record.checkInTime) : '-',
          record.checkOutTime ? formatTimeForDisplay(record.checkOutTime) : '-',
          record.totalHours ? record.totalHours.toFixed(2) : '0',
          status.replace('-', ' '),
          record.remarks || ''
        ]);
      });

      // Summary row
      const totalEmployees = employees.length;
      const totalDays = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();
      const totalRequired = totalEmployees * totalDays;

      const summaryRow = [
        '=== SUMMARY ===',
        `Total Employees: ${totalEmployees}`,
        `Total Days: ${totalDays}`,
        `Total Required: ${totalRequired}`,
        `Present: ${totalPresent}`,
        `Absent: ${totalAbsent}`,
        `Half Day: ${totalHalfDay}`,
        `Weekly Off: ${totalWeeklyOff}`,
        `Leave: ${totalLeave}`,
        `Attendance Rate: ${totalRequired > 0 ? ((totalPresent / totalRequired) * 100).toFixed(1) + '%' : '0.0%'}`
      ];

      const emptyRow = headers.map(() => '');

      // Create CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
        emptyRow.join(','),
        summaryRow.join(',')
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${month}_full_month.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Full month data exported successfully!`);

    } catch (error) {
      console.error('Error exporting full month:', error);
      toast.dismiss();
      toast.error('Failed to export full month data');
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || currentUser?.role !== "supervisor") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">Supervisors only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Attendance Management" onMenuClick={onMenuClick} />

      <div className="p-4 space-y-4">
        {/* Date picker + refresh + export */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-36"
            />
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
              Today
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-1" /> Filters
            </Button>
            <Button variant="outline" size="sm" onClick={loadAttendanceRecords}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleExportFullMonth}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Full Month
            </Button>
          </div>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <Card className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Search</Label>
                <Input
                  placeholder="Name or ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Site</Label>
                <Select value={selectedSiteFilter} onValueChange={setSelectedSiteFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {siteOptions.map(site => (
                      <SelectItem key={site} value={site!}>{site}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departmentOptions.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2 w-full sm:w-auto">Clear Filters</Button>
          </Card>
        )}

        {/* Compact summary bar */}
        <div className="flex flex-wrap justify-between items-center gap-2 text-sm bg-gray-50 p-3 rounded-lg">
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-600" /> Present: {summary.present}</span>
            <span className="flex items-center gap-1"><XCircle className="h-4 w-4 text-red-600" /> Absent: {summary.absent}</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-purple-600" /> Weekly Off: {summary.weeklyOff}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-yellow-600" /> Half Day: {summary.halfDay}</span>
          </div>
          <span className="text-xs text-muted-foreground">Total: {summary.total}</span>
        </div>

        {/* Employee list */}
        {filteredEmployees.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p>No employees found</p>
          </Card>
        ) : isMobileView ? (
          <div className="space-y-3">
            {filteredEmployees.map(emp => {
              const record = getEmployeeAttendance(emp);
              const derived = getDerivedAttendanceStatus(record, record?.checkInTime || null);
              const isExpanded = expandedEmployeeId === emp._id;
              return (
                <Card key={emp._id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold flex items-center gap-1">
                        {emp.name}
                        {isEmployeeIncomplete(emp) && (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px] border-amber-200">
                            Incomplete
                          </Badge>
                        )}
                      </h4>
                      <p className="text-xs text-muted-foreground">ID: {emp.employeeId}</p>
                      <p className="text-xs">{emp.department} • {emp.siteName}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(emp._id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadge(derived.status)}>
                        {derived.status === 'half-day' ? 'Half Day' : derived.status}
                      </Badge>
                      {derived.isLate && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">
                          Late
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {/* 1. Mark Present (If Absent, Half-Day, or Weekly Off) */}
                      {derived.status === 'absent' || derived.status === 'half-day' || derived.status === 'weekly-off' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => {
                            setAttendancePhotoTarget(emp);
                            setAttendanceCameraOpen(true);
                          }}
                        >
                          <Camera className="h-4 w-4 mr-1" /> Mark Present
                        </Button>
                      ) : null}

                      {/* 2. Check Out (If Present and not checked out yet) */}
                      {derived.status === 'present' && !record?.checkOutTime ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          onClick={() => {
                            setCheckoutPhotoTarget(emp);
                            setCheckoutCameraOpen(true);
                          }}
                        >
                          <Clock className="h-4 w-4 mr-1" /> Check Out
                        </Button>
                      ) : null}

                      {/* 3. Checked Out (Already checked out) */}
                      {record?.checkOutTime ? (
                        <Button variant="ghost" size="sm" className="text-gray-500 bg-gray-50 cursor-default" disabled>
                          <Clock className="h-4 w-4 mr-1" /> Done
                        </Button>
                      ) : null}

                      {/* 4. Edit (Always visible) */}
                      <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(emp)}>
                        Edit
                      </Button>
                      {/* Employee Status Change */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-600 border-purple-600 hover:bg-purple-50"
                        onClick={() => handleOpenEmployeeStatusDialog(emp)}
                      >
                        <UserCog className="h-4 w-4 mr-1" /> Status
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t text-sm space-y-1">
                      <div className="flex justify-between"><span>Check In:</span><span>{record?.checkInTime ? formatTimeForDisplay(record.checkInTime) : "-"}</span></div>
                      <div className="flex justify-between"><span>Check Out:</span><span>{record?.checkOutTime ? formatTimeForDisplay(record.checkOutTime) : "-"}</span></div>
                      <div className="flex justify-between"><span>Hours:</span><span>{record ? formatHours(record.totalHours) : "-"}</span></div>
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span>
                          {record?.latitude && record?.longitude ? (
                            <a
                              href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              View Map
                            </a>
                          ) : (
                            emp.siteName || '-'
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <div className="flex gap-2">
                          <Badge className={getStatusBadge(derived.status)}>
                            {derived.status === 'half-day' ? 'Half Day' : derived.status}
                          </Badge>
                          {derived.isLate && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">
                              Late
                            </Badge>
                          )}
                        </div>
                      </div>
                      {record?.checkInPhoto && (
                        <button onClick={() => handleViewPhoto(record.checkInPhoto, 'checkin')} className="text-blue-500 text-xs flex items-center gap-1 mt-1">
                          <Camera className="h-3 w-3" /> View Check-in Photo
                        </button>
                      )}
                      {record?.checkOutPhoto && (
                        <button onClick={() => handleViewPhoto(record.checkOutPhoto, 'checkout')} className="text-blue-500 text-xs flex items-center gap-1 mt-1">
                          <Camera className="h-3 w-3" /> View Check-out Photo
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Check In Photo</TableHead>
                  <TableHead>Check Out Photo</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map(emp => {
                  const record = getEmployeeAttendance(emp);
                  const derived = getDerivedAttendanceStatus(record, record?.checkInTime || null);
                  return (
                    <TableRow key={emp._id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {emp.name}
                          {isEmployeeIncomplete(emp) && (
                            <Badge className="bg-amber-100 text-amber-800 text-[10px] border-amber-200">
                              Incomplete
                            </Badge>
                          )}
                        </div>

                      </TableCell>
                      <TableCell>{emp.employeeId}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record?.checkInTime ? formatTimeForDisplay(record.checkInTime) : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record?.checkOutTime ? formatTimeForDisplay(record.checkOutTime) : '-'}
                      </TableCell>
                      <TableCell>
                        {record?.checkInPhoto ? (
                          <Button variant="ghost" size="sm" onClick={() => handleViewPhoto(record.checkInPhoto, 'checkin')}>
                            <Camera className="h-4 w-4" />
                          </Button>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {record?.checkOutPhoto ? (
                          <Button variant="ghost" size="sm" onClick={() => handleViewPhoto(record.checkOutPhoto, 'checkout')}>
                            <Camera className="h-4 w-4" />
                          </Button>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{record ? formatHours(record.totalHours) : '-'}</TableCell>
                      <TableCell>
                        {record?.latitude && record?.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline text-sm"
                          >
                            View Map
                          </a>
                        ) : (
                          emp.siteName || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadge(derived.status)}>
                            {derived.status === 'half-day' ? 'Half Day' : derived.status}
                          </Badge>
                          {derived.isLate && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">
                              Late
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {/* ✅ DYNAMIC ACTIONS BASED ON STATUS */}

                          {/* 1. If Absent / Half-Day / Weekly-Off -> Show Mark Present */}
                          {derived.status === 'absent' || derived.status === 'half-day' || derived.status === 'weekly-off' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => {
                                setAttendancePhotoTarget(emp);
                                setAttendanceCameraOpen(true);
                              }}
                            >
                              <Camera className="h-4 w-4 mr-1" /> Mark Present
                            </Button>
                          ) : null}

                          {/* 2. If Present (Checked In) -> Show Mark Check Out */}
                          {derived.status === 'present' && !record?.checkOutTime ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setCheckoutPhotoTarget(emp);
                                setCheckoutCameraOpen(true);
                              }}
                            >
                              <Camera className="h-4 w-4 mr-1" /> Check Out
                            </Button>
                          ) : null}

                          {/* 3. If Already Checked Out for the day -> Show Disabled Status */}
                          {record?.checkOutTime ? (
                            <Button variant="outline" size="sm" className="text-gray-500 bg-gray-50 border-gray-200 cursor-default" disabled>
                              <Clock className="h-4 w-4 mr-1" /> Checked Out
                            </Button>
                          ) : null}

                          {/* ✅ Always show the Edit (Update Status) button */}
                          <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(emp)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 text-purple-600 border-purple-600"
                            onClick={() => handleOpenEmployeeStatusDialog(emp)}
                          >
                            <UserCog className="h-3 w-3 mr-1" /> Change Status
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {/* ✅ Quick Photo Capture Dialog */}
        <CameraCapture
          open={attendanceCameraOpen}
          onOpenChange={setAttendanceCameraOpen}
          onCapture={handleAttendancePhotoCapture}
          title="Mark Present with Photo"
          description="Take a photo to verify the employee's presence for today."
          actionLabel="Confirm Present"
        />
        {/* ✅ Checkout Photo Capture Dialog */}
        <CameraCapture
          open={checkoutCameraOpen}
          onOpenChange={setCheckoutCameraOpen}
          onCapture={handleCheckoutPhotoCapture}
          title="Check Out with Photo"
          description="Take a photo to verify the employee's checkout for today."
          actionLabel="Confirm Check Out"
        />
      </div>



      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Update Status – {selectedEmployeeForStatus?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Date</Label><Input type="date" value={statusUpdateData.date} onChange={e => setStatusUpdateData({ ...statusUpdateData, date: e.target.value })} /></div>
            <div><Label>Current Status</Label><Badge className={getStatusBadge(statusUpdateData.currentStatus)}>{statusUpdateData.currentStatus}</Badge></div>
            <div>
              <Label>New Status</Label>
              <Select value={statusUpdateData.newStatus} onValueChange={(v: any) => setStatusUpdateData({ ...statusUpdateData, newStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                  <SelectItem value="weekly-off">Weekly Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Remarks</Label><Textarea value={statusUpdateData.remarks} onChange={e => setStatusUpdateData({ ...statusUpdateData, remarks: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitStatusUpdate} disabled={updatingStatus}>{updatingStatus ? "Saving..." : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={employeeStatusDialogOpen} onOpenChange={setEmployeeStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Employment Status – {selectedEmployeeForStatus?.name}</DialogTitle>
            <DialogDescription>
              Update the employee’s overall status (Active, Inactive, or Left).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label>Current Status</Label>
              <Badge className="ml-2">
                {selectedEmployeeForStatus?.status || 'active'}
              </Badge>
            </div>
            <div>
              <Label>New Status</Label>
              <Select
                value={newEmployeeStatus}
                onValueChange={(val: "active" | "inactive" | "left") => setNewEmployeeStatus(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmployeeStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitEmployeeStatusUpdate} disabled={updatingEmployeeStatus}>
              {updatingEmployeeStatus ? "Saving..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{selectedPhotoType === 'checkin' ? 'Check-in Photo' : 'Check-out Photo'}</DialogTitle></DialogHeader>
          {selectedPhoto && <img src={selectedPhoto} alt="Attendance photo" className="rounded-lg w-full" />}
          <DialogFooter><Button onClick={() => setPhotoModalOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;