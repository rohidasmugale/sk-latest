import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, useRef } from "react";
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
  Coffee, Timer, LogIn, LogOut, Camera, Cpu, Shirt, Images, Factory, GraduationCap, Megaphone, Settings
} from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// ✅ Authenticated API client (attaches JWT automatically)
import apiClient from '@/lib/apiClient';

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
  siteName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  maritalStatus?: string;
  permanentAddress?: string;
  localAddress?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  relativeName?: string;
  relation?: string;
  numberOfChildren?: string | number;
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
  profileStatus?: "complete" | "incomplete";
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

const CHART_COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  weeklyOff: '#94a3b8',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// Normalizes any date value to YYYY-MM-DD using local date parts
const normalizeDateStr = (d: string | null | undefined): string => {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return formatDate(parsed);
};
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
  shiftId?: string;
  overtimeHours?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
}

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
  profileStatus?: "complete" | "incomplete";
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
  lastCheckInDate: string | null;
  hasCheckedInToday: boolean;
  hasCheckedOutToday: boolean;
}

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

// ✅ FIX: skipSiteFilter added below so empty /sites doesn't drop all employees
const fetchEmployeesAssignedToSites = async (): Promise<{ employees: Employee[], siteCounts: SiteEmployeeCount[] }> => {
  try {
    console.log('🔄 Fetching employees assigned to sites from API...');

    const sites = await siteService.getAllSites();
    const validSiteNames = new Set(sites.map(site => site.name));

    // ✅ FIX: If /sites returned nothing (manager-side backend bug), skip filtering.
    const skipSiteFilter = validSiteNames.size === 0;

    console.log(`Found ${sites.length} sites with names:`, Array.from(validSiteNames));
    console.log(`⚠️ skipSiteFilter = ${skipSiteFilter} (true means we accept all employees)`);

    const response = await apiClient.get(`/employees`, {
      params: { limit: 5000 }
    });

    console.log('Employees API response:', response.data);

    let employeesData: any[] = [];

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

    console.log(`📥 Total employees from API: ${employeesData.length}`);

    const transformedEmployees: Employee[] = [];
    const siteCountMap = new Map<string, number>();

    employeesData.forEach((emp: any) => {
      const siteName = emp.site || emp.siteName || '';
      const assignedSites = emp.assignedSites || emp.sites || [];

      // ✅ FIX: If skipSiteFilter is true, accept every employee.
      const hasValidSite = skipSiteFilter || (siteName && validSiteNames.has(siteName));
      const hasValidAssignedSites = skipSiteFilter || (Array.isArray(assignedSites) && assignedSites.some((site: string) => validSiteNames.has(site)));

      if (hasValidSite || hasValidAssignedSites) {
        const employeeSite = siteName
          || (Array.isArray(assignedSites) && assignedSites[0])
          || 'Unknown Site';

        const employee: Employee = {
          id: emp._id || emp.id || `emp_${Math.random()}`,
          _id: emp._id || emp.id,
          employeeId: emp.employeeId || emp.employeeID || `EMP${String(Math.random()).slice(2, 6)}`,
          name: emp.name || emp.employeeName || "Unknown Employee",
          department: emp.department || "Unknown Department",
          position: emp.position || emp.designation || emp.role || "Employee",
          site: employeeSite,
          siteName: employeeSite,
          assignedSites: assignedSites,
          isManager: (emp.position?.toLowerCase() || '').includes('manager') || (emp.department?.toLowerCase() || '').includes('manager'),
          isSupervisor: (emp.position?.toLowerCase() || '').includes('supervisor') || (emp.department?.toLowerCase() || '').includes('supervisor')
        };

        transformedEmployees.push(employee);
        siteCountMap.set(employeeSite, (siteCountMap.get(employeeSite) || 0) + 1);
      }
    });

    const siteCounts: SiteEmployeeCount[] = Array.from(siteCountMap.entries()).map(([siteName, count]) => ({
      siteName,
      totalEmployees: count
    }));

    console.log(`✅ Loaded ${transformedEmployees.length} employees ASSIGNED TO SITES from API`);
    console.log(`📊 Employee count per site:`, siteCounts);

    return { employees: transformedEmployees, siteCounts };
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    throw new Error(`Error loading employees: ${error.message}`);
  }
};
// Bulk-fetch raw attendance records for a date range, used to join to each
// employee's current site instead of trusting attendance.siteName
const fetchAttendanceRecordsRange = async (
  start: string,
  end: string
): Promise<{ employeeId: string; employeeName: string; date: string; status: string }[]> => {
  try {
    const response = await apiClient.get(`/attendance`, {
      params: { startDate: start, endDate: end, limit: 5000 }
    });

    let records: any[] = [];
    if (response.data) {
      if (response.data.success && Array.isArray(response.data.data)) records = response.data.data;
      else if (Array.isArray(response.data)) records = response.data;
      else if (Array.isArray(response.data.attendance)) records = response.data.attendance;
    }

    return records.map((record: any) => ({
      employeeId: record.employeeId || record.employee?._id || '',
      employeeName: record.employeeName || record.employee?.name || '',
      date: normalizeDateStr(record.date),
      status: (record.status?.toLowerCase() || 'absent'),
    }));
  } catch (error) {
    console.error('Error fetching attendance records range:', error);
    return [];
  }
};


const fetchAttendanceData = async (days: number = 30): Promise<DailyAttendanceSummary[]> => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    const { employees: siteAssignedEmployees } = await fetchEmployeesAssignedToSites();
    const totalStaffAssignedToSites = siteAssignedEmployees.length;

    const staffSiteCounts: { [site: string]: number } = {};
    const empIdToSite = new Map<string, string>();
    const empNameToSite = new Map<string, string>();
    siteAssignedEmployees.forEach(emp => {
      const site = (emp.site || emp.siteName || 'Unknown').trim();
      staffSiteCounts[site] = (staffSiteCounts[site] || 0) + 1;
      if (emp._id) empIdToSite.set(String(emp._id), site);
      if (emp.name) empNameToSite.set(emp.name.trim().toLowerCase(), site);
    });

    // ✅ FIX: join attendance records to each employee's CURRENT site
    const attendanceRecords = await fetchAttendanceRecordsRange(startDateStr, endDateStr);

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
        siteBreakdown: {},
      };
      Object.entries(staffSiteCounts).forEach(([site, count]) => {
        dailySummaries[dateStr].siteBreakdown![site] = {
          total: count, present: 0, absent: 0, weeklyOff: 0, leave: 0,
        };
      });
      cur.setDate(cur.getDate() + 1);
    }

    attendanceRecords.forEach(record => {
      const summary = dailySummaries[record.date];
      if (!summary) return;

      const site =
        empIdToSite.get(String(record.employeeId)) ||
        (record.employeeName ? empNameToSite.get(record.employeeName.trim().toLowerCase()) : undefined);
      if (!site) return;

      const status = record.status;
      if (status === 'present') summary.present += 1;
      else if (status === 'half-day') summary.present += 0.5;
      else if (status === 'weekly-off') summary.weeklyOff += 1;
      else if (status === 'leave') summary.leave += 1;
      else summary.absent += 1;

      const sb = summary.siteBreakdown?.[site];
      if (sb) {
        if (status === 'present') sb.present += 1;
        else if (status === 'half-day') sb.present += 0.5;
        else if (status === 'weekly-off') sb.weeklyOff += 1;
        else if (status === 'leave') sb.leave += 1;
        else sb.absent += 1;
      }
    });

    Object.values(dailySummaries).forEach(summary => {
      const accounted = summary.present + summary.weeklyOff + summary.leave + summary.absent;
      if (accounted < summary.totalEmployees) summary.absent += (summary.totalEmployees - accounted);
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
    return [];
  }
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
        <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) pageNum = i + 1;
          else if (currentPage <= 3) pageNum = i + 1;
          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
          else pageNum = currentPage - 2 + i;
          return (
            <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => onPageChange(pageNum)} className="min-w-[2rem]">
              {pageNum}
            </Button>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

const exportToExcel = (data: any[], filename: string) => {
  const headers = ['Site Name', 'Billing Amount (₹)', 'Total Paid (₹)', 'Hold Salary (₹)', 'Difference (₹)', 'Status', 'Remark'];
  const csvContent = [
    headers.join(','),
    ...data.map(item => {
      const difference = item.billingAmount - item.totalPaid + item.holdSalary;
      return [`"${item.siteName}"`, item.billingAmount, item.totalPaid, item.holdSalary, difference, item.status, `"${item.remark}"`].join(',');
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


const ManagerDashboard = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const totalDeploymentStaff = useMemo(() => {
    return siteService.getTotalStaffAcrossSites(sites);
  }, [sites]);
  const departmentData = useMemo(() => {
    const allowedDepartments = [
      { name: 'Housekeeping', icon: Home, color: 'from-blue-50 to-blue-100 border-blue-200' },
      { name: 'Security', icon: Shield, color: 'from-green-50 to-green-100 border-green-200' },
      { name: 'Waste Management', icon: Trash2, color: 'from-gray-50 to-gray-100 border-gray-200' },
      { name: 'Parking Management', icon: Car, color: 'from-purple-50 to-purple-100 border-purple-200' },
      { name: 'Consumables', icon: ShoppingCart, color: 'from-orange-50 to-orange-100 border-orange-200' },
      { name: 'Technician', icon: Settings, color: 'from-slate-50 to-slate-100 border-slate-300' },
      { name: 'Other', icon: Droplets, color: 'from-cyan-50 to-cyan-100 border-cyan-200' }
    ];

    const deptSiteCounts = new Map<string, Set<string>>();
    sites.forEach(site => {
      const services = site.services || [];
      services.forEach(service => {
        const matchedDept = allowedDepartments.find(d => d.name.toLowerCase() === service.toLowerCase().trim());
        const deptName = matchedDept ? matchedDept.name : service;
        if (!deptSiteCounts.has(deptName)) deptSiteCounts.set(deptName, new Set());
        deptSiteCounts.get(deptName)!.add(site._id);
      });
    });

    return allowedDepartments.map(dept => {
      const siteIds = deptSiteCounts.get(dept.name) || new Set();
      return {
        department: dept.name,
        total: siteIds.size,
        present: siteIds.size,
        icon: dept.icon,
        color: dept.color,
        siteNames: Array.from(siteIds)
      };
    });
  }, [sites]);

  const navigate = useNavigate();

  const [attendanceData, setAttendanceData] = useState<DailyAttendanceSummary[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [refreshingAttendance, setRefreshingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [totalEmployeesAssignedToSites, setTotalEmployeesAssignedToSites] = useState(0);
  const [siteEmployeeCounts, setSiteEmployeeCounts] = useState<SiteEmployeeCount[]>([]);
  const [attendance, setAttendance] = useState<AttendanceStatus>({
    isCheckedIn: false, isOnBreak: false, checkInTime: null, checkOutTime: null,
    checkInPhoto: null, checkOutPhoto: null, breakStartTime: null, breakEndTime: null,
    totalHours: 0, breakTime: 0, lastCheckInDate: null,
    hasCheckedInToday: false, hasCheckedOutToday: false,
  });
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraAction, setCameraAction] = useState<'checkin' | 'checkout' | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [myEmployeeRecord, setMyEmployeeRecord] = useState<any>(null);
  const [weeklyOffDialogOpen, setWeeklyOffDialogOpen] = useState(false);
  const [selectedEmployeeForWeeklyOff, setSelectedEmployeeForWeeklyOff] = useState<Employee | null>(null);
  const [weeklyOffLoading, setWeeklyOffLoading] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [sixDaysStartIndex, setSixDaysStartIndex] = useState(1);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedSite, setSelectedSite] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSiteBreakdown, setShowSiteBreakdown] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const loadMyAttendanceStatus = async () => {
    try {
      const empId = myEmployeeRecord?.employeeId || myEmployeeRecord?._id;
      if (!empId) return;
      const response = await apiClient.get(`/attendance/status/${empId}`);
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

  const handleBreakIn = async () => {
    if (!attendance.isCheckedIn) return toast.error("Check in first");
    if (attendance.isOnBreak) return toast.error("Already on break");
    try {
      const empId = myEmployeeRecord?.employeeId || myEmployeeRecord?._id;
      await apiClient.post(`/attendance/breakin`, { employeeId: empId });
      setAttendance({ ...attendance, isOnBreak: true, breakStartTime: new Date().toISOString() });
      toast.success("Break started");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Break failed");
    }
  };

  const handleBreakOut = async () => {
    if (!attendance.isOnBreak) return toast.error("Not on break");
    try {
      const empId = myEmployeeRecord?.employeeId || myEmployeeRecord?._id;
      await apiClient.post(`/attendance/breakout`, { employeeId: empId });
      const breakTime = calculateBreakTime(attendance.breakStartTime, new Date().toISOString());
      setAttendance({ ...attendance, isOnBreak: false, breakEndTime: new Date().toISOString(), breakTime: attendance.breakTime + breakTime });
      toast.success("Break ended");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Break end failed");
    }
  };

  const handleAttendanceCamera = () => {
    const isCheckingOut = attendance.hasCheckedInToday && !attendance.hasCheckedOutToday;
    setCameraAction(isCheckingOut ? 'checkout' : 'checkin');
    setCameraOpen(true);
  };

  const handlePhotoCapture = async (photoFile: File) => {
    if (!cameraAction) return;
    setUploadingPhoto(true);
    try {
      if (!myEmployeeRecord) {
        toast.error("Your employee record wasn't found. Contact admin to link your account.");
        setUploadingPhoto(false);
        setCameraOpen(false);
        setCameraAction(null);
        return;
      }
      const empId = myEmployeeRecord.employeeId || myEmployeeRecord._id;
      const empName = myEmployeeRecord.name || "Manager";
      const empSite = myEmployeeRecord.siteName || myEmployeeRecord.site || '';
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('employeeId', empId);
      formData.append('employeeName', empName);
      formData.append('siteName', empSite);
      const endpoint = cameraAction === 'checkin' ? `/attendance/checkin-with-photo` : `/attendance/checkout-with-photo`;
      const response = await apiClient.post(endpoint, formData);
      if (response.data.success) {
        toast.success(cameraAction === 'checkin' ? 'Checked in successfully!' : 'Checked out successfully!');
        loadAttendanceData(true);
        loadMyAttendanceStatus();
      } else {
        toast.error(response.data.message || 'Attendance failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to process attendance');
    } finally {
      setUploadingPhoto(false);
      setCameraOpen(false);
      setCameraAction(null);
    }
  };

  const handleMarkWeeklyOff = async () => {
    if (!selectedEmployeeForWeeklyOff) return;
    setWeeklyOffLoading(true);
    try {
      await apiClient.post(`/attendance/update-status`, {
        employeeId: selectedEmployeeForWeeklyOff._id,
        date: new Date().toISOString().split('T')[0],
        status: 'weekly-off',
        remarks: 'Marked by admin',
      });
      toast.success(`Weekly off marked for ${selectedEmployeeForWeeklyOff.name}`);
      setWeeklyOffDialogOpen(false);
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

  const fetchMyEmployeeRecord = async () => {
    try {
      const stored = localStorage.getItem("sk_user");
      const me = stored ? JSON.parse(stored) : null;
      if (!me?._id) return;
      const response = await apiClient.get(`/employees`, { params: { userId: me._id, limit: 1 } });
      let employeesData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) employeesData = response.data;
        else if (response.data.success && Array.isArray(response.data.data)) employeesData = response.data.data;
      }
      if (employeesData.length > 0) {
        setMyEmployeeRecord(employeesData[0]);
        console.log('✅ Linked Employee record found:', employeesData[0].name, 'ID:', employeesData[0].employeeId);
      } else {
        console.warn('⚠️ No Employee record linked to this User (userId):', me._id);
      }
    } catch (error) {
      console.error('Failed to fetch my employee record:', error);
    }
  };

  const calculateBreakTime = (start: string | null, end: string | null): number => {
    if (!start || !end) return 0;
    return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
  };

  const itemsPerPage = 5;

  const fetchEmployeesData = async (attempt = 1) => {
    try {
      const { employees: empList } = await fetchEmployeesAssignedToSites();
      setEmployees(empList);
    } catch (error) {
      console.error(`Error fetching employees (attempt ${attempt}):`, error);
      if (attempt < 3) setTimeout(() => fetchEmployeesData(attempt + 1), 1500);
      else toast.error('Could not load employee data. Try refreshing.');
    }
  };

  useEffect(() => {
    fetchEmployeesData();
    fetchMyEmployeeRecord();
  }, []);

  useEffect(() => {
    if (myEmployeeRecord) loadMyAttendanceStatus();
  }, [myEmployeeRecord]);

  useEffect(() => {
    loadAttendanceData();
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const sitesData = await siteService.getAllSites();
      setSites(sitesData);
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  };

  const loadAttendanceData = async (showRefreshToast: boolean = false, attempt: number = 1) => {
    try {
      if (showRefreshToast) setRefreshingAttendance(true);
      else setLoadingAttendance(true);
      setAttendanceError(null);

      const data = await fetchAttendanceData(30);

      if (data.length > 0 && data[0].totalEmployees === 0 && attempt < 2) {
        setTimeout(() => loadAttendanceData(showRefreshToast, attempt + 1), 1500);
        return;
      }

      setAttendanceData(data);

      if (data.length > 0) {
        setTotalEmployeesAssignedToSites(data[0].totalEmployees);
        if (data[0].siteBreakdown) {
          const counts = Object.entries(data[0].siteBreakdown).map(([siteName, siteData]) => ({
            siteName, totalEmployees: siteData.total
          }));
          setSiteEmployeeCounts(counts);
        }
      }
      if (data.length > 0) {
        setCurrentDayIndex(0);
        setSixDaysStartIndex(Math.min(1, data.length - 6));
      }
      if (showRefreshToast) toast.success('Attendance data refreshed successfully');
    } catch (error: any) {
      console.error('Failed to load attendance data:', error);
      if (attempt < 3) {
        setTimeout(() => loadAttendanceData(showRefreshToast, attempt + 1), 1500);
        return;
      }
      setAttendanceError(error.message || 'Failed to load attendance data');
      toast.error('Failed to load attendance data', { description: error.message || 'Please try again later' });
    } finally {
      setLoadingAttendance(false);
      setRefreshingAttendance(false);
    }
  };

  const handleRefreshAttendance = () => loadAttendanceData(true);

  const currentDayData = useMemo(() => {
    if (attendanceData.length === 0) {
      return {
        date: new Date().toISOString().split('T')[0], day: 'Today',
        present: 0, absent: 0, weeklyOff: 0, leave: 0, total: 0, rate: '0.0%', index: 0,
        totalEmployees: totalEmployeesAssignedToSites, sitesWithData: 0, siteBreakdown: {}
      };
    }
    return attendanceData[currentDayIndex] || attendanceData[0];
  }, [attendanceData, currentDayIndex, totalEmployeesAssignedToSites]);

  const sixDaysData = useMemo(() => {
    if (attendanceData.length === 0) return [];
    return attendanceData.slice(sixDaysStartIndex, sixDaysStartIndex + 6);
  }, [attendanceData, sixDaysStartIndex]);

  const currentDayPieData = [
    { name: 'Present', value: currentDayData.present, color: CHART_COLORS.present },
    { name: 'Weekly Off', value: currentDayData.weeklyOff, color: CHART_COLORS.weeklyOff },
    { name: 'Absent', value: currentDayData.absent, color: CHART_COLORS.absent }
  ].filter(item => item.value > 0);

  const detailedPieData = currentDayPieData;

  const handlePreviousDay = () => setCurrentDayIndex(prev => (prev > 0 ? prev - 1 : attendanceData.length - 1));
  const handleNextDay = () => setCurrentDayIndex(prev => (prev < attendanceData.length - 1 ? prev + 1 : 0));

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
    const fd = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fd(firstDate)} - ${fd(lastDate)}`;
  };

  const handlePageChange = (page: number) => setCurrentPage(page);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateDifference = (item: any) => item.billingAmount - item.totalPaid + item.holdSalary;

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{data.name}</p>
          <p className="text-sm" style={{ color: data.payload.fill }}>
            {data.value} employees ({((data.value / (currentDayData.totalEmployees || 1)) * 100).toFixed(1)}%)
          </p>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-gray-50/50">
      <DashboardHeader
        title={<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-base sm:text-lg">Manager Dashboard</span>}
        onMenuClick={onMenuClick}
      />

      <div className="px-3 sm:px-4 mt-2 flex flex-wrap items-center gap-2">
        <Button onClick={handleAttendanceCamera} variant="default" size="sm" className="flex items-center gap-1">
          <Camera className="h-4 w-4" />
          {attendance.hasCheckedInToday && !attendance.hasCheckedOutToday ? 'Check Out' : 'Check In'}
        </Button>
        <Button onClick={handleBreakIn} disabled={!attendance.isCheckedIn || attendance.isOnBreak} variant="outline" size="sm">
          <Coffee className="h-4 w-4 mr-1" /> Break In
        </Button>
        <Button onClick={handleBreakOut} disabled={!attendance.isOnBreak} variant="outline" size="sm">
          <Timer className="h-4 w-4 mr-1" /> Break Out
        </Button>
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <Badge variant={attendance.hasCheckedOutToday ? "default" : attendance.hasCheckedInToday ? "secondary" : "outline"} className="text-xs">
            {attendance.hasCheckedOutToday ? "Completed" : attendance.hasCheckedInToday ? "In Progress" : "Not Started"}
          </Badge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Hours: {attendance.totalHours.toFixed(1)}h
          </span>
        </div>
        <Button onClick={handleRefreshAttendance} variant="ghost" size="sm" className="ml-auto">
          <RefreshCw className={`h-4 w-4 ${refreshingAttendance ? "animate-spin" : ""}`} />
        </Button>
        <Button onClick={() => setQuickCreateOpen(true)} className="rounded-full h-10 w-10 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <UnifiedCreateModal
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        employees={employees as any}
        setEmployees={setEmployees as any}
        onSuccess={() => { loadAttendanceData(); loadSites(); fetchEmployeesData(); }}
        allowedTabs={['employee', 'supervisor']}
      />

      <div className="p-3 space-y-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
                  <Button onClick={handleRefreshAttendance} variant="outline" size="sm" className="mt-2 h-7 text-xs">Retry</Button>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold flex items-center gap-1"><Calendar className="h-3 w-3" /> Historical</h3>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={handleSixDaysPrevious} disabled={!canGoSixDaysPrevious} className="h-6 w-6 p-0">
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleSixDaysNext} disabled={!canGoSixDaysNext} className="h-6 w-6 p-0">
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
                          <Card key={idx} className="cursor-pointer p-1" onClick={() => handleSmallPieChartClick(dayData)}>
                            <CardContent className="p-1 text-center">
                              <p className="text-[10px] font-medium">{dayData.day}</p>
                              <div className="h-12">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RechartsPieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={20} dataKey="value">
                                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
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

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold">Today</h3>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={handlePreviousDay} className="h-6 w-6 p-0">
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-[10px]">Day {currentDayIndex + 1}</span>
                        <Button variant="outline" size="sm" onClick={handleNextDay} className="h-6 w-6 p-0">
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex-1 min-w-[100px]">
                        <div className="h-28">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie data={currentDayPieData} cx="50%" cy="50%" outerRadius={45} dataKey="value"
                                labelLine={false} onClick={() => handlePieChartClick(currentDayData.date)} className="cursor-pointer">
                                {currentDayPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                              </Pie>
                              <Tooltip content={<CustomPieTooltip />} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between p-1 bg-green-50 rounded"><span>Present</span><span className="font-bold">{currentDayData.present}</span></div>
                          <div className="flex justify-between p-1 bg-gray-50 rounded"><span>Weekly Off</span><span className="font-bold">{currentDayData.weeklyOff}</span></div>
                          <div className="flex justify-between p-1 bg-red-50 rounded"><span>Absent</span><span className="font-bold">{currentDayData.absent}</span></div>
                          <div className="flex justify-between p-1 bg-purple-50 rounded">
                            <span>Deployment</span>
                            <span className="font-bold">{totalDeploymentStaff}</span>
                          </div>
                          <div className="flex justify-between p-1 bg-blue-50 rounded mt-1">
                            <span>Actual Staff</span>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-sm">
            <CardHeader className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Department Performance</CardTitle>
                <Badge variant="outline" className="text-[10px] bg-white/80">
                  <Users className="h-2.5 w-2.5 mr-1" />{employees.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 py-2">
              <div className="w-full overflow-x-auto">
                <div className="flex flex-nowrap gap-2 min-w-[500px]">
                  {departmentData.map((dept, idx) => {
                    const IconComp = dept.icon;
                    return (
                      <div key={dept.department} className="flex-1 min-w-[80px]">
                        <Card className={`text-center cursor-pointer hover:shadow-md border-2 bg-gradient-to-b ${dept.color} h-full`}
                          onClick={() => handleDepartmentCardClick(dept.department)}>
                          <CardContent className="p-2">
                            <div className="bg-white/50 rounded-full w-8 h-8 mx-auto mb-1 flex items-center justify-center">
                              <IconComp className="h-4 w-4 text-gray-700" />
                            </div>
                            <p className="text-[10px] font-medium truncate">{dept.department}</p>
                            <p className="text-sm font-bold mt-1">{dept.total}</p>
                            <p className="text-[8px] text-muted-foreground">site{dept.total !== 1 ? 's' : ''}</p>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/manager/machine-status')}>
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-green-100 text-green-600 mb-2"><Cpu className="h-5 w-5" /></div>
              <span className="text-xs font-medium">Machine Status</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/manager/grooming')}>
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-purple-100 text-purple-600 mb-2"><Shirt className="h-5 w-5" /></div>
              <span className="text-xs font-medium">Grooming</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/manager/incidents')}>
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-red-100 text-red-600 mb-2"><AlertTriangle className="h-5 w-5" /></div>
              <span className="text-xs font-medium">Incidents</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/manager/cleaning-photos')}>
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-yellow-100 text-yellow-600 mb-2"><Images className="h-5 w-5" /></div>
              <span className="text-xs font-medium">Cleaning Photos</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/manager/shift-deployment')}>
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 mb-2"><Factory className="h-5 w-5" /></div>
              <span className="text-xs font-medium">Shift Deployment</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handlePhotoCapture}
        title={`${cameraAction === 'checkin' ? 'Check-in' : 'Check-out'} with Camera`}
        actionLabel="Confirm"
      />

      <Dialog open={weeklyOffDialogOpen} onOpenChange={setWeeklyOffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Weekly Off</DialogTitle>
            <DialogDescription>Select an employee to mark as weekly off for today.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedEmployeeForWeeklyOff?._id || ""} onValueChange={(value) => {
              const emp = employees.find(e => e._id === value);
              setSelectedEmployeeForWeeklyOff(emp || null);
            }}>
              <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
              <SelectContent>
                {employees.map(emp => <SelectItem key={emp._id} value={emp._id}>{emp.name} ({emp.employeeId})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeeklyOffDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkWeeklyOff} disabled={weeklyOffLoading}>
              {weeklyOffLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerDashboard;