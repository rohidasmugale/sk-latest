import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { UnifiedCreateModal } from "@/components/shared/UnifiedCreateModal";
import CameraCapture from "../supervisor/CameraCapture";
import { getLocation } from "@/utils/geo";
import {
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Home,
  Shield,
  Car,
  Trash2,
  Droplets,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  List,
  PieChart,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  Receipt,
  AlertTriangle,
  TrendingUp,
  Users,
  Building,
  CalendarDays,
  Filter,
  Eye,
  Loader2,
  RefreshCw,
  Briefcase,
  UserCheck,
  UserX,
  UserMinus,
  UserPlus,
  BarChart3,
  X,
  MapPin,
  Plus,
  Coffee, Timer, LogIn, LogOut, Camera,Cpu, Shirt, Images, Factory, GraduationCap, Megaphone 
} from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
// Recharts for charts
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Import axios for API calls
import axios from 'axios';

// Import site service
import { siteService, Site } from "@/services/SiteService";


interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  department: string;
  position: string;
  joinDate?: string;
  dateOfJoining?: string;
  status: "active" | "inactive" | "left";
  salary: number | string;
  uanNumber?: string;
  uan?: string;
  esicNumber?: string;
  panNumber?: string;
  photo?: string;
  photoPublicId?: string;
  // Additional fields
  siteName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  maritalStatus?: string;
  permanentAddress?: string;
  permanentPincode?: string;
  localAddress?: string;
  localPincode?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  numberOfChildren?: string | number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  pantSize?: string;
  shirtSize?: string;
  capSize?: string;
  idCardIssued?: boolean;
  westcoatIssued?: boolean;
  apronIssued?: boolean;
  employeeSignature?: string;
  authorizedSignature?: string;
  createdAt?: string;
  updatedAt?: string;
  isManager?: boolean;
  isSupervisor?: boolean;
}

interface SalaryStructure {
  id: number;
  employeeId: string;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  otherAllowances: number;
  pf: number;
  esic: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  workingDays: number;
  paidDays: number;
  lopDays: number;
}

// API URL
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// Chart color constants
const CHART_COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  weeklyOff: '#94a3b8',
  payroll: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b4d6', '#ef4444']
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// Helper function to format date
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Interface for attendance record
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
  siteName?: string;
  department?: string;
  shift?: string;
  overtimeHours?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
}

// Interface for employee
interface Employee {
  id: string;
  _id?: string;
  employeeId?: string;
  name: string;
  department: string;
  position: string;
  site: string;
  siteName?: string;
  isManager?: boolean;
  isSupervisor?: boolean;
  status?: string;
  assignedSites?: string[];
}

// Interface for site employee count (ONLY EMPLOYEES ASSIGNED TO SITES)
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
  lastCheckInDate: string | null;
  hasCheckedInToday: boolean;
  hasCheckedOutToday: boolean;
}
// Interface for daily attendance summary (TOTAL ACROSS ALL SITES - ONLY SITE-ASSIGNED EMPLOYEES)
interface DailyAttendanceSummary {
  date: string;
  day: string;
  present: number;
  absent: number;
  weeklyOff: number;
  leave: number;
  total: number;
  rate: string;
  index: number;
  totalEmployees: number;
  sitesWithData: number;
  siteBreakdown?: {
    [siteName: string]: {
      total: number;
      present: number;
      absent: number;
      weeklyOff: number;
      leave: number;
    }
  };
}

// Fetch all employees and count ONLY THOSE ASSIGNED TO SITES
const fetchEmployeesAssignedToSites = async (): Promise<{ employees: Employee[], siteCounts: SiteEmployeeCount[] }> => {
  try {
    console.log('🔄 Fetching employees assigned to sites from API...');

    // First fetch all sites to get valid site names
    const sites = await siteService.getAllSites();
    const validSiteNames = new Set(sites.map(site => site.name));

    console.log(`Found ${sites.length} sites with names:`, Array.from(validSiteNames));

    const response = await axios.get(`${API_URL}/employees`, {
      params: { limit: 5000 }
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

    // Transform employees data and filter ONLY those assigned to valid sites
    const transformedEmployees: Employee[] = [];
    const siteCountMap = new Map<string, number>();

    employeesData.forEach((emp: any) => {
      // Check if employee has a site assignment
      const siteName = emp.site || emp.siteName || '';
      const assignedSites = emp.assignedSites || emp.sites || [];

      // Only include if employee has a valid site assignment
      const hasValidSite = siteName && validSiteNames.has(siteName);
      const hasValidAssignedSites = Array.isArray(assignedSites) && assignedSites.some((site: string) => validSiteNames.has(site));

      if (hasValidSite || hasValidAssignedSites) {
        const employeeSite = hasValidSite ? siteName : (assignedSites.find((site: string) => validSiteNames.has(site)) || 'Unknown Site');

        const employee: Employee = {
          id: emp._id || emp.id || `emp_${Math.random()}`,
          _id: emp._id || emp.id,
          employeeId: emp.employeeId || emp.employeeID || `EMP${String(Math.random()).slice(2, 6)}`,
          name: emp.name || emp.employeeName || "Unknown Employee",
          department: emp.department || emp.department || "Unknown Department",
          position: emp.position || emp.designation || emp.role || "Employee",
          site: employeeSite,
          siteName: employeeSite,
          assignedSites: assignedSites,
          isManager: (emp.position?.toLowerCase() || '').includes('manager') || (emp.department?.toLowerCase() || '').includes('manager'),
          isSupervisor: (emp.position?.toLowerCase() || '').includes('supervisor') || (emp.department?.toLowerCase() || '').includes('supervisor')
        };

        transformedEmployees.push(employee);

        // Count employees per site
        siteCountMap.set(employeeSite, (siteCountMap.get(employeeSite) || 0) + 1);
      }
    });

    const siteCounts: SiteEmployeeCount[] = Array.from(siteCountMap.entries()).map(([siteName, count]) => ({
      siteName,
      totalEmployees: count
    }));

    console.log(`✅ Loaded ${transformedEmployees.length} employees ASSIGNED TO SITES from API`);
    console.log(`📊 Employee count per site:`, siteCounts);

    return {
      employees: transformedEmployees,
      siteCounts
    };
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    throw new Error(`Error loading employees: ${error.message}`);
  }
};

// Fetch attendance data from API and calculate totals across ALL SITES (ONLY SITE-ASSIGNED EMPLOYEES)
const fetchAttendanceData = async (days: number = 30): Promise<DailyAttendanceSummary[]> => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    const employeesWithCounts = await fetchEmployeesAssignedToSites();
    const siteAssignedEmployees = employeesWithCounts.employees;

   const staffEmployees = siteAssignedEmployees; // include everyone
const totalStaffAssignedToSites = staffEmployees.length;
    // Build lookup: MongoDB _id → employee (for matching attendance records)
    const staffById = new Map<string, Employee>();
    staffEmployees.forEach(emp => {
      if (emp._id) staffById.set(emp._id, emp);
      if (emp.id) staffById.set(emp.id, emp);
    });
// Also build lookup by name (fallback)
const staffByName = new Map<string, Employee>();
staffEmployees.forEach(emp => {
  if (emp.name) staffByName.set(emp.name, emp);
});
    // Build employee ID → siteName map for backfilling missing siteName on records
   // Build employee ID → siteName map from ALL employees (not just staff)
const empIdToSite = new Map<string, string>();
siteAssignedEmployees.forEach(emp => {
  const mongoId = emp._id || emp.id;
  if (mongoId) empIdToSite.set(mongoId, emp.site || emp.siteName || '');
});

    // Fetch attendance records
    let allRecords: AttendanceRecord[] = [];
    try {
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { startDate: startDateStr, endDate: endDateStr, limit: 10000 }
      });
      if (response.data?.success && Array.isArray(response.data.data)) {
        allRecords = response.data.data;
      } else if (Array.isArray(response.data)) {
        allRecords = response.data;
      }
    } catch {
      // day-by-day fallback
      const tempDate = new Date(startDate);
      while (tempDate <= endDate) {
        const dateStr = formatDate(tempDate);
        try {
          const r = await axios.get(`${API_URL}/attendance`, { params: { date: dateStr } });
          const recs = r.data?.success ? r.data.data : Array.isArray(r.data) ? r.data : [];
          allRecords.push(...recs);
        } catch { /* skip */ }
        tempDate.setDate(tempDate.getDate() + 1);
        await new Promise(res => setTimeout(res, 50));
      }
    }

    // Backfill missing siteName using employee lookup
    allRecords.forEach(record => {
      if (!record.siteName && empIdToSite.has(record.employeeId)) {
        record.siteName = empIdToSite.get(record.employeeId)!;
      }
    });

    // Keep only staff records
    const staffRecords = allRecords.filter(r =>
  staffById.has(r.employeeId) ||
  (r.employeeName && staffByName.has(r.employeeName))
);

    // Build per-site staff counts
    const staffSiteCounts: { [site: string]: number } = {};
    staffEmployees.forEach(emp => {
      const site = emp.site || emp.siteName || 'Unknown';
      staffSiteCounts[site] = (staffSiteCounts[site] || 0) + 1;
    });

    // Initialize daily summaries
    const dailySummaries: { [key: string]: DailyAttendanceSummary } = {};
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateStr = formatDate(cur);
      const dayName = cur.toLocaleDateString('en-US', { weekday: 'long' });
      dailySummaries[dateStr] = {
        date: dateStr,
        day: dateStr === formatDate(new Date()) ? 'Today'
          : dateStr === formatDate(new Date(Date.now() - 86400000)) ? 'Yesterday'
          : dayName,
        present: 0, absent: 0, weeklyOff: 0, leave: 0,
        total: 0, rate: '0.0%', index: 0,
        totalEmployees: totalStaffAssignedToSites,
        sitesWithData: 0,
        siteBreakdown: {}
      };
      // Initialize site breakdown
      Object.entries(staffSiteCounts).forEach(([site, count]) => {
        dailySummaries[dateStr].siteBreakdown![site] = {
          total: count, present: 0, absent: 0, weeklyOff: 0, leave: 0
        };
      });
      cur.setDate(cur.getDate() + 1);
    }

    // ✅ THE FIX: removed the ! — condition is now positive
    staffRecords.forEach(record => {
      const summary = dailySummaries[record.date];
      if (!summary) return; // skip records outside date range

      const status = (record.status || '').toLowerCase().trim();

      // Update daily totals
      if (status === 'present') { summary.present++; }
      else if (status === 'half-day') { summary.present += 0.5; }
      else if (status === 'weekly-off') { summary.weeklyOff++; }
      else if (status === 'leave') { summary.leave++; }
      else { summary.absent++; } // 'absent' or unknown

      // Update site breakdown if siteName matches
      const siteKey = record.siteName;
      if (siteKey && summary.siteBreakdown?.[siteKey]) {
        const sb = summary.siteBreakdown[siteKey];
        if (status === 'present') { sb.present++; }
        else if (status === 'half-day') { sb.present += 0.5; }
        else if (status === 'weekly-off') { sb.weeklyOff++; }
        else if (status === 'leave') { sb.leave++; }
        else { sb.absent++; }
      }
    });

    // Fill unaccounted employees as absent, then compute rate
    Object.values(dailySummaries).forEach(summary => {
      const accounted = summary.present + summary.weeklyOff + summary.leave + summary.absent;
      if (accounted < summary.totalEmployees) {
        summary.absent += (summary.totalEmployees - accounted);
      }
      // Also fill site breakdown gaps
      Object.values(summary.siteBreakdown || {}).forEach(sb => {
        const siteAccounted = sb.present + sb.weeklyOff + sb.leave + sb.absent;
        if (siteAccounted < sb.total) sb.absent += (sb.total - siteAccounted);
      });
      const onSchedule = summary.present + summary.weeklyOff;
      summary.rate = summary.totalEmployees > 0
        ? ((onSchedule / summary.totalEmployees) * 100).toFixed(1) + '%'
        : '0.0%';
    });

    return Object.values(dailySummaries).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  } catch (error: any) {
    console.error('Error fetching attendance data:', error);
    toast.error('Failed to fetch attendance data');
    return generateDemoAttendanceData(days);
  }
};

// Update the generateDemoAttendanceData function to match the expected pattern from your attendance view
const generateDemoAttendanceData = (days: number): DailyAttendanceSummary[] => {
  console.log('Generating demo attendance data (only site-assigned employees)...');
  const data = [];
  const today = new Date();

  // Demo site counts (only sites that exist)
  const demoSites = [
    'ALYSSUM DEVELOPERS PVT. LTD.',
    'ARYA ASSOCIATES',
    'ASTITVA ASSET MANAGEMENT LLP',
    'A.T.C COMMERCIAL PREMISES CO. OPERATIVE SOCIETY LTD',
    'BAHIRAT ESTATE LLP',
    'CHITRALI PROPERTIES PVT LTD',
    'Concretely Infra Llp',
    'COORTUS ADVISORS LLP',
    'CUSHMAN & WAKEFIELD PROPERTY MANAGEMENT SERVICES INDIA PVT. LTD.'
  ];

  // Demo employee counts per site - MATCHING YOUR ATTENDANCE VIEW EXAMPLE
  // Total 4 employees: 1 present, 2 absent, 1 weekly off
  const siteEmployeeCounts: { [key: string]: number } = {
    'ALYSSUM DEVELOPERS PVT. LTD.': 4
  };

  const totalEmployees = Object.values(siteEmployeeCounts).reduce((a, b) => a + b, 0);

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    const dayName = i === 0 ? 'Today' :
      i === 1 ? 'Yesterday' :
        date.toLocaleDateString('en-US', { weekday: 'long' });

    let totalPresent = 0;
    let totalWeeklyOff = 0;
    let totalLeave = 0;
    let totalAbsent = 0;

    const siteBreakdown: { [siteName: string]: { total: number; present: number; absent: number; weeklyOff: number; leave: number } } = {};

    // Calculate per site - MATCHING YOUR ATTENDANCE VIEW EXAMPLE
    Object.entries(siteEmployeeCounts).forEach(([siteName, siteTotal]) => {
      if (siteTotal === 4) {
        // Match your example: 1 present, 2 absent, 1 weekly off
        totalPresent = 1;
        totalWeeklyOff = 1;
        totalAbsent = 2;
        totalLeave = 0;

        siteBreakdown[siteName] = {
          total: siteTotal,
          present: 1,
          absent: 2,
          weeklyOff: 1,
          leave: 0
        };
      } else {
        // For other sites, use realistic distribution
        let present, weeklyOff, leave, absent;

        if (isWeekend) {
          // Weekend pattern
          weeklyOff = Math.floor(siteTotal * 0.7);
          present = Math.floor(siteTotal * 0.2);
          leave = Math.floor(siteTotal * 0.05);
          absent = siteTotal - present - weeklyOff - leave;
        } else {
          // Weekday pattern
          present = Math.floor(siteTotal * 0.75);
          weeklyOff = Math.floor(siteTotal * 0.05);
          leave = Math.floor(siteTotal * 0.05);
          absent = siteTotal - present - weeklyOff - leave;
        }

        siteBreakdown[siteName] = {
          total: siteTotal,
          present,
          absent,
          weeklyOff,
          leave
        };

        totalPresent += present;
        totalWeeklyOff += weeklyOff;
        totalLeave += leave;
        totalAbsent += absent;
      }
    });

    const totalPresentWithWO = totalPresent + totalWeeklyOff;
    const rate = totalEmployees > 0 ? ((totalPresentWithWO / totalEmployees) * 100).toFixed(1) + '%' : '0.0%';

    data.push({
      date: date.toISOString().split('T')[0],
      day: dayName,
      present: totalPresent,
      absent: totalAbsent,
      weeklyOff: totalWeeklyOff,
      leave: totalLeave,
      total: totalEmployees,
      rate,
      index: i,
      totalEmployees,
      sitesWithData: demoSites.length,
      siteBreakdown
    });
  }

  return data;
};


// Generate payroll data
const generatePayrollData = () => {
  const payrollData = [];
  const siteNames = [
    'ALYSSUM DEVELOPERS PVT. LTD.',
    'ARYA ASSOCIATES',
    'ASTITVA ASSET MANAGEMENT LLP',
    'A.T.C COMMERCIAL PREMISES CO. OPERATIVE SOCIETY LTD',
    'BAHIRAT ESTATE LLP',
    'CHITRALI PROPERTIES PVT LTD',
    'Concretely Infra Llp',
    'COORTUS ADVISORS LLP',
    'CUSHMAN & WAKEFIELD PROPERTY MANAGEMENT SERVICES INDIA PVT. LTD.',
  ];

  siteNames.forEach((siteName, index) => {
    const billingAmount = Math.floor(Math.random() * 500000) + 200000;
    const totalPaid = Math.floor(Math.random() * billingAmount * 0.8) + (billingAmount * 0.2);
    const holdSalary = billingAmount - totalPaid;

    const remarks = [
      'Payment processed',
      'Pending approval',
      'Under review',
      'Payment scheduled',
      'Awaiting documents',
      'Completed',
      'On hold'
    ];

    payrollData.push({
      id: index + 1,
      siteName,
      billingAmount,
      totalPaid,
      holdSalary: holdSalary > 0 ? holdSalary : 0,
      remark: remarks[Math.floor(Math.random() * remarks.length)],
      status: holdSalary > 0 ? 'Pending' : 'Paid'
    });
  });

  return payrollData;
};

const years = ['2024', '2023', '2022', '2021'];
const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

// Enhanced Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <motion.div
      className="flex items-center justify-between px-2 py-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-semibold">{startItem}-{endItem}</span> of{" "}
        <span className="font-semibold">{totalItems}</span> entries
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }

          return (
            <motion.div
              key={pageNum}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className="min-w-[2rem] hover:shadow-md transition-shadow"
              >
                {pageNum}
              </Button>
            </motion.div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0 hover:scale-105 transition-transform"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// Export to Excel function
const exportToExcel = (data: any[], filename: string) => {
  const headers = ['Site Name', 'Billing Amount (₹)', 'Total Paid (₹)', 'Hold Salary (₹)', 'Difference (₹)', 'Status', 'Remark'];

  const csvContent = [
    headers.join(','),
    ...data.map(item => {
      const difference = item.billingAmount - item.totalPaid + item.holdSalary;
      return [
        `"${item.siteName}"`,
        item.billingAmount,
        item.totalPaid,
        item.holdSalary,
        difference,
        item.status,
        `"${item.remark}"`
      ].join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
// Mobile Stat Card Component
const MobileStatCard = ({ title, value, icon: Icon, color = "primary", subtitle }: any) => {
  const colorClasses: Record<string, string> = {
    primary: "text-blue-600 bg-blue-100",
    success: "text-green-600 bg-green-100",
    warning: "text-yellow-600 bg-yellow-100",
    danger: "text-red-600 bg-red-100",
    purple: "text-purple-600 bg-purple-100"
  };

  return (
    <Card className="overflow-hidden rounded-xl border-0 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground truncate">{title}</p>
            <p className="text-base font-bold mt-0.5 truncate">{value}</p>
            {subtitle && <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg flex-shrink-0 ml-2 ${colorClasses[color]}`}>
            <Icon className="h-3 w-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mobile Payroll Card Component
const MobilePayrollCard = ({ item, formatCurrency, index }: any) => {
  const [expanded, setExpanded] = useState(false);
  const difference = item.billingAmount - item.totalPaid + item.holdSalary;

  return (
    <Card className="mb-3 rounded-xl border-0 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{item.siteName.split(',')[0]}</h3>
              <Badge variant={item.status === 'Paid' ? 'default' : 'secondary'} className="text-[9px] px-1.5">{item.status}</Badge>
            </div>
            <p className="text-xs font-bold text-blue-600 mt-1">{formatCurrency(item.billingAmount)}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 pt-3 border-t space-y-2"
          >
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Total Paid</p>
                <p className="font-medium text-green-600">{formatCurrency(item.totalPaid)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Hold Salary</p>
                <p className="font-medium text-orange-600">{formatCurrency(item.holdSalary)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Difference</p>
                <p className={`font-medium ${difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(difference)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Remark</p>
                <p className="font-medium text-xs">{item.remark}</p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
const ManagerDashboard = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [employees, setEmployees] = useState<Employee[]>([]);
  // Dynamic department data based on real employees
  // Allowed departments in desired display order (always show all, even if zero)
  const allowedDepartments = [
    { name: 'Housekeeping', icon: Home, color: 'from-blue-50 to-blue-100 border-blue-200' },
    { name: 'Security', icon: Shield, color: 'from-green-50 to-green-100 border-green-200' },
    { name: 'Waste Management', icon: Trash2, color: 'from-gray-50 to-gray-100 border-gray-200' },
    { name: 'Parking Management', icon: Car, color: 'from-purple-50 to-purple-100 border-purple-200' },
    { name: 'Consumables', icon: ShoppingCart, color: 'from-orange-50 to-orange-100 border-orange-200' },
    { name: 'Other', icon: Droplets, color: 'from-cyan-50 to-cyan-100 border-cyan-200' }
  ];

  // Dynamic department data – always show all allowed departments, count only staff (exclude managers/supervisors)
  const departmentData = useMemo(() => {
    // Create mapping from raw department to allowed name (case-insensitive, partial match)
    const allowedMap = new Map<string, string>(); // raw -> allowed
    allowedDepartments.forEach(dept => {
      allowedMap.set(dept.name.toLowerCase(), dept.name);
    });
    // Additional mapping for variations
    const mapping: Record<string, string> = {
      'parking management': 'Parking',
      'housekeeping': 'Housekeeping',
      'security': 'Security',
      'waste management': 'Waste Management',
      'consumables': 'Consumables',
      'other': 'Other'
    };

    // Count employees per allowed department (only staff, not managers/supervisors)
    const countMap = new Map<string, number>();
    employees.forEach(emp => {
      // Exclude managers and supervisors
      if (emp.isManager || emp.isSupervisor) return;
      const deptRaw = emp.department?.trim().toLowerCase() || '';
      if (!deptRaw) return;
      // Try to map to allowed department
      let allowedDept = mapping[deptRaw];
      if (!allowedDept) {
        for (const [key, value] of Object.entries(mapping)) {
          if (deptRaw.includes(key) || key.includes(deptRaw)) {
            allowedDept = value;
            break;
          }
        }
      }
      if (allowedDept) {
        countMap.set(allowedDept, (countMap.get(allowedDept) || 0) + 1);
      }
    });

    // Build final array in allowed order, always include all departments (even with 0)
    return allowedDepartments.map(dept => ({
      department: dept.name,
      total: countMap.get(dept.name) || 0,
      present: countMap.get(dept.name) || 0, // just show total count
      icon: dept.icon,
      color: dept.color
    }));
  }, [employees]);
  const navigate = useNavigate();



  // ... rest of your state declarations
  // State for attendance data
  const [attendanceData, setAttendanceData] = useState<DailyAttendanceSummary[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [refreshingAttendance, setRefreshingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [totalEmployeesAssignedToSites, setTotalEmployeesAssignedToSites] = useState(0);
  const [sites, setSites] = useState<Site[]>([]);
  const [siteEmployeeCounts, setSiteEmployeeCounts] = useState<SiteEmployeeCount[]>([]);
// Attendance marking state
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
  hasCheckedOutToday: false,
});
const [cameraOpen, setCameraOpen] = useState(false);
const [cameraAction, setCameraAction] = useState<'checkin' | 'checkout' | 'recognize' | null>(null);
const [uploadingPhoto, setUploadingPhoto] = useState(false);
const [weeklyOffDialogOpen, setWeeklyOffDialogOpen] = useState(false);
const [selectedEmployeeForWeeklyOff, setSelectedEmployeeForWeeklyOff] = useState<Employee | null>(null);
const [weeklyOffLoading, setWeeklyOffLoading] = useState(false);
  // State for UI navigation
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [sixDaysStartIndex, setSixDaysStartIndex] = useState(1);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [payrollData, setPayrollData] = useState(generatePayrollData());
  const [payrollTab, setPayrollTab] = useState('list-view');
  const [selectedSite, setSelectedSite] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSiteBreakdown, setShowSiteBreakdown] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);


  // Load attendance status for the logged‑in admin
const loadMyAttendanceStatus = async () => {
  try {
    const storedUser = localStorage.getItem("sk_user");
    const userId = storedUser ? JSON.parse(storedUser)._id : null;
    if (!userId) return;
    const response = await axios.get(`${API_URL}/attendance/status/${userId}`);
    if (response.data.success && response.data.data) {
      const api = response.data.data;
      const today = new Date().toDateString();
      const lastCheckInDate = api.lastCheckInDate ? new Date(api.lastCheckInDate).toDateString() : null;
      setAttendance({
        isCheckedIn: api.isCheckedIn || false,
        isOnBreak: api.isOnBreak || false,
        checkInTime: api.checkInTime || null,
        checkOutTime: api.checkOutTime || null,
        checkInPhoto: api.checkInPhoto || null,
        checkOutPhoto: api.checkOutPhoto || null,
        breakStartTime: api.breakStartTime || null,
        breakEndTime: api.breakEndTime || null,
        totalHours: Number(api.totalHours) || 0,
        breakTime: Number(api.breakTime) || 0,
        lastCheckInDate: api.lastCheckInDate || null,
        hasCheckedInToday: lastCheckInDate === today,
        hasCheckedOutToday: api.checkOutTime && new Date(api.checkOutTime).toDateString() === today,
      });
    }
  } catch (error) {
    console.error("Failed to load admin attendance", error);
  }
};

// Break handlers
const handleBreakIn = async () => {
  if (!attendance.isCheckedIn) return toast.error("Check in first");
  if (attendance.isOnBreak) return toast.error("Already on break");
  try {
    await axios.post(`${API_URL}/attendance/breakin`, { employeeId: getCurrentAdminId() });
    setAttendance({ ...attendance, isOnBreak: true, breakStartTime: new Date().toISOString() });
    toast.success("Break started");
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Break failed");
  }
};

const handleBreakOut = async () => {
  if (!attendance.isOnBreak) return toast.error("Not on break");
  try {
    await axios.post(`${API_URL}/attendance/breakout`, { employeeId: getCurrentAdminId() });
    const breakTime = calculateBreakTime(attendance.breakStartTime, new Date().toISOString());
    setAttendance({
      ...attendance,
      isOnBreak: false,
      breakEndTime: new Date().toISOString(),
      breakTime: attendance.breakTime + breakTime,
    });
    toast.success("Break ended");
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Break end failed");
  }
};
// Add this function
const handleAttendanceCamera = () => {
  setCameraAction('recognize');
  setCameraOpen(true);
};
// Camera capture handler (same as supervisor)
const handlePhotoCapture = async (photoFile: File) => {
  if (!cameraAction) return;
  setUploadingPhoto(true);
  try {
    // Face recognition path
    if (cameraAction === 'recognize') {
      const photoClone = new File([photoFile], photoFile.name, { type: photoFile.type });
      const formData = new FormData();
      formData.append('photo', photoClone);
      const recognizeRes = await axios.post(`${API_URL}/attendance/face-recognize`, formData);
      if (!recognizeRes.data.success) {
        toast.error(recognizeRes.data.message || 'Face not recognized');
        setCameraOpen(false);
        return;
      }
      const { employeeId, employeeName } = recognizeRes.data.data;
      const statusRes = await axios.get(`${API_URL}/attendance/status/${employeeId}`);
      const hasCheckedInToday = statusRes.data.data.hasCheckedInToday;
      const hasCheckedOutToday = statusRes.data.data.hasCheckedOutToday;
      if (hasCheckedOutToday) {
        toast.info(`${employeeName} has already completed today's attendance.`);
        setCameraOpen(false);
        return;
      }
      const action = !hasCheckedInToday ? 'checkin' : 'checkout';
      const attendFormData = new FormData();
      attendFormData.append('photo', photoClone);
      attendFormData.append('employeeId', employeeId);
      attendFormData.append('employeeName', employeeName);
      try {
        const location = await getLocation();
        attendFormData.append('latitude', location.lat.toString());
        attendFormData.append('longitude', location.lng.toString());
      } catch (locErr) {
        toast.warning("Location not available – check‑in/out continues without location");
      }
      const endpoint = action === 'checkin'
        ? `${API_URL}/attendance/checkin-with-photo`
        : `${API_URL}/attendance/checkout-with-photo`;
      const attendRes = await axios.post(endpoint, attendFormData);
      if (attendRes.data.success) {
        toast.success(`${employeeName} ${action === 'checkin' ? 'checked in' : 'checked out'} with face recognition!`);
        loadMyAttendanceStatus();
        loadAttendanceData(true);
      } else {
        toast.error(attendRes.data.message || 'Attendance recording failed');
      }
      setCameraOpen(false);
      return;
    }

    // Fallback for manual checkin/checkout (kept for compatibility)
    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('employeeId', getCurrentAdminId());
    const endpoint = cameraAction === 'checkin'
      ? `${API_URL}/attendance/checkin-with-photo`
      : `${API_URL}/attendance/checkout-with-photo`;
    const response = await axios.post(endpoint, formData);
    if (response.data.success) {
      toast.success(`Admin ${cameraAction === 'checkin' ? 'checked in' : 'checked out'}`);
      loadMyAttendanceStatus();
    }
  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setUploadingPhoto(false);
    setCameraOpen(false);
    setCameraAction(null);
  }
};
    

// Weekly off marking (for any employee – admin has full access)
const handleMarkWeeklyOff = async () => {
  if (!selectedEmployeeForWeeklyOff) return;
  setWeeklyOffLoading(true);
  try {
    await axios.post(`${API_URL}/attendance/update-status`, {
      employeeId: selectedEmployeeForWeeklyOff._id,
      date: new Date().toISOString().split('T')[0],
      status: 'weekly-off',
      remarks: 'Marked by admin',
    });
    toast.success(`Weekly off marked for ${selectedEmployeeForWeeklyOff.name}`);
    setWeeklyOffDialogOpen(false);
    // Optionally refresh attendance data
    loadAttendanceData(true);
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Failed");
  } finally {
    setWeeklyOffLoading(false);
  }
};

const getCurrentAdminId = () => {
  const stored = localStorage.getItem("sk_user");
  if (stored) return JSON.parse(stored)._id;
  return "admin-demo";
};
const calculateBreakTime = (start: string | null, end: string | null): number => {
  if (!start || !end) return 0;
  return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
};
  const itemsPerPage = 5;
  const fetchEmployeesData = async () => {
    try {
      const { employees: empList } = await fetchEmployeesAssignedToSites();
      setEmployees(empList);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    fetchEmployeesData();
  }, []);

  // Load attendance data on component mount
  useEffect(() => {
    loadAttendanceData();
    loadSites();
  }, []);
  // Load sites data
  const loadSites = async () => {
    try {
      const sitesData = await siteService.getAllSites();
      setSites(sitesData);
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  };

  // Function to load attendance data
  const loadAttendanceData = async (showRefreshToast: boolean = false) => {
    try {
      if (showRefreshToast) {
        setRefreshingAttendance(true);
      } else {
        setLoadingAttendance(true);
      }
      setAttendanceError(null);

      const data = await fetchAttendanceData(30);
      setAttendanceData(data);

      if (data.length > 0) {
        setTotalEmployeesAssignedToSites(data[0].totalEmployees);

        // Extract site employee counts from the first day's breakdown
        if (data[0].siteBreakdown) {
          const counts = Object.entries(data[0].siteBreakdown).map(([siteName, siteData]) => ({
            siteName,
            totalEmployees: siteData.total
          }));
          setSiteEmployeeCounts(counts);
        }
      }

      // Reset indices if needed
      if (data.length > 0) {
        setCurrentDayIndex(0);
        setSixDaysStartIndex(Math.min(1, data.length - 6));
      }

      if (showRefreshToast) {
        toast.success('Attendance data refreshed successfully');
      }
    } catch (error: any) {
      console.error('Failed to load attendance data:', error);
      setAttendanceError(error.message || 'Failed to load attendance data');
      toast.error('Failed to load attendance data', {
        description: error.message || 'Please try again later'
      });
    } finally {
      setLoadingAttendance(false);
      setRefreshingAttendance(false);
    }
  };

  // Handle refresh
  const handleRefreshAttendance = () => {
    loadAttendanceData(true);
  };

  // Get current day data
  const currentDayData = useMemo(() => {
    if (attendanceData.length === 0) {
      return {
        date: new Date().toISOString().split('T')[0],
        day: 'Today',
        present: 0,
        absent: 0,
        weeklyOff: 0,
        leave: 0,
        total: 0,
        rate: '0.0%',
        index: 0,
        totalEmployees: totalEmployeesAssignedToSites,
        sitesWithData: 0,
        siteBreakdown: {}
      };
    }
    return attendanceData[currentDayIndex] || attendanceData[0];
  }, [attendanceData, currentDayIndex, totalEmployeesAssignedToSites]);

  // Get six days data
  const sixDaysData = useMemo(() => {
    if (attendanceData.length === 0) return [];
    return attendanceData.slice(sixDaysStartIndex, sixDaysStartIndex + 6);
  }, [attendanceData, sixDaysStartIndex]);

  // Current day pie data (present vs absent) - FIXED: Weekly off and leave are not counted as absent
  const currentDayPieData = [
    { name: 'Present', value: currentDayData.present, color: CHART_COLORS.present },
    { name: 'Weekly Off', value: currentDayData.weeklyOff, color: CHART_COLORS.weeklyOff },
    { name: 'Absent', value: currentDayData.absent, color: CHART_COLORS.absent }
  ].filter(item => item.value > 0);

  // Detailed pie data with all categories
  const detailedPieData = [
    { name: 'Present', value: currentDayData.present, color: CHART_COLORS.present },
    { name: 'Weekly Off', value: currentDayData.weeklyOff, color: CHART_COLORS.weeklyOff },
    { name: 'Absent', value: currentDayData.absent, color: CHART_COLORS.absent }
  ].filter(item => item.value > 0);

  // Payroll summary
  const payrollSummary = useMemo(() => {
    const totalBilling = payrollData.reduce((sum, item) => sum + item.billingAmount, 0);
    const totalPaid = payrollData.reduce((sum, item) => sum + item.totalPaid, 0);
    const totalHold = payrollData.reduce((sum, item) => sum + item.holdSalary, 0);
    const totalDifference = payrollData.reduce((sum, item) => sum + (item.billingAmount - item.totalPaid + item.holdSalary), 0);

    return {
      totalBilling,
      totalPaid,
      totalHold,
      totalDifference,
      completionRate: ((totalPaid / totalBilling) * 100).toFixed(1)
    };
  }, [payrollData]);

  // Filtered payroll data
  const filteredPayrollData = useMemo(() => {
    return payrollData.filter(item =>
      item.siteName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [payrollData, searchTerm]);

  // Paginated payroll data
  const paginatedPayrollData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayrollData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayrollData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPayrollData.length / itemsPerPage);
  const selectedSiteData = payrollData.find(item => item.siteName === selectedSite);

  // Site pie chart data
  const sitePieChartData = selectedSiteData ? [
    { name: 'Total Paid', value: selectedSiteData.totalPaid, color: CHART_COLORS.payroll[1] },
    { name: 'Hold Salary', value: selectedSiteData.holdSalary, color: CHART_COLORS.payroll[5] }
  ] : [];

  // Navigation handlers
  const handlePreviousDay = () => {
    setCurrentDayIndex(prev => (prev > 0 ? prev - 1 : attendanceData.length - 1));
  };

  const handleNextDay = () => {
    setCurrentDayIndex(prev => (prev < attendanceData.length - 1 ? prev + 1 : 0));
  };

  const handleSixDaysPrevious = () => {
    setSixDaysStartIndex(prev => {
      const newIndex = prev + 6;
      const maxIndex = attendanceData.length - 6;
      return newIndex <= maxIndex ? newIndex : prev;
    });
  };

  const handleSixDaysNext = () => {
    setSixDaysStartIndex(prev => {
      const newIndex = prev - 6;
      return newIndex >= 1 ? newIndex : prev;
    });
  };

  const canGoSixDaysPrevious = sixDaysStartIndex < attendanceData.length - 6;
  const canGoSixDaysNext = sixDaysStartIndex > 1;

  const getDateRangeText = () => {
    if (sixDaysData.length === 0) return '';

    const firstDate = new Date(sixDaysData[0].date);
    const lastDate = new Date(sixDaysData[sixDaysData.length - 1].date);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };

    return `${formatDate(firstDate)} - ${formatDate(lastDate)}`;
  };

  const handlePayrollFilterChange = () => {
    setPayrollData(generatePayrollData());
    setCurrentPage(1);
    toast.success(`Payroll data updated for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleExportToExcel = () => {
    const monthName = months.find(m => m.value === selectedMonth)?.label;
    const filename = `Payroll_Data_${monthName}_${selectedYear}.csv`;

    exportToExcel(filteredPayrollData, filename);
    toast.success(`Payroll data exported to ${filename}`);
  };

 const handlePieChartClick = (date?: string) => {
  const selectedDate = date || currentDayData.date;
  navigate(`/manager/managerattendance?view=site&startDate=${selectedDate}&endDate=${selectedDate}`);
};

 const handleSmallPieChartClick = (dayData: any) => {
  navigate(`/manager/managerattendance?view=site&startDate=${dayData.date}&endDate=${dayData.date}`);
};
  const handleDepartmentCardClick = (department: string) => {
  const today = new Date().toISOString().split('T')[0];
  navigate(`/manager/managerattendance?view=department&department=${department}&startDate=${today}&endDate=${today}`);
};
  // Custom tooltips
 
   
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateDifference = (item: any) => {
    return item.billingAmount - item.totalPaid + item.holdSalary;
  };

  // Custom tooltip for attendance pie chart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-3 border rounded-lg shadow-lg"
      >
        <p className="font-semibold text-sm">{data.name}</p>
        <p className="text-sm" style={{ color: data.payload.fill }}>
          {data.value} employees ({((data.value / currentDayData.totalEmployees) * 100).toFixed(1)}%)
        </p>
      </motion.div>
    );
  }
  return null;
};

// Custom tooltip for payroll pie chart (if you keep payroll section)
const CustomPayrollTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-3 border rounded-lg shadow-lg"
      >
        <p className="font-semibold text-sm">{data.name}</p>
        <p className="text-sm" style={{ color: data.payload.fill }}>
          {formatCurrency(data.value)} ({((data.value / (selectedSiteData?.billingAmount || 1)) * 100).toFixed(1)}%)
        </p>
      </motion.div>
    );
  }
  return null;
};
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-gray-50/50">
      <DashboardHeader
        title={
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-base sm:text-lg">
             Manager Dashboard
          </span>
        }
        onMenuClick={onMenuClick}
      />
{/* Attendance row – exactly like supervisor dashboard */}
<div className="px-3 sm:px-4 mt-2 flex flex-wrap items-center gap-2">
  <Button onClick={handleAttendanceCamera} variant="default" size="sm" className="flex items-center gap-1">
    <Camera className="h-4 w-4" /> Attendance
  </Button>
  <Button onClick={handleBreakIn} disabled={!attendance.isCheckedIn || attendance.isOnBreak} variant="outline" size="sm">
    <Coffee className="h-4 w-4 mr-1" /> Break In
  </Button>
  <Button onClick={handleBreakOut} disabled={!attendance.isOnBreak} variant="outline" size="sm">
    <Timer className="h-4 w-4 mr-1" /> Break Out
  </Button>
  <div className="flex items-center gap-2 ml-auto sm:ml-0">
    <Badge 
      variant={attendance.hasCheckedOutToday ? "default" : attendance.hasCheckedInToday ? "secondary" : "outline"} 
      className="text-xs"
    >
      {attendance.hasCheckedOutToday ? "Completed" : attendance.hasCheckedInToday ? "In Progress" : "Not Started"}
    </Badge>
    <span className="text-xs text-muted-foreground whitespace-nowrap">
      Hours: {attendance.totalHours.toFixed(1)}h
    </span>
  </div>
  <Button onClick={handleRefreshAttendance} variant="ghost" size="sm" className="ml-auto">
    <RefreshCw className={`h-4 w-4 ${refreshingAttendance ? "animate-spin" : ""}`} />
  </Button>
   <Button
          onClick={() => setQuickCreateOpen(true)}
          className="rounded-full h-10 w-10 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          <Plus className="h-5 w-5" />
        </Button>
</div>
    
    
<UnifiedCreateModal
  open={quickCreateOpen}
  onOpenChange={setQuickCreateOpen}
  employees={employees as any}
  setEmployees={setEmployees as any}
  onSuccess={() => {
    loadAttendanceData();
    loadSites();
    fetchEmployeesData();
  }}
  allowedTabs={['employee', 'supervisor']}   // ✅ no 'admin'
/>

      <div className="p-3 space-y-3">
        {/* Attendance Card – compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-blue-100/50 shadow-sm">
            <CardContent className="p-3">
              {loadingAttendance ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : attendanceData.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs">No attendance data</p>
                  <Button onClick={handleRefreshAttendance} variant="outline" size="sm" className="mt-2 h-7 text-xs">
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  {/* 6 days small pie charts – more compact */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Historical
                      </h3>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSixDaysPrevious}
                          disabled={!canGoSixDaysPrevious}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSixDaysNext}
                          disabled={!canGoSixDaysNext}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {sixDaysData.map((dayData, idx) => {
                        const pieData = [
                          { name: 'Present', value: dayData.present, color: CHART_COLORS.present },
                          { name: 'Weekly Off', value: dayData.weeklyOff, color: CHART_COLORS.weeklyOff },
                          { name: 'Absent', value: dayData.absent, color: CHART_COLORS.absent }
                        ].filter(item => item.value > 0);
                        return (
                          <Card
                            key={idx}
                            className="cursor-pointer p-1"
                            onClick={() => handleSmallPieChartClick(dayData)}
                          >
                            <CardContent className="p-1 text-center">
                              <p className="text-[10px] font-medium">{dayData.day}</p>
                              <div className="h-12">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RechartsPieChart>
                                    <Pie
                                      data={pieData}
                                      cx="50%"
                                      cy="50%"
                                      outerRadius={20}
                                      dataKey="value"
                                    >
                                      {pieData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </RechartsPieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="flex justify-center gap-1 text-[9px] mt-1">
                                <span className="text-green-600">{dayData.present}</span>
                                <span className="text-gray-400">{dayData.weeklyOff}</span>
                                <span className="text-red-600">{dayData.absent}</span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Today's Overview compact */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold">Today</h3>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousDay}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-[10px]">Day {currentDayIndex + 1}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextDay}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex-1 min-w-[100px]">
                        <div className="h-28">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={currentDayPieData}
                                cx="50%"
                                cy="50%"
                                outerRadius={45}
                                dataKey="value"
                                labelLine={false}
                                onClick={() => handlePieChartClick(currentDayData.date)}
                                className="cursor-pointer"
                              >
                                {currentDayPieData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomPieTooltip />} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between p-1 bg-green-50 rounded">
                            <span>Present</span>
                            <span className="font-bold">{currentDayData.present}</span>
                          </div>
                          <div className="flex justify-between p-1 bg-gray-50 rounded">
                            <span>Weekly Off</span>
                            <span className="font-bold">{currentDayData.weeklyOff}</span>
                          </div>
                          <div className="flex justify-between p-1 bg-red-50 rounded">
                            <span>Absent</span>
                            <span className="font-bold">{currentDayData.absent}</span>
                          </div>
                          <div className="flex justify-between p-1 bg-blue-50 rounded mt-1">
                            <span>Total Staff</span>
                            <span className="font-bold">{totalEmployeesAssignedToSites}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Department Performance Cards – compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-sm">
            <CardHeader className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Department Performance</CardTitle>
                <Badge variant="outline" className="text-[10px] bg-white/80">
                  <Users className="h-2.5 w-2.5 mr-1" />
                  {employees.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 py-2">
              {departmentData.length === 0 ? (
                <div className="text-center py-4 text-xs">No departments found.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {departmentData.map((dept, idx) => {
                    const IconComp = dept.icon;
                    return (
                      <motion.div
                        key={dept.department}
                        variants={itemVariants}
                        custom={idx}
                        whileHover={{ scale: 1.02 }}
                      >
                        <Card
                          className={`text-center cursor-pointer hover:shadow-md border-2 hover:border-blue-300 bg-gradient-to-b ${dept.color}`}
                          onClick={() => handleDepartmentCardClick(dept.department)}
                        >
                          <CardContent className="p-2">
                            <div className="bg-white/50 rounded-full w-8 h-8 mx-auto mb-1 flex items-center justify-center">
                              <IconComp className="h-4 w-4 text-gray-700" />
                            </div>
                            <p className="text-[10px] font-medium truncate">{dept.department}</p>
                            <p className="text-sm font-bold mt-1">{dept.total}</p>
                            <p className="text-[9px] text-muted-foreground">
                              employee{dept.total !== 1 ? 's' : ''}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

                {/* Feature Blocks – Machine Status, Grooming, Incidents, Cleaning, Shift, Training, Briefing */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
          <Card className="cursor-pointer hover:shadow-md transition-all hover:scale-105" onClick={() => navigate('/manager/machine-status')}>
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-green-100 text-green-600 mb-2"><Cpu className="h-5 w-5" /></div>
              <span className="text-xs font-medium">Machine Status</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-all hover:scale-105" onClick={() => navigate('/manager/grooming')}>
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-purple-100 text-purple-600 mb-2"><Shirt className="h-5 w-5" /></div>
              <span className="text-xs font-medium">Grooming</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-all hover:scale-105" onClick={() => navigate('/manager/incidents')}>
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-red-100 text-red-600 mb-2"><AlertTriangle className="h-5 w-5" /></div>
              <span className="text-xs font-medium">Incidents</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-all hover:scale-105" onClick={() => navigate('/manager/cleaning-photos')}>
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-yellow-100 text-yellow-600 mb-2"><Images className="h-5 w-5" /></div>
              <span className="text-xs font-medium">Cleaning Photos</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-all hover:scale-105" onClick={() => navigate('/manager/shift-deployment')}>
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 mb-2"><Factory className="h-5 w-5" /></div>
              <span className="text-xs font-medium">Shift Deployment</span>
            </CardContent>
          </Card>
         </div>
</div>

      {/* Camera capture for check‑in/out */}
<CameraCapture
  open={cameraOpen}
  onOpenChange={setCameraOpen}
  onCapture={handlePhotoCapture}
  title={`${cameraAction === 'checkin' ? 'Check-in' : 'Check-out'} with Camera`}
  actionLabel="Confirm"
/>

{/* Weekly off dialog for employees */}
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
        {weeklyOffLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default ManagerDashboard;